import axios from 'axios';

const FANPASS_API = 'https://fanpass.onefootball.com/api';

export async function pollAccountVerification(input: string): Promise<{ success: boolean; data?: any; message: string }> {
  const token = input.trim();
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile)',
    'Accept': 'application/json'
  };

  if (token.startsWith('eyJ')) {
    headers['Authorization'] = 'Bearer ' + token;
    headers['Cookie'] = 'access_token=' + token;
  } else {
    headers['Cookie'] = token;
  }

  try {
    const res = await axios.get(FANPASS_API + '/quests/status', { headers, timeout: 15000 });
    return { success: true, data: res.data, message: 'API request successful.' };
  } catch (error: any) {
    const status = error.response ? error.response.status : 'Network';
    const errData = error.response ? error.response.data : error.message;
    
    if (status === 401 || status === 403) {
      return { success: false, message: '❌ Unauthorized [Status ' + status + ']: Token is expired or invalid. Grab a fresh access_token from Cookie-Editor.' };
    } else if (status === 429) {
      return { success: false, message: '⚠️ Rate Limited [429]: Server congestion detected.' };
    } else {
      return { success: false, message: '❌ API Error [' + status + ']: ' + JSON.stringify(errData) };
    }
  }
}
