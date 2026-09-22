import axios from 'axios';

const SUBDOMAIN_API = 'https://fanpass.proofchain.co.za';

export async function pollAccountVerification(input: string): Promise<{ success: boolean; data?: any; message: string }> {
  try {
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

    const discoveryEndpoints = [
      `${SUBDOMAIN_API}/openapi.json`,
      `${SUBDOMAIN_API}/api/openapi.json`,
      `${SUBDOMAIN_API}/docs`,
      `${SUBDOMAIN_API}/api/docs`
    ];

    const discoveredRoutes = [];

    for (const docUrl of discoveryEndpoints) {
      const res = await axios.get(docUrl, {
        headers,
        timeout: 8000,
        validateStatus: () => true
      });

      if (res.status === 200 && res.data && res.data.paths) {
        // Extract all paths related to quests or user-quests
        const paths = Object.keys(res.data.paths);
        const questRelatedPaths = paths.filter(p => p.toLowerCase().includes('quest') || p.toLowerCase().includes('verify') || p.toLowerCase().includes('complete'));
        
        discoveredRoutes.push({
          source: docUrl,
          matchingPaths: questRelatedPaths,
          allPathsCount: paths.length
        });
      }
    }

    // Also run a quick test on common alternative completion paths using the active userQuestId
    const testId = '26ada2ca-8b24-4cc6-9566-b826026397ab';
    const testPaths = [
      `${SUBDOMAIN_API}/api/user-quests/${testId}/progress`,
      `${SUBDOMAIN_API}/api/user_quests/${testId}/progress`,
      `${SUBDOMAIN_API}/api/quests/user-quests/${testId}`,
      `${SUBDOMAIN_API}/api/quest-progress`,
      `${SUBDOMAIN_API}/api/quests/submit`
    ];

    const probeResults = [];
    for (const testUrl of testPaths) {
      const res = await axios.post(testUrl, { user_quest_id: testId, status: 'completed' }, {
        headers: { ...headers, 'Content-Type': 'application/json' },
        timeout: 5000,
        validateStatus: () => true
      });
      probeResults.push({ url: testUrl, status: res.status, response: res.data });
    }

    return {
      success: true,
      data: { discoveredRoutes, probeResults },
      message: '🔍 API Blueprint Introspection Complete!'
    };

  } catch (error: any) {
    return { 
      success: false, 
      data: { error: error.message },
      message: '❌ Introspection Error: ' + error.message 
    };
  }
}
