# PostPilot

CLI automation tool for social media posting and GUI testing. Cross-post to Reddit, Facebook, and Twitter with one command, or run automated UI tests on any web app.

## Installation

```bash
git clone https://github.com/KtotheC/PostPilot.git
cd PostPilot
npm install
npm run build
npm link  # Makes 'postpilot' available globally
```

## Quick Start

### 1. Configure Credentials

```bash
# Interactive setup
postpilot login reddit
postpilot login twitter
postpilot login facebook

# Or set environment variables
export REDDIT_USERNAME="your_username"
export REDDIT_PASSWORD="your_password"
export TWITTER_USERNAME="your_username"
export TWITTER_PASSWORD="your_password"
export FACEBOOK_EMAIL="your_email"
export FACEBOOK_PASSWORD="your_password"
```

### 2. Post to Platforms

```bash
# Reddit - post to multiple subreddits
postpilot reddit \
  --subreddits "Homeplate,travelball" \
  --title "Check out this baseball training tip" \
  --body "Here's a great drill..."

# Twitter
postpilot twitter -c "Just launched my new project! #buildinpublic"

# Facebook
postpilot facebook -c "Check out our latest update!"
```

### 3. Run Campaigns

```bash
# Create a campaign config
postpilot campaign create "Product Launch"

# Edit campaigns/product-launch.json, then run:
postpilot campaign --config ./campaigns/product-launch.json

# Dry run first
postpilot campaign --config ./campaigns/product-launch.json --dry-run
```

### 4. GUI Testing

```bash
# Quick smoke test
postpilot test smoke https://myapp.com

# Run test flow
postpilot test run ./tests/login.json --url https://myapp.com

# Create test from template
postpilot test create "My Login Test" --template login
```

## Commands

| Command | Description |
|---------|-------------|
| `postpilot reddit` | Post to Reddit subreddits |
| `postpilot twitter` | Post to Twitter/X |
| `postpilot facebook` | Post to Facebook feed or pages |
| `postpilot campaign` | Run multi-platform campaigns |
| `postpilot test` | Run GUI tests |
| `postpilot login <platform>` | Configure credentials |
| `postpilot status` | Check configuration |

## Campaign Config Format

```json
{
  "name": "Product Launch",
  "steps": [
    {
      "platform": "reddit",
      "action": "post",
      "data": {
        "subreddits": ["webdev", "programming"],
        "title": "Launching my new tool",
        "body": "Check it out!"
      },
      "delay": 60000
    },
    {
      "platform": "twitter",
      "action": "post",
      "data": {
        "content": "Just launched! #buildinpublic"
      }
    }
  ]
}
```

## Test Flow Format

```json
{
  "name": "Login Flow",
  "baseUrl": "https://myapp.com",
  "steps": [
    { "goto": "/login" },
    { "type": "#email", "text": "user@example.com" },
    { "type": "#password", "text": "password123" },
    { "click": "button[type=submit]" },
    { "waitFor": ".dashboard" },
    { "verify": "h1", "contains": "Dashboard" }
  ]
}
```

## Features

- ✅ **Multi-platform posting** - Reddit, Twitter, Facebook
- ✅ **Campaign orchestration** - Run multi-step campaigns from JSON config
- ✅ **GUI testing** - Automated UI testing for any web app
- ✅ **Anti-detection** - Human-like delays and stealth mode
- ✅ **Duplicate prevention** - Won't repost within 24 hours
- ✅ **Verification** - Optional post verification with screenshots
- ✅ **SQLite history** - Track all posts and test runs

## License

MIT
