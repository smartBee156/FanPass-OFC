import axios from 'axios';

const SUBDOMAIN_API = 'https://fanpass.proofchain.co.za';

export async function pollAccountVerification(input: string): Promise<{ success: boolean; data?: any; message: string }> {
  const token = input.trim();
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Origin': 'https://fanpass.onefootball.com',
    'Referer': 'https://fanpass.onefootball.com/',
    'X-Tenant-ID': 'tenant_1g6k1cew859ls7408'
  };

  if (token.startsWith('eyJ')) {
    headers['Authorization'] = 'Bearer ' + token;
  } else {
    headers['Cookie'] = token;
  }

  try {
    // Fetch the live list of quests to inspect the full object schema for Polymarket
    const res = await axios.get(`${SUBDOMAIN_API}/api/quests`, { 
      headers, 
      timeout: 15000, 
      validateStatus: () => true 
    });

    if (res.status !== 200 || !Array.isArray(res.data)) {
      return {
        success: false,
        message: `⚠️ Failed to fetch quest list [Status ${res.status}]`
      };
    }

    // Find the Polymarket quest specifically
    const polyQuest = res.data.find((q: any) => 
      q.id === '81ff3b8a-03bf-488c-828c-f60923e96149' || 
      (q.slug && q.slug.includes('polymarket')) ||
      (q.name && q.name.toLowerCase().includes('market debut'))
    );

    if (!polyQuest) {
      return {
        success: true,
        data: { allQuestsCount: res.data.length },
        message: '⚠️ Polymarket quest not found in active list. Check raw payload.'
      };
    }

    return {
      success: true,
      data: {
        polymarketFullObject: polyQuest
      },
      message: '🔍 Polymarket Quest Schema Discovered!'
    };

  } catch (error: any) {
    return { success: false, message: '❌ Error: ' + error.message };
  }
}
