# Discord Bot

This project is the user-facing communication layer of the daily LeetCode challenge system. It is responsible for:

- receiving Discord commands
- posting the daily challenge embed into a configured channel
- allowing users to mark that they solved the challenge
- sending DM reminders to members who have not solved the challenge yet
- exposing a small health endpoint for monitoring

The bot is designed to be a thin, interactive frontend over the backend system rather than the source of business logic.

---

## Core idea

The Discord bot does not manage the daily challenge data itself. Instead, it depends on the Spring backend and the LeetCode wrapper for truth and state.

This creates a clean separation:

- LeetCode wrapper: fetches challenge data from LeetCode
- Java backend: persists solved status and exposes system state
- Discord bot: posts to Discord and interacts with users

---

## Project structure

```text
discord_bot/
├── .env.example
├── bot.js
├── commands.js
├── dailyChallenge.js
├── handlers.js
├── patternPicker.js
├── reminderService.js
├── server.js
├── package.json
├── README.md
├── .gitignore
└── node_modules/
```

---

## Main files

### `bot.js`

This is the main entry point. It:

- loads environment variables
- creates the Discord client
- registers command handlers
- starts the reminder service
- starts the lightweight HTTP server

### `commands.js`

This file is the registry of all supported commands. It defines:

- the command names
- aliases
- descriptions
- the handler function for each command

It also handles command normalization for mention-based usage such as:

```text
@sensei daily challenge
@sensei patterns
@sensei solved
```

### `dailyChallenge.js`

This file is responsible for fetching the daily challenge from the backend or wrapper and sending it to a channel as a Discord embed.

### `patternPicker.js`

This module shows a pattern selection interface and helps users select a LeetCode topic or problem category.

### `reminderService.js`

This is the reminder engine. It tracks:

- when the challenge was posted
- whether a member has solved it
- when the last reminder was sent

It then sends follow-up DMs after the configured delay if a user has not solved the challenge yet.

### `server.js`

This file exposes a lightweight HTTP server used for:

- health checks
- internal posting from the Spring backend
- deployment monitoring

---

## Commands supported by the bot

The command registry centralizes all supported actions. The main examples are:

### Core commands

- `!daily`
- `daily`
- `daily challenge`
- `!patterns`
- `patterns`
- `!help`
- `help`
- `!solved`
- `solved`

### Mention-based usage

Because the command parser strips the bot mention before lookup, the bot supports commands like:

```text
@sensei daily challenge
@sensei patterns
@sensei solved
```

This is useful for servers where members do not want to type the command prefix manually.

---

## Reminder flow

The reminder service is one of the key features of the bot.

### Reminder logic

1. When the challenge is posted, the timestamp is recorded for the guild
2. The bot waits for the configured delay before starting reminder checks
3. For each guild member:
   - skip bots
   - skip members who already solved the challenge
   - skip users who were reminded recently
4. Send a DM reminder if the user has not solved the challenge yet

This keeps reminders helpful without spamming users repeatedly.

---

## Health and monitoring

The bot exposes lightweight HTTP endpoints so deployment platforms and monitoring tools can check the process.

### Example endpoint

```http
GET /health
GET /api/health
```

This returns basic service status information and confirms that the bot process is alive.

The internal endpoint used by the Java backend is also available:

```http
POST /internal/daily-challenge
```

This is how the backend pushes the scheduled challenge payload to the bot for posting in the Discord channel.

---

## Configuration

The project uses environment variables. A sample file exists in `.env.example`.

Example:

```bash
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_application_client_id_here
PORT=3000
SPRING_API_BASE=http://localhost:8080
SPRING_USERNAME=admin
SPRING_PASSWORD=change_this_password
LEETCODE_WRAPPER_URL=http://localhost:3001/api/daily
DISCORD_CHANNEL_ID=your_discord_channel_id_here
```

### Why environment variables matter

- tokens and URLs should not be hardcoded into source files
- the same code can run in dev, staging, and prod with different settings
- secrets remain outside the local repository and are easier to manage in deployment systems

---

## Local development

Install dependencies:

```bash
npm install
```

Run the bot:

```bash
npm start
```

or directly:

```bash
node bot.js
```

---

## How the bot interacts with the rest of the system

### With the backend

The bot calls the Spring backend to:

- persist solved state
- check if a user has already solved the daily challenge
- sync reminder logic with the persistent database

### With the wrapper

The bot usually does not talk directly to LeetCode. Instead, it receives the daily challenge from the backend or uses a wrapper endpoint when needed.

### With Discord users

The bot is the visible part of the system. It posts challenge information, listens for commands, and communicates progress and reminders through Discord.

---

## Troubleshooting

### Bot does not come online

Check:

- `DISCORD_TOKEN` exists and is valid
- the bot has the required permissions in the server
- the app is not crashing due to a missing environment variable

### Commands do not trigger

Check:

- the message content is normalized correctly
- the user is typing the intended command or mention format
- the guild is where the bot is expected to operate

### Reminder DMs are not sent

Check:

- the daily challenge was posted and recorded by the bot
- the user has not already solved the challenge in the backend
- the reminder interval is configured correctly
- the member allows DMs from the server

---

## Best practices for future developers

- keep all command definitions in `commands.js`
- keep reminder logic in `reminderService.js`
- keep HTTP endpoints in `server.js`
- keep API payload building isolated in service-like modules
- keep secrets in environment variables rather than source code

This project is intentionally modular, and each file is focused on one task so future developers can extend the system without reading the entire codebase at once.

