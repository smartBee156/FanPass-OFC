import axios from 'axios';

const SUBDOMAIN_API = 'https://fanpass.proofchain.co.za';

export async function pollAccountVerification(input: string): Promise<{ success: boolean; data?: any; message: string }> {
  const token = input.trim();
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Origin': 'https://fanpass.onefootball.com',
    'Referer': 'https://fanpass.onefootball.com/',
    'X-Tenant-ID': 'tenant_1g6k1cew859ls7408'
  };

  if (token.startsWith('eyJ')) {
    headers['Authorization'] = 'Bearer ' + token;
  } else {
    headers['Cookie'] = token;
  }

  // Probe API routes directly on the tenant subdomain
  const candidateEndpoints = [
    '/api/quests',
    '/v1/quests',
    '/api/v1/quests',
    '/quests',
    '/backend/quests'
  ];

  const probeResults: Record<string, any> = {};

  for (const endpoint of candidateEndpoints) {
    try {
      const res = await axios.get(`${SUBDOMAIN_API}${endpoint}`, { 
        headers, 
        timeout: 10000, 
        validateStatus: () => true 
      });

      const contentType = res.headers['content-type'] || '';
      
      probeResults[endpoint] = {
        status: res.status,
        contentType,
        // If it's JSON, show the data; if it's HTML, summarize it so we don't spam chat
        data: contentType.includes('application/json') ? res.data : '[HTML Frontend Response]'
      };

      // If we find an endpoint returning JSON with a 200 OK status
      if (res.status === 200 && contentType.includes('application/json')) {
        return {
          success: true,
          data: {
            endpoint,
            payload: res.data
          },
          message: `✅ Subdomain API Unlocked at [${endpoint}]!`
        };
      }
    } catch (err: any) {
      probeResults[endpoint] = { error: err.message };
    }
  }

  return {
    success: true,
    data: probeResults,
    message: '✅ Subdomain API Route Probe Complete.'
  };
}
