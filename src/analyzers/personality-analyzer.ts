/**
 * Personality Analyzer V2 — 2-Axis Dimension System
 *
 * Calculates two independent dimensions (Conviction/Intuition) and contribution score
 * to determine supporter personality type through a 2x2 quadrant classification.
 */

import { PersonalityType } from '../types/personality';
import { CATEGORY_KEYWORDS } from '../types/categories';
import {
  TasteSpectrums,
  HiddenPatternInsight,
  AiPlaybook,
  LEARNING_TRY_FIRST_KEYWORDS,
  LEARNING_STUDY_FIRST_KEYWORDS,
  DECISION_GUT_KEYWORDS,
  DECISION_DELIBERATE_KEYWORDS,
  NOVELTY_EARLY_KEYWORDS,
  NOVELTY_WAIT_KEYWORDS,
  RISK_BOLD_KEYWORDS,
  RISK_CAUTIOUS_KEYWORDS,
  STRENGTH_PATTERNS,
  EPISODE_PATTERNS,
  EpisodePattern,
} from '../types/taste-dimensions';

export interface UserData {
  sources: string[];
  twitter?: {
    following: string[];
    tweets: any[];
    bio: string;
  };
  farcaster?: {
    casts: any[];
    channels: string[];
    bio: string;
  };
  wallet?: {
    transactions: any[];
    nfts: any[];
    tokens: any[];
    contracts: string[]; // Unique contracts interacted with
  };
  conversationMemory?: {
    topics: string[];
    interests: string[];
    preferences: string[];
    history: string[];
  };
  userMdContent?: string; // Raw USER.md text for keyword + episodic extraction
}

export interface DimensionScores {
  conviction: number;    // 0-100: Conviction (high) ← → Curiosity (low)
  intuition: number;     // 0-100: Intuition (high) ← → Analysis (low)
  contribution: number;  // 0-100: Contribution behavior score
  tasteSpectrums?: TasteSpectrums;
}

export interface PersonalityAnalysis {
  personalityType: PersonalityType;
  tagline: string;
  description: string;
  detectedInterests: string[];
  detectedCategories: string[]; // Top categories for tagline generation
  dimensions: DimensionScores;
  strengths?: string[];
  hiddenInsight?: HiddenPatternInsight;
  aiPlaybook?: AiPlaybook;
  confidence: number;
}

// Minimum keyword frequency score to qualify as a detected category
const MIN_CATEGORY_SCORE = 3;

/**
 * Tagline templates by personality type
 */
const TAGLINE_TEMPLATES = {
  [PersonalityType.THE_VISIONARY]: (category: string) => `The ${category} Pioneer`,
  [PersonalityType.THE_EXPLORER]: (category: string) => `The ${category} Nomad`,
  [PersonalityType.THE_CULTIVATOR]: (category: string) => `The ${category} Gardener`,
  [PersonalityType.THE_OPTIMIZER]: (category: string) => `The ${category} Analyst`,
  [PersonalityType.THE_INNOVATOR]: (category: string) => `The ${category} Architect`,
};

export class PersonalityAnalyzer {
  /**
   * Main analysis method — calculates dimensions and determines personality
   *
   * @param nudges Optional dimension adjustments from USER.md signal merger (-15 to +15 each)
   */
  async analyze(
    userData: UserData,
    nudges?: {
      conviction: number;
      intuition: number;
      contribution: number;
      learning?: number;
      decision?: number;
      novelty?: number;
      risk?: number;
    },
  ): Promise<PersonalityAnalysis> {
    console.log('🤖 Analyzing user data for 2-axis personality classification...');

    // Step 1: Calculate dimension scores
    const dimensions = this.calculateDimensions(userData);

    // Step 1a: Calculate taste spectrums
    const { final: tasteSpectrums, keywordOnly: keywordSpectrums, episodeLabelCounts } = this.calculateTasteSpectrums(userData);
    dimensions.tasteSpectrums = tasteSpectrums;

    // Step 1b: Detect strengths
    const strengths = this.detectStrengths(userData);

    // Step 1.5: Apply dimension nudges from USER.md (if present)
    if (nudges) {
      dimensions.conviction = Math.min(Math.max(dimensions.conviction + nudges.conviction, 0), 100);
      dimensions.intuition = Math.min(Math.max(dimensions.intuition + nudges.intuition, 0), 100);
      dimensions.contribution = Math.min(Math.max(dimensions.contribution + nudges.contribution, 0), 100);

      // Apply taste spectrum nudges if present
      if (nudges.learning !== undefined) {
        dimensions.tasteSpectrums.learning = Math.min(Math.max(dimensions.tasteSpectrums.learning + nudges.learning, 0), 100);
      }
      if (nudges.decision !== undefined) {
        dimensions.tasteSpectrums.decision = Math.min(Math.max(dimensions.tasteSpectrums.decision + nudges.decision, 0), 100);
      }
      if (nudges.novelty !== undefined) {
        dimensions.tasteSpectrums.novelty = Math.min(Math.max(dimensions.tasteSpectrums.novelty + nudges.novelty, 0), 100);
      }
      if (nudges.risk !== undefined) {
        dimensions.tasteSpectrums.risk = Math.min(Math.max(dimensions.tasteSpectrums.risk + nudges.risk, 0), 100);
      }

      console.log(`📊 Nudges applied: conviction ${nudges.conviction >= 0 ? '+' : ''}${nudges.conviction}, intuition ${nudges.intuition >= 0 ? '+' : ''}${nudges.intuition}, contribution ${nudges.contribution >= 0 ? '+' : ''}${nudges.contribution}`);
    }
    console.log(`📊 Dimensions: Conviction=${dimensions.conviction}, Intuition=${dimensions.intuition}, Contribution=${dimensions.contribution}`);
    console.log(`📊 Taste Spectrums: Learning=${tasteSpectrums.learning}, Decision=${tasteSpectrums.decision}, Novelty=${tasteSpectrums.novelty}, Risk=${tasteSpectrums.risk}`);
    if (strengths.length > 0) {
      console.log(`💪 Detected strengths: ${strengths.join(', ')}`);
    }

    // Step 2: Classify personality type (contribution override logic)
    const personalityType = this.classifyPersonality(dimensions);
    console.log(`✨ Personality Type: ${personalityType}`);

    // Step 3: Detect categories for tagline
    const detectedCategories = this.detectCategories(userData);
    const topCategory = detectedCategories[0] || 'Tech';

    // Step 4: Generate dynamic tagline
    const tagline = TAGLINE_TEMPLATES[personalityType](topCategory);

    // Step 5: Generate personalized description (dynamically composed from spectrums)
    const description = this.composeTasteDescription(personalityType, detectedCategories, dimensions);

    // Step 6: Extract detailed interests
    const detectedInterests = this.extractInterests(userData);

    // Step 7: Calculate confidence (based on data sources)
    const confidence = this.calculateConfidence(userData);

    // Step 8: Detect hidden pattern insight (skip if low confidence)
    let hiddenInsight: HiddenPatternInsight | undefined;
    if (confidence >= 30) {
      hiddenInsight = this.detectHiddenInsight(
        dimensions,
        personalityType,
        strengths,
        keywordSpectrums,
        tasteSpectrums,
        episodeLabelCounts,
      );
      if (hiddenInsight) {
        console.log(`🔍 Hidden insight: [${hiddenInsight.patternType}] ${hiddenInsight.brief}`);
      }
    }

    // Step 9: Generate AI-era playbook
    const aiPlaybook = this.generateAiPlaybook(personalityType, tasteSpectrums, strengths);

    return {
      personalityType,
      tagline,
      description,
      detectedInterests,
      detectedCategories,
      dimensions,
      strengths: strengths.length > 0 ? strengths : undefined,
      hiddenInsight,
      aiPlaybook,
      confidence,
    };
  }

  /**
   * Calculate all three dimension scores (0-100 each)
   */
  private calculateDimensions(userData: UserData): DimensionScores {
    const conviction = this.calculateConviction(userData);
    const intuition = this.calculateIntuition(userData);
    const contribution = this.calculateContribution(userData);

    return {
      conviction: Math.min(Math.max(Math.round(conviction), 0), 100),
      intuition: Math.min(Math.max(Math.round(intuition), 0), 100),
      contribution: Math.min(Math.max(Math.round(contribution), 0), 100),
    };
  }

  /**
   * Calculate Conviction (0-100)
   * High = Few deep commitments, focused topics, repeated themes
   * Low = Diverse interests, many topics, always exploring
   */
  private calculateConviction(userData: UserData): number {
    let score = 50; // Start at midpoint

    // Factor 0: Conversation topic focus (primary signal for conversation-only)
    if (userData.conversationMemory) {
      const topicCount = userData.conversationMemory.topics.length;

      // Fewer topics = more focused = higher conviction
      if (topicCount <= 1) score += 15;
      else if (topicCount <= 2) score += 5;
      else if (topicCount <= 3) score += 0;
      else if (topicCount >= 6) score -= 10;
      else if (topicCount >= 8) score -= 20;

      // Topic dominance: use all available text (history + topics + interests)
      const history = this.extractAllText(userData).toLowerCase();
      const topicMentions = userData.conversationMemory.topics.map(topic => {
        // Count how many times each topic's keywords appear in history
        const topicWord = topic.toLowerCase().split(' ')[0];
        const regex = new RegExp(topicWord, 'g');
        return { topic, count: (history.match(regex) || []).length };
      });
      topicMentions.sort((a, b) => b.count - a.count);

      if (topicMentions.length >= 2) {
        const topCount = topicMentions[0].count;
        const secondCount = topicMentions[1].count;
        // Dominant topic = focused person = high conviction
        if (topCount >= 3 * secondCount && topCount >= 3) score += 20;
        else if (topCount >= 2 * secondCount && topCount >= 2) score += 10;
        // Even spread across many topics = explorer = low conviction
        else if (topCount <= secondCount + 1) score -= 10;
      }

      // Many topics + even spread = strong explorer signal
      if (topicCount >= 4 && topicMentions.length >= 2) {
        const topCount = topicMentions[0].count;
        const bottomCount = topicMentions[topicMentions.length - 1].count;
        // If top and bottom topics have similar mentions, very even = explorer
        if (topCount <= bottomCount * 2) score -= 10;
      }

      // Explorer language detection: curiosity/exploration words lower conviction
      // These signal someone who explores broadly rather than commits deeply
      const explorerKeywords = [
        'curious', 'explore', 'exploring', 'explorer', 'discovery', 'discover',
        'experiment', 'experimenting', 'variety', 'diverse', 'try new',
        'always looking', 'different', 'comparing', 'new things', 'so many things',
        'rabbit hole', 'stumble upon',
      ];
      const convictionKeywords = [
        'committed', 'dedicated', 'focused', 'deep dive', 'specialize',
        'expert', 'obsessed', 'passionate about', 'all in', 'doubled down',
      ];
      const explorerHits = explorerKeywords.filter(kw => history.includes(kw)).length;
      const convictionHits = convictionKeywords.filter(kw => history.includes(kw)).length;
      const explorerNet = explorerHits - convictionHits;
      if (explorerNet >= 4) score -= 25;
      else if (explorerNet >= 2) score -= 15;
      else if (explorerNet >= 1) score -= 5;
      else if (explorerNet <= -2) score += 10;
    }

    if (userData.wallet) {
      const { transactions = [], contracts = [], tokens = [] } = userData.wallet;

      // Portfolio concentration (fewer contracts = higher conviction)
      const uniqueContracts = new Set(contracts).size;
      if (uniqueContracts > 0) {
        if (uniqueContracts <= 5) score += 20;
        else if (uniqueContracts <= 10) score += 10;
        else if (uniqueContracts > 30) score -= 20;
      }

      // Repeat interactions
      const contractCounts = contracts.reduce((acc, addr) => {
        acc[addr] = (acc[addr] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const avgInteractionsPerContract = Object.values(contractCounts).reduce((a, b) => a + b, 0) / uniqueContracts;
      if (avgInteractionsPerContract > 5) score += 15;
      else if (avgInteractionsPerContract > 2) score += 5;
      else if (avgInteractionsPerContract < 1.5) score -= 10;

      // Token holding
      const uniqueTokens = new Set(tokens.map((t: any) => t.symbol)).size;
      if (uniqueTokens > 20) score -= 15;
      else if (uniqueTokens < 5) score += 10;
    }

    // Social signals
    if (userData.twitter) {
      const followingCount = userData.twitter.following.length;
      if (followingCount < 100) score += 5;
      else if (followingCount > 500) score -= 5;
    }

    return score;
  }

  /**
   * Calculate Intuition (0-100)
   * High = Vision-driven, backs pre-launch, trend-spotter
   * Low = Data-driven, waits for metrics, mature protocols
   */
  private calculateIntuition(userData: UserData): number {
    let score = 50; // Start at midpoint

    const allText = this.extractAllText(userData).toLowerCase();

    // Factor 1: Vision/narrative language vs data/metrics language
    const visionKeywords = ['vision', 'future', 'believe', 'potential', 'revolutionary', 'paradigm', 'early', 'first'];
    const analysisKeywords = ['data', 'metrics', 'roi', 'tvl', 'apy', 'analysis', 'performance', 'track record'];

    const visionScore = visionKeywords.filter(k => allText.includes(k)).length;
    const analysisScore = analysisKeywords.filter(k => allText.includes(k)).length;

    score += (visionScore - analysisScore) * 5;

    // Factor 2: Wallet activity - pre-launch vs established protocols
    if (userData.wallet) {
      const { transactions = [] } = userData.wallet;

      // Pre-launch signals: interacting with new contracts (deployed < 30 days ago)
      // Established signals: using high-TVL mature protocols
      // Note: In production, this would call blockchain APIs to check contract age and TVL
      // For hackathon, we'll use heuristics

      const establishedProtocols = ['uniswap', 'aave', 'compound', 'curve', 'maker'];
      const establishedTxCount = transactions.filter((tx: any) =>
        establishedProtocols.some(p => tx.to?.toLowerCase().includes(p))
      ).length;

      if (establishedTxCount > 10) score -= 10; // Prefers mature protocols
      else if (establishedTxCount < 3) score += 10; // Avoids established

      // High transaction count = willing to experiment early
      if (transactions.length > 100) score += 5;
    }

    // Factor 3: Social behavior - talks about trends vs analysis
    if (userData.twitter) {
      const tweets = userData.twitter.tweets || [];
      const trendKeywords = ['trend', 'new', 'launch', 'alpha', 'early'];
      const trendMentions = tweets.filter((t: any) =>
        trendKeywords.some(k => t.text?.toLowerCase().includes(k))
      ).length;

      score += trendMentions * 2;
    }

    return score;
  }

  /**
   * Calculate Contribution (0-100)
   * >65 = The Cultivator (override personality classification)
   * Detects: content creation, feedback, referrals, governance
   */
  private calculateContribution(userData: UserData): number {
    let score = 0;

    const allText = this.extractAllText(userData).toLowerCase();

    // Factor 1: Content creation
    const contentKeywords = ['wrote', 'published', 'created', 'shared', 'tutorial', 'guide', 'review'];
    score += contentKeywords.filter(k => allText.includes(k)).length * 5;

    // Factor 2: Community engagement
    const engagementKeywords = ['feedback', 'suggestion', 'improvement', 'helped', 'support', 'community'];
    score += engagementKeywords.filter(k => allText.includes(k)).length * 5;

    // Factor 3: Referrals and evangelism
    const referralKeywords = ['recommend', 'check out', 'try this', 'using', 'love this'];
    score += referralKeywords.filter(k => allText.includes(k)).length * 3;

    // Factor 4: Governance participation
    if (userData.wallet) {
      const { transactions = [] } = userData.wallet;
      const governanceTxs = transactions.filter((tx: any) =>
        tx.method?.includes('vote') || tx.method?.includes('propose')
      ).length;
      score += governanceTxs * 10;
    }

    // Factor 5: Twitter/Farcaster engagement volume
    if (userData.twitter) {
      const tweets = userData.twitter.tweets || [];
      if (tweets.length > 100) score += 10;
      else if (tweets.length > 50) score += 5;
    }

    if (userData.farcaster) {
      const casts = userData.farcaster.casts || [];
      if (casts.length > 100) score += 10;
      else if (casts.length > 50) score += 5;
    }

    return Math.min(score, 100);
  }

  /**
   * Classify personality based on 2x2 quadrant + contribution override
   */
  private classifyPersonality(dimensions: DimensionScores): PersonalityType {
    const { conviction, intuition, contribution } = dimensions;

    // Override: If contribution > 55, user is The Cultivator
    if (contribution > 55) {
      return PersonalityType.THE_CULTIVATOR;
    }

    // 2x2 Quadrant Classification:
    // Conviction ≥ 50 AND Intuition ≥ 50 → The Visionary 💜
    // Conviction < 50 AND Intuition ≥ 50 → The Explorer 💚
    // Conviction ≥ 50 AND Intuition < 50 → The Optimizer 🧡
    // Conviction < 50 AND Intuition < 50 → The Innovator 💙

    if (conviction >= 50 && intuition >= 50) {
      return PersonalityType.THE_VISIONARY;
    } else if (conviction < 50 && intuition >= 50) {
      return PersonalityType.THE_EXPLORER;
    } else if (conviction >= 50 && intuition < 50) {
      return PersonalityType.THE_OPTIMIZER;
    } else {
      return PersonalityType.THE_INNOVATOR;
    }
  }

  /**
   * Detect top categories from user data
   *
   * Uses frequency-weighted scoring: counts total keyword hits per category.
   * A category must reach MIN_CATEGORY_SCORE to qualify — a single passing
   * mention of "blockchain" won't label someone as a Crypto person.
   */
  private detectCategories(userData: UserData): string[] {
    const allText = this.extractAllText(userData).toLowerCase();
    const categoryScores: Record<string, number> = {};

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      let score = 0;
      for (const keyword of keywords) {
        // Use word boundary for short keywords to avoid false matches
        const pattern = keyword.length <= 3 ? `\\b${keyword}\\b` : keyword;
        const regex = new RegExp(pattern, 'gi');
        const matches = allText.match(regex);
        if (matches) {
          score += matches.length;
        }
      }
      categoryScores[category] = score;
    }

    // Filter by minimum score, then sort by score descending
    const qualified = Object.entries(categoryScores)
      .filter(([, score]) => score >= MIN_CATEGORY_SCORE)
      .sort(([, a], [, b]) => b - a)
      .map(([category]) => category);

    // Always return at least 1 category (fallback to highest scoring)
    if (qualified.length === 0) {
      const fallback = Object.entries(categoryScores)
        .sort(([, a], [, b]) => b - a)
        .map(([category]) => category);
      return fallback.slice(0, 1);
    }

    return qualified.slice(0, 3);
  }

  /**
   * Extract episodic memory signals from user text.
   *
   * Looks for narrative sentences ("I switched from X to Y", "we built X together")
   * that reveal decisions, pivots, and experiences — much stronger signals than
   * individual keyword hits.
   *
   * Returns aggregated spectrum adjustments from all matched episodes.
   */
  private extractEpisodes(allText: string): { learning: number; decision: number; novelty: number; risk: number; count: number; labelCounts: Record<string, number> } {
    const totals = { learning: 0, decision: 0, novelty: 0, risk: 0, count: 0 };
    const labelCounts: Record<string, number> = {};

    for (const ep of EPISODE_PATTERNS) {
      // Use global regex to count multiple matches
      const globalPattern = new RegExp(ep.pattern.source, ep.pattern.flags.includes('g') ? ep.pattern.flags : ep.pattern.flags + 'g');
      const matches = allText.match(globalPattern);
      if (matches) {
        const hitCount = matches.length;
        totals.count += hitCount;
        labelCounts[ep.label] = (labelCounts[ep.label] || 0) + hitCount;
        if (ep.signals.learning !== undefined) totals.learning += ep.signals.learning * hitCount;
        if (ep.signals.decision !== undefined) totals.decision += ep.signals.decision * hitCount;
        if (ep.signals.novelty !== undefined) totals.novelty += ep.signals.novelty * hitCount;
        if (ep.signals.risk !== undefined) totals.risk += ep.signals.risk * hitCount;
      }
    }

    return { ...totals, labelCounts };
  }

  /**
   * Calculate taste spectrum scores (0-100 each)
   *
   * Two signal layers:
   *   1. Keywords (shallow): vocabulary matching, ±5 per net keyword hit
   *   2. Episodes (deep):    narrative pattern matching, ±8 per weighted episode
   *
   * Episodes carry more weight because they represent actual behaviors/decisions,
   * not just vocabulary preferences.
   */
  private calculateTasteSpectrums(userData: UserData): { final: TasteSpectrums; keywordOnly: TasteSpectrums; episodeLabelCounts: Record<string, number> } {
    const allText = this.extractAllText(userData).toLowerCase();

    // Layer 1: Keyword scoring (±5 per net hit)
    const tryHits = LEARNING_TRY_FIRST_KEYWORDS.filter(k => allText.includes(k)).length;
    const studyHits = LEARNING_STUDY_FIRST_KEYWORDS.filter(k => allText.includes(k)).length;
    const gutHits = DECISION_GUT_KEYWORDS.filter(k => allText.includes(k)).length;
    const deliberateHits = DECISION_DELIBERATE_KEYWORDS.filter(k => allText.includes(k)).length;
    const earlyHits = NOVELTY_EARLY_KEYWORDS.filter(k => allText.includes(k)).length;
    const waitHits = NOVELTY_WAIT_KEYWORDS.filter(k => allText.includes(k)).length;
    const boldHits = RISK_BOLD_KEYWORDS.filter(k => allText.includes(k)).length;
    const cautiousHits = RISK_CAUTIOUS_KEYWORDS.filter(k => allText.includes(k)).length;

    let learning = 50 + (studyHits - tryHits) * 5;
    let decision = 50 + (deliberateHits - gutHits) * 5;
    let novelty = 50 + (waitHits - earlyHits) * 5;
    let risk = 50 + (cautiousHits - boldHits) * 5;

    const clamp = (v: number) => Math.min(Math.max(Math.round(v), 0), 100);

    // Save keyword-only values before episode adjustment
    const keywordOnly: TasteSpectrums = {
      learning: clamp(learning),
      decision: clamp(decision),
      novelty: clamp(novelty),
      risk: clamp(risk),
    };

    // Layer 2: Episodic memory scoring (±8 per weighted signal)
    const episodes = this.extractEpisodes(allText);
    if (episodes.count > 0) {
      const EPISODE_WEIGHT = 8;
      learning += episodes.learning * EPISODE_WEIGHT;
      decision += episodes.decision * EPISODE_WEIGHT;
      novelty += episodes.novelty * EPISODE_WEIGHT;
      risk += episodes.risk * EPISODE_WEIGHT;
      console.log(`🧠 Episodic signals: ${episodes.count} episodes found (L:${episodes.learning.toFixed(1)} D:${episodes.decision.toFixed(1)} N:${episodes.novelty.toFixed(1)} R:${episodes.risk.toFixed(1)})`);
    }

    const final: TasteSpectrums = { learning: clamp(learning), decision: clamp(decision), novelty: clamp(novelty), risk: clamp(risk) };
    return { final, keywordOnly, episodeLabelCounts: episodes.labelCounts };
  }

  /**
   * Detect user strengths from text patterns
   * Looks for "I built/created/wrote/taught" + topic patterns
   */
  private detectStrengths(userData: UserData): string[] {
    const allText = this.extractAllText(userData);
    const found = new Set<string>();

    for (const { pattern, label } of STRENGTH_PATTERNS) {
      if (pattern.test(allText)) {
        found.add(label);
      }
    }

    // Return top 5 strength labels
    return Array.from(found).slice(0, 5);
  }

  /**
   * Compose dynamic description from personality type + spectrum positions + categories
   * Each sentence maps to a different aspect, making every card unique.
   */
  private composeTasteDescription(
    type: PersonalityType,
    categories: string[],
    dimensions: DimensionScores,
  ): string {
    const spectrums = dimensions.tasteSpectrums || { learning: 50, decision: 50, novelty: 50, risk: 50 };
    const topCategory = categories[0] || 'Tech';

    // Sentence 1: Personality type opener
    const typeOpeners: Record<string, string> = {
      [PersonalityType.THE_VISIONARY]: `You back bold ideas before they're obvious, especially in ${topCategory}.`,
      [PersonalityType.THE_EXPLORER]: `Every project is a new adventure — your diverse interests across ${categories.slice(0, 2).join(' and ')} fuel your journey.`,
      [PersonalityType.THE_CULTIVATOR]: `You don't just support projects — you help them grow through feedback and community building.`,
      [PersonalityType.THE_OPTIMIZER]: `Always leveling up — you're driven to find the most efficient path in ${topCategory}.`,
      [PersonalityType.THE_INNOVATOR]: `First to back breakthrough technology, you spot the future before it arrives.`,
    };

    // Sentence 2: Learning + Decision combined
    let learningSentence: string;
    if (spectrums.learning > 65 && spectrums.decision > 65) {
      learningSentence = 'You study deeply and decide carefully — nothing escapes your analysis.';
    } else if (spectrums.learning < 35 && spectrums.decision < 35) {
      learningSentence = 'You trust your instincts and learn by doing — ship first, refine later.';
    } else if (spectrums.learning > 65) {
      learningSentence = 'You prefer understanding deeply before acting — research is your foundation.';
    } else if (spectrums.learning < 35) {
      learningSentence = 'You learn by doing — prototyping and shipping are how you understand the world.';
    } else if (spectrums.decision > 65) {
      learningSentence = 'You weigh every option before committing — deliberate and data-driven.';
    } else if (spectrums.decision < 35) {
      learningSentence = 'You go with your gut — fast instincts guide your decisions.';
    } else {
      learningSentence = 'You balance theory and practice, knowing when to study and when to ship.';
    }

    // Sentence 3: Novelty + Risk combined (AI-era angle only for extreme profiles)
    let closingSentence: string;
    if (spectrums.novelty < 35 && spectrums.risk < 35) {
      closingSentence = 'A fearless early adopter — you\'ll master new tools while others are still reading changelogs.';
    } else if (spectrums.novelty > 65 && spectrums.risk > 65) {
      closingSentence = 'Patient and prudent, you adopt the right tools after the hype fades — avoiding costly missteps.';
    } else if (spectrums.novelty < 35 && spectrums.risk > 65) {
      closingSentence = 'You spot new tools early but vet them carefully — that filter is exactly what teams need.';
    } else if (spectrums.novelty > 65 && spectrums.risk < 35) {
      closingSentence = 'You prefer proven tools but bet big when it counts — when you finally move, you move with full conviction.';
    } else if (spectrums.novelty < 35) {
      closingSentence = 'An early adopter at heart — you find the best tools before they go mainstream.';
    } else if (spectrums.novelty > 65) {
      closingSentence = 'You let others beta-test the hype, then commit to what actually works.';
    } else if (spectrums.risk < 35) {
      closingSentence = 'Bold by nature — you take the leaps that others overthink.';
    } else if (spectrums.risk > 65) {
      closingSentence = 'Careful and steady — your approach protects you from hype cycles and keeps you on solid ground.';
    } else {
      closingSentence = 'Versatile and adaptive, you know when to experiment and when to wait.';
    }

    return `${typeOpeners[type] || typeOpeners[PersonalityType.THE_INNOVATOR]} ${learningSentence} ${closingSentence}`;
  }

  /**
   * Detect the most interesting hidden pattern from computed analysis data.
   *
   * Priority order (most memorable first, catch-alls last):
   *   1. Layer Mismatch    — self-image vs behavior conflict (rare, high impact)
   *   2. Spectrum Extreme   — any spectrum < 15 or > 85 (dramatic, memorable)
   *   3. Episode Dominance  — one behavioral pattern dominates (story-driven)
   *   4. Stealth Contributor — high contribution without Cultivator label
   *   5. Strength Synergy   — known powerful strength combos
   *   6. Boundary Dweller   — conviction/intuition within ±4 of threshold (catch-all)
   */
  private detectHiddenInsight(
    dimensions: DimensionScores,
    personalityType: PersonalityType,
    strengths: string[],
    keywordSpectrums: TasteSpectrums,
    finalSpectrums: TasteSpectrums,
    episodeLabelCounts: Record<string, number>,
  ): HiddenPatternInsight | undefined {
    const spectrumKeys = ['learning', 'decision', 'novelty', 'risk'] as const;
    const spectrumLabels: Record<string, [string, string]> = {
      learning: ['hands-on learner', 'methodical researcher'],
      decision: ['gut-instinct decider', 'deliberate analyst'],
      novelty: ['early adopter', 'wait-and-see observer'],
      risk: ['bold risk-taker', 'cautious planner'],
    };

    // 1. Layer Mismatch — keyword vs episode spectrums disagree by >15 points
    for (const key of spectrumKeys) {
      const diff = Math.abs(keywordSpectrums[key] - finalSpectrums[key]);
      if (diff > 15) {
        const kwLabel = keywordSpectrums[key] > 50 ? spectrumLabels[key][1] : spectrumLabels[key][0];
        const epLabel = finalSpectrums[key] > 50 ? spectrumLabels[key][1] : spectrumLabels[key][0];
        if (kwLabel !== epLabel) {
          return {
            brief: `You describe yourself as a ${kwLabel}, but your actions say ${epLabel}`,
            narrative: `Your vocabulary leans ${kwLabel}, but when we look at your actual decisions and experiences, the pattern flips — you consistently act like a ${epLabel}. This gap between self-image and behavior is rare and often signals someone in an exciting transition phase.`,
            patternType: 'layer-mismatch',
          };
        }
      }
    }

    // 2. Spectrum Extreme — any spectrum < 15 or > 85
    for (const key of spectrumKeys) {
      const val = finalSpectrums[key];
      if (val < 15 || val > 85) {
        const label = val < 15 ? spectrumLabels[key][0] : spectrumLabels[key][1];
        return {
          brief: `Your ${key} style is off the charts — pure ${label}`,
          narrative: `With a ${key} score of ${val}/100, you're in the extreme end of the spectrum. While most people cluster around the middle, you've committed fully to the ${label} approach. This clarity of style is a strength — you know exactly how you operate.`,
          patternType: 'spectrum-extreme',
        };
      }
    }

    // 3. Episode Dominance — one episode label dominates (>= 3 occurrences and > 50% of total)
    const totalEpisodes = Object.values(episodeLabelCounts).reduce((a, b) => a + b, 0);
    if (totalEpisodes >= 3) {
      const sorted = Object.entries(episodeLabelCounts).sort(([, a], [, b]) => b - a);
      const [topLabel, topCount] = sorted[0];
      if (topCount >= 3 && topCount / totalEpisodes > 0.5) {
        const episodeDescriptions: Record<string, string> = {
          pivot: "You've pivoted multiple times recently — you chase change and aren't afraid to restart",
          shipped: 'You keep shipping — completion is your default mode',
          bold: 'You repeatedly take bold leaps — calculated risk is your comfort zone',
          study: 'You invest deeply in understanding before acting — knowledge is your foundation',
          'hands-on': "You learn by doing, again and again — theory can't keep up with your prototyping",
          'early-adopter': "You're always first in line — your curiosity outpaces caution",
          decision: 'You make deliberate choices — every move is considered',
          cautious: 'You play the long game — patience and protection are your strategy',
        };
        const desc = episodeDescriptions[topLabel] || `Your "${topLabel}" pattern dominates your story`;
        return {
          brief: desc,
          narrative: `Out of ${totalEpisodes} behavioral episodes we detected, ${topCount} follow the "${topLabel}" pattern. This isn't random — it's a core part of how you operate. Most people show a mix of patterns, but your consistency here reveals a deep-seated approach to challenges.`,
          patternType: 'episode-dominance',
        };
      }
    }

    // 4. Stealth Contributor — contribution > 40 but NOT classified as Cultivator
    if (dimensions.contribution > 40 && personalityType !== PersonalityType.THE_CULTIVATOR) {
      return {
        brief: "You're a stealth community builder — contributing more than you realize",
        narrative: `Your contribution score (${dimensions.contribution}/100) is surprisingly high for ${personalityType.replace(/^The /, 'a ')}. You're quietly building community value through content, feedback, and engagement — even though it's not your primary identity. Many teams would love to have this kind of organic contributor.`,
        patternType: 'stealth-contributor',
      };
    }

    // 5. Strength Synergy — known powerful combos
    const synergies: [string, string, string][] = [
      ['Builder', 'Designer', 'Builder + Designer is rare — you can envision AND ship'],
      ['Analyst', 'Writer', 'Analyst + Writer means you can decode complexity and explain it clearly'],
      ['Founder', 'Community Builder', 'Founder + Community Builder — you build products AND the people around them'],
      ['Builder', 'Teacher', 'Builder + Teacher — you create things and help others learn to do the same'],
      ['Optimizer', 'Founder', 'Optimizer + Founder — you build lean and iterate fast'],
      ['Designer', 'Writer', 'Designer + Writer — you craft experiences in both visual and verbal form'],
    ];
    if (strengths.length >= 2) {
      for (const [a, b, brief] of synergies) {
        if (strengths.includes(a) && strengths.includes(b)) {
          return {
            brief,
            narrative: `Having both ${a} and ${b} strengths is an uncommon combination. Most people excel at one or the other — you bridge both worlds, which means you can take a project from concept to completion in ways others can't.`,
            patternType: 'strength-synergy',
          };
        }
      }
    }

    // 6. Boundary Dweller — conviction or intuition within ±4 of the 50 threshold (tight catch-all)
    const boundaryChecks = [
      { name: 'conviction', value: dimensions.conviction, low: 'Explorer', high: 'Visionary' },
      { name: 'intuition', value: dimensions.intuition, low: 'Optimizer', high: 'Visionary' },
    ];
    for (const check of boundaryChecks) {
      const distFromThreshold = Math.abs(check.value - 50);
      if (distFromThreshold <= 4 && distFromThreshold > 0) {
        const side = check.value >= 50 ? check.high : check.low;
        return {
          brief: `You're ${distFromThreshold} points from ${side} territory — that duality is a superpower`,
          narrative: `Your ${check.name} score sits right at the boundary (${check.value}/100). Most people land firmly on one side, but you operate in the liminal zone — able to flex between both modes. This adaptability is rare and valuable.`,
          patternType: 'boundary-dweller',
        };
      }
    }

    return undefined;
  }

  /**
   * Generate AI-era playbook based on personality profile.
   * Returns leverage / watchOut / nextMove for the dashboard.
   */
  private generateAiPlaybook(
    personalityType: PersonalityType,
    spectrums: TasteSpectrums,
    strengths: string[],
  ): AiPlaybook {
    // Leverage: based on learning style + strengths
    let leverage: string;
    const topStrength = strengths[0];
    if (spectrums.learning < 35) {
      leverage = topStrength
        ? `Your try-first learning style combined with your ${topStrength} strength means you can prototype with AI tools faster than most — use that speed to test ideas others are still planning.`
        : 'Your try-first learning style means you\'ll adapt to AI tools faster than most — start using them as prototyping partners before waiting for the perfect workflow.';
    } else if (spectrums.learning > 65) {
      leverage = topStrength
        ? `Your deep-research approach as a ${topStrength} means you\'ll understand AI capabilities at a level others won\'t — you\'ll know exactly when to trust AI output and when to override it.`
        : 'Your research-first approach means you\'ll understand AI capabilities at a level others won\'t — you\'ll know the limits before you hit them.';
    } else {
      leverage = topStrength
        ? `Your balanced learning style as a ${topStrength} lets you both experiment with AI tools quickly and understand them deeply — that\'s a rare combination.`
        : 'Your balanced learning style lets you both experiment quickly and understand deeply — you can pick up AI tools fast without falling for hype.';
    }

    // Watch out: based on decision style
    let watchOut: string;
    if (spectrums.decision < 35) {
      watchOut = 'As a gut decider, you might skip evaluating AI output quality. Build a quick review habit — AI is confident even when wrong.';
    } else if (spectrums.decision > 65) {
      watchOut = 'Your deliberate decision-making is a strength, but AI moves fast. Don\'t over-analyze every tool — sometimes a 10-minute test beats an hour of research.';
    } else {
      watchOut = 'You naturally switch between gut calls and careful analysis. With AI, be intentional about which mode you\'re in — quick experiments need less review, high-stakes outputs need more.';
    }

    // Next move: personality type sets the base, spectrums differentiate
    let nextMove: string;

    // Cross personality type × learning style × risk style for unique combos
    if (spectrums.learning < 35 && spectrums.risk < 35) {
      // Try-first + bold → speed runner
      nextMove = topStrength
        ? `Pick an AI tool, skip the tutorial, and build something with your ${topStrength} skills today. Your instinct-first + bold combo means you learn fastest by shipping.`
        : 'Pick an AI tool, skip the tutorial, and build something today. You learn fastest by shipping — let your instinct lead.';
    } else if (spectrums.learning > 65 && spectrums.risk > 65) {
      // Study-first + cautious → strategic evaluator
      nextMove = 'Read 3 comparison reviews of AI tools in your field, then pick the most proven one for a low-stakes task. Your methodical approach will pay off — you\'ll avoid the tools that flame out in 6 months.';
    } else if (spectrums.learning < 35 && spectrums.risk > 65) {
      // Try-first + cautious → careful experimenter
      nextMove = 'Spin up a sandbox project with an AI tool — no production stakes. Your hands-on instinct wants to try, your caution wants safety. A sandbox gives you both.';
    } else if (spectrums.learning > 65 && spectrums.risk < 35) {
      // Study-first + bold → informed risk-taker
      nextMove = 'Deep-dive into one AI tool\'s documentation, then go all-in on a real project. You\'ll understand it better than anyone, and your boldness means you\'ll actually ship with it.';
    } else {
      // Balanced — fall back to personality type
      const typeNextMoves: Record<string, string> = {
        [PersonalityType.THE_VISIONARY]: 'Pick one AI tool in your focus area and go deep for a week. Your conviction means you\'ll find uses others miss.',
        [PersonalityType.THE_EXPLORER]: 'Try a different AI tool for each of your interest areas this week. Cross-pollinate what you learn — your breadth is the edge.',
        [PersonalityType.THE_CULTIVATOR]: 'Test 2 AI tools, then write a honest comparison for your community. You\'re a natural filter — help others skip the hype.',
        [PersonalityType.THE_OPTIMIZER]: 'Map your current workflow, find the one bottleneck AI could 10x, and set up that integration. Efficiency is your game.',
        [PersonalityType.THE_INNOVATOR]: 'Find the newest AI tool in your space and stress-test it before anyone writes about it. Your pattern-spotting will see what others miss.',
      };
      nextMove = typeNextMoves[personalityType] || typeNextMoves[PersonalityType.THE_INNOVATOR];
    }

    // Novelty-based modifier (early adopter vs wait-and-see)
    if (spectrums.novelty < 20) {
      nextMove += ' You\'re wired to move first — trust that instinct, the early-mover advantage in AI is real.';
    } else if (spectrums.novelty > 80) {
      nextMove += ' No rush — the AI tools that survive the next 6 months are the ones worth your time.';
    }

    return { leverage, watchOut, nextMove };
  }

  /**
   * Extract all text from user data
   */
  private extractAllText(userData: UserData): string {
    const textParts: string[] = [];

    if (userData.twitter) {
      textParts.push(userData.twitter.bio);
      textParts.push(...userData.twitter.tweets.map(t => t.text || ''));
      textParts.push(...userData.twitter.following);
    }

    if (userData.farcaster) {
      textParts.push(userData.farcaster.bio);
      textParts.push(...userData.farcaster.casts.map(c => c.text || ''));
      textParts.push(...userData.farcaster.channels);
    }

    if (userData.conversationMemory) {
      textParts.push(...userData.conversationMemory.topics);
      textParts.push(...userData.conversationMemory.interests);
      textParts.push(...userData.conversationMemory.preferences);
      textParts.push(...userData.conversationMemory.history);
    }

    // USER.md raw text — first-class signal source
    if (userData.userMdContent) {
      textParts.push(userData.userMdContent);
    }

    return textParts.join(' ');
  }

  /**
   * Extract specific interests
   */
  private extractInterests(userData: UserData): string[] {
    const interests = new Set<string>();
    const allText = this.extractAllText(userData).toLowerCase();

    const interestKeywords = [
      'AI Tools', 'Machine Learning', 'Crypto', 'DeFi', 'NFTs',
      'Education', 'Wellness', 'Fitness', 'Productivity', 'Meditation',
      'Web3', 'DAOs', 'Gaming', 'Art', 'Music', 'Writing',
      'Coding', 'Design', 'Marketing', 'Finance', 'Health',
    ];

    for (const keyword of interestKeywords) {
      if (allText.includes(keyword.toLowerCase())) {
        interests.add(keyword);
      }
    }

    return Array.from(interests).slice(0, 10);
  }

  /**
   * Calculate confidence based on data quality
   */
  private calculateConfidence(userData: UserData): number {
    let confidence = 30; // Base confidence

    if (userData.twitter && userData.twitter.tweets.length > 10) confidence += 20;
    if (userData.farcaster && userData.farcaster.casts.length > 10) confidence += 15;
    if (userData.wallet && userData.wallet.transactions.length > 20) confidence += 25;
    if (userData.conversationMemory && userData.conversationMemory.history.length > 5) confidence += 10;

    return Math.min(confidence, 100);
  }
}
