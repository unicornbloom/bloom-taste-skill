/**
 * Bloom Identity Card Generator - OpenClaw Skill v2
 *
 * Enhanced version with:
 * - Permission handling
 * - Manual Q&A fallback
 * - Focus on Twitter/X integration
 * - Graceful degradation
 */

import { PersonalityAnalyzer } from '../analyzers/personality-analyzer';
import { EnhancedDataCollector } from '../analyzers/data-collector-enhanced';
import { ManualQAFallback, ManualAnswer } from '../analyzers/manual-qa-fallback';
import { CategoryMapper } from '../analyzers/category-mapper';
import { AgentWallet, AgentWalletInfo } from '../blockchain/agent-wallet';
import { TwitterShare, createTwitterShare } from '../integrations/twitter-share';
import { ClawHubClient, createClawHubClient } from '../integrations/clawhub-client';

export enum PersonalityType {
  THE_VISIONARY = 'The Visionary',
  THE_EXPLORER = 'The Explorer',
  THE_CULTIVATOR = 'The Cultivator',
  THE_OPTIMIZER = 'The Optimizer',
  THE_INNOVATOR = 'The Innovator',
}

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
   */
  private async initializeAgentWallet(): Promise<AgentWalletInfo> {
    if (this.agentWallet) {
      return this.agentWallet.getWalletInfo();
    }

    console.log('🤖 Initializing agent wallet...');
    this.agentWallet = new AgentWallet({
      network: process.env.NODE_ENV === 'production' ? 'base-mainnet' : 'base-sepolia',
    });

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
          skipFarcaster: options?.skipFarcaster !== false, // Skip by default unless explicitly enabled
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

      // Step 4: Initialize Agent Wallet ⭐ NEW
      console.log('🤖 Step 4: Initializing Agent Wallet...');
      const agentWallet = await this.initializeAgentWallet();
      console.log(`✅ Agent wallet ready: ${agentWallet.address}`);

      // Step 5: Generate Dashboard auth token
      let dashboardUrl: string | undefined;
      try {
        console.log('🔐 Step 5: Generating Dashboard access...');
        const authToken = await this.agentWallet!.generateAuthToken();
        const baseUrl = process.env.DASHBOARD_URL || 'https://preview.bloomprotocol.ai';
        dashboardUrl = `${baseUrl}/dashboard?token=${authToken}`;
        console.log(`✅ Dashboard URL ready`);
      } catch (error) {
        console.warn('⚠️  Dashboard URL generation failed (skipping):', error);
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
            agentWallet: agentWallet.address,
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
  const { identityData, agentWallet, recommendations, mode, dataQuality } = result;

  const modeEmoji = mode === 'manual' ? '📝' : '🤖';
  const qualityText = dataQuality ? ` (${dataQuality}% confidence)` : '';

  return `
🎉 Your Bloom Identity Card is ready! ${modeEmoji}

${getPersonalityEmoji(identityData.personalityType)} **${identityData.personalityType}**${qualityText}
💬 "${identityData.customTagline}"

📝 ${identityData.customDescription}

🏷️ Categories: ${identityData.mainCategories.join(', ')}

🎯 Recommended OpenClaw Skills (${recommendations.length}):
${recommendations
  .slice(0, 5)
  .map((s: any, i: number) => {
    return `${i + 1}. **${s.skillName}** (${s.matchScore}% match)\n   ${s.description}\n   💡 Tip creators with your Agent wallet below!`;
  })
  .join('\n\n')}

🤖 Agent On-Chain Identity
📍 Wallet: ${agentWallet.address.slice(0, 6)}...${agentWallet.address.slice(-4)}
🔗 X402: ${agentWallet.x402Endpoint}
⛓️  Network: ${agentWallet.network}

${result.dashboardUrl ? `🌐 View full dashboard:\n   ${result.dashboardUrl}\n` : ''}
${result.shareUrl ? `📢 Share on Twitter:\n   ${result.shareUrl}` : ''}

${mode === 'manual' ? '\n*Generated via manual Q&A' : '\n*Generated via AI analysis'}

Built with @openclaw @coinbase @base 🦞
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
