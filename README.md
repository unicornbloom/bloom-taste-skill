# Bloom Identity Skill

OpenClaw skill for generating personalized Bloom Identity Cards based on **conversation history** (primary, 85% weight) and **Twitter/X data** (optional, 15% weight).

## Data Sources & Privacy

This skill analyzes personality from:

1. **Conversation History** (85% weight) - Always available, owned by OpenClaw
   - Most authentic representation of who you are
   - Analyzes topics, interests, preferences from your conversations
   - No special permissions required

2. **Twitter/X Data** (15% weight) - Optional enhancement
   - **Auto-detected**: If bird CLI is installed, automatically used
   - **Graceful fallback**: If not installed, uses conversation only
   - Fetches real data via bird CLI (cookie auth)
   - Includes: bio, recent tweets, following list, interactions

3. **Wallet** - Creation only, NOT analyzed
   - Creates Tier 2/3 local wallet for tipping/payments
   - **Does NOT analyze** transaction history (privacy-preserving)
   - Private keys encrypted with AES-256-GCM

**Key Principle**: Conversation > Twitter > No wallet analysis

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

# Required for wallet encryption (CRITICAL: use a strong random secret!)
WALLET_ENCRYPTION_SECRET=your_random_secret_here

# Optional: Coinbase Developer Platform (for advanced wallet features)
# CDP_API_KEY_ID=your_cdp_api_key_id
# CDP_API_KEY_SECRET=your_cdp_api_key_secret
```

**Generate a strong encryption secret:**
```bash
# Option 1: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: Using OpenSSL
openssl rand -hex 32
```

### Wallet Creation 🔐

This skill automatically creates **real wallets** for each user:

- ✅ **Zero setup required** - Works out of the box
- ✅ **Real wallets on Base** - Can send/receive funds
- ✅ **Encrypted storage** - Private keys secured with AES-256-GCM encryption
- ✅ **Persistent** - Same user = same wallet across sessions
- ✅ **No external API needed** - Fully standalone

**How it works:**

1. **Tier 1** (Recommended): Use Coinbase Developer Platform (CDP) credentials for production-grade wallets
2. **Tier 2** (Auto-fallback): Create local wallets using viem - fully functional, encrypted with AES-256-GCM, persistent
3. **Tier 3** (Display-only): Mock wallet for UI preview (no real transactions)

**🔐 Security:**
- **Tier 2 local wallets** are encrypted with **AES-256-GCM** (industry standard)
- Private keys never leave your server and are encrypted at rest
- **CRITICAL**: Set a strong `WALLET_ENCRYPTION_SECRET` in your `.env` (see below)
- Both Tier 1 (CDP) and Tier 2 (Local) are **production-ready**

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

### 🎁 Optional: Enhanced Twitter Analysis

**The skill works perfectly without any additional setup!** However, if you want more accurate personality analysis with Twitter/X data, you can optionally install bird CLI:

```bash
# Install bird CLI (requires Node >= 20)
npm install -g @steipete/bird

# Verify installation
bird --version
```

**What happens:**

| Setup | Analysis Source | Accuracy | User Experience |
|-------|----------------|----------|-----------------|
| **Without bird CLI** | Conversations only | **85%** | ✅ Zero setup, works immediately |
| **With bird CLI** | Conversations + Twitter | **100%** | ✅ Auto-detected, enhanced results |

**Key features:**
- ✅ **Auto-detection** - Skill automatically uses bird CLI if installed
- ✅ **Graceful fallback** - Works perfectly without it
- ✅ **Progressive enhancement** - Better results if available
- ✅ **Cookie-based auth** - No API keys needed

**Privacy & Safety:**
- Bird CLI uses cookie authentication (reads from your browser session)
- Read-only commands (timeline, search) have 99.8% reliability
- No account warnings for read operations
- Learn more: [bird CLI documentation](https://github.com/steipete/bird)

**When to install:**
- ✅ You want personality analysis based on your Twitter bio and tweets
- ✅ You're okay with bird CLI accessing your Twitter session cookies
- ❌ You prefer conversation-only analysis (default is already great!)

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
