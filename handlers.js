// Bot command and interaction handlers.
// This module is responsible for the UI/Discord behavior and delegates the actual
// fetching logic to the feature-specific modules.
const { EmbedBuilder } = require('discord.js');
const { resolveCommand } = require('./commands');
const { sendPatternRequest, buildProblemChoiceRows } = require('./patternPicker');

function registerHandlers(client) {
  // Handle text commands from Discord channels, including mention-based commands like
  // "@sensei daily challenge".
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const command = resolveCommand(message.content, client.user?.id);

    if (command) {
      await command.handler(message);
      return;
    }
  });

  // Handle button clicks from the pattern-picker embed.
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    // VS Code links are sent to users so they can open the LeetCode problem in their editor.
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
}

module.exports = {
  registerHandlers
};
