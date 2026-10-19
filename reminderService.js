// Reminder service for the daily LeetCode challenge.
// This module is responsible for tracking whether members completed the challenge,
// recording when the challenge was posted, and sending direct-message reminders to
// members who have not confirmed completion.

const SPRING_API_BASE = process.env.SPRING_API_BASE || 'http://localhost:8080';

const SOLVED_KEYWORDS = [
  'solved the daily challenge',
  'solved daily challenge',
  'i solved the daily challenge',
  'i solved today\'s daily challenge',
  'completed the daily challenge',
  'finished the daily challenge',
  'daily challenge solved',
  'i did the daily challenge'
];

// A map of guildId -> posted time.
// This is used to determine when the challenge was published so the reminder timer
// can start after 12 hours instead of immediately.
const challengePostedAtByGuild = new Map();

// A map of guildId:userId -> last reminder timestamp.
// This prevents spamming the same member with multiple DMs in a short window.
const lastReminderAtByUser = new Map();

// Returns the current date in YYYY-MM-DD format so the solved state resets each day.
function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

// Stores the time when the daily challenge was posted in the guild.
function markChallengePosted(guildId, postedAt = new Date()) {
  if (!guildId) return;
  challengePostedAtByGuild.set(guildId, new Date(postedAt));
}

// Retrieves the stored post time for the current guild.
function getChallengePostedAt(guildId) {
  const postedAt = challengePostedAtByGuild.get(guildId);
  return postedAt ? new Date(postedAt) : null;
}

async function markUserSolved(guildId, userId) {
  if (!guildId || !userId) return;

  const challengeDate = getTodayKey();
  const url = `${SPRING_API_BASE}/api/challenge-completion?guildId=${encodeURIComponent(guildId)}&userId=${encodeURIComponent(userId)}&challengeDate=${encodeURIComponent(challengeDate)}`;

  try {
    const response = await fetch(url, { method: 'POST' });
    if (!response.ok) {
      console.error('Failed to persist solved status with Spring backend:', await response.text());
    }
  } catch (error) {
    console.error('Error persisting solved status with Spring backend:', error);
  }

  const key = `${guildId}:${userId}`;
  lastReminderAtByUser.delete(key);
}

async function hasUserSolvedToday(guildId, userId) {
  if (!guildId || !userId) return false;

  const challengeDate = getTodayKey();
  const url = `${SPRING_API_BASE}/api/challenge-completion?guildId=${encodeURIComponent(guildId)}&userId=${encodeURIComponent(userId)}&challengeDate=${encodeURIComponent(challengeDate)}`;

  try {
    const response = await fetch(url, { method: 'GET' });
    const data = await response.json();
    return Boolean(data);
  } catch (error) {
    console.error('Error checking solved status from Spring backend:', error);
    return false;
  }
}

// Checks whether a Discord message indicates the user has completed the challenge.
function isSolvedMessage(content) {
  if (!content) return false;

  const normalized = content.toLowerCase();
  return SOLVED_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

async function sendDailyReminders(client) {
  const now = Date.now();

  for (const guild of client.guilds.cache.values()) {
    try {
      const postedAt = getChallengePostedAt(guild.id);
      if (!postedAt) continue;

      const twelveHoursLater = new Date(postedAt.getTime() + 12 * 60 * 60 * 1000);
      if (now < twelveHoursLater.getTime()) continue;

      const members = await guild.members.fetch();

      for (const member of members.values()) {
        if (member.user.bot) continue;
        if (await hasUserSolvedToday(guild.id, member.id)) continue;

        const userKey = `${guild.id}:${member.id}`;
        const lastReminderAt = lastReminderAtByUser.get(userKey);

        if (lastReminderAt && now - new Date(lastReminderAt).getTime() < 4 * 60 * 60 * 1000) {
          continue;
        }

        try {
          await member.send(
            'Reminder: you have not marked that you solved today\'s LeetCode daily challenge yet. ' +
            'Please post in the server that you solved it or type `@sensei solved`.'
          );

          lastReminderAtByUser.set(userKey, new Date(now));
        } catch (error) {
          console.log(`Could not DM ${member.user.tag}: ${error.message}`);
        }
      }
    } catch (error) {
      console.error(`Failed to process guild reminders for ${guild.name}:`, error);
    }
  }
}

function registerReminderService(client) {
  client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    if (message.content.toLowerCase().startsWith('!solved') || isSolvedMessage(message.content)) {
      await markUserSolved(message.guild.id, message.author.id);
      return;
    }
  });

  setInterval(() => {
    sendDailyReminders(client).catch((error) => {
      console.error('Failed to send daily challenge reminders:', error);
    });
  }, 60 * 60 * 1000);
}

module.exports = {
  markChallengePosted,
  getChallengePostedAt,
  markUserSolved,
  hasUserSolvedToday,
  isSolvedMessage,
  sendDailyReminders,
  registerReminderService
};
