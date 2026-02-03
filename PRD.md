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

**Goal:** Be able to run:
```bash
postpilot reddit -s "Homeplate,travelball" -t "Title" -b "Body text" -u "https://link.com"
```

And have it post to both subreddits automatically.
