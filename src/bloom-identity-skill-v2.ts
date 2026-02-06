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
import { TwitterShare, createTwitterShare } from './integrations/twitter-share';
import { ClawHubClient, createClawHubClient } from './integrations/clawhub-client';
import { PersonalityType } from './types/personality';

// Re-export PersonalityType for backwards compatibility
export { PersonalityType };

export interface IdentityData {
  personalityType: PersonalityType;
  customTagline: string;
  customDescription: string;
  mainCategories: string[];
  subCategories: string[];
}

export interface SkillRecommendation {
  skillId: string;
  skillName: string;
  description: string;
  url: string;
  categories: string[];
  matchScore: number;
  creator?: string;
  creatorUserId?: number;
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
  private clawHubClient: ClawHubClient;

  constructor() {
    this.personalityAnalyzer = new PersonalityAnalyzer();
    this.dataCollector = new EnhancedDataCollector();
    this.manualQA = new ManualQAFallback();
    this.categoryMapper = new CategoryMapper();
    this.twitterShare = createTwitterShare();
    this.clawHubClient = createClawHubClient();
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

    // Register with Bloom Protocol
    try {
      const registration = await this.agentWallet.registerWithBloom('Bloom Skill Discovery Agent');
      console.log(`✅ Agent registered with Bloom: userId ${registration.agentUserId}`);
      walletInfo.x402Endpoint = registration.x402Endpoint;
    } catch (error) {
      console.warn('⚠️ Bloom registration failed, using fallback X402 endpoint');
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

      if (mode !== ExecutionMode.MANUAL) {
        console.log('📊 Step 1: Attempting data collection...');

        const userData = await this.dataCollector.collect(userId, {
          skipFarcaster: true, // Skip Farcaster by default
        });

        dataQuality = this.dataCollector.getDataQualityScore(userData);
        console.log(`📊 Data quality score: ${dataQuality}/100`);
        console.log(`📊 Available sources: ${userData.sources.join(', ')}`);

        // Check if we have sufficient data
        const hasSufficientData = this.dataCollector.hasSufficientData(userData);

        if (hasSufficientData) {
          console.log('✅ Sufficient data available, proceeding with AI analysis...');

          // Analyze personality from data
          const analysis = await this.personalityAnalyzer.analyze(userData);

          identityData = {
            personalityType: analysis.personalityType,
            customTagline: analysis.tagline,
            customDescription: analysis.description,
            mainCategories: this.categoryMapper.getMainCategories(analysis.personalityType),
            subCategories: analysis.detectedInterests,
          };

          console.log(`✅ Analysis complete: ${identityData.personalityType}`);
        } else {
          console.log('⚠️  Insufficient data for AI analysis');

          // In AUTO mode, fallback to manual Q&A
          if (mode === ExecutionMode.AUTO) {
            console.log('🔄 Falling back to manual Q&A...');
            usedManualQA = true;
          } else {
            // DATA_ONLY mode - fail
            throw new Error('Insufficient data and manual Q&A not enabled');
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

      // Step 5: Register agent and save identity card with Bloom (single atomic operation)
      let dashboardUrl: string | undefined;
      let agentUserId: number | undefined;
      try {
        console.log('📝 Step 5: Registering agent with Bloom and saving identity card...');

        // Register agent with Bloom backend (includes identity data)
        const registration = await this.agentWallet!.registerWithBloom('Bloom Skill Discovery Agent', {
          personalityType: identityData!.personalityType,
          tagline: identityData!.customTagline,
          description: identityData!.customDescription,
          mainCategories: identityData!.mainCategories,
          subCategories: identityData!.subCategories,
          confidence: dataQuality,
          mode: usedManualQA ? 'manual' : 'data',
        });
        agentUserId = registration.agentUserId;
        console.log(`✅ Agent registered with identity card! User ID: ${agentUserId}`);

        // Create permanent dashboard link (no expiry, no sensitive data in URL)
        const baseUrl = process.env.DASHBOARD_URL || 'https://preflight.bloomprotocol.ai';
        dashboardUrl = `${baseUrl}/agent/${agentUserId}`;
        console.log(`✅ Dashboard link ready: ${dashboardUrl}`);
      } catch (error) {
        console.warn('⚠️  Bloom registration failed (skipping dashboard link):', error);
      }

      // Step 6: Generate Twitter share link (optional)
      let shareUrl: string | undefined;
      if (!options?.skipShare) {
        try {
          console.log('📢 Step 6: Generating Twitter share link...');
          shareUrl = await this.twitterShare.share({
            userId,
            personalityType: identityData!.personalityType,
            recommendations: recommendations.slice(0, 3).map(r => ({
              skillName: r.skillName,
              matchScore: r.matchScore,
            })),
            // Wallet address removed for security - coming soon features
            agentWallet: undefined,
          });
          console.log(`✅ Share link ready`);
        } catch (error) {
          console.warn('⚠️  Twitter share link generation failed (skipping):', error);
        }
      }

      // Success!
      console.log('🎉 Bloom Identity generation complete!');

      return {
        success: true,
        mode: usedManualQA ? 'manual' : 'data',
        identityData: identityData!,
        agentWallet,
        recommendations,
        dashboardUrl,
        shareUrl,
        dataQuality,
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

  /**
   * Recommend OpenClaw Skills based on identity
   *
   * Uses ClawHub registry with vector search
   */
  private async recommendSkills(identity: IdentityData): Promise<SkillRecommendation[]> {
    console.log(`🔍 Searching ClawHub for skills matching ${identity.personalityType}...`);

    try {
      // Get recommendations from ClawHub
      const clawHubSkills = await this.clawHubClient.getRecommendations({
        mainCategories: identity.mainCategories,
        subCategories: identity.subCategories,
        limit: 15,
      });

      // Convert ClawHub skills to our format and calculate enhanced match scores
      const recommendations: SkillRecommendation[] = clawHubSkills.map(skill => {
        // Base score from ClawHub similarity (0-100)
        let matchScore = skill.similarityScore * 100;

        // Boost score based on personality match
        const personalityKeywords = this.getPersonalityKeywords(identity.personalityType);
        const descLower = skill.description.toLowerCase();
        const keywordMatches = personalityKeywords.filter(k => descLower.includes(k)).length;
        matchScore += keywordMatches * 5;

        // Category match boost
        const categoryMatch = skill.categories?.some(c =>
          identity.mainCategories.includes(c) || identity.subCategories.includes(c.toLowerCase())
        );
        if (categoryMatch) {
          matchScore += 10;
        }

        return {
          skillId: skill.slug,
          skillName: skill.name,
          description: skill.description,
          url: skill.url,
          categories: skill.categories || ['General'],
          matchScore: Math.min(matchScore, 100),
          creator: skill.creator,
          creatorUserId: skill.creatorUserId,
        };
      });

      // Sort by enhanced match score
      const sortedRecommendations = recommendations
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 10);

      console.log(`✅ Returning top ${sortedRecommendations.length} recommendations`);
      return sortedRecommendations;

    } catch (error) {
      console.error('❌ ClawHub search failed, falling back to empty list:', error);
      return [];
    }
  }

  /**
   * Get personality-specific keywords for matching
   */
  private getPersonalityKeywords(type: PersonalityType): string[] {
    const keywordMap = {
      [PersonalityType.THE_VISIONARY]: ['innovative', 'early-stage', 'vision', 'future', 'paradigm'],
      [PersonalityType.THE_EXPLORER]: ['diverse', 'experimental', 'discovery', 'research', 'explore'],
      [PersonalityType.THE_CULTIVATOR]: ['community', 'social', 'collaborate', 'nurture', 'build'],
      [PersonalityType.THE_OPTIMIZER]: ['efficiency', 'data-driven', 'optimize', 'systematic', 'analytics'],
      [PersonalityType.THE_INNOVATOR]: ['technology', 'ai', 'automation', 'creative', 'cutting-edge'],
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

    return {
      message: formatSuccessMessage(result),
      data: result,
    };
  },
};

/**
 * Format success message for user
 */
function formatSuccessMessage(result: any): string {
  const { identityData, recommendations, mode, dataQuality } = result;

  const modeEmoji = mode === 'manual' ? '📝' : '🤖';
  const qualityText = dataQuality ? ` (${dataQuality}% confidence)` : '';

  return `
🎉 **Your Bloom Identity Card Generated!** ${modeEmoji}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💜 **Your Identity**

${getPersonalityEmoji(identityData.personalityType)} **${identityData.personalityType}**${qualityText}
💬 *"${identityData.customTagline}"*

${identityData.customDescription}

**Categories**: ${identityData.mainCategories.join(', ')}${identityData.subCategories.length > 0 ? `\n**Interests**: ${identityData.subCategories.slice(0, 3).join(', ')}` : ''}

${result.dashboardUrl ? `\n🌐 **View & Build Your Profile**\n→ ${result.dashboardUrl}\n\nYour identity card is saved on Bloom Protocol. You can return anytime to view and enhance your profile!\n` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 **Recommended OpenClaw Skills** (${recommendations.length})

${recommendations
  .slice(0, 5)
  .map((s: any, i: number) => {
    const creatorInfo = s.creator ? ` • by ${s.creator}` : '';
    return `${i + 1}. **${s.skillName}** (${s.matchScore}% match)${creatorInfo}
   ${s.description}`;
  })
  .join('\n\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${mode === 'manual' ? '📝 Generated via Q&A' : '🤖 Analyzed from on-chain activity'} • Built with @openclaw @coinbase @base 🦞
  `.trim();
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
