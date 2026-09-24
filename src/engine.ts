import axios from 'axios';

const BASE_API = 'https://api.proofchain.co.za';
const TENANT_ID = 'tenant_b56f41ce3351a7d08';
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
    const jwtUserId = extractUserId(token) || 'afe546fe-0aa9-4a4b-9ff4-81db76b76cdf';
    const encodedUser = encodeURIComponent(jwtUserId);

    // 1. Fetch Wallets
    const walletsRes = await axios.get(`${BASE_API}/wallets/me`, { headers, validateStatus: () => true });
    logs.push({ step: 'GET_WALLETS', status: walletsRes.status, response: walletsRes.data });
    const smartWalletAddress = walletsRes.data?.wallet_address || 'Unknown';

    // 2. Start Quest Session
    const startUrl = `${BASE_API}/quests/${QUEST_ID}/start?user_id=${encodedUser}`;
    const startRes = await axios.post(startUrl, { questId: QUEST_ID }, { headers, validateStatus: () => true });
    logs.push({ step: 'START_QUEST', status: startRes.status, response: startRes.data });

    // 3. Intelligent Polling Loop (Forces backend indexer re-evaluation)
    let questState: any = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      const progressUrl = `${BASE_API}/quests/${QUEST_ID}/progress/${encodedUser}`;
      const progressRes = await axios.get(progressUrl, { headers, validateStatus: () => true });
      
      questState = progressRes.data;
      logs.push({ step: `POLL_PROGRESS_ATTEMPT_${attempts}`, status: progressRes.status, response: questState });

      if (questState?.can_claim || questState?.completion_percentage === 100) {
        break;
      }
      
      // Wait 2 seconds between polls to let the backend indexer update
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // 4. Attempt Claim if condition is met or force it
    let claimRes: any = { status: 400, data: { detail: 'Not ready for claim yet' } };
    if (questState?.can_claim || questState?.completion_percentage === 100 || attempts >= maxAttempts) {
      const claimUrl = `${BASE_API}/quests/${QUEST_ID}/progress/${encodedUser}/claim`;
      claimRes = await axios.post(claimUrl, {}, { headers, validateStatus: () => true });
      logs.push({ step: 'CLAIM_REWARD', status: claimRes.status, response: claimRes.data });
    }

    const success = claimRes.status >= 200 && claimRes.status < 300;

    return {
      success: true,
      data: { smartWalletAddress, logs },
      message: success ? '🚀 Quest verified and successfully claimed!' : '⚡ Execution completed. Check logs for account status.'
    };

  } catch (error: any) {
    return { 
      success: false, 
      data: { error: error.message },
      message: '❌ Engine Error: ' + error.message 
    };
  }
}
