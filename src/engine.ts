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
    let quests: any[] = [];

    // Try fetching available quests from standard sub-routes
    const candidatePaths = ['/quests/available', '/quests', '/api/quests'];
    for (const path of candidatePaths) {
      const res = await axios.get(`${PROOFCHAIN_API}${path}`, { 
        headers, 
        timeout: 10000, 
        validateStatus: () => true 
      });

      if (res.status === 200 && res.data) {
        quests = Array.isArray(res.data) ? res.data : (res.data.quests || res.data.data || []);
        if (quests.length > 0) break;
      }
    }

    // If listing didn't return active items, fallback directly to the known Polymarket quest ID
    if (quests.length === 0) {
      quests = [{ id: 'de5a250f-233e-4cb7-8de1-273a437d420d', title: 'Polymarket Quest' }];
    }

    // Trigger each quest completion/start link
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
        processedCount: questResults.length,
        results: questResults
      },
      message: `✅ Successfully processed quests for account!`
    };

  } catch (error: any) {
    return { success: false, message: '❌ Network Error: ' + error.message };
  }
}
