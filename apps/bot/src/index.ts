import { Bot } from 'grammy';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN is required');
}

const bot = new Bot(token);

bot.command('start', (ctx) => ctx.reply('Hello! I am alive.'));

bot.on('message', (ctx) => ctx.reply('Got your message!'));

bot.start();

