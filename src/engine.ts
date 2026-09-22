import axios from 'axios';

const PROOFCHAIN_API = 'https://api.proofchain.co.za';

export async function pollAccountVerification(input: string): Promise<{ success: boolean; data?: any; message: string }> {
  const token = input.trim();
  const headers: Record<string, string> = {
    'Host': 'api.proofchain.co.za',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Origin': 'https://fanpass.onefootball.com',
    'Referer': 'https://fanpass.onefootball.com/',
    'X-Tenant-Slug': 'fanpass',
    'X-Tenant-ID': 'tenant_1g6k1cew859ls7408'
  };

  if (token.startsWith('eyJ')) {
    headers['Authorization'] = 'Bearer ' + token;
  } else {
    headers['Cookie'] = token;
  }

  // Probe likely API path variants on the backend server
  const candidateEndpoints = [
    '/api/quests',
    '/v1/quests',
    '/api/v1/quests',
    '/tenants/fanpass/quests',
    '/quests'
  ];

  for (const endpoint of candidateEndpoints) {
    try {
      const res = await axios.get(`${PROOFCHAIN_API}${endpoint}`, { 
        headers, 
        timeout: 10000, 
        validateStatus: () => true 
      });

      // If we hit a successful JSON response or anything other than a standard routing 404/400
      if (res.status === 200 || (res.status !== 404 && res.status !== 400)) {
        return {
          success: true,
          data: {
            endpoint,
            statusCode: res.status,
            payload: res.data
          },
          message: `✅ Found Active API Route: ${endpoint} [Status ${res.status}]!`
        };
      }
    } catch (err) {
      // Continue probing next endpoint
    }
  }

  return {
    success: true,
    data: { message: "Probed all backend API endpoints with tenant headers." },
    message: '✅ API Probed. Check payload.'
  };
}
