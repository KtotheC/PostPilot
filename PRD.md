# PostPilot

## Product Requirements Document v1.0

**Owner:** Casey
**Created:** February 2026
**Status:** 🚧 Building

---

## Overview

PostPilot is a CLI-based social media automation tool that uses Puppeteer to cross-post content to multiple platforms. Built to save time when promoting products across Reddit, Facebook, and other social platforms.

## Core Features

### 1. Reddit Multi-Post
- Post to multiple subreddits with one command
- Support for text posts and link posts
- Configurable delay between posts (avoid rate limits)
- Login via stored credentials (secure local storage)

### 2. Facebook Posting
- Post to personal feed or pages
- Support for text + link posts
- Image upload support (future)

### 3. Twitter/X Integration (Careful - TOS)
- Optional module (disabled by default)
- Like and reply to tweets matching keywords
- Post tweets

### 4. CLI Interface
```bash
# Post to multiple subreddits
postpilot reddit --subreddits "Homeplate,travelball,LittleLeague" --title "Your title" --body "Your content"

# Post to Facebook
postpilot facebook --page "MyPage" --content "Check this out!"

# Run a campaign (config file)
postpilot campaign --config ./campaigns/clipkeeper-launch.json
```

### 5. Campaign System
- Define campaigns in JSON/YAML
- Schedule posts
- Track what's been posted (avoid duplicates)

## Tech Stack

- **Runtime:** Node.js
- **Browser Automation:** Puppeteer
- **CLI Framework:** Commander.js or Yargs
- **Config:** dotenv for credentials, JSON for campaigns
- **Storage:** Local SQLite for post history

## Security

- Credentials stored in `~/.postpilot/credentials.json` (gitignored)
- Never commit credentials
- Support for environment variables

## File Structure

```
PostPilot/
├── src/
│   ├── index.ts          # CLI entry point
│   ├── platforms/
│   │   ├── reddit.ts     # Reddit automation
│   │   ├── facebook.ts   # Facebook automation
│   │   └── twitter.ts    # Twitter automation (optional)
│   ├── browser.ts        # Puppeteer setup/helpers
│   ├── config.ts         # Config loading
│   └── db.ts             # SQLite post history
├── campaigns/            # Example campaign configs
├── package.json
├── tsconfig.json
└── README.md
```

## Future Features

- [ ] Image/media upload support
- [ ] Post scheduling (cron-based)
- [ ] Analytics tracking (click tracking via redirects)
- [ ] Discord posting
- [ ] LinkedIn posting
- [ ] Proxy support (for multiple accounts)
- [ ] GUI dashboard (web-based)

## Anti-Detection Measures

- Random delays between actions
- Human-like typing speed
- Browser fingerprint randomization
- Respect platform rate limits

---

## Phase 1 Scope (MVP)

1. ✅ Project setup (TypeScript, Puppeteer)
2. ✅ Reddit login + post to single subreddit
3. ✅ Reddit multi-post (loop through subreddits)
4. ✅ CLI interface
5. ✅ Credential storage
6. ✅ **Post Verification** - Confirm posts went live

**Goal:** Be able to run:
```bash
postpilot reddit -s "Homeplate,travelball" -t "Title" -b "Body text" -u "https://link.com" --verify
```

And have it post to both subreddits automatically, then verify each post exists.

---

## Feature: Post Verification (--verify)

After posting, PostPilot will:
1. Wait 5-10 seconds for Reddit to process
2. Navigate to the subreddit's /new page or user profile
3. Search for the post by title
4. Confirm it exists and is visible
5. Capture a screenshot as proof (saved to `./screenshots/`)
6. Log result: "✅ Verified: Post live at [URL]" or "❌ Failed: Post not found"

### CLI Flags
- `--verify` - Enable post verification (default: off)
- `--screenshot` - Save screenshot proof (default: on when --verify)
- `--retry <n>` - Retry posting if verification fails (default: 0)
- `--notify` - Send notification on completion (future: Telegram/Discord webhook)

### Verification Output
```
📤 Posting to r/Homeplate...
✅ Posted: "Your Title Here"
🔍 Verifying...
📸 Screenshot saved: ./screenshots/homeplate-2024-02-02-201500.png
✅ Verified: https://reddit.com/r/Homeplate/comments/abc123/

📤 Posting to r/travelball...
✅ Posted: "Your Title Here"  
🔍 Verifying...
📸 Screenshot saved: ./screenshots/travelball-2024-02-02-201530.png
✅ Verified: https://reddit.com/r/travelball/comments/def456/

Summary: 2/2 posts verified ✅
```
