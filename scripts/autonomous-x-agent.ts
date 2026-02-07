#!/usr/bin/env node
/**
 * Bloom Identity Bot - Autonomous X Agent
 * 
 * Monitors @ mentions on X, generates identity cards, posts results
 * Designed for Base Builder Quest - autonomous, onchain, viral
 * 
 * Usage:
 *   npm run x-agent
 * 
 * Environment variables:
 *   X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET
 *   BLOOM_BOT_USERNAME (default: bloomidentitybot)
 */

import 'dotenv/config';
import { TwitterApi } from 'twitter-api-v2';
import { BloomIdentitySkillV2 } from '../src/bloom-identity-skill-v2';
import { getViralSkills, formatSkillForX } from '../src/data/viral-skills';

interface ProcessedMention {
  mentionId: string;
  timestamp: number;
}

class BloomXAgent {
  private client: TwitterApi;
  private skill: BloomIdentitySkillV2;
  private botUsername: string;
  private processedMentions: Set<string>;
  private lastMentionId: string | null = null;

  constructor() {
    // Initialize X API client
    this.client = new TwitterApi({
      appKey: process.env.X_API_KEY!,
      appSecret: process.env.X_API_SECRET!,
      accessToken: process.env.X_ACCESS_TOKEN!,
      accessSecret: process.env.X_ACCESS_SECRET!,
    });

    // Initialize Bloom Identity Skill
    this.skill = new BloomIdentitySkillV2();
    
    // Bot configuration
    this.botUsername = process.env.BLOOM_BOT_USERNAME || 'bloomidentitybot';
    this.processedMentions = new Set();

    console.log('🤖 Bloom Identity Bot initialized');
    console.log(`📱 Listening for @${this.botUsername} mentions`);
  }

  /**
   * Main agent loop - runs forever
   */
  async run() {
    console.log('🚀 Starting autonomous agent...');

    while (true) {
      try {
        // Check for new mentions every minute
        await this.checkMentions();
        
        // Wait 60 seconds before next check
        await this.sleep(60000);
      } catch (error) {
        console.error('❌ Error in main loop:', error);
        // Wait a bit longer on error to avoid rate limits
        await this.sleep(120000);
      }
    }
  }

  /**
   * Check for new @ mentions
   */
  private async checkMentions() {
    try {
      // Get recent mentions (X API v2)
      const mentions = await this.client.v2.userMentionTimeline(
        this.botUsername,
        {
          max_results: 10,
          since_id: this.lastMentionId || undefined,
          'tweet.fields': ['author_id', 'created_at', 'text'],
        }
      );

      if (!mentions.data || mentions.data.data.length === 0) {
        console.log('💤 No new mentions');
        return;
      }

      console.log(`📨 Found ${mentions.data.data.length} new mentions`);

      // Process each mention
      for (const mention of mentions.data.data) {
        // Skip if already processed
        if (this.processedMentions.has(mention.id)) {
          continue;
        }

        // Process this mention
        await this.processMention(mention);
        
        // Mark as processed
        this.processedMentions.add(mention.id);
        this.lastMentionId = mention.id;

        // Rate limit: wait 5 seconds between replies
        await this.sleep(5000);
      }
    } catch (error) {
      console.error('❌ Error checking mentions:', error);
    }
  }

  /**
   * Process a single mention - generate identity and reply
   */
  private async processMention(mention: any) {
    const userId = mention.author_id;
    const mentionId = mention.id;
    const text = mention.text;

    console.log(`\n🎯 Processing mention from user ${userId}`);
    console.log(`📝 Text: ${text}`);

    try {
      // 1. Fetch user's X profile
      console.log('1️⃣ Fetching user profile...');
      const user = await this.client.v2.user(userId, {
        'user.fields': ['description', 'public_metrics', 'created_at'],
      });

      // 2. Fetch recent tweets for analysis
      console.log('2️⃣ Fetching recent tweets...');
      const tweets = await this.client.v2.userTimeline(userId, {
        max_results: 50,
        exclude: ['retweets', 'replies'],
      });

      // 3. Convert X data to skill input format
      const userData = this.convertXDataToSkillInput(user.data, tweets.data.data);

      // 4. Generate identity using Bloom skill
      console.log('3️⃣ Generating identity...');
      const result = await this.skill.execute(`x_${userId}`, {
        mode: 'auto',
        skipShare: true,
      });

      if (!result.success) {
        throw new Error(result.error || 'Identity generation failed');
      }

      // 5. Get viral-friendly skills (with active X creators)
      console.log('4️⃣ Finding viral skills...');
      const viralSkills = getViralSkills(
        result.identityData.mainCategories,
        result.identityData.personalityType,
        3  // Top 3
      );

      // 6. Format reply (privacy-aware)
      const reply = this.formatReply(
        user.data.username,
        result.identityData,
        viralSkills,
        result.dashboardUrl
      );

      // 7. Post reply
      console.log('5️⃣ Posting reply...');
      await this.client.v2.reply(reply, mentionId);

      console.log('✅ Reply posted successfully!');
      console.log(`🔗 Dashboard: ${result.dashboardUrl}`);
    } catch (error) {
      console.error('❌ Error processing mention:', error);
      
      // Try to send error reply
      try {
        await this.client.v2.reply(
          `@${mention.author_id} Sorry, I encountered an error generating your identity. Please try again later!`,
          mentionId
        );
      } catch (replyError) {
        console.error('❌ Could not send error reply:', replyError);
      }
    }
  }

  /**
   * Convert X profile data to skill input format
   */
  private convertXDataToSkillInput(user: any, tweets: any[]) {
    // Extract bio/interests from user description
    const bio = user.description || '';
    
    // Analyze recent tweets for topics/sentiment
    const tweetTexts = tweets.map(t => t.text).join(' ');
    
    // TODO: More sophisticated analysis
    // For now, just pass bio and recent tweets
    return {
      bio,
      recentActivity: tweetTexts,
      metrics: user.public_metrics,
    };
  }

  /**
   * Format privacy-aware reply for X
   */
  private formatReply(
    username: string,
    identity: any,
    viralSkills: any[],
    dashboardUrl?: string
  ): string {
    const { personalityType, customTagline } = identity;

    // Format skills with creator tags
    const skillsText = viralSkills
      .map((skill, i) => `${i + 1}. ${formatSkillForX(skill, 85 - i * 3)}`)
      .join('\n');

    return `@${username} 🌸 Your Bloom Identity is ready!

🎭 ${personalityType}
💬 "${customTagline}"

🎯 Top Skills for you:
${skillsText}

🔗 View full analysis: ${dashboardUrl || 'https://preflight.bloomprotocol.ai'}

#BloomProtocol #BuildOnBase`;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run agent
async function main() {
  console.log('🌸 Bloom Identity Bot - Autonomous X Agent');
  console.log('=========================================\n');

  // Validate environment
  const required = ['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nPlease set these in your .env file');
    process.exit(1);
  }

  // Create and run agent
  const agent = new BloomXAgent();
  await agent.run();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
