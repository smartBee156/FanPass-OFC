import axios from 'axios';

const BASE_API = 'https://fanpass.proofchain.co.za/api';
const TENANT_ID = 'tenant_1g6k1cew859ls7408';
const QUEST_ID = '81ff3b8a-03bf-488c-828c-f60923e96149';

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

    const jwtUserId = extractUserId(token) || 'afe546fe-0aa9-4a4b-9ff4-81db76b76cdf';
    const encodedUser = encodeURIComponent(jwtUserId);
    const logs = [];

    // 1. Get Wallet Info
    const walletsRes = await axios.get(`${BASE_API}/wallets/me`, { headers, validateStatus: () => true });
    const walletData = walletsRes.data || {};
    const smartWalletAddress = walletData.wallet_address || '0xbC7859CC04132386C7DF14895ff3a67fA5bFc26b';
    logs.push({ step: 'GET_WALLETS', wallet: smartWalletAddress });

    // 2. Check Deposit State on Base Mainnet (using Bolt's route pattern)
    const depositRes = await axios.get(`${BASE_API}/deposits/base/${smartWalletAddress}`, { headers, validateStatus: () => true });
    logs.push({ step: 'CHECK_DEPOSIT_BASE', status: depositRes.status, response: depositRes.data });

    // 3. Scan Epoch Dates for Merkle Leaf (using Bolt's route pattern)
    const candidateDates = ['2026-09-23', '2026-09-22', '2026-09-21', '2026-09-20', '2026-09-19', '2026-09-18'];
    let foundProof: any = null;
    const epochProbes = [];

    for (const dateStr of candidateDates) {
      const url = `${BASE_API}/verify/epoch/${dateStr}/leaf/${smartWalletAddress}`;
      const res = await axios.get(url, { headers, validateStatus: () => true });
      
      if (res.status === 200 && res.data && (res.data.leaf || res.data.proof)) {
        foundProof = { epoch: dateStr, ...res.data };
        epochProbes.push({ date: dateStr, success: true, response: res.data });
        break;
      } else {
        epochProbes.push({ date: dateStr, status: res.status, response: res.data });
      }
    }
    logs.push({ step: 'EPOCH_LEAF_PROBES', results: epochProbes });

    // 4. If proof is found, submit it
    if (foundProof && foundProof.leaf && foundProof.proof) {
      const proofSubRes = await axios.post(`${BASE_API}/verify/proof`, {
        questId: QUEST_ID,
        quest_id: QUEST_ID,
        epoch: foundProof.epoch,
        address: smartWalletAddress,
        leaf: foundProof.leaf,
        proof: foundProof.proof,
        root: foundProof.root,
        signature: foundProof.signature || '0x'
      }, { headers, validateStatus: () => true });
      logs.push({ step: 'SUBMIT_MERKLE_PROOF', status: proofSubRes.status, response: proofSubRes.data });
    }

    // 5. Start / Initialize Quest
    const startUrl = `${BASE_API}/quests/${QUEST_ID}/start?user_id=${encodedUser}`;
    const startRes = await axios.post(startUrl, { questId: QUEST_ID }, { headers, validateStatus: () => true });
    logs.push({ step: 'START_QUEST', status: startRes.status, response: startRes.data });

    // 6. Attempt Claim Reward
    const claimUrl = `${BASE_API}/quests/${QUEST_ID}/progress/${encodedUser}/claim`;
    const claimRes = await axios.post(claimUrl, {}, { headers, validateStatus: () => true });
    logs.push({ step: 'CLAIM_REWARD', status: claimRes.status, response: claimRes.data });

    const success = claimRes.status >= 200 && claimRes.status < 300;

    return {
      success: true,
      data: { smartWalletAddress, logs },
      message: success ? '🚀 Quest successfully verified and claimed!' : '⚡ Bolt-integrated pipeline executed. Check execution logs.'
    };

  } catch (error: any) {
    return { 
      success: false, 
      data: { error: error.message },
      message: '❌ Engine Error: ' + error.message 
    };
  }
}
