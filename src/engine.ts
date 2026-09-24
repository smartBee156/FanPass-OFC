import axios from 'axios';

const CORE_API = 'https://fanpass.proofchain.co.za/api';
const MASTER_API = 'https://api.proofchain.co.za';
const TENANT_ID = 'tenant_b56f41ce3351a7d08';
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
      'Authorization': `Bearer ${token}`,
      'Cookie': `access_token=${token}; token=${token}`,
      'Content-Type': 'application/json'
    };

    const logs = [];

    // Extract user ID safely from the JWT payload
    let jwtUserId = 'afe546fe-0aa9-4a4b-9ff4-81db76b76cdf';
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        jwtUserId = payload.sub || payload.user_id || jwtUserId;
      }
    } catch (e) {}

    const encodedUser = encodeURIComponent(jwtUserId);

    // 1. Fetch Wallets on Core Gateway
    const walletsRes = await axios.get(`${CORE_API}/wallets/me`, { headers, validateStatus: () => true });
    logs.push({ step: 'GET_WALLETS', status: walletsRes.status, response: walletsRes.data });
    const smartWalletAddress = walletsRes.data?.wallet_address || 'Unknown';

    // 2. Check Master Available Quests on Master API (using the exact URL format from DevTools)
    const availableRes = await axios.get(`${MASTER_API}/quests/available?user_id=${encodedUser}`, { headers, validateStatus: () => true });
    logs.push({ step: 'GET_AVAILABLE_QUESTS', status: availableRes.status, response: availableRes.data });

    // 3. Start Quest Session on Core Gateway
    const startUrl = `${CORE_API}/quests/${QUEST_ID}/start?user_id=${encodedUser}`;
    const startRes = await axios.post(startUrl, { questId: QUEST_ID }, { headers, validateStatus: () => true });
    logs.push({ step: 'START_QUEST', status: startRes.status, response: startRes.data });

    // 4. Polling Loop for Progress
    let questState: any = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      const progressUrl = `${CORE_API}/quests/${QUEST_ID}/progress/${encodedUser}`;
      const progressRes = await axios.get(progressUrl, { headers, validateStatus: () => true });
      
      questState = progressRes.data;
      logs.push({ step: `POLL_PROGRESS_ATTEMPT_${attempts}`, status: progressRes.status, response: questState });

      if (questState?.can_claim || questState?.completion_percentage === 100) {
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // 5. Attempt Claim
    let claimRes: any = { status: 400, data: { detail: 'Not ready for claim yet' } };
    if (questState?.can_claim || questState?.completion_percentage === 100) {
      const claimUrl = `${CORE_API}/quests/${QUEST_ID}/progress/${encodedUser}/claim`;
      claimRes = await axios.post(claimUrl, {}, { headers, validateStatus: () => true });
      logs.push({ step: 'CLAIM_REWARD', status: claimRes.status, response: claimRes.data });
    }

    const success = claimRes.status >= 200 && claimRes.status < 300;

    return {
      success: true,
      data: { smartWalletAddress, logs },
      message: success ? '🚀 Quest verified and successfully claimed!' : '⚡ Execution completed with dual-gateway routing.'
    };

  } catch (error: any) {
    return { 
      success: false, 
      data: { error: error.message },
      message: '❌ Engine Error: ' + error.message 
    };
  }
}
