---
name: bloom-identity
description: Generate Bloom Identity Card from Twitter/X and on-chain data. Analyzes supporter profile, creates personality type (Visionary/Explorer/Cultivator/Optimizer/Innovator), recommends matching OpenClaw skills, and generates agent wallet. Use when user asks to "generate my bloom identity", "create identity card", "analyze my profile", or "discover my personality".
homepage: https://bloomprotocol.ai
metadata:
  {
    "openclaw": {
      "emoji": "🌸",
      "requires": { "bins": ["node", "npx"] }
    }
  }
---

# Bloom Identity Card Generator

Generate personalized Bloom Identity Cards based on Twitter/X activity and on-chain identity.

## Usage

Run the generator script:

```bash
bash scripts/generate.sh --user-id $USER_ID
```

Or call directly from OpenClaw:

```bash
bash scripts/generate.sh --user-id $OPENCLAW_USER_ID
```

## Output

Returns:

- Personality type (Visionary/Explorer/Cultivator/Optimizer/Innovator)
- Confidence score  
- Custom tagline and description
- Main categories and subcategories
- Recommended OpenClaw skills (with match scores)
- Agent wallet address (on Base Sepolia)
- X402 payment endpoint
- Dashboard link with auth token

## Example

**User**: "Generate my bloom identity"

**Agent runs**:
```bash
bash scripts/generate.sh --user-id user123
```

**Returns**:
```
🎉 Your Bloom Identity Card is ready! 🤖

💜 The Visionary (85% confidence)
💬 "See beyond the hype"

📝 You are a forward-thinking builder who sees beyond 
    the hype and focuses on real-world impact.

🏷️ Categories: Crypto, DeFi, Web3

🎯 Recommended OpenClaw Skills (3):
1. DeFi Protocol Analyzer (95% match)
2. Smart Contract Auditor (90% match)
3. Gas Optimizer (88% match)

🤖 Agent On-Chain Identity
📍 Wallet: 0x03Ce...9905
🔗 X402: https://x402.bloomprotocol.ai/base-sepolia/0x...
⛓️  Network: base-sepolia

🌐 View full dashboard:
   https://preview.bloomprotocol.ai/dashboard?token=xxx
```

## Triggers

- "generate my bloom identity"
- "create my identity card"  
- "analyze my supporter profile"
- "mint my bloom card"
- "discover my personality"

## Technical Details

- **Version**: 2.0.0
- **Network**: Base Sepolia (testnet)
- **Authentication**: EIP-191 signed tokens with 7-layer security
- **Data Sources**: Twitter/X, on-chain transactions
- **Integration**: Coinbase AgentKit + ClawHub API

## Requirements

- Node.js 18+
- Environment variables:
  - `JWT_SECRET` - JWT signing secret
  - `DASHBOARD_URL` - Dashboard URL (default: https://preview.bloomprotocol.ai)
  - `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET` - Coinbase CDP credentials (optional)

## Installation

```bash
# Clone or download the skill
git clone https://github.com/unicornbloom/bloom-identity-skill.git

# Install dependencies
cd bloom-identity-skill
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your credentials
```

---

Built by [Bloom Protocol](https://bloomprotocol.ai)
