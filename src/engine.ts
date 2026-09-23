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

    // 1. Fetch wallet info to get the exact smart wallet address
    const walletsRes = await axios.get(`${BASE_API}/wallets/me`, { headers, validateStatus: () => true });
    logs.push({ step: 'GET_WALLETS', status: walletsRes.status, response: walletsRes.data });

    const walletData = walletsRes.data || {};
    const smartWalletAddress = walletData.wallet_address || '0xbC7859CC04132386C7DF14895ff3a67fA5bFc26b';

    // 2. Test path-based wallet verification endpoints that avoid the 500 query error
    const verifyPaths = [
      `${BASE_API}/wallets/${smartWalletAddress}/verify`,
      `${BASE_API}/wallets/verify/${smartWalletAddress}`,
      `${BASE_API}/quests/${questId}/verify-deposit`,
      `${BASE_API}/users/me/verify-deposit`
    ];

    const verifyResults = [];
    for (const url of verifyPaths) {
      for (const method of ['get', 'post']) {
        const vRes = await axios({
          method,
          url,
          headers,
          data: method === 'post' ? { quest_id: questId, address: smartWalletAddress } : undefined,
          validateStatus: () => true
        });

        if (vRes.status !== 404) {
          verifyResults.push({
            attempt: `${method.toUpperCase()} ${url}`,
            status: vRes.status,
            response: vRes.data
          });
        }
      }
    }

    logs.push({ step: 'PATH_VERIFY_PROBES', results: verifyResults });

    // 3. Re-check progress cleanly with user_id query parameter
    const startUrl = `${BASE_API}/quests/${questId}/start?user_id=${encodedUser}`;
    const startRes = await axios.post(startUrl, { questId }, { headers, validateStatus: () => true });
    logs.push({ step: 'RE_CHECK_PROGRESS', status: startRes.status, response: startRes.data });

    return {
      success: true,
      data: { smartWalletAddress, logs },
      message: '🔍 Path-based verification and sync triggered. Check logs!'
    };

  } catch (error: any) {
    return { 
      success: false, 
      data: { error: error.message },
      message: '❌ Engine Error: ' + error.message 
    };
  }
}
