/**
 * Agent Wallet Integration with Coinbase AgentKit
 *
 * Uses Coinbase CDP (Developer Platform) to create and manage
 * wallet for autonomous agents with X402 payment capabilities.
 *
 * References:
 * - AgentKit Docs: https://docs.cdp.coinbase.com/agent-kit/welcome
 * - X402 Protocol: https://docs.cdp.coinbase.com/x402/welcome
 */

import { CdpSmartWalletProvider } from '@coinbase/agentkit';

export interface AgentWalletConfig {
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
 */
export class AgentWallet {
  private walletProvider: CdpSmartWalletProvider | null = null;
  private network: 'base-mainnet' | 'base-sepolia';
  private walletAddress: string | null = null;

  constructor(config: AgentWalletConfig = {}) {
    this.network = config.network || 'base-sepolia'; // Default to testnet
  }

  /**
   * Initialize agent wallet
   *
   * Creates a new CDP wallet for the agent with X402 capabilities
   */
  async initialize(): Promise<AgentWalletInfo> {
    console.log(`🤖 Initializing Agent Wallet on ${this.network}...`);

    try {
      // Map network name to CDP format
      const cdpNetwork = this.network === 'base-mainnet' ? 'base' : 'base-sepolia';

      // Initialize CDP Smart Wallet Provider
      this.walletProvider = await CdpSmartWalletProvider.configureWithWallet({
        network: cdpNetwork as 'base' | 'base-sepolia',
      });

      // Get wallet address
      this.walletAddress = await this.walletProvider.getAddress();

      console.log(`✅ Agent Wallet created: ${this.walletAddress}`);

      return {
        address: this.walletAddress,
        network: this.network,
        x402Endpoint: this.getX402Endpoint(),
      };
    } catch (error) {
      console.error('❌ Failed to initialize agent wallet:', error);
      throw new Error(`Agent wallet initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
   * Register agent wallet with Bloom Protocol backend
   *
   * This creates an agent user in Bloom system and associates the wallet
   */
  async registerWithBloom(agentName: string): Promise<{ agentUserId: number; x402Endpoint: string }> {
    if (!this.walletAddress) {
      throw new Error('Agent wallet not initialized');
    }

    console.log(`📝 Registering agent with Bloom Protocol...`);

    try {
      // Sign a message to prove wallet ownership
      const message = `Bloom Agent Registration: ${agentName}`;
      const signature = await this.signMessage(message);

      // Call Bloom backend API
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
   */
  async signMessage(message: string): Promise<string> {
    if (!this.walletProvider) {
      throw new Error('Agent wallet not initialized');
    }

    try {
      // Use CDP wallet provider to sign message
      const signature = await this.walletProvider.signMessage(message);
      return signature;
    } catch (error) {
      console.error('❌ Failed to sign message:', error);
      throw new Error(`Message signing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate authentication token for Dashboard login
   *
   * Creates a secure JWT token with signature verification
   * for Agent to access Bloom Dashboard
   */
  async generateAuthToken(): Promise<string> {
    if (!this.walletAddress) {
      throw new Error('Agent wallet not initialized');
    }

    const crypto = await import('crypto');
    const jwt = await import('jsonwebtoken');

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

    // Create JWT payload
    const payload = {
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
    const balance = await this.getBalance();

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
 */
export async function createAgentWallet(config: AgentWalletConfig = {}): Promise<AgentWallet> {
  const wallet = new AgentWallet(config);
  await wallet.initialize();
  return wallet;
}
