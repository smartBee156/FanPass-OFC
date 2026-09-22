import axios from 'axios';

const API_URL = 'https://api.onefootball.com/users-accounts-api/v1/settings/profile';

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
    headers['Cookie'] = 'access_token=' + token;
  } else {
    headers['Cookie'] = token;
  }

  try {
    const res = await axios.get(API_URL, { 
      headers, 
      timeout: 15000, 
      validateStatus: () => true 
    });
    
    if (res.status >= 200 && res.status < 300) {
      return { success: true, data: res.data, message: '✅ Successfully fetched profile and quest data!' };
    } else if (res.status === 401 || res.status === 403) {
      return { success: false, message: '❌ Unauthorized [Status ' + res.status + ']: Token is expired or invalid. Grab a fresh access_token from Cookie-Editor.' };
    } else {
      return { success: false, message: '❌ API Error [' + res.status + ']: ' + JSON.stringify(res.data) };
    }
  } catch (error: any) {
    return { success: false, message: '❌ Network Error: ' + error.message };
  }
}
