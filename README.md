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
JWT_SECRET=your_jwt_secret_here
DASHBOARD_URL=https://preview.bloomprotocol.ai
```

### Usage

```bash
# Generate identity card
bash scripts/generate.sh --user-id <your-user-id>

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
