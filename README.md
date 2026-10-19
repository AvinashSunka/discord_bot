# LeetCode Pattern Discord Bot

This small Discord bot shows a list of common LeetCode patterns as clickable buttons. When a user clicks a pattern, the bot calls your Spring Boot backend at:

http://localhost:8080/api/leetcode/wrapper?param=<pattern>

## Setup

1. Copy `.env.example` to `.env`
2. Add your Discord bot token:
   ```env
   DISCORD_TOKEN=your_bot_token
   SPRING_API_BASE=http://localhost:8080
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the bot:
   ```bash
   npm start
   ```
5. In Discord, type:
   ```
   !patterns
   ```

The bot will show pattern buttons and send the selected pattern to your Spring Boot server.
