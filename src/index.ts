/**
 * Bloom Identity Card Generator - CLI Entry Point
 *
 * OpenClaw skill wrapper for bloom-identity-skill-v2
 */

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
  const { identityData, agentWallet, recommendations, mode, dataQuality, dashboardUrl, shareUrl } = result;

  const modeEmoji = mode === 'manual' ? '📝' : '🤖';
  const qualityText = dataQuality ? ` (${dataQuality}% confidence)` : '';

  console.log(`\n🎉 Your Bloom Identity Card is ready! ${modeEmoji}\n`);

  console.log(`${getPersonalityEmoji(identityData.personalityType)} **${identityData.personalityType}**${qualityText}`);
  console.log(`💬 "${identityData.customTagline}"\n`);

  console.log(`📝 ${identityData.customDescription}\n`);

  console.log(`🏷️ Categories: ${identityData.mainCategories.join(', ')}\n`);

  console.log(`🎯 Recommended OpenClaw Skills (${recommendations.length}):`);
  recommendations.slice(0, 5).forEach((skill: any, i: number) => {
    console.log(`${i + 1}. **${skill.skillName}** (${skill.matchScore}% match)`);
    console.log(`   ${skill.description}`);
    console.log(`   💡 Tip creators with your Agent wallet below!\n`);
  });

  console.log(`🤖 Agent On-Chain Identity`);
  console.log(`📍 Wallet: ${agentWallet.address.slice(0, 6)}...${agentWallet.address.slice(-4)}`);
  console.log(`🔗 X402: ${agentWallet.x402Endpoint}`);
  console.log(`⛓️  Network: ${agentWallet.network}\n`);

  if (dashboardUrl) {
    console.log(`🌐 View full dashboard:`);
    console.log(`   ${dashboardUrl}\n`);
  }

  if (shareUrl) {
    console.log(`📢 Share on Twitter:`);
    console.log(`   ${shareUrl}\n`);
  }
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
