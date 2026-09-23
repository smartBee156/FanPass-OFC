import axios from 'axios';
import { randomUUID } from 'crypto';

const BASE_API = 'https://fanpass.proofchain.co.za/api';
const TENANT_ID = 'tenant_1g6k1cew859ls7408';

function extractUserId(token: string): string | null {
  try {
    if (!token.startsWith('eyJ')) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    return payload.sub || payload.user_id || payload.id || payload.uid || null;
  } catch (e) {
    return null;
  }
}

export async function pollAccountVerification(input: string): Promise<{ success: boolean; data?: any; message: string }> {
  try {
    const token = input.trim();
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Origin': 'https://fanpass.onefootball.com',
      'Referer': 'https://fanpass.onefootball.com/',
      'X-Tenant-ID': TENANT_ID,
      'Content-Type': 'application/json'
    };

    if (token.startsWith('eyJ')) {
      headers['Authorization'] = 'Bearer ' + token;
    } else {
      headers['Cookie'] = token;
    }

    const questId = '81ff3b8a-03bf-488c-828c-f60923e96149';
    const jwtUserId = extractUserId(token) || 'afe546fe-0aa9-4a4b-9ff4-81db76b76cdf';
    const encodedUser = encodeURIComponent(jwtUserId);
    const logs = [];

    // 1. Get Wallet Info
    const walletsRes = await axios.get(`${BASE_API}/wallets/me`, { headers, validateStatus: () => true });
    const walletData = walletsRes.data || {};
    const smartWalletAddress = walletData.wallet_address || '0xbC7859CC04132386C7DF14895ff3a67fA5bFc26b';
    logs.push({ step: 'GET_WALLETS', wallet: smartWalletAddress });

    // Your actual Polygon transaction hashes from your screenshots
    const txHashes = [
      "0x5fd3a620931714fb3a07986f1281e8ae90eea733ae4f455f37cd2eaa7db449d7",
      "0x22415a793904c6dc259f6b804ca7c1bd8434f0ded9989003780137145d09e774"
    ];

    const submissionResults = [];

    for (const txHash of txHashes) {
      // Step A: Try to call the prepare endpoint to obtain prepare_id and idempotency_key
      const prepareRes = await axios.post(`${BASE_API}/wallets/me/send/prepare`, {
        quest_id: questId,
        tx_hash: txHash,
        wallet_address: smartWalletAddress,
        network: 'polygon'
      }, { headers, validateStatus: () => true });

      let prepareId = prepareRes.data?.prepare_id || prepareRes.data?.id || randomUUID();
      let idempotencyKey = prepareRes.data?.idempotency_key || randomUUID();

      // Step B: Submit the transaction with the required keys
      const submitRes = await axios.post(`${BASE_API}/wallets/me/send/submit`, {
        quest_id: questId,
        tx_hash: txHash,
        transaction_hash: txHash,
        wallet_address: smartWalletAddress,
        network: 'polygon',
        user_id: jwtUserId,
        prepare_id: prepareId,
        idempotency_key: idempotencyKey
      }, { headers, validateStatus: () => true });

      submissionResults.push({
        txHash,
        prepareStatus: prepareRes.status,
        submitStatus: submitRes.status,
        response: submitRes.data
      });
    }

    logs.push({ step: 'PREPARE_AND_SUBMIT_TX', results: submissionResults });

    // 2. Initialize / Start Quest
    const startUrl = `${BASE_API}/quests/${questId}/start?user_id=${encodedUser}`;
    const startRes = await axios.post(startUrl, { questId }, { headers, validateStatus: () => true });
    logs.push({ step: 'START_QUEST', status: startRes.status, response: startRes.data });

    // 3. Attempt Claim Reward
    const claimUrl = `${BASE_API}/quests/${questId}/progress/${encodedUser}/claim`;
    const claimRes = await axios.post(claimUrl, {}, { headers, validateStatus: () => true });
    logs.push({ step: 'CLAIM_REWARD', status: claimRes.status, response: claimRes.data });

    const success = claimRes.status >= 200 && claimRes.status < 300;

    return {
      success: true,
      data: { smartWalletAddress, logs },
      message: success ? '🚀 Quest successfully verified and claimed!' : '⚡ Prepare & submit flow executed. Check execution logs.'
    };

  } catch (error: any) {
    return { 
      success: false, 
      data: { error: error.message },
      message: '❌ Engine Error: ' + error.message 
    };
  }
}
