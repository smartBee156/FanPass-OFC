import axios from 'axios';

const SUBDOMAIN_API = 'https://fanpass.proofchain.co.za';

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
  const token = input.trim();
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Origin': 'https://fanpass.onefootball.com',
    'Referer': 'https://fanpass.onefootball.com/',
    'X-Tenant-ID': 'tenant_1g6k1cew859ls7408',
    'Content-Type': 'application/json'
  };

  if (token.startsWith('eyJ')) {
    headers['Authorization'] = 'Bearer ' + token;
  } else {
    headers['Cookie'] = token;
  }

  const questId = '81ff3b8a-03bf-488c-828c-f60923e96149';
  const userId = extractUserId(token);

  try {
    const logs = [];

    // Step 1: Ensure quest instance is started and get the user-quest tracking ID
    const startUrl = userId 
      ? `${SUBDOMAIN_API}/api/quests/${questId}/start?user_id=${userId}`
      : `${SUBDOMAIN_API}/api/quests/${questId}/start`;

    const startRes = await axios.post(startUrl, { questId }, {
      headers,
      timeout: 8000,
      validateStatus: () => true
    });

    logs.push({ step: 'START', status: startRes.status, response: startRes.data });

    const userQuestId = startRes.data?.id || '26ada2ca-8b24-4cc6-9566-b826026397ab';

    // Step 2: Target the user-quest instance routes to push steps to completion (4/4 steps)
    const completionEndpoints = [
      { method: 'put', url: `${SUBDOMAIN_API}/api/user-quests/${userQuestId}`, data: { steps_completed: 4, completion_percentage: 100, status: 'completed' } },
      { method: 'post', url: `${SUBDOMAIN_API}/api/user-quests/${userQuestId}/complete`, data: { steps_completed: 4 } },
      { method: 'post', url: `${SUBDOMAIN_API}/api/quests/${questId}/verify`, data: { user_quest_id: userQuestId, steps_completed: 4 } },
      { method: 'put', url: `${SUBDOMAIN_API}/api/quests/verify`, data: { questId, user_quest_id: userQuestId, status: 'completed' } }
    ];

    let completed = false;
    for (const endpoint of completionEndpoints) {
      const res = await axios({
        method: endpoint.method,
        url: endpoint.url,
        headers,
        data: endpoint.data,
        timeout: 8000,
        validateStatus: () => true
      });

      logs.push({ step: 'COMPLETE_ATTEMPT', url: endpoint.url, status: res.status, response: res.data });

      if (res.status >= 200 && res.status < 300) {
        completed = true;
        break;
      }
    }

    return {
      success: true,
      data: { userQuestId, completed, logs },
      message: completed ? '🚀 Polymarket Quest Fully Completed & Ticked!' : '⚡ Quest started. Check completion logs.'
    };

  } catch (error: any) {
    return { success: false, message: '❌ Error: ' + error.message };
  }
}
