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
    const res = await axios.get(`${SUBDOMAIN_API}/api/quests`, { 
      headers, 
      timeout: 15000, 
      validateStatus: () => true 
    });

    if (res.status !== 200 || !Array.isArray(res.data)) {
      return { success: false, message: `⚠️ Failed [Status ${res.status}]` };
    }

    const polyQuest = res.data.find((q: any) => 
      q.id === '81ff3b8a-03bf-488c-828c-f60923e96149' || 
      (q.slug && q.slug.includes('polymarket'))
    );

    if (!polyQuest) {
      return { success: true, message: '⚠️ Polymarket quest not found in active list.' };
    }

    // Strip out heavy HTML fields and isolate the keys that matter for progression
    const sanitizedData = {
      id: polyQuest.id,
      name: polyQuest.name,
      slug: polyQuest.slug,
      status: polyQuest.status || polyQuest.state || 'N/A',
      isCompleted: polyQuest.completed || polyQuest.is_completed || false,
      userQuestId: polyQuest.user_quest_id || polyQuest.userQuestId || polyQuest.relation_id || 'None',
      rawKeysAvailable: Object.keys(polyQuest)
    };

    return {
      success: true,
      data: sanitizedData,
      message: '🔍 Sanitized Polymarket Data (No HTML Bloat):'
    };

  } catch (error: any) {
    return { success: false, message: '❌ Error: ' + error.message };
  }
}
