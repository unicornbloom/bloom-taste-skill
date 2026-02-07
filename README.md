# Bloom Identity Skill

OpenClaw skill for generating personalized Bloom Identity Cards based on Twitter/X and on-chain identity.

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/unicornbloom/bloom-identity-skill.git
cd bloom-identity-skill

# Auto-install dependencies and setup
bash scripts/install.sh
```

### Configuration

Edit `.env` with your credentials:

```bash
# Required
JWT_SECRET=your_jwt_secret_here
DASHBOARD_URL=https://preflight.bloomprotocol.ai
BLOOM_API_URL=https://api.bloomprotocol.ai
NETWORK=base-sepolia

# Required for wallet encryption (generate a random secret)
WALLET_ENCRYPTION_SECRET=your_random_secret_here

# Optional: Coinbase Developer Platform (for advanced wallet features)
# CDP_API_KEY_ID=your_cdp_api_key_id
# CDP_API_KEY_SECRET=your_cdp_api_key_secret
```

### Wallet Creation 🔐

This skill automatically creates **real wallets** for each user:

- ✅ **Zero setup required** - Works out of the box
- ✅ **Real wallets on Base** - Can send/receive funds
- ✅ **Encrypted storage** - Private keys secured with AES-256-GCM
- ✅ **Persistent** - Same user = same wallet across sessions
- ✅ **No external API needed** - Fully standalone

**How it works:**

1. **Tier 1** (Recommended): Use Coinbase Developer Platform (CDP) credentials for production-grade wallets
2. **Tier 2** (Auto-fallback): Create local wallets using viem - fully functional, encrypted, persistent
3. **Tier 3** (Display-only): Mock wallet for UI preview (no real transactions)

**Power users:** To use CDP wallets, add these to your `.env`:
```bash
CDP_API_KEY_ID=your_api_key_id
CDP_API_KEY_SECRET=your_api_key_secret
```

Get CDP credentials at: https://portal.cdp.coinbase.com/projects

### Usage

```bash
# Generate identity card
bash scripts/generate.sh <your-user-id>

# Or use CLI directly
npx tsx src/index.ts --user-id <your-user-id>

# Check health status
bash scripts/health-check.sh
```

## For OpenClaw Agents

### Load the skill

```bash
curl -s https://raw.githubusercontent.com/unicornbloom/bloom-identity-skill/main/skill.json
```

### Triggers

- "generate my bloom identity"
- "create my identity card"
- "analyze my supporter profile"
- "mint my bloom card"
- "discover my personality"

## Architecture

```
bloom-identity-skill/
├── skill.json            # Machine-readable manifest
├── SKILL.md             # Human-readable documentation
├── scripts/
│   ├── install.sh       # Auto-installer with dependency resolution
│   ├── generate.sh      # Main execution script
│   └── health-check.sh  # Status monitoring
├── src/
│   ├── index.ts         # CLI entry point
│   ├── bloom-identity-skill-v2.ts  # Core implementation
│   ├── analyzers/       # Data analysis logic
│   ├── blockchain/      # Agent wallet management
│   └── integrations/    # External APIs (ClawHub, Twitter, X402)
└── package.json         # npm dependencies
```

## Automation Features

### 1. Manifest Parser
- `skill.json` provides structured metadata
- Auto-extracts dependencies and requirements
- Validates environment and permissions

### 2. Dependency Mapping
- `agentKits` section maps skill needs to npm packages
- Automatic version resolution
- Conflict detection

### 3. Dynamic Loading
- Hot-reload capable via `scripts/generate.sh`
- No restart required after updates
- Stateless execution model

### 4. Sandboxing & Permissions
- Declares required network endpoints
- Filesystem access limitations
- Execution permissions (node, npx only)

### 5. Status Feedback
- `health-check.sh` returns JSON status
- Real-time installation progress
- Error reporting with actionable messages

## Development

```bash
# Install dependencies
npm install

# Run directly with ts-node
npx ts-node src/index.ts --user-id test-user

# Build
npm run build

# Test
npm test
```

## License

MIT - Built by [Bloom Protocol](https://bloomprotocol.ai)
