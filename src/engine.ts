import axios from 'axios';

const BASE_URL = 'https://fanpass.onefootball.com';

const CANDIDATE_PATHS = [
  '/api/quests',
  '/api/user',
  '/api/profile',
  '/api/me',
  '/api/status',
  '/api/v1/quests',
  '/api/v1/user',
  '/api/auth/me'
];

export async function pollAccountVerification(input: string): Promise<{ success: boolean; data?: any; message: string }> {
  const token = input.trim();
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile)',
    'Accept': 'application/json, text/plain, */*'
  };

  if (token.startsWith('eyJ')) {
    headers['Authorization'] = 'Bearer ' + token;
    headers['Cookie'] = 'access_token=' + token;
  } else {
    headers['Cookie'] = token;
  }

  for (const path of CANDIDATE_PATHS) {
    try {
      const url = BASE_URL + path;
      const res = await axios.get(url, { 
        headers, 
        timeout: 10000, 
        validateStatus: () => true 
      });
      
      const contentType = String(res.headers['content-type'] || '');
      const bodyStr = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
      
      if (contentType.includes('text/html') || bodyStr.trim().startsWith('<!doctype') || bodyStr.trim().startsWith('<html')) {
        continue; 
      }

      if (res.status >= 200 && res.status < 300) {
        return { success: true, data: res.data, message: '✅ Connected successfully via ' + path + '!' };
      } else if (res.status === 401 || res.status === 403) {
        return { success: false, message: '❌ Unauthorized [Status ' + res.status + '] on ' + path + ': Token is invalid or expired.' };
      }
    } catch (err: any) {
      // Skip error and try next path
    }
  }

  return { 
    success: false, 
    message: '❌ All candidate endpoints returned HTML pages.' 
  };
}
