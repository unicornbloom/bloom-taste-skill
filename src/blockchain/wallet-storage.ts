/**
 * Wallet Storage Layer
 *
 * Stores and retrieves per-user wallet data
 * Currently uses file-based storage (can migrate to MongoDB later)
 *
 * ⭐ AgentKit 0.10.4 Update:
 * - Wallets are now managed server-side by CDP
 * - We only need to store the wallet address (not full wallet data)
 * - CDP retrieves wallets by address using API credentials
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface UserWalletRecord {
  userId: string;
  walletAddress: `0x${string}`;
  network: string;
  createdAt: string;
  lastUsedAt: string;
  privateKey?: `0x${string}`;  // ⭐ NEW: For local wallets (TODO: encrypt post-hackathon)
}

const STORAGE_DIR = path.join(process.cwd(), '.wallet-storage');
const STORAGE_FILE = path.join(STORAGE_DIR, 'user-wallets.json');

/**
 * Wallet Storage Manager
 */
export class WalletStorage {
  /**
   * Initialize storage directory
   */
  private async ensureStorageExists(): Promise<void> {
    try {
      await fs.access(STORAGE_DIR);
    } catch {
      await fs.mkdir(STORAGE_DIR, { recursive: true });
      await fs.writeFile(STORAGE_FILE, JSON.stringify({}), 'utf-8');
    }
  }

  /**
   * Load all wallet records
   */
  private async loadRecords(): Promise<Record<string, UserWalletRecord>> {
    await this.ensureStorageExists();

    try {
      const content = await fs.readFile(STORAGE_FILE, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  /**
   * Save all wallet records
   */
  private async saveRecords(records: Record<string, UserWalletRecord>): Promise<void> {
    await this.ensureStorageExists();
    await fs.writeFile(STORAGE_FILE, JSON.stringify(records, null, 2), 'utf-8');
  }

  /**
   * Get wallet for a specific user
   */
  async getUserWallet(userId: string): Promise<UserWalletRecord | null> {
    const records = await this.loadRecords();
    return records[userId] || null;
  }

  /**
   * Save wallet for a specific user
   *
   * ⭐ AgentKit 0.10.4: Only stores address (CDP manages wallet server-side)
   * ⭐ NEW: Can also store privateKey for local wallets (TODO: encrypt post-hackathon)
   */
  async saveUserWallet(
    userId: string,
    walletAddress: `0x${string}`,
    network: string,
    privateKey?: `0x${string}`  // ⭐ NEW: Optional for local wallets
  ): Promise<void> {
    const records = await this.loadRecords();

    const now = new Date().toISOString();

    records[userId] = {
      userId,
      walletAddress,
      network,
      createdAt: records[userId]?.createdAt || now,
      lastUsedAt: now,
      ...(privateKey && { privateKey }),  // ⭐ Only add if provided
    };

    await this.saveRecords(records);
  }

  /**
   * Update last used timestamp
   */
  async updateLastUsed(userId: string): Promise<void> {
    const records = await this.loadRecords();

    if (records[userId]) {
      records[userId].lastUsedAt = new Date().toISOString();
      await this.saveRecords(records);
    }
  }

  /**
   * Delete user wallet (for testing/cleanup)
   */
  async deleteUserWallet(userId: string): Promise<void> {
    const records = await this.loadRecords();
    delete records[userId];
    await this.saveRecords(records);
  }

  /**
   * List all users with wallets
   */
  async listUsers(): Promise<string[]> {
    const records = await this.loadRecords();
    return Object.keys(records);
  }

  /**
   * Get wallet count
   */
  async getWalletCount(): Promise<number> {
    const records = await this.loadRecords();
    return Object.keys(records).length;
  }
}

/**
 * Singleton instance
 */
export const walletStorage = new WalletStorage();
