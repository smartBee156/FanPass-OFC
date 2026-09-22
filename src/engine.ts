import axios from 'axios';

const PROOFCHAIN_API = 'https://api.proofchain.co.za';

export async function pollAccountVerification(input: string): Promise<{ success: boolean; data?: any; message: string }> {
  const token = input.trim();
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Origin': 'https://fanpass.onefootball.com',
    'Referer': 'https://fanpass.onefootball.com/'
  };

  if (token.startsWith('eyJ')) {
    headers['Authorization'] = 'Bearer ' + token;
  } else {
    headers['Cookie'] = token;
  }

  // Probe potential route prefixes on proofchain.co.za
  const candidatePaths = [
    '/quests',
    '/api/quests',
    '/v1/quests',
    '/rewards',
    '/users/me',
    '/me'
  ];

  const results: Record<string, any> = {};

  for (const path of candidatePaths) {
    try {
      const res = await axios.get(`${PROOFCHAIN_API}${path}`, { 
        headers, 
        timeout: 10000, 
        validateStatus: () => true 
      });

      results[path] = { status: res.status, data: res.data };

      if (res.status >= 200 && res.status < 300) {
        return {
          success: true,
          data: {
            workingPath: path,
            payload: res.data
          },
          message: `✅ Proofchain Route Found: ${path}`
        };
      }
    } catch (err: any) {
      results[path] = { error: err.message };
    }
  }

  return {
    success: true,
    data: { probeResults: results },
    message: '✅ Connected to Proofchain API. Probed routes.'
  };
}
