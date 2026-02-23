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
  LEARNING_TRY_FIRST_KEYWORDS,
  LEARNING_STUDY_FIRST_KEYWORDS,
  ENERGY_SOLO_KEYWORDS,
  ENERGY_SOCIAL_KEYWORDS,
  GROWTH_CURIOSITY_KEYWORDS,
  GROWTH_GOAL_KEYWORDS,
  STRENGTH_PATTERNS,
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
      energy?: number;
      growth?: number;
    },
  ): Promise<PersonalityAnalysis> {
    console.log('🤖 Analyzing user data for 2-axis personality classification...');

    // Step 1: Calculate dimension scores
    const dimensions = this.calculateDimensions(userData);

    // Step 1a: Calculate taste spectrums
    const tasteSpectrums = this.calculateTasteSpectrums(userData);
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
      if (nudges.energy !== undefined) {
        dimensions.tasteSpectrums.energy = Math.min(Math.max(dimensions.tasteSpectrums.energy + nudges.energy, 0), 100);
      }
      if (nudges.growth !== undefined) {
        dimensions.tasteSpectrums.growth = Math.min(Math.max(dimensions.tasteSpectrums.growth + nudges.growth, 0), 100);
      }

      console.log(`📊 Nudges applied: conviction ${nudges.conviction >= 0 ? '+' : ''}${nudges.conviction}, intuition ${nudges.intuition >= 0 ? '+' : ''}${nudges.intuition}, contribution ${nudges.contribution >= 0 ? '+' : ''}${nudges.contribution}`);
    }
    console.log(`📊 Dimensions: Conviction=${dimensions.conviction}, Intuition=${dimensions.intuition}, Contribution=${dimensions.contribution}`);
    console.log(`📊 Taste Spectrums: Learning=${tasteSpectrums.learning}, Energy=${tasteSpectrums.energy}, Growth=${tasteSpectrums.growth}`);
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

    return {
      personalityType,
      tagline,
      description,
      detectedInterests,
      detectedCategories,
      dimensions,
      strengths: strengths.length > 0 ? strengths : undefined,
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
   * Calculate taste spectrum scores (0-100 each)
   * Same keyword-counting pattern as calculateConviction()
   */
  private calculateTasteSpectrums(userData: UserData): TasteSpectrums {
    const allText = this.extractAllText(userData).toLowerCase();

    // Learning: try-first (0) <-> study-first (100)
    let learning = 50;
    const tryHits = LEARNING_TRY_FIRST_KEYWORDS.filter(k => allText.includes(k)).length;
    const studyHits = LEARNING_STUDY_FIRST_KEYWORDS.filter(k => allText.includes(k)).length;
    learning += (studyHits - tryHits) * 5;

    // Energy: solo (0) <-> social (100)
    let energy = 50;
    const soloHits = ENERGY_SOLO_KEYWORDS.filter(k => allText.includes(k)).length;
    const socialHits = ENERGY_SOCIAL_KEYWORDS.filter(k => allText.includes(k)).length;
    energy += (socialHits - soloHits) * 5;

    // Growth: curiosity-driven (0) <-> goal-driven (100)
    let growth = 50;
    const curiosityHits = GROWTH_CURIOSITY_KEYWORDS.filter(k => allText.includes(k)).length;
    const goalHits = GROWTH_GOAL_KEYWORDS.filter(k => allText.includes(k)).length;
    growth += (goalHits - curiosityHits) * 5;

    return {
      learning: Math.min(Math.max(Math.round(learning), 0), 100),
      energy: Math.min(Math.max(Math.round(energy), 0), 100),
      growth: Math.min(Math.max(Math.round(growth), 0), 100),
    };
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
    const spectrums = dimensions.tasteSpectrums || { learning: 50, energy: 50, growth: 50 };
    const topCategory = categories[0] || 'Tech';

    // Sentence 1: Personality type opener
    const typeOpeners: Record<string, string> = {
      [PersonalityType.THE_VISIONARY]: `You back bold ideas before they're obvious, especially in ${topCategory}.`,
      [PersonalityType.THE_EXPLORER]: `Every project is a new adventure — your diverse interests across ${categories.slice(0, 2).join(' and ')} fuel your journey.`,
      [PersonalityType.THE_CULTIVATOR]: `You don't just support projects — you help them grow through feedback and community building.`,
      [PersonalityType.THE_OPTIMIZER]: `Always leveling up — you're driven to find the most efficient path in ${topCategory}.`,
      [PersonalityType.THE_INNOVATOR]: `First to back breakthrough technology, you spot the future before it arrives.`,
    };

    // Sentence 2: Learning spectrum
    let learningSentence: string;
    if (spectrums.learning > 65) {
      learningSentence = 'You prefer understanding deeply before acting — research is your foundation.';
    } else if (spectrums.learning < 35) {
      learningSentence = 'You learn by doing — prototyping and shipping are how you understand the world.';
    } else {
      learningSentence = 'You balance theory and practice, knowing when to study and when to ship.';
    }

    // Sentence 3: Energy + Growth combined
    let closingSentence: string;
    if (spectrums.energy > 65 && spectrums.growth > 65) {
      closingSentence = 'A social achiever, you thrive in teams pursuing ambitious goals.';
    } else if (spectrums.energy > 65 && spectrums.growth < 35) {
      closingSentence = 'You draw energy from community and let curiosity guide where it leads.';
    } else if (spectrums.energy < 35 && spectrums.growth > 65) {
      closingSentence = 'A focused individual, you set clear targets and quietly deliver results.';
    } else if (spectrums.energy < 35 && spectrums.growth < 35) {
      closingSentence = 'Independent and curiosity-driven, you explore at your own pace.';
    } else if (spectrums.energy > 65) {
      closingSentence = 'Collaboration energizes you — the best ideas emerge from conversation.';
    } else if (spectrums.energy < 35) {
      closingSentence = 'You do your best work in focused, independent sessions.';
    } else if (spectrums.growth > 65) {
      closingSentence = 'Goal-oriented by nature, you measure progress in milestones shipped.';
    } else if (spectrums.growth < 35) {
      closingSentence = 'Curiosity is your compass — you follow what fascinates you.';
    } else {
      closingSentence = 'Versatile and adaptive, you shift between exploration and execution as the moment demands.';
    }

    return `${typeOpeners[type] || typeOpeners[PersonalityType.THE_INNOVATOR]} ${learningSentence} ${closingSentence}`;
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
