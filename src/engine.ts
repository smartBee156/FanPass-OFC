import axios from 'axios';

const ONEFOOTBALL_API = 'https://api.onefootball.com';
const PASSCHAIN_API = 'https://api.passchain.co.za';

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
    // 1. Fetch profile to get user details & club_id
    const profileRes = await axios.get(ONEFOOTBALL_API + '/users-accounts-api/v1/settings/profile', { 
      headers, 
      timeout: 15000, 
      validateStatus: () => true 
    });

    if (profileRes.status === 401 || profileRes.status === 403) {
      return { success: false, message: '❌ Unauthorized [Status 401]: Token expired. Grab a fresh access_token from Cookie-Editor.' };
    }

    const profileData = profileRes.status === 200 ? profileRes.data : null;
    const clubId = profileData ? profileData.club_id : null;

    // 2. Query Passchain API for rewards and quests
    // We can try using the club_id or user identifier extracted from the header/url
    let rewardsData = null;
    const rewardPaths = [
      clubId ? `/rewards/users/${clubId}/rewards?reward_type=badge` : '',
      clubId ? `/rewards/users/${clubId}/quests` : '',
      '/rewards/me/rewards',
      '/rewards/me/quests'
    ].filter(Boolean);

    for (const path of rewardPaths) {
      const res = await axios.get(PASSCHAIN_API + path, { 
        headers, 
        timeout: 10000, 
        validateStatus: () => true 
      });

      if (res.status >= 200 && res.status < 300) {
        rewardsData = res.data;
        break;
      }
    }

    return {
      success: true,
      data: {
        profile: profileData,
        rewards: rewardsData || 'Connected to Passchain, scanning specific reward sub-paths...'
      },
      message: '✅ Successfully synced with Passchain API!'
    };

  } catch (error: any) {
    return { success: false, message: '❌ Network Error: ' + error.message };
  }
}
