import axios from 'axios';

const BASE_API = 'https://fanpass.proofchain.co.za/api';
const TENANT_ID = 'tenant_1g6k1cew859ls7408';
const QUEST_ID = '81ff3b8a-03bf-488c-828c-f60923e96149';

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

    // 2. Initialize / Start Quest using 'me' or clean query
    const startUrl = `${BASE_API}/quests/${QUEST_ID}/start?user_id=me`;
    const startRes = await axios.post(startUrl, { questId: QUEST_ID }, { headers, validateStatus: () => true });
    logs.push({ step: 'START_QUEST', status: startRes.status, response: startRes.data });

    // Grab the authoritative user_id returned directly by the server's start response if available
    const serverUserId = startRes.data?.user_id || 'me';

    // 3. Check Progress using 'me'
    const progressUrl = `${BASE_API}/quests/${QUEST_ID}/progress/${serverUserId}`;
    const progressRes = await axios.get(progressUrl, { headers, validateStatus: () => true });
    logs.push({ step: 'GET_QUEST_PROGRESS', status: progressRes.status, response: progressRes.data });

    // 4. Attempt Claim Reward using 'me'
    const claimUrl = `${BASE_API}/quests/${QUEST_ID}/progress/${serverUserId}/claim`;
    const claimRes = await axios.post(claimUrl, {}, { headers, validateStatus: () => true });
    logs.push({ step: 'CLAIM_REWARD', status: claimRes.status, response: claimRes.data });

    const success = claimRes.status >= 200 && claimRes.status < 300;

    return {
      success: true,
      data: { smartWalletAddress, logs },
      message: success ? '🚀 Quest successfully verified and claimed!' : '⚡ Authenticated session routes executed. Check execution logs.'
    };

  } catch (error: any) {
    return { 
      success: false, 
      data: { error: error.message },
      message: '❌ Engine Error: ' + error.message 
    };
  }
}
