// Central registry for all Discord text commands.
// This file acts as the bot's command directory: every supported command is listed
// here with a clear trigger, a short description, and the handler that executes it.
// This makes future changes easier because developers can look at one place to see
// all supported user actions.

const { showDailyChallenge } = require('./dailyChallenge');
const { showPatterns } = require('./patternPicker');
const { markUserSolved } = require('./reminderService');

// Command map overview:
// - !patterns / patterns: opens the pattern picker so the user can choose a pattern
// - !daily / daily / daily challenge: fetches today's LeetCode challenge and posts it
// - !help / help: lists all available commands in the server
//
// The bot also supports mention-based commands like: @sensei daily challenge
// because the message is normalized before the command lookup happens.
const BOT_COMMANDS = {
  // !patterns: Shows the embed containing the LeetCode pattern buttons.
  // This is the command users run when they want to select a pattern and then
  // request matching problems from the backend.
  '!patterns': {
    name: 'patterns',
    description: 'Show the LeetCode pattern picker embed.',
    handler: async (message) => {
      await showPatterns(message.channel);
    }
  },
  // patterns: Same behavior as !patterns, but this alias allows mention-based usage
  // such as: @sensei patterns
  'patterns': {
    name: 'patterns',
    description: 'Show the LeetCode pattern picker embed.',
    handler: async (message) => {
      await showPatterns(message.channel);
    }
  },
  // !daily: Fetches the current daily LeetCode challenge from the wrapper service and
  // sends it in the current Discord channel as a formatted embed.
  '!daily': {
    name: 'daily',
    description: 'Fetch and display today\'s LeetCode challenge.',
    handler: async (message) => {
      await showDailyChallenge(message.channel);
    }
  },
  // daily: Alias for !daily. This lets users type plain commands like "daily" or
  // mention the bot and say "@sensei daily".
  'daily': {
    name: 'daily',
    description: 'Fetch and display today\'s LeetCode challenge.',
    handler: async (message) => {
      await showDailyChallenge(message.channel);
    }
  },
  // daily challenge: Natural-language alias for the daily command. Example:
  // @sensei daily challenge
  'daily challenge': {
    name: 'daily',
    description: 'Fetch and display today\'s LeetCode challenge.',
    handler: async (message) => {
      await showDailyChallenge(message.channel);
    }
  },
  // !solved: Marks the current user as having solved today's LeetCode challenge.
  // This prevents reminders from being sent to that user until the next day.
  '!solved': {
    name: 'solved',
    description: 'Mark that you solved today\'s challenge and stop reminders for today.',
    handler: async (message) => {
      if (message.guild) {
        markUserSolved(message.guild.id, message.author.id);
      }

      await message.reply('Thanks for confirming that you solved today\'s LeetCode challenge.');
    }
  },
  // !help: Lists every command the bot supports, including aliases, in a readable embed.
  '!help': {
    name: 'help',
    description: 'List all available bot commands.',
    handler: async (message) => {
      const helpText = Object.entries(BOT_COMMANDS)
        .filter(([trigger]) => trigger !== 'daily challenge')
        .map(([trigger, command]) => `• ${trigger} - ${command.description}`)
        .join('\n');

      await message.channel.send({
        embeds: [{
          title: 'Bot Commands',
          description: helpText,
          color: 0x5865F2
        }]
      });
    }
  },
  // help: Plain-language alias for !help. Example: @sensei help
  'help': {
    name: 'help',
    description: 'List all available bot commands.',
    handler: async (message) => {
      const helpText = Object.entries(BOT_COMMANDS)
        .filter(([trigger]) => trigger !== 'daily challenge')
        .map(([trigger, command]) => `• ${trigger} - ${command.description}`)
        .join('\n');

      await message.channel.send({
        embeds: [{
          title: 'Bot Commands',
          description: helpText,
          color: 0x5865F2
        }]
      });
    }
  },
  // solved: Mention-based alias for the confirmation command.
  'solved': {
    name: 'solved',
    description: 'Mark that you solved today\'s challenge and stop reminders for today.',
    handler: async (message) => {
      if (message.guild) {
        markUserSolved(message.guild.id, message.author.id);
      }

      await message.reply('Thanks for confirming that you solved today\'s LeetCode challenge.');
    }
  }
};

// normalizeCommandInput removes the bot mention and standardizes user input so the
// command lookup is not affected by casing, extra spaces, or Discord mention syntax.
// Example: "@sensei Daily Challenge" becomes "daily challenge".
function normalizeCommandInput(content, clientUserId) {
  if (!content) return '';

  let cleaned = content.trim();

  if (clientUserId) {
    cleaned = cleaned
      .replace(new RegExp(`<@!?${clientUserId}>`, 'gi'), '')
      .replace(new RegExp(`<@&${clientUserId}>`, 'gi'), '');
  }

  cleaned = cleaned.replace(/\s+/g, ' ').trim().toLowerCase();
  return cleaned;
}

// resolveCommand reads the cleaned message and checks whether it matches one of the
// supported command triggers. This is the central lookup point for commands sent both
// as plain text and via @mentions.
function resolveCommand(content, clientUserId) {
  const normalized = normalizeCommandInput(content, clientUserId);
  return BOT_COMMANDS[normalized];
}

// getCommandHelp exposes the command metadata for documentation or future UI usage.
function getCommandHelp() {
  return Object.entries(BOT_COMMANDS)
    .filter(([trigger]) => trigger !== 'daily challenge')
    .map(([trigger, command]) => ({
      trigger,
      name: command.name,
      description: command.description
    }));
}

module.exports = {
  BOT_COMMANDS,
  normalizeCommandInput,
  resolveCommand,
  getCommandHelp
};
