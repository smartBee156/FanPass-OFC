import axios from 'axios';

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

    // 2. Your actual Polygon transaction hashes from screenshots
    const txHashes = [
      "0x5fd3a620931714fb3a07986f1281e8ae90eea733ae4f455f37cd2eaa7db449d7",
      "0x22415a793904c6dc259f6b804ca7c1bd8434f0ded9989003780137145d09e774"
    ];

    const txSubmissionResults = [];
    const submitEndpoints = [
      `${BASE_API}/wallets/me/send/submit`,
      `${BASE_API}/quests/${questId}/verify-tx`,
      `${BASE_API}/transactions/verify`,
      `${BASE_API}/verify/tx`,
      `${BASE_API}/polymarket/verify-deposit`
    ];

    for (const txHash of txHashes) {
      for (const url of submitEndpoints) {
        const sRes = await axios.post(url, {
          quest_id: questId,
          tx_hash: txHash,
          transaction_hash: txHash,
          wallet_address: smartWalletAddress,
          network: 'polygon',
          user_id: jwtUserId
        }, { headers, validateStatus: () => true });

        if (sRes.status !== 404) {
          txSubmissionResults.push({ txHash, url, status: sRes.status, response: sRes.data });
        }
      }
    }

    logs.push({ step: 'POLYGON_TX_SUBMISSION', results: txSubmissionResults });

    // 3. Initialize / Start Quest
    const startUrl = `${BASE_API}/quests/${questId}/start?user_id=${encodedUser}`;
    const startRes = await axios.post(startUrl, { questId }, { headers, validateStatus: () => true });
    logs.push({ step: 'START_QUEST', status: startRes.status, response: startRes.data });

    // 4. Attempt Claim
    const claimUrl = `${BASE_API}/quests/${questId}/progress/${encodedUser}/claim`;
    const claimRes = await axios.post(claimUrl, {}, { headers, validateStatus: () => true });
    logs.push({ step: 'CLAIM_REWARD', status: claimRes.status, response: claimRes.data });

    const success = claimRes.status >= 200 && claimRes.status < 300;

    return {
      success: true,
      data: { smartWalletAddress, logs },
      message: success ? '🚀 Quest successfully verified and claimed via Polygon TX!' : '⚡ Polygon transaction hashes dispatched. Check execution logs.'
    };

  } catch (error: any) {
    return { 
      success: false, 
      data: { error: error.message },
      message: '❌ Engine Error: ' + error.message 
    };
  }
}
