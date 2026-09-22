import axios from 'axios';

const SUBDOMAIN_API = 'https://fanpass.proofchain.co.za';

// Helper to safely extract user ID from the JWT access token
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
  const token = input.trim();
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Origin': 'https://fanpass.onefootball.com',
    'Referer': 'https://fanpass.onefootball.com/',
    'X-Tenant-ID': 'tenant_1g6k1cew859ls7408',
    'Content-Type': 'application/json'
  };

  if (token.startsWith('eyJ')) {
    headers['Authorization'] = 'Bearer ' + token;
  } else {
    headers['Cookie'] = token;
  }

  const questId = '81ff3b8a-03bf-488c-828c-f60923e96149';
  const questName = 'Market Debut';
  const questSlug = 'kick-off-with-polymarket-us';
  
  // Extract user ID from token dynamically
  const userId = extractUserId(token);

  try {
    const executionLogs = [];

    // Step 1: Initialize / Start the quest passing the required user_id query parameter
    const startUrl = userId 
      ? `${SUBDOMAIN_API}/api/quests/${questId}/start?user_id=${userId}`
      : `${SUBDOMAIN_API}/api/quests/${questId}/start`;

    const startRes = await axios.post(startUrl, { questId }, {
      headers,
      timeout: 8000,
      validateStatus: () => true
    });

    executionLogs.push({ step: 'START', url: startUrl, status: startRes.status, response: startRes.data });

    // Step 2: Fire the verification force-tick payload
    const verifyPayload = { id: questId, name: questName, slug: questSlug };
    const verifyRes = await axios.put(`${SUBDOMAIN_API}/api/quests/verify`, verifyPayload, {
      headers,
      timeout: 8000,
      validateStatus: () => true
    });

    executionLogs.push({ step: 'VERIFY', payload: verifyPayload, status: verifyRes.status, response: verifyRes.data });

    const success = startRes.status >= 200 && startRes.status < 300 && verifyRes.status >= 200 && verifyRes.status < 300;

    return {
      success: true,
      data: { extractedUserId: userId, executionLogs },
      message: success ? '🚀 Polymarket Quest Force-Ticked Successfully!' : '⚡ Execution complete. Check logs for details.'
    };

  } catch (error: any) {
    return { success: false, message: '❌ Error: ' + error.message };
  }
}
