import axios from 'axios';

const BASE_API = 'https://fanpass.onefootball.com/api';
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
    const smartWalletAddress = walletsRes.data?.wallet_address || 'Unknown';

    // 2. Start Quest Session
    const startUrl = `${BASE_API}/quests/${QUEST_ID}/start?user_id=${encodedUser}`;
    const startRes = await axios.post(startUrl, { questId: QUEST_ID }, { headers, validateStatus: () => true });
    logs.push({ step: 'START_QUEST', status: startRes.status, response: startRes.data });

    // 3. Diagnostic Polling & Step-Verify Loop
    let questState: any = null;
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      attempts++;
      const progressUrl = `${BASE_API}/quests/${QUEST_ID}/progress/${encodedUser}`;
      const progressRes = await axios.get(progressUrl, { headers, validateStatus: () => true });
      
      questState = progressRes.data;
      logs.push({ step: `POLL_PROGRESS_ATTEMPT_${attempts}`, status: progressRes.status, response: questState });

      // Force log every step verification attempt regardless of status code
      if (questState?.step_progress) {
        for (const [stepKey, stepData] of Object.entries(questState.step_progress) as [string, any][]) {
          if (!stepData.completed) {
            const stepVerifyUrl = `${BASE_API}/quests/${QUEST_ID}/progress/${encodedUser}/steps/${stepKey}/verify`;
            const stepRes = await axios.post(stepVerifyUrl, {}, { headers, validateStatus: () => true });
            logs.push({ 
              step: `DIAGNOSTIC_VERIFY_STEP_${stepKey}`, 
              status: stepRes.status, 
              endpoint: stepVerifyUrl, 
              response: stepRes.data 
            });
          }
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    return {
      success: true,
      data: { smartWalletAddress, logs },
      message: '🔍 Diagnostic run complete. Check the logs for step verification endpoints.'
    };

  } catch (error: any) {
    return { 
      success: false, 
      data: { error: error.message },
      message: '❌ Engine Error: ' + error.message 
    };
  }
}
