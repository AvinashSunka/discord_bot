// Main entry point for the Discord bot.
// This file is responsible for bootstrapping the client, wiring handlers,
// starting the HTTP health server, and connecting to Discord.
require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');
const { registerHandlers } = require('./handlers');
const { createServer } = require('./server');
const { registerReminderService } = require('./reminderService');

// Discord client configuration: we only need the minimum intents required for
// guild message handling and message content parsing.
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

// Fail fast if the bot token is missing so the app never starts in a broken state.
if (!DISCORD_TOKEN) {
  console.error('Missing DISCORD_TOKEN in environment variables. Please add it to a .env file.');
  process.exit(1);
}

// Attach all command and interaction handlers, then start the HTTP server.
registerHandlers(client);
registerReminderService(client);
createServer(client);
client.login(DISCORD_TOKEN);
