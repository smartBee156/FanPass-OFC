import axios from 'axios';

// Use the tenant subdomain as the API base so the backend captures the tenant context automatically
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
    const questId = "de5a250f-233e-4cb7-8de1-273a437d420d";

    // Try hitting the quest endpoint directly on the tenant subdomain API
    const res = await axios.get(`${TENANT_API}/quests/${questId}/start/link`, { 
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
      message: `✅ Tenant Subdomain API Response [Status ${res.status}]!`
    };

  } catch (error: any) {
    return { success: false, message: '❌ Network Error: ' + error.message };
  }
}
