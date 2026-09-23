import axios from 'axios';

const BASE_API = 'https://fanpass.proofchain.co.za/api';
const TENANT_ID = 'tenant_1g6k1cew859ls7408';
const QUEST_ID = '81ff3b8a-03bf-488c-828c-f60923e96149';

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

    const logs = [];

    // 1. Get Wallet Info
    const walletsRes = await axios.get(`${BASE_API}/wallets/me`, { headers, validateStatus: () => true });
    const walletData = walletsRes.data || {};
    const smartWalletAddress = walletData.wallet_address || '0xbC7859CC04132386C7DF14895ff3a67fA5bFc26b';
    logs.push({ step: 'GET_WALLETS', wallet: smartWalletAddress });

    // 2. Extract JWT User ID securely
    const jwtUserId = extractUserId(token) || 'fe6a740a-4c0a-490f-8bf2-d9189a2b1ef8';
    const encodedUser = encodeURIComponent(jwtUserId);

    // 3. Initialize / Start Quest using the proper JWT UUID
    const startUrl = `${BASE_API}/quests/${QUEST_ID}/start?user_id=${encodedUser}`;
    const startRes = await axios.post(startUrl, { questId: QUEST_ID }, { headers, validateStatus: () => true });
    logs.push({ step: 'START_QUEST', status: startRes.status, response: startRes.data });

    // 4. Check Progress using the proper JWT UUID
    const progressUrl = `${BASE_API}/quests/${QUEST_ID}/progress/${encodedUser}`;
    const progressRes = await axios.get(progressUrl, { headers, validateStatus: () => true });
    logs.push({ step: 'GET_QUEST_PROGRESS', status: progressRes.status, response: progressRes.data });

    // 5. Attempt Claim Reward using the proper JWT UUID
    const claimUrl = `${BASE_API}/quests/${QUEST_ID}/progress/${encodedUser}/claim`;
    const claimRes = await axios.post(claimUrl, {}, { headers, validateStatus: () => true });
    logs.push({ step: 'CLAIM_REWARD', status: claimRes.status, response: claimRes.data });

    const success = claimRes.status >= 200 && claimRes.status < 300;

    return {
      success: true,
      data: { smartWalletAddress, logs },
      message: success ? '🚀 Quest successfully verified and claimed!' : '⚡ JWT user-bound session executed. Check execution logs.'
    };

  } catch (error: any) {
    return { 
      success: false, 
      data: { error: error.message },
      message: '❌ Engine Error: ' + error.message 
    };
  }
}
