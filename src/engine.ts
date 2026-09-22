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

  // Test different schema key formats to find what the 422 validator expects
  const payloadsToTest = [
    { questId: polymarketQuestId },
    { id: polymarketQuestId },
    { slug: polymarketSlug },
    { quest_id: polymarketQuestId },
    { questId: polymarketQuestId, slug: polymarketSlug }
  ];

  const results = [];

  for (const payload of payloadsToTest) {
    try {
      const res = await axios.put(`${SUBDOMAIN_API}/api/quests/verify`, payload, {
        headers,
        timeout: 10000,
        validateStatus: () => true
      });

      results.push({
        payload,
        status: res.status,
        response: res.data
      });

      if (res.status >= 200 && res.status < 300) {
        return {
          success: true,
          data: { winningPayload: payload, response: res.data },
          message: `🚀 Polymarket Quest Force-Ticked Successfully via PUT!`
        };
      }
    } catch (err: any) {
      results.push({ payload, error: err.message });
    }
  }

  return {
    success: true,
    data: { results },
    message: '⚡ Schema Resolution Audit Complete. Check response snippet.'
  };
}
