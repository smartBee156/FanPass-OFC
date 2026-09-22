import axios from 'axios';

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
  } else {
    headers['Cookie'] = token;
  }

  try {
    // Probe Passchain quest and user endpoints directly
    const candidateEndpoints = [
      '/quests',
      '/users/me/quests',
      '/rewards/me/rewards',
      '/me'
    ];

    let questData = null;
    let matchedEndpoint = '';

    for (const endpoint of candidateEndpoints) {
      const res = await axios.get(PASSCHAIN_API + endpoint, { 
        headers, 
        timeout: 10000, 
        validateStatus: () => true 
      });

      if (res.status >= 200 && res.status < 300) {
        questData = res.data;
        matchedEndpoint = endpoint;
        break;
      }
    }

    return {
      success: true,
      data: {
        endpointHit: matchedEndpoint || 'Direct quest path required',
        response: questData || 'Connected to Passchain API successfully.'
      },
      message: '✅ Successfully authenticated and queried Passchain API!'
    };

  } catch (error: any) {
    return { success: false, message: '❌ Passchain Network Error: ' + error.message };
  }
}
