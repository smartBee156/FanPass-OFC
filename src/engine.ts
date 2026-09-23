import axios from 'axios';

const BASE_API = 'https://fanpass.proofchain.co.za/api';
const TENANT_ID = 'tenant_1g6k1cew859ls7408';

function extractUserId(token: string): string | null {
  try {
    if (!token.startsWith('eyJ')) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    return payload.sub || payload.user_id || payload.id || payload.uid || null;
  } catch (e) {
    return null;
  }
}

export async function pollAccountVerification(input: string): Promise<{ success: boolean; data?: any; message: string }> {
  try {
    const token = input.trim();
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Origin': 'https://fanpass.onefootball.com',
      'Referer': 'https://fanpass.onefootball.com/',
      'X-Tenant-ID': TENANT_ID,
      'Content-Type': 'application/json'
    };

    if (token.startsWith('eyJ')) {
      headers['Authorization'] = 'Bearer ' + token;
    } else {
      headers['Cookie'] = token;
    }

    const questId = '81ff3b8a-03bf-488c-828c-f60923e96149';
    const jwtUserId = extractUserId(token) || 'afe546fe-0aa9-4a4b-9ff4-81db76b76cdf';
    const encodedUser = encodeURIComponent(jwtUserId);
    const logs = [];

    // 1. Initialize / Start quest with guaranteed query parameter user_id
    const startUrl = `${BASE_API}/quests/${questId}/start?user_id=${encodedUser}`;
    const startRes = await axios.post(startUrl, { questId }, { headers, validateStatus: () => true });
    logs.push({ step: 'START_QUEST', status: startRes.status, response: startRes.data });

    // 2. Probe user profile, wallets, and deposit/polymarket status endpoints to force sync
    const probeEndpoints = [
      `${BASE_API}/users/me`,
      `${BASE_API}/wallets/me`,
      `${BASE_API}/users/${encodedUser}/wallets`,
      `${BASE_API}/polymarket/status`,
      `${BASE_API}/polymarket/verify`,
      `${BASE_API}/quests/${questId}/progress/${encodedUser}/refresh`,
      `${BASE_API}/quests/user/${encodedUser}/progress`,
      `${BASE_API}/wallets/verify`
    ];

    const probeResults = [];
    for (const url of probeEndpoints) {
      for (const method of ['get', 'post']) {
        const pRes = await axios({
          method,
          url,
          headers,
          data: { questId, user_id: jwtUserId },
          validateStatus: () => true
        });

        if (pRes.status !== 404) {
          probeResults.push({
            attempt: `${method.toUpperCase()} ${url}`,
            status: pRes.status,
            response: pRes.data
          });
        }
      }
    }

    logs.push({ step: 'ACCOUNT_PROBES', results: probeResults });

    return {
      success: true,
      data: { jwtUserId, logs },
      message: '🔍 Deposit & wallet sync probes completed. Check execution logs.'
    };

  } catch (error: any) {
    return { 
      success: false, 
      data: { error: error.message },
      message: '❌ Engine Error: ' + error.message 
    };
  }
}
