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

  const polymarketQuestId = '81ff3b8a-03bf-488c-828c-f60923e96149';

  // Test alternative HTTP methods (GET, PUT) and query parameters for verification routes
  const actions = [
    { method: 'get', url: `${SUBDOMAIN_API}/api/quests/${polymarketQuestId}/verify` },
    { method: 'put', url: `${SUBDOMAIN_API}/api/quests/${polymarketQuestId}/verify` },
    { method: 'get', url: `${SUBDOMAIN_API}/api/quests/verify`, params: { questId: polymarketQuestId } },
    { method: 'put', url: `${SUBDOMAIN_API}/api/quests/verify`, data: { questId: polymarketQuestId } },
    { method: 'get', url: `${SUBDOMAIN_API}/api/quests/${polymarketQuestId}/start/link` }
  ];

  const probeResults = [];

  for (const action of actions) {
    try {
      const res = await axios({
        method: action.method,
        url: action.url,
        headers,
        params: (action as any).params,
        data: (action as any).data,
        timeout: 10000,
        validateStatus: () => true
      });

      probeResults.push({
        action: `${action.method.toUpperCase()} ${action.url}`,
        status: res.status,
        response: res.data
      });

      if (res.status >= 200 && res.status < 300) {
        return {
          success: true,
          data: { winningAction: action, response: res.data },
          message: `🚀 Polymarket Quest Ticked Successfully via ${action.method.toUpperCase()}!`
        };
      }
    } catch (err: any) {
      probeResults.push({ action: action.url, error: err.message });
    }
  }

  return {
    success: true,
    data: { probeResults },
    message: '⚡ Method audit complete. Check response snippet.'
  };
}
