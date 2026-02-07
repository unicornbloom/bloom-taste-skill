#!/usr/bin/env node
/**
 * Test X Agent locally without actually posting to X
 * 
 * Simulates the full flow:
 * 1. Mock X mention
 * 2. Generate identity
 * 3. Format reply (but don't post)
 */

import 'dotenv/config';
import { BloomIdentitySkillV2 } from '../src/bloom-identity-skill-v2';
import { getViralSkills, formatSkillForX } from '../src/data/viral-skills';

async function testAgent() {
  console.log('🧪 Testing X Agent Flow (Local)\n');

  // Mock user data
  const mockUser = {
    id: 'test_user_123',
    username: 'testuser',
    description: 'Building AI tools and Web3 projects. Love crypto and productivity hacks.',
  };

  console.log('1️⃣ Mock X mention received');
  console.log(`   User: @${mockUser.username}`);
  console.log(`   Bio: ${mockUser.description}\n`);

  // Generate identity
  console.log('2️⃣ Generating identity...');
  const skill = new BloomIdentitySkillV2();
  
  try {
    const result = await skill.execute(`x_${mockUser.id}`, {
      mode: 'auto',
      skipShare: true,
    });

    if (!result.success) {
      console.error('❌ Identity generation failed:', result.error);
      return;
    }

    console.log('✅ Identity generated!\n');

    // Get viral skills
    console.log('3️⃣ Finding viral skills...');
    const viralSkills = getViralSkills(
      result.identityData.mainCategories,
      result.identityData.personalityType,
      3
    );

    console.log(`✅ Found ${viralSkills.length} viral skills\n`);

    // Format reply
    const skillsText = viralSkills
      .map((skill, i) => `${i + 1}. ${formatSkillForX(skill, 85 - i * 3)}`)
      .join('\n');

    const reply = `@${mockUser.username} 🌸 Your Bloom Identity is ready!

🎭 ${result.identityData.personalityType}
💬 "${result.identityData.customTagline}"

🎯 Top Skills for you:
${skillsText}

🔗 View full analysis: ${result.dashboardUrl || 'https://preflight.bloomprotocol.ai'}

#BloomProtocol #BuildOnBase`;

    console.log('4️⃣ Reply formatted (would post to X):\n');
    console.log('─'.repeat(60));
    console.log(reply);
    console.log('─'.repeat(60));

    console.log('\n✅ Test completed successfully!');
    console.log('\nℹ️  To run the actual bot:');
    console.log('   npm run x-agent');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAgent().catch(console.error);
