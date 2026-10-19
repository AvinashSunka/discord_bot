// Lightweight HTTP server used by the bot for health checks and internal webhook calls.
// This keeps the bot process reachable by deployment platforms and the Spring backend.
const express = require('express');
const { EmbedBuilder } = require('discord.js');

function createServer(client) {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Basic health endpoint for deployment services and uptime checks.
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'discord-bot',
      botLoggedIn: !!client.user,
      timestamp: new Date().toISOString()
    });
  });

  app.get('/api/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'discord-bot',
      botLoggedIn: !!client.user,
      timestamp: new Date().toISOString()
    });
  });

  app.get('/', (req, res) => {
    res.status(200).json({
      message: 'Discord bot is running',
      status: 'ok'
    });
  });

  const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID || null;

  // Internal endpoint used by the backend scheduler to post the daily challenge.
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

  app.listen(PORT, () => {
    console.log(`Discord bot server listening on port ${PORT}`);
  });

  return app;
}

module.exports = {
  createServer
};
