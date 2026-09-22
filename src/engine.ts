import axios from 'axios';
import https from 'https';

// Intercept DNS lookup for passchain while preserving the hostname for SSL/SNI
const passchainAgent = new https.Agent({
  lookup: (hostname, options, callback) => {
    const cb = typeof options === 'function' ? options : callback;
    if (hostname === 'api.passchain.co.za') {
      return cb(null, '104.26.3.64', 4);
    }
    return cb(new Error('Unknown hostname'), '', 4);
  }
});

const passchainClient = axios.create({
  baseURL: 'https://api.passchain.co.za',
  httpsAgent: passchainAgent,
  validateStatus: () => true,
  timeout: 15000
});

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

  try {
    const questId = "de5a250f-233e-4cb7-8de1-273a437d420d";
    const res = await passchainClient.get(`/quests/${questId}/start/link`, { headers });

    return {
      success: true,
      data: {
        statusCode: res.status,
        payload: res.data
      },
      message: `✅ Passchain Backend Triggered [Status ${res.status}]!`
    };

  } catch (error: any) {
    return { success: false, message: '❌ Network Error: ' + error.message };
  }
}
