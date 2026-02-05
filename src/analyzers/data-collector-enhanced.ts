/**
 * Enhanced Data Collector with Permissions Handling
 *
 * Collects user data from multiple sources with graceful fallbacks
 * when permissions are denied or data is unavailable.
 */

export interface TwitterData {
  bio: string;
  following: string[];  // Accounts they follow
  tweets: Array<{
    text: string;
    likes?: number;
    retweets?: number;
    timestamp?: number;
  }>;
  interactions: {
    likes: string[];      // Accounts they frequently like
    retweets: string[];   // Accounts they frequently retweet
    replies: string[];    // Accounts they frequently reply to
  };
}

export interface WalletData {
  address: string;
  // Tokens
  tokens: Array<{
    symbol: string;
    name: string;
    balance: string;
    value?: number;
  }>;
  // NFTs
  nfts: Array<{
    collection: string;
    name: string;
    tokenId: string;
    image?: string;
  }>;
  // Transactions
  transactions: Array<{
    hash: string;
    to: string;
    value: string;
    timestamp: number;
    method?: string;
  }>;
  // DeFi Protocols
  defiProtocols: string[];  // e.g., ['Uniswap', 'Aave', 'Compound']
}

export interface FarcasterData {
  bio: string;
  channels: string[];  // Channels they're in
  casts: Array<{
    text: string;
    timestamp: number;
  }>;
  following: string[];  // Accounts they follow
}

export interface ConversationMemory {
  topics: string[];      // Topics discussed
  interests: string[];   // Expressed interests
  preferences: string[]; // Stated preferences
  history: string[];     // Raw conversation snippets
}

export interface UserData {
  sources: string[];  // Which sources were successfully collected
  permissions: {
    twitter: boolean;
    wallet: boolean;
    farcaster: boolean;
    conversation: boolean;
  };
  twitter?: TwitterData;
  wallet?: WalletData;
  farcaster?: FarcasterData;
  conversationMemory?: ConversationMemory;
}

export class EnhancedDataCollector {
  /**
   * Collect all available user data with permission handling
   */
  async collect(
    userId: string,
    options?: {
      skipTwitter?: boolean;
      skipWallet?: boolean;
      skipFarcaster?: boolean;
    }
  ): Promise<UserData> {
    console.log(`📊 Collecting data for user: ${userId}`);

    const userData: UserData = {
      sources: [],
      permissions: {
        twitter: false,
        wallet: false,
        farcaster: false,
        conversation: false,
      },
    };

    // Collect Twitter/X data (priority)
    if (!options?.skipTwitter) {
      try {
        const hasPermission = await this.checkTwitterPermission(userId);
        userData.permissions.twitter = hasPermission;

        if (hasPermission) {
          userData.twitter = await this.collectTwitterData(userId);
          userData.sources.push('Twitter');
          console.log('✅ Twitter data collected');
        } else {
          console.log('⚠️  Twitter permission denied by user');
        }
      } catch (error) {
        console.warn('⚠️  Twitter data unavailable:', error);
      }
    }

    // Collect Wallet data
    if (!options?.skipWallet) {
      try {
        const hasPermission = await this.checkWalletPermission(userId);
        userData.permissions.wallet = hasPermission;

        if (hasPermission) {
          userData.wallet = await this.collectWalletData(userId);
          userData.sources.push('Wallet');
          console.log('✅ Wallet data collected');
        } else {
          console.log('⚠️  Wallet permission denied by user');
        }
      } catch (error) {
        console.warn('⚠️  Wallet data unavailable:', error);
      }
    }

    // Collect Farcaster data (optional)
    if (!options?.skipFarcaster) {
      try {
        const hasPermission = await this.checkFarcasterPermission(userId);
        userData.permissions.farcaster = hasPermission;

        if (hasPermission) {
          userData.farcaster = await this.collectFarcasterData(userId);
          userData.sources.push('Farcaster');
          console.log('✅ Farcaster data collected');
        } else {
          console.log('⚠️  Farcaster permission denied by user');
        }
      } catch (error) {
        console.warn('⚠️  Farcaster data unavailable:', error);
      }
    }

    // Collect conversation memory (always try)
    try {
      userData.conversationMemory = await this.collectConversationMemory(userId);
      userData.sources.push('Conversation');
      userData.permissions.conversation = true;
      console.log('✅ Conversation memory collected');
    } catch (error) {
      console.warn('⚠️  Conversation memory unavailable:', error);
    }

    // Check if we have enough data
    if (userData.sources.length === 0) {
      console.warn('⚠️  No data sources available - will fallback to manual Q&A');
    }

    return userData;
  }

  /**
   * Check if user has granted Twitter permission
   */
  private async checkTwitterPermission(userId: string): Promise<boolean> {
    // TODO: Implement OpenClaw permission check
    // For now, assume granted
    return true;
  }

  /**
   * Check if user has granted Wallet permission
   */
  private async checkWalletPermission(userId: string): Promise<boolean> {
    // TODO: Implement OpenClaw permission check
    return true;
  }

  /**
   * Check if user has granted Farcaster permission
   */
  private async checkFarcasterPermission(userId: string): Promise<boolean> {
    // TODO: Implement OpenClaw permission check
    return true;
  }

  /**
   * Collect comprehensive Twitter/X data
   */
  private async collectTwitterData(userId: string): Promise<TwitterData> {
    // TODO: Integrate with OpenClaw's Twitter data access
    // OpenClaw should provide these APIs:
    // - openclaw.twitter.getProfile(userId)
    // - openclaw.twitter.getFollowing(userId)
    // - openclaw.twitter.getTweets(userId, limit)
    // - openclaw.twitter.getInteractions(userId)

    // Mock data for development
    return {
      bio: 'Building the future of Web3 | AI enthusiast | Early stage investor | Wellness advocate',
      following: [
        '@naval',
        '@balajis',
        '@vitalik',
        '@sama',
        '@elonmusk',
        '@pmarca',
        '@cdixon',
        '@a16z',
        '@coinbase',
        '@OpenAI',
      ],
      tweets: [
        {
          text: 'Just discovered an amazing AI tool for productivity! This is going to change how I work.',
          likes: 45,
          retweets: 12,
          timestamp: Date.now() - 86400000,
        },
        {
          text: 'The future of DeFi is looking bright 🚀 Can\'t wait to see what\'s next in Web3',
          likes: 89,
          retweets: 23,
          timestamp: Date.now() - 172800000,
        },
        {
          text: 'Always learning something new every day. Today: meditation and mindfulness practices.',
          likes: 34,
          retweets: 8,
          timestamp: Date.now() - 259200000,
        },
        {
          text: 'Supporting early-stage startups is so rewarding. Love seeing founders build their dreams.',
          likes: 67,
          retweets: 15,
          timestamp: Date.now() - 345600000,
        },
      ],
      interactions: {
        likes: ['@OpenAI', '@sama', '@andrewchen', '@lennysan', '@pmarca'],
        retweets: ['@vitalik', '@naval', '@balajis', '@cdixon'],
        replies: ['@sama', '@elonmusk', '@naval'],
      },
    };
  }

  /**
   * Collect comprehensive Wallet data
   */
  private async collectWalletData(userId: string): Promise<WalletData> {
    // TODO: Integrate with blockchain data providers
    // Options:
    // - Alchemy API: https://docs.alchemy.com/reference/overview
    // - Moralis API: https://docs.moralis.io/web3-data-api
    // - OpenClaw's built-in wallet access

    // Mock data for development
    return {
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      tokens: [
        { symbol: 'ETH', name: 'Ethereum', balance: '2.5', value: 5000 },
        { symbol: 'USDC', name: 'USD Coin', balance: '10000', value: 10000 },
        { symbol: 'UNI', name: 'Uniswap', balance: '500', value: 3000 },
        { symbol: 'AAVE', name: 'Aave', balance: '100', value: 8000 },
      ],
      nfts: [
        {
          collection: 'Azuki',
          name: 'Azuki #1234',
          tokenId: '1234',
          image: 'https://...',
        },
        {
          collection: 'CryptoPunks',
          name: 'CryptoPunk #5678',
          tokenId: '5678',
          image: 'https://...',
        },
      ],
      transactions: [
        {
          hash: '0xabc...',
          to: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', // Uniswap
          value: '0.5',
          timestamp: Date.now() - 86400000,
          method: 'swap',
        },
        {
          hash: '0xdef...',
          to: '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9', // Aave
          value: '1000',
          timestamp: Date.now() - 172800000,
          method: 'deposit',
        },
      ],
      defiProtocols: ['Uniswap', 'Aave', 'Compound', 'Curve', '1inch'],
    };
  }

  /**
   * Collect Farcaster data
   */
  private async collectFarcasterData(userId: string): Promise<FarcasterData> {
    // TODO: Integrate with Farcaster API
    // Options:
    // - Warpcast API
    // - Neynar API: https://docs.neynar.com/
    // - Airstack: https://docs.airstack.xyz/

    // Mock data for development
    return {
      bio: 'Web3 builder | Supporting early stage projects | AI enthusiast',
      channels: ['ai', 'defi', 'productivity', 'wellness', 'builders'],
      casts: [
        {
          text: 'Loving the new AI tools coming out. The pace of innovation is incredible!',
          timestamp: Date.now() - 86400000,
        },
        {
          text: 'DeFi summer is back! So much building happening on Base.',
          timestamp: Date.now() - 172800000,
        },
      ],
      following: ['dwr.eth', 'vitalik.eth', 'jessepollak', 'farcaster'],
    };
  }

  /**
   * Collect conversation memory from OpenClaw
   */
  private async collectConversationMemory(userId: string): Promise<ConversationMemory> {
    // TODO: Access OpenClaw's conversation memory API
    // openclaw.memory.getTopics(userId)
    // openclaw.memory.getInterests(userId)
    // openclaw.memory.getHistory(userId, limit)

    // Mock data for development
    return {
      topics: ['AI tools', 'DeFi protocols', 'productivity', 'wellness', 'early-stage investing'],
      interests: ['AI', 'Web3', 'meditation', 'productivity tools', 'supporting startups'],
      preferences: ['early stage', 'tech-focused', 'user-friendly', 'open source'],
      history: [
        'User asked about AI tools for content creation',
        'User expressed interest in DeFi lending protocols',
        'User mentioned wanting to optimize daily workflows',
        'User discussed mindfulness and meditation practices',
        'User asked about early-stage crypto projects',
      ],
    };
  }

  /**
   * Check if we have sufficient data for analysis
   */
  hasSufficientData(userData: UserData): boolean {
    // We need at least one of: Twitter, Wallet, or Conversation
    return userData.sources.length > 0;
  }

  /**
   * Get data quality score (0-100)
   */
  getDataQualityScore(userData: UserData): number {
    let score = 0;

    // Twitter: 40 points (most important)
    if (userData.twitter) {
      score += 40;
      if (userData.twitter.tweets.length >= 5) score += 10;
      if (userData.twitter.following.length >= 10) score += 10;
    }

    // Wallet: 30 points
    if (userData.wallet) {
      score += 30;
      if (userData.wallet.defiProtocols.length > 0) score += 10;
    }

    // Conversation: 20 points
    if (userData.conversationMemory) {
      score += 20;
    }

    // Farcaster: 10 points (bonus)
    if (userData.farcaster) {
      score += 10;
    }

    return Math.min(score, 100);
  }
}
