/**
 * Test signature verification locally
 */

import { privateKeyToAccount } from 'viem/accounts';
import { verifyMessage } from 'viem';
import crypto from 'crypto';

const TEST_PRIVATE_KEY = '0x' + crypto.randomBytes(32).toString('hex');

async function testSignatureVerification() {
  console.log('\n🧪 Testing Signature Verification\n');
  console.log('═══════════════════════════════════════\n');

  // Create test wallet
  const account = privateKeyToAccount(TEST_PRIVATE_KEY as `0x${string}`);
  const address = account.address;
  console.log('✅ Test wallet created:', address, '\n');

  // Create message
  const nonce = crypto.randomUUID();
  const timestamp = Date.now();
  const expiresAt = timestamp + 24 * 60 * 60 * 1000;

  const message = [
    'Bloom Agent Authentication',
    `Address: ${address}`,
    `Nonce: ${nonce}`,
    `Timestamp: ${timestamp}`,
    `Expires: ${expiresAt}`,
    'Scope: read:identity,read:skills,read:wallet',
  ].join('\n');

  console.log('📝 Message to sign:\n', message, '\n');

  // Sign message
  console.log('Signing message with wallet...');
  const signature = await account.signMessage({ message });
  console.log('✅ Signature:', signature, '\n');

  // Verify signature
  console.log('Verifying signature...');
  try {
    const isValid = await verifyMessage({
      address: address as `0x${string}`,
      message: message,
      signature: signature as `0x${string}`,
    });

    console.log('Verification result:', isValid);

    if (isValid) {
      console.log('✅ Signature verification PASSED!\n');
    } else {
      console.log('❌ Signature verification FAILED!\n');
    }
  } catch (error) {
    console.error('❌ Verification error:', error);
  }

  console.log('═══════════════════════════════════════\n');
}

testSignatureVerification().catch(console.error);
