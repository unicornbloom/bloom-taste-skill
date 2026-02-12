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
  .option('--mint-to-base', 'Mint identity card as SBT on Base', false)
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
      mintToBase: options.mintToBase,
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
  const { identityData, recommendations, dashboardUrl } = result;

  console.log('');
  console.log(`${getPersonalityEmoji(identityData.personalityType)} You're **${identityData.personalityType}**`);
  console.log(`"${identityData.customTagline}"`);
  console.log(`Categories: ${identityData.mainCategories.join(' • ')}`);
  console.log('');

  if (recommendations?.length > 0) {
    console.log(`🔍 ${recommendations.length} tools & skills matched to your taste`);
  }

  if (dashboardUrl) {
    console.log(`→ See your recommendations: ${dashboardUrl}`);
  }

  console.log('');
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
