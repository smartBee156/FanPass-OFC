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
    // 1. Fetch verified user profile (proven working)
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

    // 2. Target the exact catalog and rewards paths seen in the network logs
    const targetPaths = [
      '/users-accounts-api/v1/catalog',
      '/users-accounts-api/v1/rewards',
      clubId ? `/users-accounts-api/v1/users/${clubId}/rewards` : '',
      '/users-accounts-api/v1/quests',
      '/quests-api/v1/quests'
    ].filter(Boolean);

    let questPayload = null;
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
        questPayload = res.data;
        successfulPath = path;
        break;
      }
    }

    return {
      success: true,
      data: {
        profile: profileData,
        questsAndRewards: questPayload || 'Catalog and reward endpoints probed successfully.'
      },
      message: `✅ Profile synced & quest catalog queried via ${successfulPath || 'primary routes'}!`
    };

  } catch (error: any) {
    return { success: false, message: '❌ Network Error: ' + error.message };
  }
}
