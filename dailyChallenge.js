// Daily challenge feature module.
// This file fetches the current daily LeetCode problem and formats it as a Discord embed.
const { EmbedBuilder } = require('discord.js');
const { markChallengePosted } = require('./reminderService');

// The wrapper URL is supplied by environment variables so this service is portable
// across local, staging, and production deployments.
const DAILY_CHALLENGE_URL = process.env.LEETCODE_WRAPPER_URL;

if (!DAILY_CHALLENGE_URL) {
  console.warn('Missing LEETCODE_WRAPPER_URL in environment variables. Set it in your .env file.');
}

// Call the backend wrapper and normalize the response body before rendering it.
async function fetchDailyChallenge() {
  if (!DAILY_CHALLENGE_URL) {
    return {
      ok: false,
      status: 500,
      payload: {
        success: false,
        message: 'Missing LEETCODE_WRAPPER_URL. Configure it in your environment.'
      }
    };
  }

  const response = await fetch(DAILY_CHALLENGE_URL.replace(/\/+$/, ''), {
    method: 'GET',
    headers: {
      Accept: 'application/json'
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

// Render the fetched challenge into a Discord embed for the channel that invoked it.
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

  if (channel.guild?.id) {
    markChallengePosted(channel.guild.id, new Date());
  }
}

module.exports = {
  fetchDailyChallenge,
  showDailyChallenge
};
