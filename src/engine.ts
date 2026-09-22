import axios from 'axios';
import https from 'https';
import dns from 'dns';

// Create a custom agent that intercepts DNS lookups for passchain and routes them directly
const passchainAgent = new https.Agent({
  lookup: (hostname, options, callback) => {
    if (hostname === 'api.passchain.co.za') {
      // Pin directly to the verified Cloudflare IP to bypass Railway DNS restrictions
      callback(null, '104.26.3.64', 4);
    } else {
      dns.lookup(hostname, options, callback);
    }
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
    // Target the Polymarket quest start/verify link captured from your network logs
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
