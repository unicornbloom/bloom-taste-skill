/**
 * Skill Discovery Module
 *
 * Uses OpenClaw Memory Search to discover and recommend skills
 * based on user personality and conversation history.
 */

import { PersonalityType } from '../types/personality';
import { DimensionScores } from '../analyzers/personality-analyzer';

export interface SkillRecommendation {
  skillName: string;
  skillId: string;
  description: string;
  creator: string;
  creatorWallet?: string;
  categories: string[];
  matchScore: number;
  matchReasons: string[];
  estimatedTip: number; // Suggested tip amount in USD
}

export interface SkillDiscoveryOptions {
  limit?: number;
  minMatchScore?: number;
  budgetPerSkill?: { min: number; max: number };
}

/**
 * Personality keyword mapping for skill discovery
 * Maps each personality type to relevant keywords for Memory Search
 */
const PERSONALITY_KEYWORDS: Record<PersonalityType, string[]> = {
  [PersonalityType.THE_VISIONARY]: [
    'vision', 'future', 'paradigm', 'revolutionary', 'bold',
    'crypto', 'web3', 'defi', 'blockchain', 'dao',
    'early-stage', 'pre-launch', 'pioneering',
  ],
  [PersonalityType.THE_EXPLORER]: [
    'explore', 'discover', 'experiment', 'diverse', 'variety',
    'learning', 'education', 'curious', 'new', 'trending',
    'multi-domain', 'cross-category',
  ],
  [PersonalityType.THE_CULTIVATOR]: [
    'community', 'feedback', 'support', 'growth', 'nurture',
    'content', 'creator', 'collaboration', 'help', 'guide',
    'evangelism', 'referral', 'social',
  ],
  [PersonalityType.THE_OPTIMIZER]: [
    'efficiency', 'productivity', 'optimization', 'automation', 'workflow',
    'data', 'analytics', 'metrics', 'performance', 'improve',
    'systematic', 'refined',
  ],
  [PersonalityType.THE_INNOVATOR]: [
    'innovation', 'technology', 'ai', 'ml', 'technical',
    'engineering', 'architecture', 'algorithm', 'breakthrough',
    'cutting-edge', 'research', 'development',
  ],
};

export class SkillDiscovery {
  private openClawApiBase: string;
  private apiKey?: string;

  constructor(config?: { apiBase?: string; apiKey?: string }) {
    this.openClawApiBase = config?.apiBase || 'https://api.openclaw.ai';
    this.apiKey = config?.apiKey || process.env.OPENCLAW_API_KEY;
  }

  /**
   * Main method: Discover skills matching user personality AND interests
   */
  async discoverSkills(
    personalityType: PersonalityType,
    dimensions: DimensionScores,
    conversationMemory: string[],
    mainCategories: string[], // NEW: User's top 3 interest categories
    options: SkillDiscoveryOptions = {}
  ): Promise<SkillRecommendation[]> {
    const {
      limit = 10,
      minMatchScore = 60,
      budgetPerSkill = { min: 1, max: 3 },
    } = options;

    console.log(`🔍 Discovering skills for ${personalityType}...`);
    console.log(`📂 Focusing on categories: ${mainCategories.join(', ')}`);

    // Step 1: Build search query based on personality + categories
    const searchQuery = this.buildSearchQuery(
      personalityType,
      dimensions,
      conversationMemory,
      mainCategories // Pass categories to query builder
    );
    console.log(`📝 Search query: "${searchQuery}"`);

    // Step 2: Search OpenClaw Memory for relevant skills
    const skillCandidates = await this.searchOpenClawMemory(searchQuery, limit * 2);
    console.log(`📦 Found ${skillCandidates.length} candidate skills`);

    // Step 3: Score and rank skills by personality + category match
    const scoredSkills = this.scoreSkills(
      skillCandidates,
      personalityType,
      dimensions,
      conversationMemory,
      mainCategories // Pass categories to scoring
    );

    // Step 4: Filter by minimum match score and limit
    const topSkills = scoredSkills
      .filter(skill => skill.matchScore >= minMatchScore)
      .slice(0, limit);

    // Step 5: Add suggested tip amounts based on match quality
    const recommendations = topSkills.map(skill => ({
      ...skill,
      estimatedTip: this.calculateSuggestedTip(skill.matchScore, budgetPerSkill),
    }));

    console.log(`✅ Recommended ${recommendations.length} skills`);
    return recommendations;
  }

  /**
   * Build search query from personality type, dimensions, AND main categories
   */
  private buildSearchQuery(
    personalityType: PersonalityType,
    dimensions: DimensionScores,
    conversationMemory: string[],
    mainCategories: string[]
  ): string {
    // Step 1: Get personality-specific keywords (how they approach things)
    const personalityKeywords = PERSONALITY_KEYWORDS[personalityType];

    // Step 2: Get main categories (what they're interested in)
    // These should be prioritized highest since they reflect actual needs
    const categoryKeywords = mainCategories.flatMap(cat =>
      this.getCategoryKeywords(cat)
    );

    // Step 3: Extract keywords from conversation memory
    const memoryKeywords = this.extractKeywordsFromMemory(conversationMemory);

    // Step 4: Build query with category focus
    // Priority: Categories > Personality > Memory
    let query = '';

    // Primary: Main categories (MUST match at least one)
    if (categoryKeywords.length > 0) {
      query = `(${categoryKeywords.slice(0, 8).join(' OR ')})`;
    }

    // Secondary: Personality traits (AND with categories)
    if (personalityKeywords.length > 0) {
      query += ` AND (${personalityKeywords.slice(0, 5).join(' OR ')})`;
    }

    // Tertiary: Add dimension-specific modifiers
    if (dimensions.conviction >= 70) {
      query += ' AND (deep OR focused OR specialized)';
    } else if (dimensions.conviction <= 30) {
      query += ' AND (diverse OR variety OR multi-purpose)';
    }

    if (dimensions.intuition >= 70) {
      query += ' AND (innovative OR creative OR novel)';
    } else if (dimensions.intuition <= 30) {
      query += ' AND (proven OR stable OR reliable)';
    }

    return query.trim();
  }

  /**
   * Get keyword variations for a category
   */
  private getCategoryKeywords(category: string): string[] {
    const categoryKeywordMap: Record<string, string[]> = {
      'AI Tools': ['ai', 'artificial intelligence', 'gpt', 'llm', 'machine learning', 'neural network', 'chatbot'],
      'Productivity': ['productivity', 'workflow', 'automation', 'efficiency', 'task management', 'time tracking'],
      'Wellness': ['wellness', 'health', 'fitness', 'meditation', 'mental health', 'mindfulness', 'yoga'],
      'Education': ['education', 'learning', 'course', 'teaching', 'knowledge', 'tutorial', 'training'],
      'Crypto': ['crypto', 'cryptocurrency', 'defi', 'web3', 'blockchain', 'token', 'dao', 'nft'],
      'Lifestyle': ['lifestyle', 'design', 'art', 'fashion', 'travel', 'photography', 'creative'],
      'Marketing': ['marketing', 'growth', 'seo', 'content', 'social media', 'advertising', 'branding'],
      'Development': ['development', 'coding', 'programming', 'software', 'engineering', 'api', 'framework'],
      'Finance': ['finance', 'investing', 'trading', 'budgeting', 'accounting', 'money', 'wealth'],
      'Social': ['social', 'community', 'networking', 'collaboration', 'communication', 'sharing'],
    };

    return categoryKeywordMap[category] || [category.toLowerCase()];
  }

  /**
   * Search OpenClaw Memory API for skills
   */
  private async searchOpenClawMemory(
    query: string,
    limit: number
  ): Promise<Array<{
    skillName: string;
    skillId: string;
    description: string;
    creator: string;
    creatorWallet?: string;
    tags: string[];
    metadata: any;
  }>> {
    try {
      // TODO: Replace with actual OpenClaw Memory Search API call
      console.log(`🔍 Searching OpenClaw Memory: "${query}"`);

      // Mock implementation for development
      // In production, this would call:
      // POST https://api.openclaw.ai/memory/search
      // {
      //   query: query,
      //   limit: limit,
      //   filters: { type: 'skill' }
      // }

      return this.getMockSkills();
    } catch (error) {
      console.error('❌ OpenClaw Memory Search failed:', error);
      return [];
    }
  }

  /**
   * Score skills based on personality + category match
   */
  private scoreSkills(
    skills: Array<any>,
    personalityType: PersonalityType,
    dimensions: DimensionScores,
    conversationMemory: string[],
    mainCategories: string[]
  ): SkillRecommendation[] {
    const personalityKeywords = PERSONALITY_KEYWORDS[personalityType];
    const memoryText = conversationMemory.join(' ').toLowerCase();

    return skills.map(skill => {
      let matchScore = 30; // Lower base score since we have more factors
      const matchReasons: string[] = [];

      const descriptionLower = `${skill.description} ${skill.tags.join(' ')}`.toLowerCase();

      // Factor 1: Main Category Match (HIGHEST WEIGHT - 30 points)
      // This is the most important: does the skill solve what they need?
      const categoryMatches = mainCategories.filter(category => {
        const categoryKeywords = this.getCategoryKeywords(category);
        return categoryKeywords.some(kw => descriptionLower.includes(kw.toLowerCase()));
      });

      if (categoryMatches.length > 0) {
        const boost = Math.min(categoryMatches.length * 15, 30);
        matchScore += boost;
        matchReasons.push(`Solves your ${categoryMatches[0]} needs`);
      }

      // Factor 2: Personality keyword match (20 points)
      // How they approach problems
      const personalityMatches = personalityKeywords.filter(kw =>
        descriptionLower.includes(kw.toLowerCase())
      );

      if (personalityMatches.length > 0) {
        const boost = Math.min(personalityMatches.length * 5, 20);
        matchScore += boost;
        matchReasons.push(`Matches your ${personalityType} style`);
      }

      // Factor 3: Conversation memory alignment (15 points)
      // Specific topics they've discussed
      const memoryKeywords = this.extractKeywordsFromMemory([memoryText]);
      const memoryMatches = memoryKeywords.filter(kw =>
        descriptionLower.includes(kw.toLowerCase())
      );

      if (memoryMatches.length > 0) {
        matchScore += Math.min(memoryMatches.length * 3, 15);
        matchReasons.push(`Related to: ${memoryMatches.slice(0, 2).join(', ')}`);
      }

      // Factor 4: Dimension-specific scoring (15 points total)
      if (dimensions.conviction >= 70 && skill.tags.includes('specialized')) {
        matchScore += 5;
        matchReasons.push('Deep specialization');
      }

      if (dimensions.intuition >= 70 && skill.tags.includes('innovative')) {
        matchScore += 5;
        matchReasons.push('Innovative approach');
      }

      if (dimensions.contribution >= 65 && skill.tags.includes('community')) {
        matchScore += 5;
        matchReasons.push('Community-focused');
      }

      // Cap at 100
      matchScore = Math.min(matchScore, 100);

      // If no category match at all, penalize heavily
      if (categoryMatches.length === 0) {
        matchScore = Math.min(matchScore, 65); // Max 65 without category match
      }

      return {
        skillName: skill.skillName,
        skillId: skill.skillId,
        description: skill.description,
        creator: skill.creator,
        creatorWallet: skill.creatorWallet,
        categories: skill.tags,
        matchScore: Math.round(matchScore),
        matchReasons,
        estimatedTip: 2, // Will be updated later
      };
    }).sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Extract keywords from conversation memory
   */
  private extractKeywordsFromMemory(memory: string[]): string[] {
    const text = memory.join(' ').toLowerCase();
    const words = text.split(/\s+/);

    // Count word frequency (excluding common words)
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were']);
    const wordFreq: Record<string, number> = {};

    words.forEach(word => {
      const cleaned = word.replace(/[^a-z]/g, '');
      if (cleaned.length > 3 && !stopWords.has(cleaned)) {
        wordFreq[cleaned] = (wordFreq[cleaned] || 0) + 1;
      }
    });

    // Return top 10 most frequent words
    return Object.entries(wordFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Calculate suggested tip amount based on match score
   */
  private calculateSuggestedTip(
    matchScore: number,
    budget: { min: number; max: number }
  ): number {
    // Higher match score = higher suggested tip
    // 60-70: min
    // 70-85: mid
    // 85-100: max

    const { min, max } = budget;

    if (matchScore >= 85) return max;
    if (matchScore >= 70) return Math.round((min + max) / 2);
    return min;
  }

  /**
   * Mock skills for development (replace with real OpenClaw API)
   */
  private getMockSkills() {
    return [
      {
        skillName: 'Web3 Token Analyzer',
        skillId: 'skill-001',
        description: 'Analyze token contracts, track whale movements, and identify promising DeFi projects',
        creator: 'CryptoBuilder',
        creatorWallet: '0x1234...5678',
        tags: ['crypto', 'defi', 'analytics', 'innovative'],
      },
      {
        skillName: 'AI Content Generator',
        skillId: 'skill-002',
        description: 'Generate high-quality content using GPT-4, optimized for social media and blogs',
        creator: 'AIExpert',
        creatorWallet: '0x2345...6789',
        tags: ['ai', 'content', 'productivity', 'specialized'],
      },
      {
        skillName: 'Community Pulse Monitor',
        skillId: 'skill-003',
        description: 'Track community sentiment across Discord, Telegram, and Farcaster',
        creator: 'CommunityGuru',
        creatorWallet: '0x3456...7890',
        tags: ['community', 'social', 'analytics'],
      },
      {
        skillName: 'Workflow Automation Suite',
        skillId: 'skill-004',
        description: 'Automate repetitive tasks across multiple platforms with custom triggers',
        creator: 'ProductivityPro',
        creatorWallet: '0x4567...8901',
        tags: ['productivity', 'automation', 'efficiency', 'specialized'],
      },
      {
        skillName: 'Early Project Scout',
        skillId: 'skill-005',
        description: 'Discover and evaluate pre-launch projects from Product Hunt, GitHub, and Twitter',
        creator: 'TrendSpotter',
        creatorWallet: '0x5678...9012',
        tags: ['discovery', 'early-stage', 'research', 'innovative'],
      },
      {
        skillName: 'NFT Collection Tracker',
        skillId: 'skill-006',
        description: 'Monitor NFT collections, floor prices, and rarity rankings across multiple chains',
        creator: 'NFTWhale',
        creatorWallet: '0x6789...0123',
        tags: ['nft', 'crypto', 'analytics'],
      },
      {
        skillName: 'Learning Path Generator',
        skillId: 'skill-007',
        description: 'Create personalized learning roadmaps for any skill or technology',
        creator: 'EduBuilder',
        creatorWallet: '0x7890...1234',
        tags: ['education', 'learning', 'diverse'],
      },
      {
        skillName: 'Smart Contract Auditor',
        skillId: 'skill-008',
        description: 'Automated security analysis for Solidity contracts with vulnerability detection',
        creator: 'SecureCode',
        creatorWallet: '0x8901...2345',
        tags: ['security', 'crypto', 'technical', 'specialized'],
      },
      {
        skillName: 'Growth Hacking Toolkit',
        skillId: 'skill-009',
        description: 'A/B testing, analytics, and optimization tools for rapid growth',
        creator: 'GrowthHacker',
        creatorWallet: '0x9012...3456',
        tags: ['growth', 'marketing', 'optimization'],
      },
      {
        skillName: 'DAO Governance Assistant',
        skillId: 'skill-010',
        description: 'Track proposals, voting patterns, and treasury movements for DAOs',
        creator: 'DAOExpert',
        creatorWallet: '0x0123...4567',
        tags: ['dao', 'governance', 'crypto', 'community'],
      },
    ];
  }
}
