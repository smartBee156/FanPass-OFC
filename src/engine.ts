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

    // Step 2: Advance pending steps (1, 2, 3) individually to prevent backend 500 crashes
    const stepTargetIndices = [1, 2, 3];
    const stepResults = [];

    for (const stepIndex of stepTargetIndices) {
      const stepEndpoints = [
        `${SUBDOMAIN_API}/api/user-quests/${userQuestId}/steps/${stepIndex}/complete`,
        `${SUBDOMAIN_API}/api/user-quests/${userQuestId}/step/${stepIndex}`,
        `${SUBDOMAIN_API}/api/quests/${questId}/steps/${stepIndex}/verify`
      ];

      let stepDone = false;
      for (const ep of stepEndpoints) {
        const res = await axios.post(ep, { step: stepIndex, status: 'completed' }, {
          headers,
          timeout: 6000,
          validateStatus: () => true
        });

        if (res.status >= 200 && res.status < 300) {
          stepDone = true;
          stepResults.push({ step: stepIndex, endpoint: ep, status: res.status, response: res.data });
          break;
        }
      }
      if (!stepDone) {
        stepResults.push({ step: stepIndex, status: 'skipped_or_failed' });
      }
    }

    logs.push({ step: 'STEP_PROGRESSIONS', results: stepResults });

    // Step 3: Final completion trigger
    const finalRes = await axios.post(`${SUBDOMAIN_API}/api/quests/verify`, {
      id: questId,
      questId: questId,
      slug: questSlug,
      name: questName,
      user_quest_id: userQuestId,
      status: 'completed'
    }, {
      headers,
      timeout: 8000,
      validateStatus: () => true
    });

    logs.push({ step: 'FINAL_VERIFY', status: finalRes.status, response: finalRes.data });

    const completed = finalRes.status >= 200 && finalRes.status < 300;

    return {
      success: true,
      data: { userQuestId, completed, logs },
      message: completed ? '🚀 Polymarket Quest Fully Ticked!' : '⚡ Steps processed. Check logs for details.'
    };

  } catch (error: any) {
    return { 
      success: false, 
      data: { error: error.message },
      message: '❌ Engine Error: ' + error.message 
    };
  }
}
