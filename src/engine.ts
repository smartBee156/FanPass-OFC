import axios from 'axios';

const SUBDOMAIN_API = 'https://fanpass.proofchain.co.za';

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
  const questName = 'Market Debut';
  const questSlug = 'kick-off-with-polymarket-us';

  try {
    const executionLogs = [];

    // Step 1: Initialize / Start the quest to generate your user-quest instance
    const startEndpoints = [
      { method: 'get', url: `${SUBDOMAIN_API}/api/quests/${questId}/start` },
      { method: 'post', url: `${SUBDOMAIN_API}/api/quests/${questId}/start`, data: { questId } },
      { method: 'get', url: `${SUBDOMAIN_API}/api/quests/${questId}/start/link` }
    ];

    let initialized = false;
    for (const startOp of startEndpoints) {
      const res = await axios({
        method: startOp.method,
        url: startOp.url,
        headers,
        data: (startOp as any).data,
        timeout: 8000,
        validateStatus: () => true
      });

      executionLogs.push({ step: 'START', action: `${startOp.method.toUpperCase()} ${startOp.url}`, status: res.status, response: res.data });

      if (res.status >= 200 && res.status < 300) {
        initialized = true;
        break;
      }
    }

    // Step 2: Fire the verification / completion force-tick payload
    const verifyPayloads = [
      { id: questId, name: questName, slug: questSlug },
      { questId, name: questName }
    ];

    let completed = false;
    for (const payload of verifyPayloads) {
      const res = await axios.put(`${SUBDOMAIN_API}/api/quests/verify`, payload, {
        headers,
        timeout: 8000,
        validateStatus: () => true
      });

      executionLogs.push({ step: 'VERIFY', payload, status: res.status, response: res.data });

      if (res.status >= 200 && res.status < 300) {
        completed = true;
        break;
      }
    }

    return {
      success: true,
      data: { initialized, completed, executionLogs },
      message: completed ? '🚀 Polymarket Quest Successfully Initialized and Force-Ticked!' : '⚡ Execution completed. Check logs for details.'
    };

  } catch (error: any) {
    return { success: false, message: '❌ Error: ' + error.message };
  }
}
