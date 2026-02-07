/**
 * Agent Wallet Integration with Coinbase AgentKit
 *
 * Uses Coinbase CDP (Developer Platform) to create and manage
 * wallet for autonomous agents with X402 payment capabilities.
 *
 * ⭐ Per-User Wallet Support:
 * - Each userId gets a unique, persistent wallet
 * - Wallets are stored and retrieved automatically
 * - First time: creates new wallet and stores it
 * - Next time: retrieves existing wallet for same userId
 *
 * References:
 * - AgentKit Docs: https://docs.cdp.coinbase.com/agent-kit/welcome
 * - X402 Protocol: https://docs.cdp.coinbase.com/x402/welcome
 */

import { CdpEvmWalletProvider } from '@coinbase/agentkit';
import { walletStorage } from './wallet-storage';
import { privateKeyToAccount } from 'viem/accounts';
import type { PrivateKeyAccount } from 'viem/accounts';
import * as crypto from 'crypto';

export interface AgentWalletConfig {
  userId: string;  // ⭐ Required for per-user wallets
  network?: 'base-mainnet' | 'base-sepolia';
  apiKey?: string;
  privateKey?: string;
}

export interface AgentWalletInfo {
  address: string;
  network: string;
  x402Endpoint?: string;
  balance?: string;
}

/**
 * Agent Wallet Manager
 *
 * Creates and manages wallet for autonomous agent using Coinbase AgentKit
 *
 * ⭐ Each user gets a unique, persistent wallet:
 * - User A → Wallet A (address: 0xAAA...)
 * - User B → Wallet B (address: 0xBBB...)
 */
export class AgentWallet {
  private userId: string;  // ⭐ User identifier
  private walletProvider: CdpEvmWalletProvider | null = null;
  private mockAccount: PrivateKeyAccount | null = null;  // For mock wallet signing (Tier 3)
  private network: 'base-mainnet' | 'base-sepolia';
  private walletAddress: `0x${string}` | null = null;

  constructor(config: AgentWalletConfig) {
    // ⭐ userId is required for per-user wallets
    if (!config.userId) {
      throw new Error('userId is required for AgentWallet');
    }

    this.userId = config.userId;

    // Default to mainnet for production readiness
    // Use NETWORK env var or config.network to override
    this.network = config.network ||
                   (process.env.NETWORK as 'base-mainnet' | 'base-sepolia') ||
                   'base-mainnet';
  }

  /**
   * Initialize agent wallet with 3-tier strategy
   *
   * ⭐ Optimal Approach:
   * 1. Local generation (viem) + OpenClaw storage - FREE, real wallets, standalone
   * 2. User's CDP credentials (optional) - For power users who prefer CDP
   * 3. Fallback to Mock wallet (testing only) - Quick testing without setup
   */
  async initialize(): Promise<AgentWalletInfo> {
    console.log(`🤖 Initializing Agent Wallet for user ${this.userId} on ${this.network}...`);

    // Tier 1: Local wallet generation + storage (PRIMARY METHOD)
    try {
      console.log('🔍 Tier 1: Checking for existing wallet or creating new local wallet...');
      const localWallet = await this.createLocalWallet();
      if (localWallet) {
        console.log('✅ Using local wallet (FREE, real wallet, fully standalone)');
        return localWallet;
      }
    } catch (error) {
      console.log('⚠️  Local wallet creation failed, trying CDP...');
    }

    // Tier 2: Try user's own CDP credentials (OPTIONAL - for power users)
    if (process.env.CDP_API_KEY_ID && process.env.CDP_API_KEY_SECRET && process.env.CDP_WALLET_SECRET) {
      try {
        console.log('🔍 Tier 2: Using user-provided CDP credentials...');
        const result = await this.withTimeout(
          this.initializeWalletInternal(),
          5000,
          'CDP wallet initialization timed out (5s)'
        );
        console.log('✅ Wallet created with user CDP credentials');
        return result;
      } catch (error) {
        console.log('⚠️  User CDP credentials failed, falling back to mock...');
      }
    } else {
      console.log('ℹ️  No user CDP credentials found, skipping Tier 2...');
    }

    // Tier 3: Fallback to mock wallet (TESTING ONLY)
    console.log('🔍 Tier 3: Creating mock wallet for quick testing...');
    const errorMessage = 'All real wallet options failed';
    console.warn(`⚠️  ${errorMessage}, using mock wallet for testing`);

    // Check if user already has a mock wallet (for persistence)
    const existingWallet = await walletStorage.getUserWallet(this.userId);
    
    if (existingWallet && existingWallet.network === this.network && !existingWallet.encryptedPrivateKey) {
      // Load existing mock wallet (deterministic)
      console.log(`📂 Loading existing mock wallet for ${this.userId}...`);
      const privateKeyHash = crypto.createHash('sha256').update(this.userId + '-bloom-test').digest('hex');
      const privateKey = `0x${privateKeyHash}` as `0x${string}`;
      this.mockAccount = privateKeyToAccount(privateKey);
      this.walletAddress = this.mockAccount.address;
      
      console.log(`✅ Loaded mock wallet: ${this.walletAddress}`);
    } else {
      // Generate deterministic test wallet with signing capability (for testing only!)
      const privateKeyHash = crypto.createHash('sha256').update(this.userId + '-bloom-test').digest('hex');
      const privateKey = `0x${privateKeyHash}` as `0x${string}`;
      
      // Create viem account for signing
      this.mockAccount = privateKeyToAccount(privateKey);
      this.walletAddress = this.mockAccount.address;

      // Save mock wallet to storage (for user retention!)
      await walletStorage.saveUserWallet(
        this.userId,
        this.walletAddress,
        this.network
        // No encryptedPrivateKey = marks as mock wallet
      );

      console.log(`🆕 Mock wallet created for ${this.userId}: ${this.walletAddress}`);
      console.log(`💾 Saved to storage - will persist across sessions`);
    }

    console.log('📝 Mock wallet is for testing only - do not send real funds!');

    return {
      address: this.walletAddress,
      network: this.network,
      x402Endpoint: this.getX402Endpoint(),
    };
  }

  /**
   * Tier 1: Create or load local wallet (FREE, real, standalone)
   * 
   * Strategy:
   * 1. Check if user already has a wallet in storage
   * 2. If yes → decrypt and load it
   * 3. If no → generate new wallet with viem, encrypt, store
   * 
   * Benefits:
   * - ✅ Completely free
   * - ✅ Real wallet (can send/receive funds)
   * - ✅ No external dependencies
   * - ✅ Fully standalone
   * - ✅ Persistent across sessions
   */
  private async createLocalWallet(): Promise<AgentWalletInfo | null> {
    try {
      // Check if user already has a wallet
      const existingWallet = await walletStorage.getUserWallet(this.userId);

      if (existingWallet && existingWallet.network === this.network) {
        // Load existing wallet
        console.log(`📂 Loading existing local wallet for ${this.userId}...`);
        
        // Decrypt private key (stored encrypted)
        const privateKey = this.decryptPrivateKey(
          existingWallet.encryptedPrivateKey || existingWallet.walletAddress, // Fallback for old format
          this.userId
        );

        // Create viem account
        this.mockAccount = privateKeyToAccount(privateKey as `0x${string}`);
        this.walletAddress = this.mockAccount.address;

        // Verify address matches (security check)
        if (this.walletAddress.toLowerCase() !== existingWallet.walletAddress.toLowerCase()) {
          console.warn('⚠️  Address mismatch! Creating new wallet...');
          throw new Error('Address verification failed');
        }

        console.log(`✅ Loaded existing wallet: ${this.walletAddress}`);

        return {
          address: this.walletAddress,
          network: this.network,
          x402Endpoint: this.getX402Endpoint(),
        };
      }

      // Create new wallet
      console.log(`🆕 Creating new local wallet for ${this.userId}...`);

      // Generate random private key (viem)
      const { generatePrivateKey } = await import('viem/accounts');
      const privateKey = generatePrivateKey();

      // Create account
      this.mockAccount = privateKeyToAccount(privateKey);
      this.walletAddress = this.mockAccount.address;

      // Encrypt private key before storage
      const encryptedPrivateKey = this.encryptPrivateKey(privateKey, this.userId);

      // Store wallet (with encrypted private key)
      await walletStorage.saveUserWallet(
        this.userId,
        this.walletAddress,
        this.network,
        encryptedPrivateKey
      );

      console.log(`✅ New local wallet created: ${this.walletAddress}`);
      console.log(`🔐 Private key encrypted and stored securely`);
      console.log(`💡 This is a REAL wallet - you can receive/send funds!`);

      return {
        address: this.walletAddress,
        network: this.network,
        x402Endpoint: this.getX402Endpoint(),
      };
    } catch (error) {
      console.error(`❌ Local wallet creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  /**
   * Encrypt private key using AES-256-GCM
   * Uses userId as part of the encryption key for additional security
   */
  private encryptPrivateKey(privateKey: string, userId: string): string {
    try {
      // Derive encryption key from userId + environment secret
      const secret = process.env.WALLET_ENCRYPTION_SECRET || 'bloom-default-secret-change-in-production';
      const key = crypto.createHash('sha256').update(userId + secret).digest();

      // Generate IV
      const iv = crypto.randomBytes(16);

      // Encrypt
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      let encrypted = cipher.update(privateKey, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get auth tag
      const authTag = cipher.getAuthTag();

      // Return: iv:authTag:encrypted
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt private key
   */
  private decryptPrivateKey(encryptedData: string, userId: string): string {
    try {
      // If data doesn't contain colons, it might be old format (unencrypted)
      if (!encryptedData.includes(':')) {
        // Assume it's a raw private key from old version
        return encryptedData;
      }

      // Parse encrypted data
      const [ivHex, authTagHex, encrypted] = encryptedData.split(':');

      // Derive same encryption key
      const secret = process.env.WALLET_ENCRYPTION_SECRET || 'bloom-default-secret-change-in-production';
      const key = crypto.createHash('sha256').update(userId + secret).digest();

      // Decrypt
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        key,
        Buffer.from(ivHex, 'hex')
      );
      decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Tier 2: Internal wallet initialization logic using user's CDP credentials
   */
  private async initializeWalletInternal(): Promise<AgentWalletInfo> {
    // Map network name to CDP format
    const cdpNetwork = this.network === 'base-mainnet' ? 'base' : 'base-sepolia';

    // Get CDP API credentials from environment variables
    const apiKeyId = process.env.CDP_API_KEY_ID;
    const apiKeySecret = process.env.CDP_API_KEY_SECRET;
    const walletSecret = process.env.CDP_WALLET_SECRET;

    // Get RPC URL (with fallback to public endpoints)
    const rpcUrl = process.env.CDP_RPC_URL || this.getDefaultRpcUrl();

    // ⭐ Step 1: Check if user already has a wallet
    const existingWallet = await walletStorage.getUserWallet(this.userId);

    if (existingWallet && existingWallet.network === this.network) {
      // ⭐ Import existing wallet by address
      console.log(`📂 Loading existing wallet for user ${this.userId}...`);

      this.walletProvider = await CdpEvmWalletProvider.configureWithWallet({
        networkId: cdpNetwork,
        apiKeyId,
        apiKeySecret,
        walletSecret,
        rpcUrl,  // ⭐ Add RPC URL
        address: existingWallet.walletAddress as `0x${string}`,  // ⭐ Import by address
      });

      this.walletAddress = this.walletProvider.getAddress() as `0x${string}`;

      // Update last used timestamp
      await walletStorage.updateLastUsed(this.userId);

      console.log(`✅ Existing wallet loaded: ${this.walletAddress}`);

    } else {
      // ⭐ Create new wallet with idempotency key
      console.log(`🆕 Creating new wallet for user ${this.userId}...`);

      this.walletProvider = await CdpEvmWalletProvider.configureWithWallet({
        networkId: cdpNetwork,
        apiKeyId,
        apiKeySecret,
        walletSecret,
        rpcUrl,  // ⭐ Add RPC URL
        idempotencyKey: this.generateDeterministicUUID(this.userId),  // ⭐ UUID v4 from userId
      });

      this.walletAddress = this.walletProvider.getAddress() as `0x${string}`;

      // ⭐ Store wallet address (CDP manages wallet server-side in 0.10.4)
      await walletStorage.saveUserWallet(
        this.userId,
        this.walletAddress,
        this.network
      );

      console.log(`✅ New wallet created and stored: ${this.walletAddress}`);
    }

    // Log wallet count for debugging
    const walletCount = await walletStorage.getWalletCount();
    console.log(`📊 Total wallets in storage: ${walletCount}`);

    return {
      address: this.walletAddress,
      network: this.network,
      x402Endpoint: this.getX402Endpoint(),
    };
  }

  /**
   * Wrap async operation with timeout
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
      ),
    ]);
  }

  /**
   * Simple hash function for deterministic mock addresses (testing only)
   */
  private simpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(40, '0');
  }

  /**
   * Generate deterministic UUID v4 from userId
   *
   * CDP requires UUID v4 format for idempotency keys
   * We create a deterministic UUID so same user always gets same wallet
   */
  private generateDeterministicUUID(input: string): string {
    const crypto = require('crypto');

    // Create a hash from the input
    const hash = crypto.createHash('sha256').update(input).digest('hex');

    // Format as UUID v4: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    // Where x is any hexadecimal digit and y is one of 8, 9, A, or B
    const uuid = [
      hash.substr(0, 8),
      hash.substr(8, 4),
      '4' + hash.substr(12, 3), // Version 4
      ((parseInt(hash.substr(16, 1), 16) & 0x3) | 0x8).toString(16) + hash.substr(17, 3), // Variant bits
      hash.substr(20, 12)
    ].join('-');

    return uuid;
  }

  /**
   * Get default RPC URL based on network
   */
  private getDefaultRpcUrl(): string {
    // Public RPC endpoints for Base network
    if (this.network === 'base-mainnet') {
      return 'https://mainnet.base.org';
    } else {
      return 'https://sepolia.base.org';
    }
  }

  /**
   * Get agent's wallet address
   */
  getAddress(): string {
    if (!this.walletAddress) {
      throw new Error('Agent wallet not initialized. Call initialize() first.');
    }
    return this.walletAddress;
  }

  /**
   * Get agent's X402 payment endpoint
   *
   * This endpoint can receive X402 payments from other agents or users
   */
  getX402Endpoint(): string {
    if (!this.walletAddress) {
      throw new Error('Agent wallet not initialized');
    }

    // Format: x402.bloomprotocol.ai/base/{address}
    // Note: This assumes Bloom has registered this agent wallet
    // In production, this should be obtained from Bloom backend after registration
    const networkPath = this.network.includes('sepolia') ? 'base-sepolia' : 'base';
    return `https://x402.bloomprotocol.ai/${networkPath}/${this.walletAddress}`;
  }

  /**
   * Get wallet balance (USDC)
   */
  async getBalance(): Promise<string> {
    if (!this.walletProvider) {
      throw new Error('Agent wallet not initialized');
    }

    try {
      // Note: Balance checking requires additional setup with CDP SDK
      // For MVP, returning '0'
      return '0';
    } catch (error) {
      console.error('❌ Failed to get balance:', error);
      return '0';
    }
  }

  /**
   * Execute X402 payment to another endpoint
   *
   * @param to - X402 endpoint URL (e.g., x402.bloomprotocol.ai/base/123)
   * @param amount - Amount in USDC
   */
  async sendX402Payment(to: string, amount: number): Promise<string> {
    if (!this.walletProvider) {
      throw new Error('Agent wallet not initialized');
    }

    console.log(`💸 Sending ${amount} USDC via X402 to ${to}...`);

    try {
      // Note: X402 payment integration requires additional setup
      // For MVP, this is a placeholder
      throw new Error('X402 payment not yet implemented in MVP');
    } catch (error) {
      console.error('❌ X402 payment failed:', error);
      throw new Error(`X402 payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Register agent wallet with Bloom Protocol backend and save identity card
   *
   * This creates an agent user in Bloom system, associates the wallet,
   * and stores the identity card data in one atomic operation
   */
  async registerWithBloom(
    agentName: string,
    identityData?: {
      personalityType: string;
      tagline: string;
      description: string;
      mainCategories: string[];
      subCategories: string[];
      confidence: number;
      mode: 'data' | 'manual';
      dimensions?: {
        conviction: number;
        intuition: number;
        contribution: number;
      };
      recommendations?: Array<{
        skillId: string;
        skillName: string;
        description: string;
        url: string;
        categories: string[];
        matchScore: number;
        creator?: string;
        creatorUserId?: number;
      }>;
    }
  ): Promise<{ agentUserId: number; x402Endpoint: string }> {
    if (!this.walletAddress) {
      throw new Error('Agent wallet not initialized');
    }

    console.log(`📝 Registering agent with Bloom Protocol...`);

    try {
      // Generate nonce and timestamp for message
      const nonce = crypto.randomUUID();
      const timestamp = Date.now();

      // Sign a message to prove wallet ownership (include nonce and timestamp)
      const message = `Bloom Agent Registration\nAgent: ${agentName}\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
      const signature = await this.signMessage(message);

      // Call Bloom backend API with identity data
      const response = await fetch(`${process.env.BLOOM_API_URL || 'https://api.bloomprotocol.ai'}/x402/agent-claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentName,
          agentType: 'skill-discovery',
          walletAddress: this.walletAddress,
          network: this.network,
          signature,
          message,
          nonce,
          timestamp,
          identityData, // Include identity card data
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Registration failed');
      }

      console.log(`✅ Agent registered! User ID: ${result.data.agentUserId}`);

      return {
        agentUserId: result.data.agentUserId,
        x402Endpoint: result.data.x402Endpoint,
      };
    } catch (error) {
      console.error('❌ Bloom registration failed:', error);
      throw new Error(`Bloom registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sign a message with agent's wallet
   * Supports all 3 wallet tiers: Backend, User CDP, Mock
   */
  async signMessage(message: string): Promise<string> {
    // Support all three wallet types
    if (!this.walletProvider && !this.mockAccount && !this.walletAddress) {
      throw new Error('Agent wallet not initialized');
    }

    try {
      // Tier 2: Use CDP wallet provider if available
      if (this.walletProvider) {
        const signature = await this.walletProvider.signMessage(message);
        return signature;
      }
      
      // Tier 1/3: Use local account (either real wallet or mock)
      if (this.mockAccount) {
        // Check if this is a real local wallet or mock wallet by looking at storage
        const existingWallet = await walletStorage.getUserWallet(this.userId);
        if (existingWallet?.encryptedPrivateKey) {
          console.log('🔐 Signing with local wallet');
        } else {
          console.log('🧪 Signing with mock wallet (test mode)');
        }
        const signature = await this.mockAccount.signMessage({ message });
        return signature;
      }
      
      // Tier 1: Backend wallet doesn't need local signing
      // (Backend API handles signing when needed)
      throw new Error('No signing capability available - backend wallets should sign via API');
    } catch (error) {
      console.error('❌ Failed to sign message:', error);
      throw new Error(`Message signing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export wallet private key (for backup/recovery)
   * ⚠️ Use with extreme caution - private key should be kept secret!
   */
  async exportPrivateKey(): Promise<string> {
    if (!this.mockAccount) {
      throw new Error('Cannot export private key: wallet not using local generation');
    }

    console.warn('⚠️  Exporting private key - keep this secret and secure!');
    return this.mockAccount.source.toString();
  }

  /**
   * Get wallet export info (for UI display/backup)
   */
  async getExportInfo(): Promise<{
    canExport: boolean;
    walletType: 'local' | 'cdp' | 'mock';
    address: string;
    network: string;
  }> {
    return {
      canExport: !!this.mockAccount,
      walletType: this.walletProvider ? 'cdp' : (this.mockAccount ? 'local' : 'mock'),
      address: this.walletAddress || 'not-initialized',
      network: this.network,
    };
  }

  /**
   * Generate authentication token for Dashboard login
   *
   * Creates a secure JWT token with signature verification
   * for Agent to access Bloom Dashboard
   */
  async generateAuthToken(options?: {
    agentUserId?: number;
    identityData?: {
      personalityType: string;
      tagline: string;
      description: string;
      mainCategories: string[];
      subCategories: string[];
      confidence: number;
      mode: 'data' | 'manual';
    };
  }): Promise<string> {
    if (!this.walletAddress) {
      throw new Error('Agent wallet not initialized');
    }

    const crypto = await import('crypto');
    const jwtModule = await import('jsonwebtoken');
    const jwt = jwtModule.default;

    const nonce = crypto.randomUUID();
    const timestamp = Date.now();
    const expiresAt = timestamp + 24 * 60 * 60 * 1000; // 24 hours

    // Construct message to sign (EIP-191 standard)
    const message = [
      'Bloom Agent Authentication',
      `Address: ${this.walletAddress}`,
      `Nonce: ${nonce}`,
      `Timestamp: ${timestamp}`,
      `Expires: ${expiresAt}`,
      'Scope: read:identity,read:skills,read:wallet',
    ].join('\n');

    // Sign the message
    const signature = await this.signMessage(message);

    // Create JWT payload with optional identity data
    const payload: any = {
      type: 'agent',
      version: '1.0',
      address: this.walletAddress,
      nonce,
      timestamp,
      expiresAt,
      scope: ['read:identity', 'read:skills', 'read:wallet'],
      signature,
      signedMessage: message,
    };

    // Add optional fields
    if (options?.agentUserId) {
      payload.agentUserId = options.agentUserId;
    }
    if (options?.identityData) {
      payload.identity = {
        personalityType: options.identityData.personalityType,
        tagline: options.identityData.tagline,
        description: options.identityData.description,
        mainCategories: options.identityData.mainCategories,
        subCategories: options.identityData.subCategories,
        confidence: options.identityData.confidence,
        mode: options.identityData.mode,
      };
    }

    // Sign JWT
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'dev-secret-change-in-production', {
      algorithm: 'HS256',
      expiresIn: '24h',
      issuer: 'bloom-protocol',
      audience: 'bloom-dashboard',
    });

    return token;
  }

  /**
   * Get wallet info for display
   */
  async getWalletInfo(): Promise<AgentWalletInfo> {
    let balance: string | undefined;

    try {
      balance = await this.getBalance();
    } catch (error) {
      // Balance check may fail if wallet not fully initialized
      console.warn('⚠️  Could not fetch balance:', error);
      balance = undefined;
    }

    return {
      address: this.getAddress(),
      network: this.network,
      x402Endpoint: this.getX402Endpoint(),
      balance,
    };
  }
}

/**
 * Create and initialize an agent wallet
 *
 * Convenience function for quick setup
 *
 * ⭐ userId is required for per-user wallet management
 */
export async function createAgentWallet(config: AgentWalletConfig): Promise<AgentWallet> {
  const wallet = new AgentWallet(config);
  await wallet.initialize();
  return wallet;
}
