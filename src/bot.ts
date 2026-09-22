import { Telegraf } from 'telegraf';
import fs from 'fs';
import path from 'path';
import { pollAccountVerification } from './engine';

const bot = new Telegraf(process.env.TG_BOT_TOKEN!);
const filePath = path.join(__dirname, 'accounts.json');

interface Account {
  name: string;
  token: string;
}

function getAccounts(): Account[] {
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return [];
  }
}

function saveAccounts(accounts: Account[]) {
  fs.writeFileSync(filePath, JSON.stringify(accounts, null, 2));
}

// Helper to safely format and truncate JSON for Telegram
function formatResponse(data: any): string {
  const jsonStr = JSON.stringify(data, null, 2);
  if (jsonStr.length > 3000) {
    return jsonStr.substring(0, 3000) + '\n... (output truncated for length)';
  }
  return jsonStr;
}

bot.start((ctx) => {
  ctx.reply(
    '🚀 *FanPass Professional Bot Active*\n\n' +
    '• **Paste your access_token directly** to save an account.\n' +
    '• Type `/run` to test all saved accounts.\n' +
    '• Type `/run <token>` to test a token instantly.'
  );
});

// Handle /run and /run <token>
bot.command('run', async (ctx) => {
  try {
    const messageText = ctx.message.text.trim();
    const parts = messageText.split(' ');
    
    // Case A: Inline token passed with /run
    if (parts.length > 1) {
      const inlineToken = parts.slice(1).join(' ').trim();
      await ctx.reply('🔍 *Testing inline token against FanPass API...*');
      const result = await pollAccountVerification(inlineToken);
      
      if (result.success) {
        const safeJson = formatResponse(result.data);
        return ctx.reply(`✅ *Token Valid & Verified!*\n\nResponse:\n\`\`\`json\n${safeJson}\`\`\``, { parse_mode: 'Markdown' });
      } else {
        return ctx.reply(result.message);
      }
    }

    // Case B: Run against all saved accounts
    const accounts = getAccounts();
    if (accounts.length === 0) {
      return ctx.reply('📂 No accounts saved yet. Paste your token directly into the chat or use `/run <token>`.');
    }

    await ctx.reply(`🔍 Testing ${accounts.length} saved account(s)...`);

    for (const acc of accounts) {
      await ctx.reply(`[*] Checking *${acc.name}*...`);
      const result = await pollAccountVerification(acc.token);
      
      if (result.success) {
        const safeJson = formatResponse(result.data);
        await ctx.reply(`✅ *${acc.name} Success!*\n\`\`\`json\n${safeJson}\`\`\``, { parse_mode: 'Markdown' });
      } else {
        await ctx.reply(`❌ *${acc.name} Failed:* ${result.message}`);
      }
    }
  } catch (err: any) {
    await ctx.reply(`⚠️ Critical Error: ${err.message}`);
  }
});

// Handle listing saved accounts
bot.command('list', (ctx) => {
  try {
    const accounts = getAccounts();
    if (accounts.length === 0) return ctx.reply('📂 No accounts saved yet.');

    const list = accounts.map((acc, index) => `*${index + 1}.* ${acc.name} (Token: \`${acc.token.substring(0, 15)}...\`)`).join('\n');
    ctx.reply(`📋 *Saved Accounts (${accounts.length}):*\n\n${list}`, { parse_mode: 'Markdown' });
  } catch (err: any) {
    ctx.reply(`⚠️ Error: ${err.message}`);
  }
});

// Handle clearing saved accounts
bot.command('clear', (ctx) => {
  try {
    saveAccounts([]);
    ctx.reply('🗑️ All saved accounts cleared from database.');
  } catch (err: any) {
    ctx.reply(`⚠️ Error: ${err.message}`);
  }
});

// Handle raw text token pasting
bot.on('text', async (ctx) => {
  try {
    const text = ctx.message.text.trim();
    if (text.startsWith('/')) return;

    const accounts = getAccounts();
    const name = `Account ${accounts.length + 1}`;

    accounts.push({ name, token: text });
    saveAccounts(accounts);

    ctx.reply(`✅ *${name}* saved successfully!\n\nType \`/run\` to test all accounts or \`/list\` to view them.`);
  } catch (err: any) {
    ctx.reply(`⚠️ Error saving account: ${err.message}`);
  }
});

bot.launch();
