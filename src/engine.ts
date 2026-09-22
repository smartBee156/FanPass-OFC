import axios from 'axios';
import dns from 'dns';

// Force Node.js to use reliable public DNS to bypass Railway's internal lookup block
try {
  dns.setServers(['1.1.1.1', '8.8.8.8']);
} catch (e) {
  console.error('DNS override error:', e);
}

const PASSCHAIN_API = 'https://api.passchain.co.za';

export async function pollAccountVerification(input: string): Promise<{ success: boolean; data?: any; message: string }> {
  const token = input.trim();
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Origin': 'https://fanpass.onefootball.com',
    'Referer': 'https://fanpass.onefootball.com/'
  };

  if (token.startsWith('eyJ')) {
    headers['Authorization'] = 'Bearer ' + token;
  } else {
    headers['Cookie'] = token;
  }

  try {
    // Target the Polymarket quest start/verify link captured from your network logs
    const questId = "de5a250f-233e-4cb7-8de1-273a437d420d";
    const targetPath = `/quests/${questId}/start/link`;

    const res = await axios.get(PASSCHAIN_API + targetPath, { 
      headers, 
      timeout: 15000, 
      validateStatus: () => true 
    });

    return {
      success: true,
      data: {
        statusCode: res.status,
        payload: res.data
      },
      message: `✅ Passchain Backend Triggered [Status ${res.status}]!`
    };

  } catch (error: any) {
    return { success: false, message: '❌ Network Error: ' + error.message };
  }
}
