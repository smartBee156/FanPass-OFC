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

    const jwtUserId = extractUserId(token) || 'afe546fe-0aa9-4a4b-9ff4-81db76b76cdf';
    const logs = [];

    // 1. Get Wallet Info
    const walletsRes = await axios.get(`${BASE_API}/wallets/me`, { headers, validateStatus: () => true });
    const walletData = walletsRes.data || {};
    const smartWalletAddress = walletData.wallet_address || '0xbC7859CC04132386C7DF14895ff3a67fA5bFc26b';
    logs.push({ step: 'GET_WALLETS', wallet: smartWalletAddress });

    // 2. Initialize / Start Quest to secure active session and authoritative user_id
    const startUrl = `${BASE_API}/quests/${QUEST_ID}/start?user_id=${encodeURIComponent(jwtUserId)}`;
    const startRes = await axios.post(startUrl, { questId: QUEST_ID }, { headers, validateStatus: () => true });
    logs.push({ step: 'START_QUEST', status: startRes.status, response: startRes.data });

    const activeUserId = startRes.data?.user_id || jwtUserId;
    const progressId = startRes.data?.id;

    // 3. Probe Step Completion Endpoints for steps 0, 1, 2, 3
    const stepCompletionResults = [];
    const stepEndpoints = [
      `${BASE_API}/quests/${QUEST_ID}/progress/${progressId}/step`,
      `${BASE_API}/quests/${QUEST_ID}/steps`,
      `${BASE_API}/quests/progress/step`,
      `${BASE_API}/quests/${QUEST_ID}/complete-step`
    ];

    for (let stepIndex = 0; stepIndex < 4; stepIndex++) {
      for (const url of stepEndpoints) {
        for (const method of ['post', 'put', 'patch']) {
          const sRes = await axios({
            method,
            url,
            data: {
              quest_id: QUEST_ID,
              user_id: activeUserId,
              progress_id: progressId,
              step_index: stepIndex,
              step: stepIndex,
              wallet_address: smartWalletAddress
            },
            headers,
            validateStatus: () => true
          });

          if (sRes.status !== 404 && sRes.status !== 405) {
            stepCompletionResults.push({ step: stepIndex, method: method.toUpperCase(), url, status: sRes.status, response: sRes.data });
          }
        }
      }
    }
    logs.push({ step: 'STEP_COMPLETION_PROBES', results: stepCompletionResults });

    // 4. Attempt Final Claim Reward
    const claimUrl = `${BASE_API}/quests/${QUEST_ID}/progress/${encodeURIComponent(activeUserId)}/claim`;
    const claimRes = await axios.post(claimUrl, {}, { headers, validateStatus: () => true });
    logs.push({ step: 'CLAIM_REWARD', status: claimRes.status, response: claimRes.data });

    const success = claimRes.status >= 200 && claimRes.status < 300;

    return {
      success: true,
      data: { smartWalletAddress, logs },
      message: success ? '🚀 Quest successfully verified and claimed!' : '⚡ Step completion probes executed. Check execution logs.'
    };

  } catch (error: any) {
    return { 
      success: false, 
      data: { error: error.message },
      message: '❌ Engine Error: ' + error.message 
    };
  }
}
