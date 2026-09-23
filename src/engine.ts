import axios from 'axios';

const BASE_API = 'https://fanpass.proofchain.co.za/api';
const TENANT_ID = 'tenant_1g6k1cew859ls7408';

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
    const logs = [];

    // 1. Fetch wallet/profile info first to get the exact smart wallet address
    const walletsRes = await axios.get(`${BASE_API}/wallets/me`, { headers, validateStatus: () => true });
    logs.push({ step: 'GET_WALLETS', status: walletsRes.status, response: walletsRes.data });

    const walletData = walletsRes.data || {};
    const smartWalletAddress = walletData.wallet_address || '0xbC7859CC04132386C7DF14895ff3a67fA5bFc26b';
    const cdpUserId = walletData.cdp_user_id;

    // 2. Target /api/wallets/verify with payload variations to force deposit synchronization
    const verifyPayloads = [
      { address: smartWalletAddress, network: 'base-mainnet', quest_id: questId },
      { wallet_address: smartWalletAddress, cdp_user_id: cdpUserId },
      { questId, walletAddress: smartWalletAddress }
    ];

    const verifyResults = [];
    for (const payload of verifyPayloads) {
      for (const method of ['post', 'get']) {
        const vRes = await axios({
          method,
          url: `${BASE_API}/wallets/verify`,
          headers,
          data: method === 'post' ? payload : undefined,
          params: method === 'get' ? payload : undefined,
          validateStatus: () => true
        });

        verifyResults.push({
          method: method.toUpperCase(),
          payload,
          status: vRes.status,
          response: vRes.data
        });

        if (vRes.status >= 200 && vRes.status < 300) break;
      }
    }

    logs.push({ step: 'WALLET_VERIFY_TRIGGER', results: verifyResults });

    // 3. Check progress again to see if steps ticked
    const startUrl = `${BASE_API}/quests/${questId}/start`;
    const startRes = await axios.post(startUrl, { questId }, { headers, validateStatus: () => true });
    logs.push({ step: 'RE_CHECK_PROGRESS', status: startRes.status, response: startRes.data });

    return {
      success: true,
      data: { smartWalletAddress, logs },
      message: '⚡ Wallet verification sync triggered. Check execution logs!'
    };

  } catch (error: any) {
    return { 
      success: false, 
      data: { error: error.message },
      message: '❌ Engine Error: ' + error.message 
    };
  }
}
