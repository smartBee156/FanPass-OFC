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
    const userId = extractUserId(token) || 'afe546fe-0aa9-4a4b-9ff4-81db76b76cdf';
    const encodedUser = encodeURIComponent(userId);

    const logs = [];

    // 1. Initialize / Start the quest
    const startUrl = `${BASE_API}/quests/${questId}/start?user_id=${encodedUser}`;
    const startRes = await axios.post(startUrl, {}, { headers, validateStatus: () => true });
    logs.push({ step: 'START_QUEST', status: startRes.status, response: startRes.data });

    // 2. Attempt to fetch user Merkle proof data from potential endpoints
    const proofLookupUrls = [
      `${BASE_API}/verify/proof/${encodedUser}`,
      `${BASE_API}/quests/${questId}/proof/${encodedUser}`,
      `${BASE_API}/verify/user/${encodedUser}`,
      `${BASE_API}/quests/${questId}/user-quests/${startRes.data?.id}`
    ];

    let proofData = null;
    for (const pUrl of proofLookupUrls) {
      const pRes = await axios.get(pUrl, { headers, validateStatus: () => true });
      logs.push({ lookup: pUrl, status: pRes.status, response: pRes.data });
      if (pRes.status >= 200 && pRes.status < 300 && pRes.data) {
        proofData = pRes.data;
        break;
      }
    }

    // 3. If proof data was retrieved, submit it to /api/verify/proof
    let verifyResStatus = null;
    let verifyResData = null;

    if (proofData && proofData.leaf && proofData.proof && proofData.root) {
      const verifyUrl = `${BASE_API}/verify/proof`;
      const vRes = await axios.post(verifyUrl, {
        questId,
        user_id: userId,
        userQuestId: startRes.data?.id,
        leaf: proofData.leaf,
        proof: proofData.proof,
        root: proofData.root
      }, { headers, validateStatus: () => true });

      verifyResStatus = vRes.status;
      verifyResData = vRes.data;
      logs.push({ step: 'SUBMIT_PROOF', status: verifyResStatus, response: verifyResData });
    }

    // 4. Attempt to claim reward
    const claimUrl = `${BASE_API}/quests/${questId}/progress/${encodedUser}/claim`;
    const claimRes = await axios.post(claimUrl, {}, { headers, validateStatus: () => true });
    logs.push({ step: 'CLAIM_REWARD', status: claimRes.status, response: claimRes.data });

    const success = claimRes.status >= 200 && claimRes.status < 300;

    return {
      success: true,
      data: { userId, questId, logs },
      message: success ? '🚀 Polymarket Quest Verified & Claimed Successfully!' : '⚡ Proof check complete. Check execution logs.'
    };

  } catch (error: any) {
    return { 
      success: false, 
      data: { error: error.message },
      message: '❌ Engine Error: ' + error.message 
    };
  }
}
