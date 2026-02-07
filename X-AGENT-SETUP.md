# 🤖 Bloom Identity Bot - X Agent Setup

Autonomous X bot for Base Builder Quest that generates identity cards when mentioned.

## 🎯 What It Does

```
User tweets: "@bloomidentitybot create my identity"
    ↓
Bot (autonomous):
  1. Fetches user's X profile + recent tweets
  2. Generates identity card using Bloom skill
  3. Creates wallet on Base
  4. Replies with results + dashboard link
    ↓
User clicks dashboard → sees full identity
User shares → friends mention bot → VIRAL LOOP! 🔥
```

---

## 📋 Requirements

### X Developer Account

1. Go to https://developer.x.com/
2. Create a new app
3. Get API keys:
   - API Key (Consumer Key)
   - API Secret (Consumer Secret)
   - Access Token
   - Access Token Secret

### X Account for Bot

1. Create new X account: `@bloomidentitybot` (or your choice)
2. Update bot profile:
   - Bio: "🌸 Autonomous identity card generator | Built with @OpenClawHQ on @base | Tag me to get your Bloom Identity!"
   - Profile pic: Bloom logo
   - Banner: Something eye-catching

---

## ⚙️ Setup

### Step 1: Install Dependencies

```bash
cd bloom-identity-skill
npm install
```

### Step 2: Configure Environment

```bash
# Add to .env
X_API_KEY=your_x_api_key
X_API_SECRET=your_x_api_secret
X_ACCESS_TOKEN=your_x_access_token
X_ACCESS_SECRET=your_x_access_secret
BLOOM_BOT_USERNAME=bloomidentitybot

# Existing Bloom config
JWT_SECRET=your_jwt_secret
DASHBOARD_URL=https://preflight.bloomprotocol.ai
BLOOM_API_URL=https://api.bloomprotocol.ai
NETWORK=base-sepolia

# Optional: CDP credentials for real wallets
# CDP_API_KEY_ID=...
# CDP_API_KEY_SECRET=...
# CDP_WALLET_SECRET=...
```

### Step 3: Update Viral Skills List

Edit `src/data/viral-skills.ts` with real X creators:

```typescript
{
  skillId: 'meow-finder',
  skillName: 'Meow Finder',
  creatorX: 'actual_creator_handle',  // ← Update this!
  isActive: true,
}
```

**How to find active creators:**
1. Search ClawHub for skills
2. Find skills with GitHub links
3. Check if creator has X account
4. Verify they're active (posted recently)
5. Add to viral-skills.ts

---

## 🚀 Running the Bot

### Local Testing

```bash
# Run bot locally
npm run x-agent

# You should see:
🤖 Bloom Identity Bot initialized
📱 Listening for @bloomidentitybot mentions
🚀 Starting autonomous agent...
💤 No new mentions
```

### Test It

1. From another X account, tweet:
   ```
   @bloomidentitybot create my identity
   ```

2. Bot should reply within ~60 seconds:
   ```
   @yourusername 🌸 Your Bloom Identity is ready!
   
   🎭 The Visionary
   💬 "See beyond the hype"
   
   🎯 Top Skills for you:
   1. Meow Finder (85%) by @creator1
   2. DeFi Tools (82%) by @creator2
   3. JS SDK (79%) by @creator3
   
   🔗 View full analysis:
   https://preflight.bloomprotocol.ai/agents/12345
   ```

---

## 🚢 Deployment (24/7 Running)

### Option A: Railway (Recommended)

**Why Railway:**
- ✅ Easy setup
- ✅ $5/month
- ✅ Auto-restart on crash
- ✅ Environment variables
- ✅ Logs/monitoring

**Steps:**

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "feat: add autonomous X agent"
   git push
   ```

2. **Deploy to Railway**
   - Go to railway.app
   - Connect GitHub repo
   - Select `bloom-identity-skill`
   - Set start command: `npm run x-agent`

3. **Set Environment Variables**
   ```
   X_API_KEY=...
   X_API_SECRET=...
   X_ACCESS_TOKEN=...
   X_ACCESS_SECRET=...
   BLOOM_BOT_USERNAME=bloomidentitybot
   JWT_SECRET=...
   DASHBOARD_URL=https://preflight.bloomprotocol.ai
   BLOOM_API_URL=https://api.bloomprotocol.ai
   NETWORK=base-sepolia
   ```

4. **Deploy!**
   - Bot runs 24/7 ✅
   - Auto-restarts if crash ✅
   - Logs available in Railway dashboard ✅

---

### Option B: AWS EC2 / DigitalOcean (Cheaper)

**Cost:** $3-5/month

**Steps:**

1. **Create Ubuntu server**
   ```bash
   # SSH into server
   ssh root@your-server-ip
   ```

2. **Install Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Clone & Setup**
   ```bash
   git clone https://github.com/unicornbloom/bloom-identity-skill.git
   cd bloom-identity-skill
   npm install
   
   # Create .env with your credentials
   nano .env
   ```

4. **Run with PM2 (process manager)**
   ```bash
   npm install -g pm2
   pm2 start "npm run x-agent" --name bloom-bot
   pm2 save
   pm2 startup  # Auto-start on reboot
   ```

5. **Check logs**
   ```bash
   pm2 logs bloom-bot
   ```

---

## 📊 Monitoring

### Railway

- Dashboard → Logs
- See real-time mentions + responses

### PM2 (if using EC2/DO)

```bash
pm2 logs bloom-bot          # View logs
pm2 status                  # Check if running
pm2 restart bloom-bot       # Restart bot
```

### What to Monitor

- ✅ New mentions detected
- ✅ Identities generated
- ✅ Replies posted
- ❌ API errors
- ❌ Rate limits

---

## 🎯 Viral Marketing Strategy

### Phase 1: Seed (Week 1)

```
1. Bot goes live
2. You + team members use it
3. Share results on your profiles
4. Tag friends to try it
```

### Phase 2: Creator Outreach

```
1. DM skill creators:
   "Hey! Our bot recommends your skill.
    Want to help spread it? 
    Just @ the bot and share your result!"

2. Creators try bot
3. Creators share (their followers see it)
4. Viral loop starts 🔥
```

### Phase 3: Community

```
1. Post in Base Discord/Telegram
2. "Try our autonomous bot! @bloomidentitybot"
3. People try it
4. They share results
5. More people try it
6. GROWTH! 📈
```

---

## 🏆 Builder Quest Submission

### What You'll Have

```
✅ Autonomous agent (@bloomidentitybot)
✅ Lives on X (24/7)
✅ Transacts on Base (creates wallets)
✅ Novel primitive (social → onchain identity)
✅ No human in the loop
✅ Viral mechanics
```

### Submission Format

**Comment on Builder Quest post:**

```
Submission: Bloom Identity Bot 🌸

📱 X Profile: https://x.com/bloomidentitybot

🤖 What it does:
- Autonomous bot that generates identity cards from X profiles
- Mints identity as wallet on Base
- Recommends OpenClaw skills based on personality
- Fully autonomous, no human intervention

🔗 Try it: Just @ the bot!

📺 Demo video: [link to demo]

📚 Technical write-up: [link to blog post explaining architecture]

#BuildOnBase #OpenClaw
```

---

## 🐛 Troubleshooting

### Bot not responding

1. Check logs
2. Verify API keys are correct
3. Check X API rate limits
4. Restart bot

### Rate limit errors

- X API has rate limits
- Bot waits 60s between checks
- Waits 5s between replies
- Should stay under limits

### Identity generation fails

- Check Bloom backend is up
- Verify .env credentials
- Check skill logs

---

## 🎉 Success Metrics

Track these for hackathon:

- 📊 Mentions received
- 🎨 Identities generated
- 💬 Replies posted
- 🔗 Dashboard clicks
- 🔄 Viral shares (people tagging friends)
- ⛓️ Wallets created on Base

---

## 💡 Future Enhancements

After hackathon:

- [ ] Support Farcaster too
- [ ] Add personality trends ("Most common type: The Visionary")
- [ ] Leaderboard of most-shared identities
- [ ] Creator tipping via X402
- [ ] NFT minting of identity cards

---

**Questions?** Check logs or open an issue on GitHub!

*Built with ❤️ for Base Builder Quest*
