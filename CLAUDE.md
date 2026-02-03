# CLAUDE.md - Project Context for AI Assistants

## Project Overview

PostPilot is a CLI-based automation tool with two core capabilities:
1. **Social Media Automation** - Cross-post content to Reddit, Facebook, Twitter
2. **GUI Testing** - Automated UI testing for SaaS apps and websites

## Tech Stack

- **Runtime:** Node.js 18+
- **Language:** TypeScript
- **Browser Automation:** Puppeteer (with stealth plugin)
- **CLI Framework:** Commander.js
- **Database:** SQLite via better-sqlite3
- **Config:** dotenv for credentials

## Project Structure

```
src/
├── index.ts           # CLI entry point, registers all commands
├── browser.ts         # Puppeteer setup, anti-detection, helper functions
├── config.ts          # Credential loading (~/.postpilot/), campaign parsing
├── db.ts              # SQLite database for post history and test runs
├── commands/          # CLI command definitions
│   ├── reddit.ts      # `postpilot reddit` command
│   ├── facebook.ts    # `postpilot facebook` command
│   ├── twitter.ts     # `postpilot twitter` command
│   └── test.ts        # `postpilot test` command
├── platforms/         # Platform-specific automation logic
│   ├── reddit.ts      # Reddit login, post, verify
│   ├── facebook.ts    # Facebook login, post
│   └── twitter.ts     # Twitter login, post
└── testing/           # GUI testing framework
    ├── runner.ts      # Test flow executor
    ├── actions.ts     # Test step implementations
    └── reporter.ts    # Test result formatting
```

## Key Patterns

### Platform Module Pattern
Each platform in `src/platforms/` exports:
- `loginTo<Platform>(page: Page): Promise<boolean>` - handles auth
- `submitPost(page: Page, options): Promise<{success, postUrl?, error?}>` - creates post
- `postTo<Platform>(options): Promise<PostResult>` - high-level single post
- `postToMultiple<Targets>()` - batch posting with delays

### Browser Automation
- Always use `launchBrowser()` and `newPage()` from `browser.ts`
- Use `humanType()` for realistic typing
- Use `randomDelay()` between actions for anti-detection
- Use `waitAndClick()` for reliable element interaction

### Credential Management
- Credentials stored in `~/.postpilot/credentials.json`
- Environment variables supported: `REDDIT_USERNAME`, `REDDIT_PASSWORD`, etc.
- Use `get<Platform>Credentials()` and `set<Platform>Credentials()` from config.ts

### Database
- `recordPost()` to log posts
- `postExists()` to check for duplicates within 24 hours
- `recordTestRun()` to log test executions

## Build & Run

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript
npm run dev          # Run via ts-node
npm link             # Make `postpilot` available globally
```

## Important Conventions

1. **Error handling:** Wrap browser operations in try/catch, return `{success: false, error}` on failure
2. **Logging:** Use chalk for colored output, emojis for status indicators
3. **Delays:** Always add random delays between posts (default 30s) to avoid rate limits
4. **Verification:** Optional `--verify` flag checks if posts are live after submission
5. **Screenshots:** Save to `./screenshots/` with timestamp suffix
