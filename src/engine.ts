import axios from 'axios';
import https from 'https';

// Direct IP routing with explicit SNI servername to satisfy Cloudflare's SSL handshake
const secureAgent = new https.Agent({
  rejectUnauthorized: false,
  servername: 'api.passchain.co.za' // Passes the required SNI during the TLS handshake
});

const directClient = axios.create({
  baseURL: 'https://104.26.3.64',
  httpsAgent: secureAgent,
  validateStatus: () => true,
  timeout: 15000
});

export async function pollAccountVerification(input: string): Promise<{ success: boolean; data?: any; message: string }> {
  const token = input.trim();
  const headers: Record<string, string> = {
    'Host': 'api.passchain.co.za',
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

  try {
    const questId = "de5a250f-233e-4cb7-8de1-273a437d420d";
    const res = await directClient.get(`/quests/${questId}/start/link`, { headers });

    return {
      success: true,
      data: {
        statusCode: res.status,
        payload: res.data
      },
      message: `✅ Passchain SNI-Bypassed Triggered [Status ${res.status}]!`
    };

  } catch (error: any) {
    return { success: false, message: '❌ Direct IP Network Error: ' + error.message };
  }
}
