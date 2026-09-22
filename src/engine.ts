import axios from 'axios';

// Use the official tenant subdomain which satisfies the backend's security middleware natively
const TENANT_API = 'https://fanpass.proofchain.co.za';

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
    // Fetch live quests directly from the tenant subdomain
    const res = await axios.get(`${TENANT_API}/quests`, { 
      headers, 
      timeout: 15000, 
      validateStatus: () => true 
    });

    return {
      success: true,
      data: {
        statusCode: res.status,
        payload: res.data
      },
      message: `✅ FanPass Tenant Quests Fetched [Status ${res.status}]!`
    };

  } catch (error: any) {
    return { success: false, message: '❌ Network Error: ' + error.message };
  }
}
