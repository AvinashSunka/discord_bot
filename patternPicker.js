// Pattern picker feature module.
// This file owns the LeetCode pattern selection UI and the requests sent to the
// Spring Boot backend that returns matching problems for a chosen pattern.
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// All backend values are kept in environment variables to avoid hardcoded secrets or URLs.
const SPRING_API_BASE = process.env.SPRING_API_BASE;
const SPRING_USERNAME = process.env.SPRING_USERNAME;
const SPRING_PASSWORD = process.env.SPRING_PASSWORD;

if (!SPRING_API_BASE || !SPRING_USERNAME || !SPRING_PASSWORD) {
  console.warn('Missing Spring backend configuration. Set SPRING_API_BASE, SPRING_USERNAME, and SPRING_PASSWORD in your .env file.');
}

// Available LeetCode topic patterns that the user may select from the Discord embed.
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

// Convert a selected pattern into the backend endpoint used by the Java service.
function buildBackendUrl(pattern) {
  const normalizedBase = SPRING_API_BASE.replace(/\/api\/problems$/, '').replace(/\/api$/, '');
  return `${normalizedBase}/api/leetcode/wrapper?patternName=${encodeURIComponent(pattern)}`;
}

// Build Discord button rows grouped in batches of 5 to keep the embed readable.
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
        .setLabel('Solve in VS Code')
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

// Fetch problems for the selected pattern from the backend service.
async function sendPatternRequest(pattern) {
  if (!SPRING_API_BASE || !SPRING_USERNAME || !SPRING_PASSWORD) {
    return {
      ok: false,
      status: 500,
      payload: {
        success: false,
        message: 'Missing backend credentials or URL. Configure SPRING_API_BASE, SPRING_USERNAME, and SPRING_PASSWORD.'
      }
    };
  }

  const url = buildBackendUrl(pattern);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: 'Basic ' + Buffer.from(`${SPRING_USERNAME}:${SPRING_PASSWORD}`).toString('base64')
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

// Display the initial pattern picker message in Discord.
async function showPatterns(channel) {
  const embed = new EmbedBuilder()
    .setTitle('LeetCode Pattern Picker')
    .setDescription('Choose a pattern below. The selected pattern will be sent to the Spring Boot server.')
    .setColor('#5865F2');

  await channel.send({ embeds: [embed], components: buildPatternRows() });
}

module.exports = {
  PATTERNS,
  buildBackendUrl,
  buildPatternRows,
  buildProblemChoiceRows,
  sendPatternRequest,
  showPatterns
};
