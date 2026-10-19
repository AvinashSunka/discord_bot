require('dotenv').config();

const express = require('express');
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'discord-bot',
    botLoggedIn: !!client.user
  });
});

app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Discord bot is running',
    status: 'ok'
  });
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const SPRING_API_BASE = (process.env.SPRING_API_BASE || 'http://localhost:8080').replace(/\/+$/, '');
const SPRING_USERNAME = process.env.SPRING_USERNAME || 'admin';
const SPRING_PASSWORD = process.env.SPRING_PASSWORD || 'secret123';
const DAILY_CHALLENGE_URL = (process.env.LEETCODE_WRAPPER_URL || 'https://leetcode-wrapper.onrender.com/api/daily').replace(/\/+$/, '');

function buildBackendUrl(pattern) {
  const normalizedBase = SPRING_API_BASE.replace(/\/api\/problems$/, '').replace(/\/api$/, '');
  return `${normalizedBase}/api/leetcode/wrapper?patternName=${encodeURIComponent(pattern)}`;
}

const PATTERNS = [
  { label: 'Sliding Window', value: 'sliding-window' },
  { label: 'Two Pointers', value: 'two-pointers' },
  { label: 'Binary Search', value: 'binary-search' },
  { label: 'Hash Table', value: 'hash-table' },
  { label: 'Graph', value: 'graph' },
  { label: 'Dynamic Programming', value: 'dynamic-programming' },
  { label: 'Greedy', value: 'greedy' },
  { label: 'Backtracking', value: 'backtracking' },
  { label: 'Heap', value: 'heap' },
  { label: 'Tree', value: 'tree' },
  { label: 'String', value: 'string' },
  { label: 'Array', value: 'array' }
];

function buildPatternRows() {
  const rows = [];

  for (let i = 0; i < PATTERNS.length; i += 5) {
    const chunk = PATTERNS.slice(i, i + 5);

    const row = new ActionRowBuilder().addComponents(
      ...chunk.map((pattern) =>
        new ButtonBuilder()
          .setCustomId(`pattern_${pattern.value}`)
          .setLabel(pattern.label)
          .setStyle(ButtonStyle.Primary)
      )
    );

    rows.push(row);
  }

  return rows;
}

function buildProblemChoiceRows(problems) {
  const rows = [];

  for (const problem of problems.slice(0, 3)) {
    const title = problem.title || 'Untitled';
    const slug = problem.titleSlug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const url = `https://leetcode.com/problems/${slug}/`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`solve_vscode_${slug}`)
        .setLabel(`Solve in VS Code`)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setURL(url)
        .setLabel('Solve in Website')
        .setStyle(ButtonStyle.Link)
    );

    rows.push(row);
  }

  return rows;
}

async function sendPatternRequest(pattern) {
  const url = buildBackendUrl(pattern);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': 'Basic ' + Buffer.from(`${SPRING_USERNAME}:${SPRING_PASSWORD}`).toString('base64')
    }
  });

  const text = await response.text();

  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch (error) {
    payload = {
      success: false,
      message: text || 'Unexpected response from backend.'
    };
  }

  return {
    ok: response.ok,
    status: response.status,
    payload
  };
}

async function showPatterns(channel) {
  const embed = new EmbedBuilder()
    .setTitle('LeetCode Pattern Picker')
    .setDescription('Choose a pattern below. The selected pattern will be sent to the Spring Boot server.')
    .setColor('#5865F2');

  await channel.send({ embeds: [embed], components: buildPatternRows() });
}

async function fetchDailyChallenge() {
  const response = await fetch(DAILY_CHALLENGE_URL, {
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    }
  });

  const text = await response.text();

  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch (error) {
    payload = {
      success: false,
      message: text || 'Unexpected response from the daily challenge service.'
    };
  }

  return {
    ok: response.ok,
    status: response.status,
    payload
  };
}

async function showDailyChallenge(channel) {
  const result = await fetchDailyChallenge();

  if (!result.ok || !result.payload?.success) {
    const message = result.payload?.message || 'The daily challenge service is unavailable right now.';
    await channel.send({ content: `Daily challenge unavailable: ${message}` });
    return;
  }

  const challenge = result.payload.data || result.payload.question || result.payload;
  const title = challenge.title || 'Daily LeetCode Challenge';
  const slug = challenge.titleSlug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const difficulty = challenge.difficulty || 'Unknown';
  const date = challenge.date || new Date().toISOString().slice(0, 10);
  const url = `https://leetcode.com/problems/${slug}/`;

  const embed = new EmbedBuilder()
    .setTitle('Daily LeetCode Challenge')
    .setDescription(`[${title}](${url})`)
    .addFields(
      { name: 'Difficulty', value: difficulty, inline: true },
      { name: 'Date', value: date, inline: true }
    )
    .setColor('#F4B400');

  await channel.send({ embeds: [embed] });
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.toLowerCase() === '!patterns') {
    await showPatterns(message.channel);
  }

  if (message.content.toLowerCase() === '!daily') {
    await showDailyChallenge(message.channel);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId.startsWith('solve_vscode_')) {
    const slug = interaction.customId.replace('solve_vscode_', '');
    const problemUrl = `https://leetcode.com/problems/${slug}/`;

    await interaction.reply({
      content: `Use this URL in VS Code, then run the LeetCode helper command and paste it when prompted:\n${problemUrl}`,
      ephemeral: true
    });
    return;
  }

  if (!interaction.customId.startsWith('pattern_')) return;

  const pattern = interaction.customId.replace('pattern_', '');

  try {
    await interaction.deferReply({ ephemeral: false });

    const result = await sendPatternRequest(pattern);

    if (!result.ok || !result.payload?.success) {
      const errorMessage = result.payload?.message || 'The backend could not fetch problems for that pattern.';

      await interaction.editReply({
        content: `Pattern: ${pattern}\n${errorMessage}`
      });
      return;
    }

    const problems = Array.isArray(result.payload.data) ? result.payload.data : [];
    const previewLines = problems.slice(0, 5).map((p, index) => {
      const title = p.title || 'Untitled';
      const slug = p.titleSlug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const url = `https://leetcode.com/problems/${slug}/`;
      return `${index + 1}. [${title}](${url}) (${p.difficulty || 'Unknown'})`;
    });

    const previewText = previewLines.length ? previewLines.join('\n') : 'No sample problems returned.';

    const embed = new EmbedBuilder()
      .setTitle(`Pattern: ${pattern}`)
      .setDescription(`Found ${result.payload.count || 0} matching problems.`)
      .addFields({ name: 'Preview', value: previewText.slice(0, 1000) })
      .setColor('#57F287');

    const components = buildProblemChoiceRows(problems);
    await interaction.editReply({ embeds: [embed], components });
  } catch (error) {
    console.error('Error while sending pattern to backend:', error);

    try {
      await interaction.editReply({
        content: `Failed to call the backend for pattern: ${pattern}\n${error instanceof Error ? error.message : String(error)}`
      });
    } catch {
      // no-op: the interaction may already be handled or failed before deferReply completed
    }
  }
});

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID || null;

app.post('/internal/daily-challenge', async (req, res) => {
  try {
    const body = req.body || {};
    const channelId = body.channelId || DISCORD_CHANNEL_ID;
    const challenge = {
      title: body.title || 'Daily LeetCode Challenge',
      titleSlug: body.titleSlug || '',
      difficulty: body.difficulty || 'Unknown',
      date: body.date || new Date().toISOString().slice(0, 10),
      questionFrontendId: body.questionFrontendId || ''
    };

    if (!channelId) {
      return res.status(400).json({
        success: false,
        message: 'Missing Discord channel id. Set DISCORD_CHANNEL_ID in the environment or send channelId in the request body.'
      });
    }

    const channel = await client.channels.fetch(channelId);
    const url = challenge.titleSlug ? `https://leetcode.com/problems/${challenge.titleSlug}/` : 'https://leetcode.com/';

    const embed = new EmbedBuilder()
      .setTitle('Daily LeetCode Challenge')
      .setDescription(`[${challenge.title}](${url})`)
      .addFields(
        { name: 'Difficulty', value: challenge.difficulty || 'Unknown', inline: true },
        { name: 'Date', value: challenge.date || 'Unknown', inline: true },
        challenge.questionFrontendId ? { name: 'Question ID', value: String(challenge.questionFrontendId), inline: true } : { name: 'Question ID', value: 'N/A', inline: true }
      )
      .setColor('#F4B400');

    await channel.send({ embeds: [embed] });

    return res.status(200).json({ success: true, channelId, challenge });
  } catch (error) {
    console.error('Failed to post daily challenge to Discord:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

if (!DISCORD_TOKEN) {
  console.error('Missing DISCORD_TOKEN in environment variables. Please add it to a .env file.');
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`Discord bot server listening on port ${PORT}`);
});

client.login(DISCORD_TOKEN);
