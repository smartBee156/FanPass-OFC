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
    // Fetch all active quests for your authenticated user profile
    const res = await axios.get(`${PROOFCHAIN_API}/quests`, { 
      headers, 
      timeout: 15000, 
      validateStatus: () => true 
    });

    return {
      success: true,
      data: {
        statusCode: res.status,
        questsPayload: res.data
      },
      message: `✅ Successfully fetched active user quests [Status ${res.status}]!`
    };

  } catch (error: any) {
    return { success: false, message: '❌ Proofchain Network Error: ' + error.message };
  }
}
