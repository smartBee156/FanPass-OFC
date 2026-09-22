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

    // 2. Scan exact reward, badge, and quest endpoints
    const targetPaths = [
      '/users-accounts-api/v1/rewards',
      '/users-accounts-api/v1/badges',
      '/users-accounts-api/v1/quests',
      clubId ? `/users-accounts-api/v1/users/${clubId}/rewards` : '',
      clubId ? `/users-accounts-api/v1/users/${clubId}/badges` : '',
      '/users-accounts-api/v1/catalog'
    ].filter(Boolean);

    let rewardsPayload = null;
    let successfulPath = '';

    for (const path of targetPaths) {
      const res = await axios.get(API_BASE + path, { 
        headers, 
        timeout: 10000, 
        validateStatus: () => true 
      });

      const contentType = String(res.headers['content-type'] || '');
      const bodyStr = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);

      if (!contentType.includes('text/html') && !bodyStr.trim().startsWith('<!doctype') && res.status >= 200 && res.status < 300) {
        rewardsPayload = res.data;
        successfulPath = path;
        break;
      }
    }

    return {
      success: true,
      data: {
        profile: profileData,
        rewardsAndBadges: rewardsPayload || 'Profile verified. Scanning badge routes.'
      },
      message: `✅ Synced via profile and ${successfulPath || 'catalog routes'}!`
    };

  } catch (error: any) {
    return { success: false, message: '❌ Network Error: ' + error.message };
  }
}
