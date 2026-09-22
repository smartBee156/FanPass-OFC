import axios from 'axios';

const PROOFCHAIN_API = 'https://api.proofchain.co.za';

export async function pollAccountVerification(input: string): Promise<{ success: boolean; data?: any; message: string }> {
  const token = input.trim();
  const headers: Record<string, string> = {
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

  try {
    const questId = "de5a250f-233e-4cb7-8de1-273a437d420d";
    const res = await axios.get(`${PROOFCHAIN_API}/quests/${questId}/start/link`, { 
      headers, 
      timeout: 15000, 
      validateStatus: () => true 
    });

    if (res.status === 521) {
      return {
        success: false,
        message: '⚠️ Proofchain Server Offline (Cloudflare 521). Their backend is currently down; waiting for them to restore service.'
      };
    }

    return {
      success: true,
      data: {
        statusCode: res.status,
        payload: res.data
      },
      message: `✅ Quest Triggered Successfully [Status ${res.status}]!`
    };

  } catch (error: any) {
    return { success: false, message: '❌ Network Error: ' + error.message };
  }
}
