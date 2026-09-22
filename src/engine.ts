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
  const polymarketSlug = 'kick-off-with-polymarket-us';

  // Test sending the quest identifier inside the request body payload
  const bodyActions = [
    { url: `${SUBDOMAIN_API}/api/quests/verify`, data: { questId: polymarketQuestId } },
    { url: `${SUBDOMAIN_API}/api/quests/complete`, data: { questId: polymarketQuestId } },
    { url: `${SUBDOMAIN_API}/api/quests/claim`, data: { questId: polymarketQuestId } },
    { url: `${SUBDOMAIN_API}/api/quests/start`, data: { questId: polymarketQuestId } },
    { url: `${SUBDOMAIN_API}/api/quests/verify`, data: { id: polymarketQuestId } },
    { url: `${SUBDOMAIN_API}/api/quests/verify`, data: { slug: polymarketSlug } }
  ];

  const probeResults = [];

  for (const action of bodyActions) {
    try {
      const res = await axios.post(action.url, action.data, {
        headers,
        timeout: 10000,
        validateStatus: () => true
      });

      probeResults.push({
        endpoint: action.url,
        payloadSent: action.data,
        status: res.status,
        response: res.data
      });

      if (res.status >= 200 && res.status < 300) {
        return {
          success: true,
          data: {
            winningEndpoint: action.url,
            payloadSent: action.data,
            response: res.data
          },
          message: `🚀 Polymarket Quest Force-Ticked via Payload Body!`
        };
      }
    } catch (err: any) {
      probeResults.push({
        endpoint: action.url,
        error: err.message
      });
    }
  }

  return {
    success: true,
    data: { probeResults },
    message: '⚡ Body-payload action audit complete. Check response snippet.'
  };
}
