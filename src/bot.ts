import { Telegraf } from 'telegraf';
import fs from 'fs';
import path from 'path';
import { pollAccountVerification } from './engine';

const bot = new Telegraf(process.env.TG_BOT_TOKEN!);
const filePath = path.join(__dirname, 'accounts.json');

interface Account {
  name: string;
  cookie: string;
  verified: boolean;
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

bot.start((ctx) => {
  ctx.reply(
    '🚀 *FanPass Emergency Bot Online*\n\n' +
    '• **Paste your access token here** to save it!\n' +
    '• Type `/run` to instantly test the API connection.'
  );
});

bot.on('text', async (ctx) => {
  try {
    const text = ctx.message.text.trim();
    if (text.startsWith('/')) return;

    const accounts = getAccounts();
    const name = `Account ${accounts.length + 1}`;

    accounts.push({ name, cookie: text, verified: false });
    saveAccounts(accounts);

    ctx.reply(`[✅] *${name}* saved successfully!\n\nType /run now to test it against the API.`);
  } catch (err: any) {
    ctx.reply(`⚠️ Error: ${err.message}`);
  }
});

bot.command('list', (ctx) => {
  try {
    const accounts = getAccounts();
    if (accounts.length === 0) return ctx.reply('📂 No accounts saved yet.');

    const list = accounts.map((acc: Account) => `• *${acc.name}* | Verified: ${acc.verified ? '✅' : '⏳'}`).join('\n');
    ctx.reply(`📋 *Saved Accounts:*\n\n${list}`);
  } catch (err: any) {
    ctx.reply(`⚠️ Error: ${err.message}`);
  }
});

bot.command('run', async (ctx) => {
  try {
    await ctx.reply('🔍 Testing accounts against FanPass API...');
    const accounts = getAccounts();

    if (accounts.length === 0) return ctx.reply('📂 No accounts saved yet. Paste your token first.');

    for (const acc of accounts) {
      await ctx.reply(`[*] Checking *${acc.name}*...`);
      const apiResult = await pollAccountVerification(acc.cookie);
      await ctx.reply(apiResult);
    }
  } catch (err: any) {
    await ctx.reply(`⚠️ Error: ${err.message}`);
  }
});

bot.launch();
