---
name: bloom-identity-openclaw
description: Generate Bloom Identity Card from current conversation. Analyzes your personality directly from the conversation context without needing external data. Creates personalized identity type, recommends matching skills, and generates dashboard link.
user-invocable: true
command-dispatch: tool
metadata: {"requires": {"bins": ["node", "npx"]}}
---

# Bloom Identity - OpenClaw Bot Integration

Generate your personalized Bloom Identity Card **directly from the current conversation**.

## How It Works

This skill analyzes your conversation with OpenClaw bot to:
1. **Detect your personality type** (Visionary/Explorer/Cultivator/Optimizer/Innovator)
2. **Identify your interests** from topics discussed
3. **Recommend matching OpenClaw skills** based on your profile
4. **Generate a shareable dashboard** with your identity card

## Key Features

✅ **No external data needed** - Uses current conversation context
✅ **Privacy-first** - No Twitter/wallet analysis required
✅ **Instant results** - Works with as few as 3+ messages
✅ **Real recommendations** - Matches you with actual OpenClaw skills

## Usage

Simply say:
```
/bloom-identity
```

Or:
```
generate my bloom identity
```

## Requirements

- **Minimum 3 messages** in current conversation
- Node.js 18+ (usually already available)
- Bloom Identity Skill installed in workspace

## Output

You'll receive:
- 🎴 **Personality Type** (e.g., "The Innovator")
- 💬 **Custom Tagline** personalized to you
- 🏷️ **Main Categories** detected from conversation
- 🎯 **Top 5 Skill Recommendations** with match scores
- 🔗 **Dashboard Link** to view and share your identity card
- 🤖 **Agent Wallet** for tipping skill creators

## Example

**You**: `/bloom-identity`

**Bot**: Analyzing your conversation...

```
═══════════════════════════════════════════════════════
🎉 Your Bloom Identity Card is ready! 🤖
═══════════════════════════════════════════════════════

🔗 VIEW YOUR IDENTITY CARD (Click below):
   https://bloomprotocol.ai/agents/12345

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💙 The Innovator
💬 "First to back new tech"

📝 A technology pioneer who jumps on cutting-edge AI tools.

🏷️  Categories: AI Tools, Technology, Innovation
   Interests: AI Assistants, Content Creation, Code Tools

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 Recommended OpenClaw Skills (5):

1. ai-code-review (95% match) • by Alice
   Automated code review using GPT-4
   💡 Tip creators with your Agent wallet!
   → https://clawhub.com/skills/ai-code-review

...
```

## Implementation

This skill reads the complete OpenClaw session history (last ~120 messages) for comprehensive analysis:

```bash
# Option 1: From session file (recommended - full context)
npx tsx scripts/run-from-session.ts ~/.openclaw/agents/main/sessions/<SessionId>.jsonl <userId>

# Option 2: From piped context (quick test)
<conversation-context> | npx tsx scripts/run-from-context.ts --user-id <userId>
```

### Finding Your Session File

```bash
# Session files location
~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl

# Example
~/.openclaw/agents/main/sessions/abc123def456.jsonl
```

## Installation

1. Clone Bloom Identity Skill to your workspace:
```bash
cd ~/.openclaw/workspace
git clone https://github.com/unicornbloom/bloom-identity-skill.git
cd bloom-identity-skill
npm install
```

2. Copy this skill wrapper to OpenClaw skills directory:
```bash
cp -r openclaw-wrapper ~/.openclaw/skills/bloom-identity-openclaw
```

3. Test it:
```
/bloom-identity
```

## Troubleshooting

**"Insufficient conversation data"**
- Continue chatting with OpenClaw (need 3+ messages)
- Try asking questions or discussing topics you're interested in

**"Command not found"**
- Verify bloom-identity-skill is installed in `~/.openclaw/workspace/`
- Run `npm install` in the bloom-identity-skill directory

**"No recommendations"**
- The skill is working but couldn't find matching skills
- This is expected if ClawHub API is unavailable

## Privacy

- ✅ Only uses current conversation (no external APIs required)
- ✅ Twitter/X integration is optional (skipped by default)
- ✅ No wallet transaction analysis
- ✅ Data is not stored long-term

## Technical Details

- **Version**: 2.0.0
- **Minimum Messages**: 3
- **Data Weight**: 100% conversation (no Twitter/wallet needed)
- **Analysis Time**: ~2-5 seconds
- **Output Format**: Text + Dashboard URL

---

Built by [Bloom Protocol](https://bloomprotocol.ai) 🌸
