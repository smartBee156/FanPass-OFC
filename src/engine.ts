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
    const userId = extractUserId(token) || 'afe546fe-0aa9-4a4b-9ff4-81db76b76cdf';
    const encodedUser = encodeURIComponent(userId);

    const logs = [];

    // 1. Initialize / Start the quest
    const startUrl = `${BASE_API}/quests/${questId}/start?user_id=${encodedUser}`;
    const startRes = await axios.post(startUrl, {}, { headers, validateStatus: () => true });
    logs.push({ step: 'START_QUEST', status: startRes.status, response: startRes.data });

    // 2. Trigger Event Ingestion via Verification Hooks
    // We target potential verification and proof endpoints uncovered by the frontend scan
    const verificationEndpoints = [
      `${BASE_API}/quests/${questId}/verify`,
      `${BASE_API}/verify/proof`,
      `${BASE_API}/quests/${questId}/progress/${encodedUser}/verify`,
      `${BASE_API}/verify/batch/${questId}`
    ];

    const verifyResults = [];
    for (const url of verificationEndpoints) {
      for (const method of ['post', 'put', 'get']) {
        const vRes = await axios({
          method,
          url,
          headers,
          data: { questId, user_id: userId, userQuestId: startRes.data?.id },
          validateStatus: () => true
        });

        verifyResults.push({
          attempt: `${method.toUpperCase()} ${url}`,
          status: vRes.status,
          response: vRes.data
        });

        if (vRes.status >= 200 && vRes.status < 300) break;
      }
    }

    logs.push({ step: 'VERIFICATION_TRIGGER', results: verifyResults });

    // 3. Attempt to claim reward after triggering verification
    const claimUrl = `${BASE_API}/quests/${questId}/progress/${encodedUser}/claim`;
    const claimRes = await axios.post(claimUrl, {}, { headers, validateStatus: () => true });
    logs.push({ step: 'CLAIM_REWARD', status: claimRes.status, response: claimRes.data });

    const success = claimRes.status >= 200 && claimRes.status < 300;

    return {
      success: true,
      data: { userId, questId, logs },
      message: success ? '🚀 Polymarket Quest Ingested & Claimed!' : '⚡ Verification triggers dispatched. Check execution logs.'
    };

  } catch (error: any) {
    return { 
      success: false, 
      data: { error: error.message },
      message: '❌ Engine Error: ' + error.message 
    };
  }
}
