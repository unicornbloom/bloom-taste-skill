/**
 * Manual Q&A Fallback
 *
 * When user denies data access or insufficient data is available,
 * ask 3 simple questions to determine personality type
 */

import { PersonalityType } from '../bloom-identity-skill-v2';

export interface ManualAnswer {
  question: string;
  answer: string;
}

export interface ManualQAResult {
  personalityType: PersonalityType;
  tagline: string;
  description: string;
  mainCategories: string[];
  subCategories: string[];
  confidence: number;
}

/**
 * 3 simple questions to determine personality
 */
export const MANUAL_QUESTIONS = [
  {
    id: 'interests',
    question: 'What are you most excited about right now?',
    options: [
      { value: 'AI and new tech', personality: PersonalityType.THE_INNOVATOR, weight: 10 },
      { value: 'Crypto and Web3', personality: PersonalityType.THE_VISIONARY, weight: 10 },
      { value: 'Productivity tools', personality: PersonalityType.THE_OPTIMIZER, weight: 10 },
      { value: 'Learning new things', personality: PersonalityType.THE_EXPLORER, weight: 10 },
      { value: 'Health and wellness', personality: PersonalityType.THE_CULTIVATOR, weight: 10 },
    ],
  },
  {
    id: 'activities',
    question: 'How do you spend your free time online?',
    options: [
      { value: 'Trying new AI tools', personality: PersonalityType.THE_INNOVATOR, weight: 8 },
      { value: 'Following crypto projects', personality: PersonalityType.THE_VISIONARY, weight: 8 },
      { value: 'Optimizing my workflows', personality: PersonalityType.THE_OPTIMIZER, weight: 8 },
      { value: 'Taking online courses', personality: PersonalityType.THE_EXPLORER, weight: 8 },
      { value: 'Meditation apps', personality: PersonalityType.THE_CULTIVATOR, weight: 8 },
    ],
  },
  {
    id: 'projects',
    question: 'What type of early-stage projects interest you most?',
    options: [
      { value: 'Cutting-edge AI/ML', personality: PersonalityType.THE_INNOVATOR, weight: 6 },
      { value: 'DeFi and blockchain', personality: PersonalityType.THE_VISIONARY, weight: 6 },
      { value: 'Productivity and automation', personality: PersonalityType.THE_OPTIMIZER, weight: 6 },
      { value: 'Education and knowledge', personality: PersonalityType.THE_EXPLORER, weight: 6 },
      { value: 'Health and wellness tech', personality: PersonalityType.THE_CULTIVATOR, weight: 6 },
    ],
  },
];

export class ManualQAFallback {
  /**
   * Analyze answers to determine personality type
   */
  async analyze(answers: ManualAnswer[]): Promise<ManualQAResult> {
    console.log('🤔 Analyzing manual Q&A responses...');

    // Score each personality type
    const scores: Record<PersonalityType, number> = {
      [PersonalityType.THE_VISIONARY]: 0,
      [PersonalityType.THE_EXPLORER]: 0,
      [PersonalityType.THE_CULTIVATOR]: 0,
      [PersonalityType.THE_OPTIMIZER]: 0,
      [PersonalityType.THE_INNOVATOR]: 0,
    };

    // Calculate scores based on answers
    for (const answer of answers) {
      const question = MANUAL_QUESTIONS.find(q => q.question === answer.question);
      if (!question) continue;

      const option = question.options.find(opt => opt.value === answer.answer);
      if (!option) continue;

      scores[option.personality] += option.weight;
    }

    // Determine dominant personality
    let maxScore = -1;
    let dominantType = PersonalityType.THE_INNOVATOR; // Default

    for (const [type, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        dominantType = type as PersonalityType;
      }
    }

    // Generate result
    const result = this.generateResult(dominantType, answers);

    console.log(`✅ Determined personality: ${dominantType} (confidence: ${result.confidence}%)`);

    return result;
  }

  /**
   * Generate complete result based on personality type
   */
  private generateResult(
    personalityType: PersonalityType,
    answers: ManualAnswer[]
  ): ManualQAResult {
    const configs = {
      [PersonalityType.THE_VISIONARY]: {
        tagline: 'See beyond the hype',
        description: 'An early believer in paradigm-shifting technologies. Champions Web3 and decentralized innovation.',
        mainCategories: ['Crypto', 'DeFi', 'Web3', 'Blockchain'],
        subCategories: ['DeFi', 'DAOs', 'NFTs', 'Layer 2'],
      },
      [PersonalityType.THE_EXPLORER]: {
        tagline: 'Never stop discovering',
        description: 'A curious mind with insatiable appetite for learning. Supports projects that expand human knowledge.',
        mainCategories: ['Education', 'Learning', 'Knowledge', 'Research'],
        subCategories: ['Online Courses', 'EdTech', 'Books', 'Science'],
      },
      [PersonalityType.THE_CULTIVATOR]: {
        tagline: 'Growth starts within',
        description: 'A wellness advocate who believes in holistic growth. Champions mental, physical, and emotional health.',
        mainCategories: ['Wellness', 'Mental Health', 'Fitness', 'Mindfulness'],
        subCategories: ['Meditation', 'Yoga', 'Nutrition', 'Sleep'],
      },
      [PersonalityType.THE_OPTIMIZER]: {
        tagline: 'Always leveling up',
        description: 'An efficiency enthusiast who loves tools that maximize productivity. Always seeking to work smarter.',
        mainCategories: ['Productivity', 'Tools', 'Efficiency', 'Automation'],
        subCategories: ['Task Management', 'Note-taking', 'Workflow', 'Time Tracking'],
      },
      [PersonalityType.THE_INNOVATOR]: {
        tagline: 'First to back new tech',
        description: 'A technology pioneer who jumps on cutting-edge AI tools. Funds the next generation of breakthroughs.',
        mainCategories: ['AI Tools', 'Technology', 'Innovation', 'Machine Learning'],
        subCategories: ['AI Assistants', 'Content Creation', 'Code Tools', 'LLMs'],
      },
    };

    const config = configs[personalityType];

    return {
      personalityType,
      tagline: config.tagline,
      description: config.description,
      mainCategories: config.mainCategories,
      subCategories: config.subCategories,
      confidence: 60, // Manual Q&A has lower confidence than data analysis
    };
  }

  /**
   * Format questions for display to user
   */
  formatQuestionsForUser(): string {
    let message = '🤔 Let me ask you a few quick questions to understand your interests:\n\n';

    MANUAL_QUESTIONS.forEach((q, index) => {
      message += `**Question ${index + 1}**: ${q.question}\n`;
      q.options.forEach((opt, optIndex) => {
        message += `${optIndex + 1}. ${opt.value}\n`;
      });
      message += '\n';
    });

    return message;
  }

  /**
   * Parse user's text responses
   */
  parseTextResponses(responses: string[]): ManualAnswer[] {
    const answers: ManualAnswer[] = [];

    responses.forEach((response, index) => {
      if (index < MANUAL_QUESTIONS.length) {
        const question = MANUAL_QUESTIONS[index];

        // Try to match response to an option
        const matchedOption = question.options.find(opt =>
          response.toLowerCase().includes(opt.value.toLowerCase().slice(0, 5))
        );

        answers.push({
          question: question.question,
          answer: matchedOption?.value || response,
        });
      }
    });

    return answers;
  }
}
