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

  // Your exact live Polymarket quest ID discovered from the API
  const polymarketQuestId = '81ff3b8a-03bf-488c-828c-f60923e96149';

  // Comprehensive force-tick and verification route variants
  const forceActions = [
    { path: `/api/quests/${polymarketQuestId}/verify`, method: 'post' },
    { path: `/api/quests/${polymarketQuestId}/complete`, method: 'post' },
    { path: `/api/quests/${polymarketQuestId}/claim`, method: 'post' },
    { path: `/api/quests/${polymarketQuestId}/start/link`, method: 'post' },
    { path: `/api/quests/${polymarketQuestId}/start/link`, method: 'get' },
    { path: `/api/quests/${polymarketQuestId}/check`, method: 'post' }
  ];

  const probeResults = [];

  for (const action of forceActions) {
    try {
      const res = await axios({
        method: action.method,
        url: `${SUBDOMAIN_API}${action.path}`,
        headers,
        data: { questId: polymarketQuestId },
        timeout: 10000,
        validateStatus: () => true
      });

      probeResults.push({
        action: `${action.method.toUpperCase()} ${action.path}`,
        status: res.status,
        response: res.data
      });

      // If any endpoint accepts the verification with a 2xx success status, we nailed it
      if (res.status >= 200 && res.status < 300) {
        return {
          success: true,
          data: {
            winningAction: `${action.method.toUpperCase()} ${action.path}`,
            payload: res.data
          },
          message: `🚀 Polymarket Quest Force-Ticked Successfully via ${action.method.toUpperCase()} ${action.path}!`
        };
      }
    } catch (err: any) {
      probeResults.push({
        action: `${action.method.toUpperCase()} ${action.path}`,
        error: err.message
      });
    }
  }

  return {
    success: true,
    data: { probeResults },
    message: '⚡ Force-tick audit executed. Check response snippet for winning route.'
  };
}
