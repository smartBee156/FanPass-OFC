import axios from 'axios';

const FANPASS_API = 'https://pass.onefootball.com/api';

export async function pollAccountVerification(input: string): Promise<string> {
  const headers: any = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile)'
  };

  if (input.trim().startsWith('eyJ')) {
    headers['Authorization'] = `Bearer ${input.trim()}`;
    headers['Cookie'] = `access_token=${input.trim()}`;
  } else {
    headers['Cookie'] = input.trim();
  }

  try {
    const res = await axios.get(`${FANPASS_API}/quests/status`, { headers, timeout: 10000 });
    return `✅ API Success! Response:\n${JSON.stringify(res.data, null, 2)}`;
  } catch (error: any) {
    const status = error.response?.status || 'Network Error';
    const data = JSON.stringify(error.response?.data || error.message);
    return `❌ API Error [${status}]: ${data}`;
  }
}

// Export both names to prevent any TypeScript import mismatch errors
export const checkAccountStatus = pollAccountVerification;
