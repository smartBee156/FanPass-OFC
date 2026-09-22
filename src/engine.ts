import axios from 'axios';

const API_BASE = 'https://api.onefootball.com';

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
    // 1. Fetch verified user profile
    const profileRes = await axios.get(API_BASE + '/users-accounts-api/v1/settings/profile', { 
      headers, 
      timeout: 15000, 
      validateStatus: () => true 
    });

    if (profileRes.status === 401 || profileRes.status === 403) {
      return { success: false, message: '❌ Unauthorized [Status 401]: Token expired. Grab a fresh access_token from Cookie-Editor.' };
    }

    const profileData = profileRes.status === 200 ? profileRes.data : null;
    const clubId = profileData ? profileData.club_id : null;

    // 2. Diagnostic probe across candidate reward & quest routes
    const candidatePaths = [
      '/users-accounts-api/v1/rewards',
      '/users-accounts-api/v1/badges',
      '/users-accounts-api/v1/quests',
      '/users-accounts-api/v1/catalog',
      clubId ? `/users-accounts-api/v1/users/${clubId}/rewards` : '',
      clubId ? `/users-accounts-api/v1/users/${clubId}/badges` : ''
    ].filter(Boolean);

    const diagnosticResults: Record<string, any> = {};

    for (const path of candidatePaths) {
      const res = await axios.get(API_BASE + path, { 
        headers, 
        timeout: 10000, 
        validateStatus: () => true 
      });

      diagnosticResults[path] = {
        status: res.status,
        contentType: String(res.headers['content-type'] || 'unknown'),
        sample: typeof res.data === 'string' ? res.data.slice(0, 80) : res.data
      };

      // If a path returns a successful JSON response, lock onto it immediately
      const contentType = String(res.headers['content-type'] || '');
      const bodyStr = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);

      if (!contentType.includes('text/html') && !bodyStr.trim().startsWith('<!doctype') && res.status >= 200 && res.status < 300) {
        return {
          success: true,
          data: {
            profile: profileData,
            matchedPath: path,
            payload: res.data
          },
          message: `✅ Successfully hit working endpoint: ${path}`
        };
      }
    }

    // Return full diagnostic report if no match auto-locks
    return {
      success: true,
      data: {
        profile: profileData,
        diagnosticReport: diagnosticResults
      },
      message: '✅ Profile verified. Diagnostic status codes returned above.'
    };

  } catch (error: any) {
    return { success: false, message: '❌ Network Error: ' + error.message };
  }
}
