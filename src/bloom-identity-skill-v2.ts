/**
 * Bloom Identity Card Generator - OpenClaw Skill v2
 *
 * Enhanced version with:
 * - Permission handling
 * - Manual Q&A fallback
 * - Focus on Twitter/X integration
 * - Graceful degradation
 */

import { PersonalityAnalyzer } from './analyzers/personality-analyzer';
import { EnhancedDataCollector } from './analyzers/data-collector-enhanced';
import { ManualQAFallback, ManualAnswer } from './analyzers/manual-qa-fallback';
import { CategoryMapper } from './analyzers/category-mapper';
import { AgentWallet, AgentWalletInfo } from './blockchain/agent-wallet';
import { walletStorage } from './blockchain/wallet-storage';
import { mintIdentitySbt } from './blockchain/identity-sbt';
import { captureAndUploadCardImage } from './blockchain/card-image';
import { TwitterShare, createTwitterShare } from './integrations/twitter-share';
import { ClaudeCodeClient, createClaudeCodeClient } from './integrations/claude-code-client';
import { GitHubRecommendations } from './github-recommendations';
import { PersonalityType } from './types/personality';
import { CATEGORY_KEYWORDS } from './types/categories';

// Re-export PersonalityType for backwards compatibility
export { PersonalityType };

export interface IdentityData {
  personalityType: PersonalityType;
  customTagline: string;
  customDescription: string;
  mainCategories: string[];
  subCategories: string[];
  dimensions?: {
    conviction: number;
    intuition: number;
    contribution: number;
  };
}

export interface SkillRecommendation {
  skillId: string;
  skillName: string;
  description: string;
  url: string;
  categories: string[];
  matchScore: number;
  reason?: string;
  creator?: string;
  creatorUserId?: number | string;
  source?: 'ClaudeCode' | 'GitHub';
  stars?: number;
  language?: string;
  categoryGroup?: string; // Which user category section this belongs to
}

/**
 * Execution mode
 */
export enum ExecutionMode {
  AUTO = 'auto',           // Try data collection, fallback to Q&A if insufficient
  MANUAL = 'manual',       // Skip data collection, go straight to Q&A
  DATA_ONLY = 'data_only', // Only use data collection, fail if insufficient
}

/**
 * Main Bloom Identity Skill v2
 */
export class BloomIdentitySkillV2 {
  private personalityAnalyzer: PersonalityAnalyzer;
  private dataCollector: EnhancedDataCollector;
  private manualQA: ManualQAFallback;
  private categoryMapper: CategoryMapper;
  private agentWallet: AgentWallet | null = null;
  private twitterShare: TwitterShare;
  private claudeCodeClient: ClaudeCodeClient;
  private githubRecommendations: GitHubRecommendations;

  constructor() {
    this.personalityAnalyzer = new PersonalityAnalyzer();
    this.dataCollector = new EnhancedDataCollector();
    this.manualQA = new ManualQAFallback();
    this.categoryMapper = new CategoryMapper();
    this.twitterShare = createTwitterShare();
    this.claudeCodeClient = createClaudeCodeClient();
    this.githubRecommendations = new GitHubRecommendations(process.env.GITHUB_TOKEN);
  }

  /**
   * Initialize agent wallet (one-time setup)
   *
   * ⭐ Creates per-user wallet using userId
   */
  private async initializeAgentWallet(userId: string): Promise<AgentWalletInfo> {
    if (this.agentWallet) {
      return this.agentWallet.getWalletInfo();
    }

    console.log('🤖 Initializing agent wallet...');

    // Network priority: NETWORK env var > NODE_ENV-based > default to mainnet
    const network = (process.env.NETWORK as 'base-mainnet' | 'base-sepolia') ||
                   (process.env.NODE_ENV === 'production' ? 'base-mainnet' : 'base-sepolia');

    // ⭐ Pass userId for per-user wallet
    this.agentWallet = new AgentWallet({ userId, network });

    const walletInfo = await this.agentWallet.initialize();

    // Pre-register with Bloom Protocol (wallet address only, no identity data yet)
    try {
      const registration = await this.agentWallet.registerWithBloom('Bloom Skill Discovery Agent');
      console.log(`✅ Agent pre-registered with Bloom: userId ${registration.agentUserId}`);
      walletInfo.x402Endpoint = registration.x402Endpoint;
    } catch (error) {
      // Not critical - identity will be saved in Step 5 via agent-save fallback
      console.warn('⚠️ Bloom pre-registration skipped (identity will be saved later)');
    }

    return walletInfo;
  }

  /**
   * Main skill execution with intelligent fallback
   */
  async execute(
    userId: string,
    options?: {
      mode?: ExecutionMode;
      skipShare?: boolean; // Twitter share is optional
      manualAnswers?: ManualAnswer[]; // If already collected
      conversationText?: string; // ⭐ NEW: Direct conversation text from OpenClaw bot
      // SBT minting is automatic when SBT_CONTRACT_ADDRESS is set
    }
  ): Promise<{
    success: boolean;
    mode: 'data' | 'manual' | 'hybrid';
    identityData?: IdentityData;
    agentWallet?: AgentWalletInfo;
    recommendations?: SkillRecommendation[];
    dashboardUrl?: string;
    shareUrl?: string;
    dataQuality?: number;
    dimensions?: {
      conviction: number;
      intuition: number;
      contribution: number;
    };
    actions?: {
      share?: {
        url: string;
        text: string;
        hashtags: string[];
      };
      save?: {
        prompt: string;
        registerUrl: string;
        loginUrl: string;
      };
      mint?: {
        contractAddress: string;
        tokenUri: string;
        txHash: string;
        network: string;
      };
    };
    error?: string;
    needsManualInput?: boolean;
    manualQuestions?: string;
  }> {
    try {
      console.log(`🎴 Generating Bloom Identity for user: ${userId}`);

      const mode = options?.mode || ExecutionMode.AUTO;

      // Step 1: Try data collection (unless manual mode)
      let identityData: IdentityData | null = null;
      let dataQuality = 0;
      let usedManualQA = false;
      let dimensions: { conviction: number; intuition: number; contribution: number } | undefined;
      let mintAction: { contractAddress: string; tokenUri: string; txHash: string; network: string } | undefined;

      if (mode !== ExecutionMode.MANUAL) {
        console.log('📊 Step 1: Attempting data collection...');

        // ⭐ NEW: If conversationText is provided, use it directly
        let userData;
        if (options?.conversationText) {
          console.log('✅ Using provided conversation text (OpenClaw bot context)');
          userData = await this.dataCollector.collectFromConversationText(
            userId,
            options.conversationText,
            { skipTwitter: options.skipShare }
          );
        } else {
          // Original: Collect from session files
          userData = await this.dataCollector.collect(userId, {
            // Default: Conversation + Twitter only (no wallet analysis)
          });
        }

        dataQuality = this.dataCollector.getDataQualityScore(userData);
        // Data quality is calculated but not displayed (cleaner output)
        console.log(`📊 Available sources: ${userData.sources.join(', ')}`);

        // ⭐ CRITICAL: Check if we have ANY real data (conversation OR Twitter)
        const hasConversation = userData.conversationMemory && userData.conversationMemory.messageCount > 0;
        const hasTwitter = userData.twitter && (userData.twitter.bio || userData.twitter.tweets.length > 0);

        if (!hasConversation && !hasTwitter) {
          console.log('⚠️  No conversation or Twitter data available');

          // In AUTO mode, fallback to manual Q&A
          if (mode === ExecutionMode.AUTO) {
            console.log('🔄 Falling back to manual Q&A (no data available)...');
            usedManualQA = true;
          } else {
            // DATA_ONLY mode - fail explicitly
            throw new Error('No conversation or Twitter data available and manual Q&A not enabled');
          }
        } else {
          // Check if we have sufficient data quality
          const hasSufficientData = this.dataCollector.hasSufficientData(userData);

          if (hasSufficientData) {
            console.log('✅ Sufficient data available, proceeding with AI analysis...');

            // Analyze personality from data
            const analysis = await this.personalityAnalyzer.analyze(userData);

            identityData = {
              personalityType: analysis.personalityType,
              customTagline: analysis.tagline,
              customDescription: analysis.description,
              // ⭐ Use detected categories from actual conversation data
              // Priority: What they talk about > personality-based defaults
              mainCategories: analysis.detectedCategories.length > 0
                ? analysis.detectedCategories
                : this.categoryMapper.getMainCategories(analysis.personalityType),
              subCategories: analysis.detectedInterests,
              dimensions: analysis.dimensions,
            };

            // ⭐ Capture 2x2 metrics
            dimensions = analysis.dimensions;

            console.log(`✅ Analysis complete: ${identityData.personalityType}`);
          } else {
            console.log('⚠️  Insufficient data quality for AI analysis');

            // In AUTO mode, fallback to manual Q&A
            if (mode === ExecutionMode.AUTO) {
              console.log('🔄 Falling back to manual Q&A...');
              usedManualQA = true;
            } else {
              // DATA_ONLY mode - fail
              throw new Error('Insufficient data and manual Q&A not enabled');
            }
          }
        }
      } else {
        // MANUAL mode - go straight to Q&A
        console.log('📝 Manual mode enabled, skipping data collection');
        usedManualQA = true;
      }

      // Step 2: Manual Q&A if needed
      if (usedManualQA) {
        // If we don't have answers yet, request them from user
        if (!options?.manualAnswers) {
          console.log('❓ Manual input required from user');
          return {
            success: false,
            mode: 'manual',
            needsManualInput: true,
            manualQuestions: this.manualQA.formatQuestionsForUser(),
          };
        }

        console.log('🤔 Analyzing manual Q&A responses...');
        const manualResult = await this.manualQA.analyze(options.manualAnswers);

        identityData = {
          personalityType: manualResult.personalityType,
          customTagline: manualResult.tagline,
          customDescription: manualResult.description,
          mainCategories: manualResult.mainCategories,
          subCategories: manualResult.subCategories,
        };

        dataQuality = manualResult.confidence;
        console.log(`✅ Manual analysis complete: ${identityData.personalityType}`);
      }

      // Step 3: Recommend OpenClaw Skills ⭐ NEW
      console.log('🔍 Step 3: Finding matching OpenClaw Skills...');
      const recommendations = await this.recommendSkills(identityData!);
      console.log(`✅ Found ${recommendations.length} matching skills`);

      // Step 4: Initialize Agent Wallet ⭐ Per-User Wallet
      console.log('🤖 Step 4: Initializing Agent Wallet...');
      const agentWallet = await this.initializeAgentWallet(userId);  // ⭐ Pass userId
      console.log(`✅ Agent wallet deployed on ${agentWallet.network}`);

      // Step 5: Register agent and save identity card with Bloom
      // Try wallet-based registration first, fall back to wallet-free save
      let dashboardUrl: string | undefined;
      let agentUserId: number | undefined;

      const identityPayload = {
        personalityType: identityData!.personalityType,
        tagline: identityData!.customTagline,
        description: identityData!.customDescription,
        mainCategories: identityData!.mainCategories,
        subCategories: identityData!.subCategories,
        confidence: dataQuality,
        mode: (usedManualQA ? 'manual' : 'data') as 'data' | 'manual',
        dimensions,
        recommendations,
      };

      try {
        console.log('📝 Step 5: Registering agent with Bloom...');

        // Try wallet-based registration (with signature)
        const registration = await this.agentWallet!.registerWithBloom(
          'Bloom Skill Discovery Agent',
          identityPayload,
        );
        agentUserId = registration.agentUserId;
        console.log(`✅ Agent registered with wallet! User ID: ${agentUserId}`);
      } catch (walletError) {
        console.debug('Wallet registration fallback:', walletError instanceof Error ? walletError.message : walletError);

        try {
          // Fallback: save without wallet signature
          const saveResult = await this.agentWallet!.saveIdentityWithBloom(
            'Bloom Skill Discovery Agent',
            identityPayload,
          );
          agentUserId = saveResult.agentUserId;
          console.log(`✅ Agent identity saved (wallet-free)! User ID: ${agentUserId}`);
        } catch (saveError) {
          console.error('❌ Both registration methods failed:', saveError);
        }
      }

      if (agentUserId) {
        const baseUrl = process.env.DASHBOARD_URL || 'https://preflight.bloomprotocol.ai';
        const cacheBust = Date.now();
        dashboardUrl = `${baseUrl}/agents/${agentUserId}?v=${cacheBust}`;
        console.log(`✅ Public URL created: ${dashboardUrl}`);
      }

      // Step 6: Twitter share (DISABLED - image embedding issues)
      // TODO: Re-enable when we can properly embed card images in Twitter
      let shareUrl: string | undefined;
      // if (!options?.skipShare) {
      //   try {
      //     console.log('📢 Step 6: Generating Twitter share link...');
      //     shareUrl = await this.twitterShare.share({
      //       userId,
      //       personalityType: identityData!.personalityType,
      //       recommendations: recommendations.slice(0, 3).map(r => ({
      //         skillName: r.skillName,
      //         matchScore: r.matchScore,
      //       })),
      //       agentWallet: undefined,
      //     });
      //     console.log(`✅ Share link ready`);
      //   } catch (error) {
      //     console.warn('⚠️  Twitter share link generation failed (skipping):', error);
      //   }
      // }

      // Success!
      console.log('🎉 Bloom Identity generation complete!');

      // Prepare share data for frontend buttons
      const shareData = dashboardUrl ? {
        url: dashboardUrl,
        text: `Just discovered my Bloom Identity: ${identityData!.personalityType}! 🌸\n\nCheck out my personalized skill recommendations on @bloomprotocol 🚀`,
        hashtags: ['BloomProtocol', 'Web3Identity', 'OpenClaw'],
      } : undefined;

      // Auto-mint SBT on Base when contract + minter key are configured
      const sbtContractAddress = process.env.SBT_CONTRACT_ADDRESS as `0x${string}` | undefined;
      const sbtMinterKey = process.env.SBT_MINTER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
      if (sbtContractAddress && sbtMinterKey) {
        try {
          const minterKey = (sbtMinterKey.startsWith('0x') ? sbtMinterKey : `0x${sbtMinterKey}`) as `0x${string}`;

          // Capture card screenshot from dashboard and upload to IPFS
          let cardImageUrl: string | undefined;
          if (dashboardUrl) {
            console.log('📸 Capturing Taste Card image...');
            const imageResult = await captureAndUploadCardImage(dashboardUrl, identityData!.personalityType);
            if (imageResult) {
              cardImageUrl = imageResult.ipfsUrl;
              console.log(`✅ Card image uploaded to IPFS: ${imageResult.gatewayUrl}`);
            }
          }

          const tokenUri = this.buildTokenUri(identityData!, agentWallet, dashboardUrl, dimensions, cardImageUrl);
          const txHash = await mintIdentitySbt({
            contractAddress: sbtContractAddress,
            to: agentWallet.address as `0x${string}`,
            tokenUri,
            network: agentWallet.network as 'base-mainnet' | 'base-sepolia',
            privateKey: minterKey,
          });

          mintAction = {
            contractAddress: sbtContractAddress,
            tokenUri,
            txHash,
            network: agentWallet.network,
          };
          console.log(`✅ Taste Card minted on Base (tx: ${txHash.slice(0, 10)}...)`);
        } catch (error) {
          // Non-blocking — skill still succeeds without SBT
          console.debug('SBT mint skipped:', error instanceof Error ? error.message : error);
        }
      }

      return {
        success: true,
        mode: usedManualQA ? 'manual' : 'data',
        identityData: identityData!,
        agentWallet,
        recommendations,
        dashboardUrl,
        shareUrl,
        dataQuality,
        dimensions, // ⭐ Include 2x2 metrics in result
        // ⭐ Frontend action buttons data
        actions: {
          share: shareData, // For "Share on X" button
          save: dashboardUrl ? {
            // For "Save to Collection" button
            prompt: 'Save this card to your Bloom collection',
            registerUrl: `${process.env.DASHBOARD_URL || 'https://preflight.bloomprotocol.ai'}/register?return=${encodeURIComponent(dashboardUrl)}`,
            loginUrl: `${process.env.DASHBOARD_URL || 'https://preflight.bloomprotocol.ai'}/login?return=${encodeURIComponent(dashboardUrl)}`,
          } : undefined,
          mint: mintAction,
        },
      };
    } catch (error) {
      console.error('❌ Error generating Bloom Identity:', error);
      return {
        success: false,
        mode: 'data',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private buildTokenUri(
    identity: IdentityData,
    wallet: AgentWalletInfo,
    dashboardUrl?: string,
    dims?: { conviction: number; intuition: number; contribution: number },
    ipfsImageUrl?: string,
  ): string {
    const baseUrl = process.env.DASHBOARD_URL || 'https://preflight.bloomprotocol.ai';
    // Use IPFS screenshot if available, fallback to static OG image
    const typeSlug = identity.personalityType.replace(/^The /, '').toLowerCase();
    const ogImage = ipfsImageUrl || `${baseUrl}/og/${typeSlug}.png`;

    const metadata: Record<string, any> = {
      name: `Bloom Taste Card — ${identity.personalityType}`,
      description: identity.customTagline,
      image: ogImage,
      external_url: dashboardUrl,
      attributes: [
        { trait_type: 'Personality Type', value: identity.personalityType },
        ...identity.mainCategories.map(c => ({ trait_type: 'Category', value: c })),
      ],
    };

    // Add dimension scores when available
    if (dims) {
      metadata.attributes.push(
        { trait_type: 'Conviction', value: dims.conviction, display_type: 'number' },
        { trait_type: 'Intuition', value: dims.intuition, display_type: 'number' },
        { trait_type: 'Contribution', value: dims.contribution, display_type: 'number' },
      );
    }

    const json = JSON.stringify(metadata);
    const base64 = Buffer.from(json).toString('base64');
    return `data:application/json;base64,${base64}`;
  }

  /**
   * Recommend skills grouped by user's main categories
   *
   * Sources: GitHub repos (quality-gated by stars/activity) + Claude Code awesome lists.
   * Deduplicates by URL, then groups by user's mainCategories with 3-7 per group.
   */
  private async recommendSkills(identity: IdentityData): Promise<SkillRecommendation[]> {
    console.log(`🔍 Searching for recommendations matching ${identity.personalityType}...`);

    try {
      // Search both sources in parallel
      const [claudeCodeSkills, githubRepos] = await Promise.all([
        this.getClaudeCodeRecommendations(identity),
        this.getGitHubRecommendations(identity),
      ]);

      // Merge and deduplicate by URL — keep highest-scoring entry
      const all = [...claudeCodeSkills, ...githubRepos];
      const byUrl = new Map<string, SkillRecommendation>();
      for (const rec of all) {
        const key = rec.url.toLowerCase().replace(/\/+$/, '');
        const existing = byUrl.get(key);
        if (!existing || rec.matchScore > existing.matchScore) {
          byUrl.set(key, rec);
        }
      }
      const deduplicated = Array.from(byUrl.values());

      // Group by user's main categories (3-7 per category)
      const grouped = this.groupByCategory(deduplicated, identity.mainCategories);

      console.log(`✅ Found ${claudeCodeSkills.length} Claude Code + ${githubRepos.length} GitHub recommendations`);
      console.log(`   Returning ${grouped.length} skills across ${identity.mainCategories.length} categories`);

      return grouped;

    } catch (error) {
      console.error('❌ Recommendation search failed:', error);
      return [];
    }
  }

  /**
   * Get recommendations from Claude Code (Official Anthropic + Community)
   */
  private async getClaudeCodeRecommendations(identity: IdentityData): Promise<SkillRecommendation[]> {
    try {
      const claudeCodeSkills = await this.claudeCodeClient.getRecommendations({
        mainCategories: identity.mainCategories,
        subCategories: identity.subCategories,
        limit: 20,
      });

      // Convert to our SkillRecommendation format with real scores
      return claudeCodeSkills.map(skill => {
        // Normalize raw keyword score to 0-100
        // Typical raw scores: 2-30+ (10/category + 2/word + 5/official)
        const CLAUDE_CODE_SCORE_CEILING = 30;
        const rawScore = skill.matchScore || 0;
        const normalizedScore = Math.min(Math.round((rawScore / CLAUDE_CODE_SCORE_CEILING) * 100), 100);

        const searchText = `${skill.skillName} ${skill.description} ${skill.category || ''}`.toLowerCase();
        const matchedCategory = [...identity.mainCategories, ...identity.subCategories]
          .find(c => searchText.includes(c.toLowerCase()));

        const { boost, matchedKeywords } = this.calculatePersonalityBoost(
          { description: skill.description, categories: skill.category ? [skill.category] : [] },
          identity,
        );

        const typeName = identity.personalityType.replace(/^The /, '');
        const reason = matchedCategory && matchedKeywords.length > 0
          ? `Because you're into ${matchedCategory} — fits your ${typeName} style`
          : matchedCategory
            ? `Because you're into ${matchedCategory}`
            : matchedKeywords.length > 0
              ? `Fits your ${typeName} style`
              : `Fits your ${typeName} profile`;

        return {
          skillId: skill.url,
          skillName: skill.skillName,
          matchScore: Math.min(normalizedScore + boost, 100),
          reason,
          description: skill.description,
          url: skill.url,
          categories: skill.category ? [skill.category] : ['General'],
          creator: skill.creator,
          source: 'ClaudeCode' as const,
        };
      });
    } catch (error) {
      console.error('⚠️  Claude Code search failed:', error);
      return [];
    }
  }

  /**
   * Get recommendations from GitHub
   */
  private async getGitHubRecommendations(identity: IdentityData): Promise<SkillRecommendation[]> {
    try {
      return await this.githubRecommendations.getRecommendations(identity, 20);
    } catch (error) {
      console.error('⚠️  GitHub search failed:', error);
      return [];
    }
  }

  /**
   * Group skills by user's main categories
   *
   * Each skill is assigned to the best-matching user category.
   * Returns 3-7 skills per category (above score threshold), sorted by score.
   * Skills are tagged with `categoryGroup` so consumers can render sections.
   */
  private groupByCategory(
    skills: SkillRecommendation[],
    mainCategories: string[],
  ): SkillRecommendation[] {
    const MIN_PER_CATEGORY = 3;
    const MAX_PER_CATEGORY = 7;
    const SCORE_THRESHOLD = 25; // Minimum score to include

    // Build category buckets
    const buckets = new Map<string, SkillRecommendation[]>();
    for (const cat of mainCategories) {
      buckets.set(cat, []);
    }

    // Assign each skill to its best-matching category
    for (const skill of skills) {
      const bestCategory = this.findBestCategory(skill, mainCategories);
      if (bestCategory) {
        buckets.get(bestCategory)!.push({ ...skill, categoryGroup: bestCategory });
      }
    }

    // Sort within each bucket by score, apply dynamic 3-7 limit
    const result: SkillRecommendation[] = [];
    for (const cat of mainCategories) {
      const bucket = buckets.get(cat)!;
      bucket.sort((a, b) => b.matchScore - a.matchScore);

      // Dynamic count: take all above threshold, capped at 7, minimum 3
      let count = bucket.filter(s => s.matchScore >= SCORE_THRESHOLD).length;
      count = Math.max(Math.min(count, MAX_PER_CATEGORY), Math.min(MIN_PER_CATEGORY, bucket.length));

      result.push(...bucket.slice(0, count));
    }

    return result;
  }

  /**
   * Find the best-matching user category for a skill
   * Uses the shared CATEGORY_KEYWORDS for robust matching beyond just category name words.
   */
  private findBestCategory(skill: SkillRecommendation, mainCategories: string[]): string | null {
    const skillText = [
      ...skill.categories,
      skill.description,
      skill.skillName,
    ].join(' ').toLowerCase();

    let bestCat: string | null = null;
    let bestScore = 0;

    for (const cat of mainCategories) {
      let score = 0;

      // Exact category label match on the skill
      if (skill.categories.some(c => c.toLowerCase() === cat.toLowerCase())) {
        score += 10;
      }

      // Use canonical keyword list for this category (e.g., "Crypto" checks for
      // 'defi', 'web3', 'blockchain', 'token', etc.)
      const keywords = CATEGORY_KEYWORDS[cat as keyof typeof CATEGORY_KEYWORDS] || [];
      for (const kw of keywords) {
        if (skillText.includes(kw)) {
          score += 2;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestCat = cat;
      }
    }

    // If no strong match, assign to first category as fallback
    if (bestScore === 0 && mainCategories.length > 0) {
      bestCat = mainCategories[0];
    }

    return bestCat;
  }

  /**
   * Generate a personalized recommendation reason
   */
  private generateReason(
    matchedCategories: string[],
    matchedKeywords: string[],
    identity: IdentityData
  ): string {
    const typeName = identity.personalityType.replace(/^The /, '');
    if (matchedCategories.length > 0 && matchedKeywords.length > 0) {
      return `Because you're into ${matchedCategories[0]} — fits your ${typeName} style`;
    }
    if (matchedCategories.length > 0) {
      return `Because you're into ${matchedCategories[0]}`;
    }
    if (matchedKeywords.length > 0) {
      return `Fits your ${typeName} style`;
    }
    return `Related to your interest in ${identity.mainCategories[0] || identity.subCategories[0] || 'building'}`;
  }

  /**
   * Get personality-specific keywords for matching
   */
  /**
   * Calculate personality boost for a skill based on keyword + dimension signals
   */
  private calculatePersonalityBoost(
    skill: { description: string; categories?: string[]; stars?: number; source?: string },
    identity: IdentityData,
  ): { boost: number; matchedKeywords: string[] } {
    const personalityKeywords = this.getPersonalityKeywords(identity.personalityType);
    const descLower = skill.description.toLowerCase();
    const catText = (skill.categories || []).join(' ').toLowerCase();
    const searchText = `${descLower} ${catText}`;

    // 1. Keyword matching — up to +15, diminishing returns per keyword
    const matchedKeywords = personalityKeywords.filter(k => searchText.includes(k));
    // First 3 keywords: 3pts each, next 3: 2pts each, rest: 1pt each
    let keywordBoost = 0;
    for (let i = 0; i < matchedKeywords.length; i++) {
      if (i < 3) keywordBoost += 3;
      else if (i < 6) keywordBoost += 2;
      else keywordBoost += 1;
    }
    keywordBoost = Math.min(keywordBoost, 15);

    // 2. Dimension-aware structural bonuses — up to +15
    let dimensionBoost = 0;
    const dims = identity.dimensions;
    if (dims) {
      // High conviction (>65): boost exact category matches
      if (dims.conviction > 65) {
        const hasExactCategory = (skill.categories || []).some(c => {
          const lower = c.toLowerCase();
          return identity.mainCategories.some(mc => mc.toLowerCase() === lower) ||
                 identity.subCategories.some(sc => sc.toLowerCase() === lower);
        });
        if (hasExactCategory) dimensionBoost += 8;
      }

      // Low conviction (<35, Explorer-like): boost novel/adjacent categories
      if (dims.conviction < 35) {
        const hasNovelCategory = (skill.categories || []).some(c => {
          const lower = c.toLowerCase();
          return !identity.mainCategories.some(mc => mc.toLowerCase() === lower) &&
                 !identity.subCategories.some(sc => sc.toLowerCase() === lower);
        });
        if (hasNovelCategory) dimensionBoost += 5;
      }

      // High intuition (>65): boost newer/early-stage tools
      if (dims.intuition > 65) {
        const earlyKeywords = /\b(early|beta|alpha|experimental)\b/i;
        const isEarlyStage = (skill.stars != null && skill.stars < 500) ||
          earlyKeywords.test(searchText);
        if (isEarlyStage) dimensionBoost += 6;
      }

      // Low intuition (<35): boost popular, established tools
      if (dims.intuition < 35) {
        const isEstablished = skill.stars != null && skill.stars > 5000;
        if (isEstablished) dimensionBoost += 6;
      }

      // High contribution (>55): boost community/collaborative tools
      if (dims.contribution > 55) {
        const isCommunity = searchText.includes('community') || searchText.includes('collaborat') ||
          searchText.includes('contribut') || searchText.includes('open-source') || searchText.includes('governance');
        if (isCommunity) dimensionBoost += 6;
      }

      dimensionBoost = Math.min(dimensionBoost, 15);
    }

    return { boost: keywordBoost + dimensionBoost, matchedKeywords };
  }

  private getPersonalityKeywords(type: PersonalityType): string[] {
    const keywordMap = {
      [PersonalityType.THE_VISIONARY]: [
        'innovative', 'early-stage', 'vision', 'future', 'paradigm',
        'pioneer', 'disrupt', 'bold', 'ambitious', 'frontier', 'emerging', 'breakthrough',
      ],
      [PersonalityType.THE_EXPLORER]: [
        'diverse', 'experimental', 'discovery', 'research', 'explore',
        'curiosity', 'variety', 'breadth', 'survey', 'sandbox', 'prototype', 'tinker',
      ],
      [PersonalityType.THE_CULTIVATOR]: [
        'community', 'social', 'collaborate', 'nurture', 'build',
        'ecosystem', 'mentor', 'contribute', 'share', 'governance', 'collective', 'stewardship',
      ],
      [PersonalityType.THE_OPTIMIZER]: [
        'efficiency', 'data-driven', 'optimize', 'systematic', 'analytics',
        'performance', 'metrics', 'roi', 'benchmark', 'refine', 'precision', 'reliable',
      ],
      [PersonalityType.THE_INNOVATOR]: [
        'technology', 'ai', 'automation', 'creative', 'cutting-edge',
        'novel', 'hybrid', 'synthesis', 'interdisciplinary', 'integrate', 'cross-domain', 'generative',
      ],
    };
    return keywordMap[type] || [];
  }
}

/**
 * Skill registration for OpenClaw
 */
export const bloomIdentitySkillV2 = {
  name: 'bloom-identity',
  description: 'Generate your personalized Bloom Identity Card and discover matching projects',
  version: '2.0.0',

  triggers: [
    'generate my bloom identity',
    'create my identity card',
    'analyze my supporter profile',
    'mint my bloom card',
    'discover my personality',
  ],

  async execute(context: any) {
    const skill = new BloomIdentitySkillV2();

    // Check if this is a response to manual Q&A
    const manualAnswers = context.manualAnswers;

    const result = await skill.execute(context.userId, {
      mode: ExecutionMode.AUTO,
      skipShare: !context.enableShare, // Only if user enables
      manualAnswers,
    });

    if (!result.success) {
      if (result.needsManualInput) {
        // Return questions to user
        return {
          message: result.manualQuestions,
          data: { awaitingManualInput: true },
        };
      }

      return {
        message: `❌ Failed to generate identity: ${result.error}`,
        data: result,
      };
    }

    // Sanitize result: Remove wallet address for privacy
    const sanitizedResult = {
      ...result,
      agentWallet: result.agentWallet ? {
        network: result.agentWallet.network,
        hasWallet: true, // Flag that wallet exists, but don't expose address
      } : undefined,
    };

    return {
      message: formatSuccessMessage(result),
      data: sanitizedResult,
    };
  },
};

/**
 * Format success message for user
 */
function formatSuccessMessage(result: any): string {
  const { identityData, recommendations } = result;

  let msg = `${getPersonalityEmoji(identityData.personalityType)} **${identityData.personalityType}**
"${identityData.customTagline}"
**Categories**: ${identityData.mainCategories.join(' • ')}`;

  // SBT mint data is in result.actions.mint but not shown to users (web3-native only on dashboard)
  if (recommendations?.length > 0 && result.dashboardUrl) {
    msg += `\n\n✨ **Your Taste Card is ready**`;
    msg += `\n→ See your card & recommendations: ${result.dashboardUrl}`;
  } else if (result.dashboardUrl) {
    msg += `\n\n✨ **Your Taste Card is ready**`;
    msg += `\n→ See your card: ${result.dashboardUrl}`;
  }

  return msg;
}

function getPersonalityEmoji(type: PersonalityType): string {
  const emojiMap = {
    [PersonalityType.THE_VISIONARY]: '💜',
    [PersonalityType.THE_EXPLORER]: '💚',
    [PersonalityType.THE_CULTIVATOR]: '🩵',
    [PersonalityType.THE_OPTIMIZER]: '🧡',
    [PersonalityType.THE_INNOVATOR]: '💙',
  };
  return emojiMap[type] || '🎴';
}

export default bloomIdentitySkillV2;
