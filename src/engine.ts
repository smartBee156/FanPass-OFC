import axios from 'axios';

const PROOFCHAIN_API = 'https://api.proofchain.co.za';

export async function pollAccountVerification(input: string): Promise<{ success: boolean; data?: any; message: string }> {
  const token = input.trim();
  const baseHeaders: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Origin': 'https://fanpass.onefootball.com',
    'Referer': 'https://fanpass.onefootball.com/'
  };

  if (token.startsWith('eyJ')) {
    baseHeaders['Authorization'] = 'Bearer ' + token;
  } else {
    baseHeaders['Cookie'] = token;
  }

  // Test different ways the backend might expect the tenant context
  const testVariations = [
    {
      name: 'Query Param Variant',
      headers: { ...baseHeaders },
      params: { tenant: 'fanpass', tenant_id: 'tenant_1g6k1cew859ls7408' }
    },
    {
      name: 'Alternative Header Keys Variant',
      headers: { 
        ...baseHeaders, 
        'X-Tenant': 'fanpass', 
        'X-Tenant-Slug': 'fanpass',
        'X-Tenant-ID': 'tenant_1g6k1cew859ls7408'
      },
      params: {}
    },
    {
      name: 'Host/Origin Override Variant',
      headers: { 
        ...baseHeaders, 
        'X-Tenant-ID': 'tenant_1g6k1cew859ls7408',
        'X-Forwarded-Host': 'fanpass.proofchain.co.za'
      },
      params: {}
    }
  ];

  const results: Record<string, any> = {};

  for (const variation of testVariations) {
    try {
      const res = await axios.get(`${PROOFCHAIN_API}/quests`, { 
        headers: variation.headers,
        params: variation.params,
        timeout: 10000, 
        validateStatus: () => true 
      });

      results[variation.name] = {
        status: res.status,
        data: res.data
      };

      if (res.status === 200) {
        return {
          success: true,
          data: {
            winningVariation: variation.name,
            payload: res.data
          },
          message: `✅ Tenant Context Unlocked via [${variation.name}]!`
        };
      }
    } catch (err: any) {
      results[variation.name] = { error: err.message };
    }
  }

  return {
    success: true,
    data: results,
    message: '✅ Tenant Variation Audit Complete.'
  };
}
