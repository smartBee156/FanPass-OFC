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

    // 1. Get your verified wallet info
    const walletsRes = await axios.get(`${BASE_API}/wallets/me`, { headers, validateStatus: () => true });
    const walletData = walletsRes.data || {};
    const smartWalletAddress = walletData.wallet_address || '0xbC7859CC04132386C7DF14895ff3a67fA5bFc26b';

    logs.push({ step: 'GET_WALLETS', status: walletsRes.status, wallet: smartWalletAddress });

    // 2. Probe Polymarket & Deposit synchronization endpoints
    const polymarketEndpoints = [
      `${BASE_API}/polymarket/sync`,
      `${BASE_API}/polymarket/verify-deposit`,
      `${BASE_API}/quests/${questId}/polymarket/sync`,
      `${BASE_API}/quests/${questId}/verify`,
      `${BASE_API}/users/me/polymarket`
    ];

    const syncResults = [];
    for (const url of polymarketEndpoints) {
      for (const method of ['post', 'get']) {
        const pRes = await axios({
          method,
          url,
          headers,
          data: method === 'post' ? { quest_id: questId, wallet_address: smartWalletAddress, user_id: jwtUserId } : undefined,
          params: method === 'get' ? { wallet_address: smartWalletAddress } : undefined,
          validateStatus: () => true
        });

        if (pRes.status !== 404) {
          syncResults.push({
            attempt: `${method.toUpperCase()} ${url}`,
            status: pRes.status,
            response: pRes.data
          });
        }
      }
    }

    logs.push({ step: 'POLYMARKET_SYNC_PROBES', results: syncResults });

    // 3. Re-check progress
    const startUrl = `${BASE_API}/quests/${questId}/start?user_id=${encodedUser}`;
    const startRes = await axios.post(startUrl, { questId }, { headers, validateStatus: () => true });
    logs.push({ step: 'RE_CHECK_PROGRESS', status: startRes.status, response: startRes.data });

    return {
      success: true,
      data: { smartWalletAddress, logs },
      message: '🔍 Polymarket deposit sync probes executed. Check execution logs!'
    };

  } catch (error: any) {
    return { 
      success: false, 
      data: { error: error.message },
      message: '❌ Engine Error: ' + error.message 
    };
  }
}
