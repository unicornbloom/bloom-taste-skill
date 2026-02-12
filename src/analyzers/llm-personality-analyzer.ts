/**
 * LLM-based Personality Analyzer
 *
 * Uses Groq (free tier) to interpret conversation context for personality dimensions.
 * Falls back gracefully when API key is missing or call fails.
 */

import Groq from 'groq-sdk';

export interface LLMDimensionScores {
  conviction: number;
  intuition: number;
  contribution: number;
  reasoning: {
    conviction: string;
    intuition: string;
    contribution: string;
  };
  mainCategories: string[];
}

const SYSTEM_PROMPT = `You are a personality analyst for a tool recommendation engine called "Bloom Taste Finder".
Your job is to analyze a conversation and determine the person's personality dimensions.

You must return ONLY valid JSON (no markdown, no explanation outside JSON).`;

const USER_PROMPT_TEMPLATE = `Analyze this conversation between a user and an assistant. Based on HOW the person thinks and communicates (not just what topics they mention), rate them on these dimensions:

1. **Conviction** (0-100): How focused/committed vs exploratory/curious?
   - HIGH (70-100): Deeply committed to few things, strong thesis, "all in" mentality, repeats same themes
   - MID (40-60): Has preferences but open to adjacent ideas
   - LOW (0-40): Explores widely, tries many things, gets excited by novelty, "variety is fuel"

2. **Intuition** (0-100): How vision/gut-driven vs data/evidence-driven?
   - HIGH (70-100): Vision-driven, backs ideas before proof, "I believe", "paradigm shift", future-oriented
   - MID (40-60): Mixes intuition with some data
   - LOW (0-40): Data-driven, wants metrics/ROI/evidence, systematic, "the numbers don't lie"

3. **Contribution** (0-100): How much do they help/share with others?
   - HIGH (60-100): Creates content, gives feedback, builds community, mentors, shares resources
   - MID (20-50): Occasionally shares or helps
   - LOW (0-20): Mostly personal focus, consumer not contributor

4. **Main Categories** (1-3): What topics does this person genuinely care about?
   Choose from: AI Tools, Productivity, Wellness, Education, Crypto, Lifestyle, Design, Development, Marketing, Finance

Return ONLY this JSON format:
{
  "conviction": <number 0-100>,
  "intuition": <number 0-100>,
  "contribution": <number 0-100>,
  "reasoning": {
    "conviction": "<1 sentence why>",
    "intuition": "<1 sentence why>",
    "contribution": "<1 sentence why>"
  },
  "mainCategories": ["<category1>", "<category2>"]
}

CONVERSATION:
---
{CONVERSATION}
---`;

// Model to use — llama-3.3-70b is fast and free on Groq
const MODEL = 'llama-3.3-70b-versatile';

export class LLMPersonalityAnalyzer {
  private client: Groq | null = null;

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (apiKey) {
      this.client = new Groq({ apiKey });
    }
  }

  /**
   * Check if LLM analysis is available (API key configured)
   */
  isAvailable(): boolean {
    return this.client !== null && !!process.env.GROQ_API_KEY;
  }

  /**
   * Analyze conversation text using LLM
   * Returns null if unavailable or on error (caller should fallback to heuristics)
   */
  async analyze(conversationText: string): Promise<LLMDimensionScores | null> {
    if (!this.client) {
      return null;
    }

    try {
      const userPrompt = USER_PROMPT_TEMPLATE.replace('{CONVERSATION}', conversationText);

      const response = await this.client.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1, // Low temp for consistent scoring
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.warn('⚠️  LLM returned empty response');
        return null;
      }

      const parsed = JSON.parse(content);
      return this.validateAndClamp(parsed);
    } catch (error: any) {
      console.warn(`⚠️  LLM personality analysis failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Validate and clamp LLM response to expected ranges
   */
  private validateAndClamp(raw: any): LLMDimensionScores | null {
    if (
      typeof raw.conviction !== 'number' ||
      typeof raw.intuition !== 'number' ||
      typeof raw.contribution !== 'number'
    ) {
      console.warn('⚠️  LLM returned invalid dimension scores');
      return null;
    }

    const clamp = (n: number) => Math.min(Math.max(Math.round(n), 0), 100);

    return {
      conviction: clamp(raw.conviction),
      intuition: clamp(raw.intuition),
      contribution: clamp(raw.contribution),
      reasoning: {
        conviction: raw.reasoning?.conviction || '',
        intuition: raw.reasoning?.intuition || '',
        contribution: raw.reasoning?.contribution || '',
      },
      mainCategories: Array.isArray(raw.mainCategories)
        ? raw.mainCategories.filter((c: any) => typeof c === 'string').slice(0, 3)
        : [],
    };
  }
}
