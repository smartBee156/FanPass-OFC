import axios from 'axios';

const BASE_API = 'https://fanpass.proofchain.co.za/api';
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

    // 1. Fetch Wallets
    const walletsRes = await axios.get(`${BASE_API}/wallets/me`, { headers, validateStatus: () => true });
    logs.push({ step: 'GET_WALLETS', status: walletsRes.status, response: walletsRes.data });

    // 2. Start Quest Session
    const startUrl = `${BASE_API}/quests/${QUEST_ID}/start?user_id=${encodedUser}`;
    const startRes = await axios.post(startUrl, { questId: QUEST_ID }, { headers, validateStatus: () => true });
    logs.push({ step: 'START_QUEST', status: startRes.status, response: startRes.data });

    // 3. Test Global Verification Endpoints
    const verifyRouteGlobal = `${BASE_API}/quests/${QUEST_ID}/verify`;
    const resGlobal = await axios.post(verifyRouteGlobal, { user_id: jwtUserId }, { headers, validateStatus: () => true });
    logs.push({ step: 'GLOBAL_VERIFY_ENDPOINT', status: resGlobal.status, response: resGlobal.data });

    const verifyRouteProgress = `${BASE_API}/quests/${QUEST_ID}/progress/${encodedUser}/verify`;
    const resProgress = await axios.post(verifyRouteProgress, {}, { headers, validateStatus: () => true });
    logs.push({ step: 'PROGRESS_VERIFY_ENDPOINT', status: resProgress.status, response: resProgress.data });

    return {
      success: true,
      data: { logs },
      message: '🔍 Global route diagnostic completed. Check results.'
    };

  } catch (error: any) {
    return { 
      success: false, 
      data: { error: error.message },
      message: '❌ Engine Error: ' + error.message 
    };
  }
}
