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
  try {
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
    const questName = 'Market Debut';
    const questSlug = 'kick-off-with-polymarket-us';
    const userId = extractUserId(token);

    const logs = [];

    // Step 1: Start / Initialize user quest instance
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

    // Step 2: Target nested sub-resource paths structured around questId and userQuestId
    const candidatePaths = [
      `${SUBDOMAIN_API}/api/quests/${questId}/complete`,
      `${SUBDOMAIN_API}/api/quests/${questId}/verify`,
      `${SUBDOMAIN_API}/api/quests/${questId}/submit`,
      `${SUBDOMAIN_API}/api/user-quests/${userQuestId}/complete`,
      `${SUBDOMAIN_API}/api/user-quests/${userQuestId}/verify`,
      `${SUBDOMAIN_API}/api/user-quests/${userQuestId}/submit`,
      `${SUBDOMAIN_API}/api/quests/${questId}/user-quests/${userQuestId}/complete`
    ];

    const payload = {
      id: userQuestId,
      user_quest_id: userQuestId,
      quest_id: questId,
      questId: questId,
      slug: questSlug,
      name: questName,
      status: 'completed',
      steps_completed: 4,
      total_steps: 4,
      completion_percentage: 100,
      steps: [
        { step: 0, name: 'Market Step 1', status: 'completed', completed: true },
        { step: 1, name: 'Market Step 2', status: 'completed', completed: true },
        { step: 2, name: 'Market Step 3', status: 'completed', completed: true },
        { step: 3, name: 'Market Step 4', status: 'completed', completed: true }
      ]
    };

    let completed = false;
    let winningResult = null;

    for (const url of candidatePaths) {
      for (const method of ['post', 'put', 'patch']) {
        const res = await axios({
          method,
          url,
          headers,
          data: payload,
          timeout: 6000,
          validateStatus: () => true
        });

        logs.push({ 
          attempt: `${method.toUpperCase()} ${url}`, 
          status: res.status, 
          response: res.data 
        });

        if (res.status >= 200 && res.status < 300) {
          completed = true;
          winningResult = { method: method.toUpperCase(), url, response: res.data };
          break;
        }
      }
      if (completed) break;
    }

    return {
      success: true,
      data: { userQuestId, completed, winningResult, logs },
      message: completed ? '🚀 Polymarket Quest Force-Ticked Successfully!' : '⚡ Sub-resource sweep complete. Check execution logs.'
    };

  } catch (error: any) {
    return { 
      success: false, 
      data: { error: error.message },
      message: '❌ Engine Error: ' + error.message 
    };
  }
}
