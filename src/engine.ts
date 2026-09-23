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

    // 1. Fetch wallet address
    const walletsRes = await axios.get(`${BASE_API}/wallets/me`, { headers, validateStatus: () => true });
    const walletData = walletsRes.data || {};
    const smartWalletAddress = walletData.wallet_address || '0xbC7859CC04132386C7DF14895ff3a67fA5bFc26b';

    logs.push({ step: 'GET_WALLETS', wallet: smartWalletAddress });

    // 2. Probe Merkle Epoch & Batch verification routes discovered in frontend bundles
    const merkleProbes = [
      `${BASE_API}/verify/batch/${questId}`,
      `${BASE_API}/verify/batch/${smartWalletAddress}`,
      `${BASE_API}/verify/epoch/latest/leaf/${smartWalletAddress}`,
      `${BASE_API}/verify/epoch/1/leaf/${smartWalletAddress}`,
      `${BASE_API}/verify/epoch/0/leaf/${smartWalletAddress}`,
      `${BASE_API}/quests/${questId}/verify/proof`
    ];

    const merkleResults = [];
    let foundProof: any = null;

    for (const url of merkleProbes) {
      const res = await axios.get(url, { headers, validateStatus: () => true });
      merkleResults.push({ url, status: res.status, response: res.data });
      if (res.status >= 200 && res.status < 300 && res.data && (res.data.leaf || res.data.proof)) {
        foundProof = res.data;
        break;
      }
    }

    logs.push({ step: 'MERKLE_PROBES', results: merkleResults });

    // 3. If proof data is found, submit it to /verify/proof
    if (foundProof && foundProof.leaf && foundProof.proof && foundProof.root) {
      const verifyRes = await axios.post(`${BASE_API}/verify/proof`, {
        questId,
        user_id: jwtUserId,
        leaf: foundProof.leaf,
        proof: foundProof.proof,
        root: foundProof.root
      }, { headers, validateStatus: () => true });

      logs.push({ step: 'SUBMIT_FOUND_PROOF', status: verifyRes.status, response: verifyRes.data });
    }

    // 4. Re-check progress & attempt claim
    const startUrl = `${BASE_API}/quests/${questId}/start?user_id=${encodedUser}`;
    const startRes = await axios.post(startUrl, { questId }, { headers, validateStatus: () => true });
    logs.push({ step: 'RE_CHECK_PROGRESS', status: startRes.status, response: startRes.data });

    const claimRes = await axios.post(`${BASE_API}/quests/${questId}/progress/${encodedUser}/claim`, {}, { headers, validateStatus: () => true });
    logs.push({ step: 'CLAIM_ATTEMPT', status: claimRes.status, response: claimRes.data });

    const success = claimRes.status >= 200 && claimRes.status < 300;

    return {
      success: true,
      data: { smartWalletAddress, logs },
      message: success ? '🚀 Quest verified and claimed successfully!' : '⚡ Merkle epoch and batch probes executed. Check execution logs.'
    };

  } catch (error: any) {
    return { 
      success: false, 
      data: { error: error.message },
      message: '❌ Engine Error: ' + error.message 
    };
  }
}
