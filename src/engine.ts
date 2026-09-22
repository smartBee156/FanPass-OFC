import axios from 'axios';

const PROOFCHAIN_API = 'https://api.proofchain.co.za';

export async function pollAccountVerification(input: string): Promise<{ success: boolean; data?: any; message: string }> {
  const token = input.trim();
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Origin': 'https://fanpass.onefootball.com',
    'Referer': 'https://fanpass.onefootball.com/',
    'X-Tenant-Slug': 'fanpass',
    'X-Tenant-ID': 'tenant_1g6k1cew859ls7408'
  };

  if (token.startsWith('eyJ')) {
    headers['Authorization'] = 'Bearer ' + token;
  } else {
    headers['Cookie'] = token;
  }

  try {
    // Step 1: Dynamically pull the active quest list for this specific account
    const listRes = await axios.get(`${PROOFCHAIN_API}/quests`, { 
      headers, 
      timeout: 15000, 
      validateStatus: () => true 
    });

    if (listRes.status !== 200) {
      return {
        success: false,
        message: `⚠️ Quest list fetch failed [Status ${listRes.status}]`
      };
    }

    const quests = Array.isArray(listRes.data) ? listRes.data : (listRes.data.quests || listRes.data.data || []);

    if (quests.length === 0) {
      return {
        success: true,
        data: listRes.data,
        message: '✅ Connected successfully! No active quests found on this account.'
      };
    }

    // Step 2: Automatically loop through and trigger/verify every active quest found
    const questResults = [];
    for (const quest of quests) {
      const questId = quest.id || quest.quest_id;
      if (questId) {
        const triggerRes = await axios.get(`${PROOFCHAIN_API}/quests/${questId}/start/link`, { 
          headers, 
          timeout: 10000, 
          validateStatus: () => true 
        });
        questResults.push({
          questId,
          title: quest.title || quest.name || 'Quest Task',
          status: triggerRes.status,
          response: triggerRes.data
        });
      }
    }

    return {
      success: true,
      data: {
        totalQuestsFound: quests.length,
        results: questResults
      },
      message: `✅ Processed ${quests.length} active quests dynamically!`
    };

  } catch (error: any) {
    return { success: false, message: '❌ Network Error: ' + error.message };
  }
}
