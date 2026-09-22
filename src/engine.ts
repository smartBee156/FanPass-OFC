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
    // Step 1: Fetch the live list of quests using the verified endpoint
    const listRes = await axios.get(`${SUBDOMAIN_API}/api/quests`, { 
      headers, 
      timeout: 15000, 
      validateStatus: () => true 
    });

    if (listRes.status !== 200 || !Array.isArray(listRes.data)) {
      return {
        success: false,
        message: `⚠️ Failed to fetch quests [Status ${listRes.status}]`
      };
    }

    const quests = listRes.data;
    const executionResults = [];

    // Step 2: Automatically loop through each live quest and trigger its start/link route
    for (const quest of quests) {
      const questId = quest.id;
      const questName = quest.name || 'Quest Task';
      
      if (questId) {
        const triggerRes = await axios.get(`${SUBDOMAIN_API}/api/quests/${questId}/start/link`, { 
          headers, 
          timeout: 10000, 
          validateStatus: () => true 
        });

        executionResults.push({
          questId,
          questName,
          status: triggerRes.status,
          response: triggerRes.data
        });
      }
    }

    return {
      success: true,
      data: {
        totalQuestsProcessed: quests.length,
        results: executionResults
      },
      message: `✅ Successfully automated ${quests.length} active quests!`
    };

  } catch (error: any) {
    return { success: false, message: '❌ Automation Error: ' + error.message };
  }
}
