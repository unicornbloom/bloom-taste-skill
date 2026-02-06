/**
 * Bloom Identity Card Generator - CLI Entry Point
 *
 * OpenClaw skill wrapper for bloom-identity-skill-v2
 */

import 'dotenv/config';
import { Command } from 'commander';
import { BloomIdentitySkillV2, ExecutionMode } from './bloom-identity-skill-v2';

const program = new Command();

program
  .name('bloom-identity')
  .description('Generate Bloom Identity Card from Twitter/X and on-chain data')
  .version('2.0.0')
  .requiredOption('--user-id <userId>', 'OpenClaw user ID')
  .option('--mode <mode>', 'Execution mode: auto, manual, or hybrid', 'auto')
  .option('--skip-share', 'Skip Twitter share link generation', false)
  .parse(process.argv);

const options = program.opts();

async function main() {
  try {
    console.log('🌸 Bloom Identity Card Generator');
    console.log('================================\n');

    const skill = new BloomIdentitySkillV2();

    const result = await skill.execute(options.userId, {
      mode: options.mode as ExecutionMode,
      skipShare: options.skipShare,
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
    process.exit(1);
  }
}

function formatResult(result: any): void {
  const { identityData, agentWallet, recommendations, mode, dimensions, dashboardUrl } = result;

  const modeEmoji = mode === 'manual' ? '📝' : '🤖';

  console.log(`\n🎉 Bloom Identity Card Ready! ${modeEmoji}\n`);

  // Dashboard URL first (most important)
  if (dashboardUrl) {
    console.log(`🌐 View Your Card:`);
    console.log(`   ${dashboardUrl}\n`);
  }

  console.log(`${getPersonalityEmoji(identityData.personalityType)} ${identityData.personalityType}`);
  console.log(`💬 "${identityData.customTagline}"\n`);
  console.log(`${identityData.customDescription}\n`);
  console.log(`Categories: ${identityData.mainCategories.join(', ')}\n`);

  // 2x2 Metrics
  if (dimensions) {
    console.log(`📊 2x2 Metrics:`);
    console.log(`   Conviction: ${dimensions.conviction}/100`);
    console.log(`   Intuition: ${dimensions.intuition}/100`);
    console.log(`   Contribution: ${dimensions.contribution}/100\n`);
  }

  console.log(`🎯 Matching Skills (${recommendations.length}):`);
  recommendations.slice(0, 5).forEach((skill: any, i: number) => {
    const creatorInfo = skill.creator ? ` • ${skill.creator}` : '';
    console.log(`${i + 1}. ${skill.skillName} (${skill.matchScore}%)${creatorInfo}`);
    console.log(`   ${skill.description}`);
    console.log(`   → ${skill.url}\n`);
  });

  console.log(`🤖 Agent Wallet: ${agentWallet.network}`);
  console.log(`⚠️  Features coming soon (tipping, payments, management)`);
  console.log(`🔒 Do not deposit funds - withdrawals not ready\n`);
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

// Run the CLI
main();
