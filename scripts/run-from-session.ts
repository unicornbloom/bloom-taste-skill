/**
 * Run Bloom Identity using full OpenClaw session history
 *
 * This script reads the complete JSONL session file and extracts the last ~120 messages
 * for comprehensive personality analysis.
 *
 * Usage:
 *   npx tsx scripts/run-from-session.ts <sessionJsonlPath> <userId>
 *
 * Example:
 *   npx tsx scripts/run-from-session.ts ~/.openclaw/agents/main/sessions/abc123.jsonl telegram:123
 */

import * as fs from 'fs';
import * as readline from 'readline';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { BloomIdentitySkillV2 } from '../src/bloom-identity-skill-v2';

/**
 * Read JSONL file and parse messages
 */
async function readJsonl(filePath: string, limit = 120): Promise<any[]> {
  const lines: string[] = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (line.trim()) {
      lines.push(line);
    }
  }

  // Take last N lines (most recent conversation)
  const recentLines = lines.slice(-limit);

  // Parse JSON
  return recentLines.map(line => {
    try {
      return JSON.parse(line);
    } catch (err) {
      console.warn('⚠️  Failed to parse line:', line.slice(0, 50));
      return null;
    }
  }).filter(Boolean);
}

/**
 * Extract conversation text from session messages
 */
function extractConversation(messages: any[]): string {
  const parts: string[] = [];

  for (const msg of messages) {
    if (!msg?.message) continue;

    const { role, content } = msg.message;

    if (role !== 'user' && role !== 'assistant') continue;

    // Flatten content array to text
    let text = '';
    if (Array.isArray(content)) {
      text = content
        .map((c: any) => c.text || '')
        .join(' ')
        .trim();
    } else if (typeof content === 'string') {
      text = content.trim();
    }

    if (text) {
      const prefix = role === 'user' ? 'User' : 'Assistant';
      parts.push(`${prefix}: ${text}`);
    }
  }

  return parts.join('\n');
}

async function main() {
  const sessionPath = process.argv[2];
  const userId = process.argv[3] || 'context-user';

  if (!sessionPath) {
    console.error('❌ Error: Session file path required\n');
    console.error('Usage:');
    console.error('  npx tsx scripts/run-from-session.ts <sessionJsonlPath> <userId>\n');
    console.error('Example:');
    console.error('  npx tsx scripts/run-from-session.ts ~/.openclaw/agents/main/sessions/abc123.jsonl telegram:123');
    process.exit(1);
  }

  if (!fs.existsSync(sessionPath)) {
    console.error(`❌ Error: Session file not found: ${sessionPath}`);
    process.exit(1);
  }

  try {
    console.log('🌸 Bloom Identity Card Generator (from session)');
    console.log('=============================================\n');

    // Read session file
    console.log(`📖 Reading session: ${path.basename(sessionPath)}`);
    const messages = await readJsonl(sessionPath, 120);
    console.log(`✅ Read ${messages.length} messages\n`);

    // Extract conversation
    const conversationText = extractConversation(messages);

    if (!conversationText.trim()) {
      console.error('❌ No conversation text found in session file');
      console.error('   The session file may be empty or in an unexpected format');
      process.exit(1);
    }

    const messageCount = conversationText.split('\n').length;
    console.log(`📊 Extracted ${messageCount} conversation turns\n`);

    // Run Bloom analysis
    const skill = new BloomIdentitySkillV2();
    const result = await skill.execute(userId, {
      conversationText,
      skipShare: true, // Skip Twitter share for session-based analysis
    });

    if (!result.success) {
      if (result.needsManualInput) {
        console.error('\n❌ Insufficient data. Manual Q&A required.');
        console.error('Questions:', result.manualQuestions);
        process.exit(1);
      }

      console.error(`\n❌ Failed: ${result.error}`);
      process.exit(1);
    }

    // Format and output the result
    formatResult(result);

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

function formatResult(result: any): void {
  const { identityData, agentWallet, recommendations, mode, dimensions, dashboardUrl } = result;

  const modeEmoji = '🤖';

  // Top border
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`🎉 Your Bloom Identity Card is ready! ${modeEmoji}`);
  console.log('═══════════════════════════════════════════════════════\n');

  // Dashboard URL first (most important)
  if (dashboardUrl) {
    console.log('🔗 VIEW YOUR IDENTITY CARD:\n');
    console.log(`   ${dashboardUrl}\n`);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Personality (real data from analysis)
  console.log(`${getPersonalityEmoji(identityData.personalityType)} ${identityData.personalityType}`);
  console.log(`💬 "${identityData.customTagline}"\n`);
  console.log(`${identityData.customDescription}\n`);

  // Categories (real data)
  console.log(`🏷️  Categories: ${identityData.mainCategories.join(' · ')}`);
  if (identityData.subCategories && identityData.subCategories.length > 0) {
    console.log(`   Interests: ${identityData.subCategories.slice(0, 5).join(' · ')}`);
  }
  console.log('');

  // 2x2 Metrics (NO data quality shown)
  if (dimensions) {
    const isCultivator = identityData.personalityType === 'The Cultivator';

    console.log('📊 2x2 Dimensions:');
    console.log(`   Conviction: ${dimensions.conviction}/100`);
    console.log(`   Intuition: ${dimensions.intuition}/100`);

    // Only show contribution for The Cultivator
    if (isCultivator) {
      console.log(`   Contribution: ${dimensions.contribution}/100`);
    }
    console.log('');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Skills (real recommendations from ClawHub)
  if (recommendations && recommendations.length > 0) {
    console.log(`🎯 Top ${Math.min(5, recommendations.length)} Recommended Skills:\n`);
    recommendations.slice(0, 5).forEach((skill: any, i: number) => {
      const creatorInfo = skill.creator ? ` · by ${skill.creator}` : '';
      console.log(`${i + 1}. ${skill.skillName} (${skill.matchScore}% match)${creatorInfo}`);
      console.log(`   ${skill.description}`);
      if (skill.url) {
        console.log(`   → ${skill.url}`);
      }
      console.log('');
    });
  } else {
    console.log('🎯 Skill Recommendations:\n');
    console.log('   No matching skills found at this time\n');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Wallet info with marketing message
  console.log('🤖 Your Agent Wallet Created\n');
  console.log(`   Network: ${agentWallet?.network || 'Base'}`);
  console.log('   Status: ✅ Wallet generated and registered\n');
  console.log('   💡 Use your agent wallet to tip skill creators!');
  console.log('   ⚠️  Tipping, payments, and management features coming soon');
  console.log('   🔒 Do not deposit funds - withdrawals not ready yet\n');

  console.log('═══════════════════════════════════════════════════════\n');
  console.log('🌸 Bloom Identity · Built with @openclaw @coinbase @base\n');
}

function getPersonalityEmoji(type: string): string {
  const emojiMap: Record<string, string> = {
    'The Visionary': '💜',
    'The Explorer': '💚',
    'The Cultivator': '🩷',
    'The Optimizer': '🧡',
    'The Innovator': '💙',
  };
  return emojiMap[type] || '🌸';
}

// Run the script
main();
