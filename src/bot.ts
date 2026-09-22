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

// Bulletproof multi-chunk reply helper that handles Telegram's 4096 character limit gracefully
async function safeReply(ctx: any, text: string) {
  try {
    const MAX_LENGTH = 4000;
    if (text.length <= MAX_LENGTH) {
      await ctx.reply(text);
      return;
    }

    // Automatically split long outputs into sequential chunks without truncation
    for (let i = 0; i < text.length; i += MAX_LENGTH) {
      const chunk = text.substring(i, i + MAX_LENGTH);
      await ctx.reply(chunk);
    }
  } catch (err: any) {
    console.error('Telegram reply error:', err.message);
  }
}

bot.start((ctx) => {
  safeReply(ctx, '🚀 FanPass Professional Bot Active\n\n• Paste your access_token directly to save an account.\n• Type /run to test all saved accounts.\n• Type /list to view saved accounts.');
});

// Handle /run command
bot.command('run', async (ctx) => {
  try {
    const accounts = getAccounts();
    if (accounts.length === 0) {
      return safeReply(ctx, '📂 No accounts saved yet. Paste your access_token directly into the chat.');
    }

    await safeReply(ctx, '🔍 Testing ' + accounts.length + ' saved account(s) against FanPass API...');

    for (const acc of accounts) {
      await safeReply(ctx, '[*] Checking ' + acc.name + '...');
      const result = await pollAccountVerification(acc.token);
      
      if (result.success) {
        const jsonString = JSON.stringify(result.data, null, 2);
        const msg = '✅ ' + acc.name + ' Success!\n\nAPI Response Snippet:\n' + jsonString;
        await safeReply(ctx, msg);
      } else {
        await safeReply(ctx, '❌ ' + acc.name + ' Failed: ' + result.message);
      }
    }
  } catch (err: any) {
    await safeReply(ctx, '⚠️ Critical Error: ' + err.message);
  }
});

// Handle listing saved accounts
bot.command('list', (ctx) => {
  try {
    const accounts = getAccounts();
    if (accounts.length === 0) return safeReply(ctx, '📂 No accounts saved yet.');

    const list = accounts.map((acc, index) => (index + 1) + '. ' + acc.name).join('\n');
    safeReply(ctx, '📋 Saved Accounts (' + accounts.length + '):\n\n' + list);
  } catch (err: any) {
    safeReply(ctx, '⚠️ Error: ' + err.message);
  }
});

// Handle clearing accounts
bot.command('clear', (ctx) => {
  try {
    saveAccounts([]);
    safeReply(ctx, '🗑️ All saved accounts cleared.');
  } catch (err: any) {
    safeReply(ctx, '⚠️ Error: ' + err.message);
  }
});

// Handle text token pasting
bot.on('text', async (ctx) => {
  try {
    const text = ctx.message.text.trim();
    if (text.startsWith('/')) return;

    const accounts = getAccounts();
    const name = 'Account ' + (accounts.length + 1);

    accounts.push({ name, token: text });
    saveAccounts(accounts);

    safeReply(ctx, '✅ ' + name + ' saved successfully!\n\nType /run now to test your accounts.');
  } catch (err: any) {
    safeReply(ctx, '⚠️ Error saving account: ' + err.message);
  }
});

bot.launch();
