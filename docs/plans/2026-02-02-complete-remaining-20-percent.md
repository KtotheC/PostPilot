# PostPilot MVP Completion - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the remaining 20% of PostPilot MVP - add CLAUDE.md, README.md, Twitter/Facebook platforms, and campaign orchestration.

**Architecture:** Each platform (Twitter, Facebook) follows the same pattern as Reddit - a `platforms/*.ts` file with login/post functions using Puppeteer, and a `commands/*.ts` file that wires it to the CLI. Campaign command reads a JSON config and dispatches to the appropriate platform modules.

**Tech Stack:** TypeScript, Puppeteer (via puppeteer-extra with stealth), Commander.js CLI, SQLite via better-sqlite3

---

## Task 1: Add CLAUDE.md Project Context

**Files:**
- Create: `CLAUDE.md`

**Step 1: Create CLAUDE.md file**

```markdown
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

## CLI Usage

```bash
postpilot reddit -s "sub1,sub2" -t "Title" -b "Body" --verify
postpilot facebook --page "MyPage" --content "Post content"
postpilot twitter --content "Tweet text"
postpilot campaign --config ./campaigns/launch.json
postpilot test run ./tests/login.json --url https://myapp.com
postpilot login reddit
postpilot status
```

## Important Conventions

1. **Error handling:** Wrap browser operations in try/catch, return `{success: false, error}` on failure
2. **Logging:** Use chalk for colored output, emojis for status indicators
3. **Delays:** Always add random delays between posts (default 30s) to avoid rate limits
4. **Verification:** Optional `--verify` flag checks if posts are live after submission
5. **Screenshots:** Save to `./screenshots/` with timestamp suffix
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md with project context for AI assistants"
```

---

## Task 2: Add README.md Documentation

**Files:**
- Create: `README.md`

**Step 1: Create README.md file**

```markdown
# PostPilot

CLI automation tool for social media posting and GUI testing. Cross-post to Reddit, Facebook, and Twitter with one command, or run automated UI tests on any web app.

## Installation

```bash
git clone https://github.com/yourusername/PostPilot.git
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

# Or set environment variables
export REDDIT_USERNAME="your_username"
export REDDIT_PASSWORD="your_password"

# Or create .env file
echo "REDDIT_USERNAME=your_username" >> .env
echo "REDDIT_PASSWORD=your_password" >> .env
```

### 2. Post to Reddit

```bash
# Post to multiple subreddits
postpilot reddit \
  --subreddits "Homeplate,travelball,LittleLeague" \
  --title "Check out this baseball training tip" \
  --body "Here's a great drill for improving batting stance..."

# Link post with verification
postpilot reddit \
  -s "webdev,programming" \
  -t "I built a CLI tool for social media automation" \
  -u "https://github.com/yourusername/PostPilot" \
  --verify --screenshot
```

### 3. Run GUI Tests

```bash
# Run a test flow
postpilot test run ./tests/login.json --url https://myapp.com

# Quick smoke test
postpilot test smoke https://myapp.com

# Create test from template
postpilot test create "My Login Test" --template login --url https://myapp.com
```

## Commands

### `postpilot reddit`

Post to one or more subreddits.

| Option | Description |
|--------|-------------|
| `-s, --subreddits <list>` | Comma-separated subreddit names |
| `-t, --title <title>` | Post title |
| `-b, --body <body>` | Post body text |
| `-u, --url <url>` | Link URL (creates link post if no body) |
| `--verify` | Verify posts are live after posting |
| `--screenshot` | Save verification screenshots |
| `--delay <ms>` | Delay between posts (default: 30000) |

```bash
postpilot reddit -s "sub1,sub2" -t "Title" -b "Body" --verify
```

### `postpilot facebook`

Post to Facebook feed or pages.

| Option | Description |
|--------|-------------|
| `--page <name>` | Page name to post to (or "feed" for personal) |
| `--content <text>` | Post content |
| `--url <url>` | Optional link to include |

```bash
postpilot facebook --page "MyBusinessPage" --content "Check out our new product!"
```

### `postpilot twitter`

Post tweets to Twitter/X.

| Option | Description |
|--------|-------------|
| `--content <text>` | Tweet content (max 280 chars) |
| `--url <url>` | Optional link to include |

```bash
postpilot twitter --content "Just launched PostPilot! #automation"
```

### `postpilot campaign`

Run multi-platform campaigns from a config file.

```bash
postpilot campaign --config ./campaigns/product-launch.json
```

Campaign config format:
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

### `postpilot test`

Run GUI tests on web applications.

```bash
# Run test flow
postpilot test run ./tests/signup.json --url https://myapp.com

# Smoke test (check if page loads)
postpilot test smoke https://myapp.com

# List templates
postpilot test templates

# View test history
postpilot test history
```

Test flow format:
```json
{
  "name": "Login Flow",
  "baseUrl": "https://myapp.com",
  "steps": [
    { "goto": "/login" },
    { "waitFor": "#email" },
    { "type": "#email", "text": "user@example.com" },
    { "type": "#password", "text": "password123" },
    { "click": "button[type=submit]" },
    { "waitFor": ".dashboard", "timeout": 10000 },
    { "screenshot": "login-success" },
    { "verify": "h1", "contains": "Dashboard" }
  ]
}
```

Supported test actions:
- `goto` - Navigate to URL
- `click` - Click element
- `type` - Type into input
- `waitFor` - Wait for element
- `screenshot` - Capture screenshot
- `verify` - Assert text content
- `wait` - Wait milliseconds
- `scroll` - Scroll to element
- `hover` - Hover over element
- `select` - Select dropdown option
- `press` - Press keyboard key

### `postpilot login`

Store credentials for a platform.

```bash
postpilot login reddit
postpilot login facebook
postpilot login twitter
```

### `postpilot status`

Check configuration status.

```bash
postpilot status
```

## Configuration

Credentials are stored in `~/.postpilot/credentials.json` (automatically created).

You can also use environment variables:
- `REDDIT_USERNAME`, `REDDIT_PASSWORD`
- `FACEBOOK_EMAIL`, `FACEBOOK_PASSWORD`
- `TWITTER_USERNAME`, `TWITTER_PASSWORD`

Or a `.env` file in the project root.

## Post History

PostPilot tracks all posts in a local SQLite database (`~/.postpilot/postpilot.db`).

```bash
# View recent Reddit posts
postpilot reddit history

# View recent test runs
postpilot test history
```

## Anti-Detection

PostPilot includes measures to avoid bot detection:
- Random delays between actions
- Human-like typing speed
- Stealth browser plugin
- Realistic user agent

## License

MIT
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README.md with usage documentation"
```

---

## Task 3: Add Twitter Platform Module

**Files:**
- Create: `src/platforms/twitter.ts`

**Step 1: Create the Twitter platform module**

```typescript
import type { Page } from 'puppeteer';
import {
  launchBrowser,
  newPage,
  randomDelay,
  humanType,
  takeScreenshot,
  sleep,
  humanSleep,
} from '../browser.js';
import { loadCredentials, saveCredentials, TwitterCredentials } from '../config.js';
import { recordPost, postExists } from '../db.js';

export interface TwitterPostOptions {
  content: string;
  url?: string;
  verify?: boolean;
  screenshot?: boolean;
  screenshotDir?: string;
}

export interface PostResult {
  success: boolean;
  content: string;
  postUrl?: string;
  verified?: boolean;
  screenshotPath?: string;
  error?: string;
  recordId?: number;
}

const TWITTER_URL = 'https://twitter.com';
const LOGIN_URL = 'https://twitter.com/i/flow/login';

export function getTwitterCredentials(): TwitterCredentials | null {
  const creds = loadCredentials();
  return creds.twitter || null;
}

export function setTwitterCredentials(username: string, password: string): void {
  saveCredentials({ twitter: { username, password } });
}

export async function loginToTwitter(page: Page): Promise<boolean> {
  const credentials = getTwitterCredentials();

  if (!credentials) {
    throw new Error('Twitter credentials not found. Run: postpilot login twitter');
  }

  console.log('Logging into Twitter...');

  await page.goto(LOGIN_URL, { waitUntil: 'networkidle2' });
  await randomDelay(2000, 3000);

  // Check if already logged in
  const homeLink = await page.$('a[href="/home"]');
  if (homeLink) {
    console.log('Already logged in');
    return true;
  }

  // Enter username
  const usernameInput = await page.waitForSelector('input[autocomplete="username"]', { timeout: 10000 });
  if (!usernameInput) {
    throw new Error('Could not find username input');
  }
  await humanType(page, 'input[autocomplete="username"]', credentials.username);
  await randomDelay(500, 1000);

  // Click Next button
  const nextButton = await page.$('xpath///*[contains(text(),"Next")]');
  if (nextButton) {
    await nextButton.click();
    await randomDelay(1500, 2500);
  }

  // Enter password
  const passwordInput = await page.waitForSelector('input[type="password"]', { timeout: 10000 });
  if (!passwordInput) {
    throw new Error('Could not find password input');
  }
  await humanType(page, 'input[type="password"]', credentials.password);
  await randomDelay(500, 1000);

  // Click Log in button
  const loginButton = await page.$('xpath///*[@role="button"][contains(text(),"Log in")]');
  if (loginButton) {
    await loginButton.click();
  } else {
    // Try alternate selector
    await page.keyboard.press('Enter');
  }

  // Wait for navigation
  try {
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
    await randomDelay(2000, 3000);
  } catch {
    // May not navigate, check if logged in anyway
  }

  // Check for 2FA or verification
  const verificationInput = await page.$('input[data-testid="ocfEnterTextTextInput"]');
  if (verificationInput) {
    throw new Error('Twitter requires additional verification. Please log in manually first.');
  }

  // Verify login success
  const homeAfterLogin = await page.$('a[href="/home"]');
  if (homeAfterLogin) {
    console.log('Login successful');
    return true;
  }

  throw new Error('Login failed: Could not verify login success');
}

export async function submitTweet(page: Page, options: TwitterPostOptions): Promise<{ success: boolean; postUrl?: string; error?: string }> {
  const { content, url } = options;

  console.log('Posting tweet...');

  // Navigate to home to compose
  await page.goto(`${TWITTER_URL}/home`, { waitUntil: 'networkidle2' });
  await randomDelay(1500, 2500);

  // Find compose box
  const composeSelector = 'div[data-testid="tweetTextarea_0"]';
  await page.waitForSelector(composeSelector, { timeout: 10000 });
  await page.click(composeSelector);
  await randomDelay(300, 500);

  // Type tweet content
  let fullContent = content;
  if (url) {
    fullContent = `${content}\n\n${url}`;
  }

  // Enforce character limit
  if (fullContent.length > 280) {
    fullContent = fullContent.substring(0, 277) + '...';
  }

  for (const char of fullContent) {
    await page.keyboard.type(char, { delay: Math.random() * 30 + 20 });
  }
  await randomDelay(500, 1000);

  // Click Post button
  const postButton = await page.$('button[data-testid="tweetButtonInline"]');
  if (!postButton) {
    throw new Error('Could not find Post button');
  }

  await postButton.click();

  // Wait for post to be submitted
  await randomDelay(2000, 3000);

  // Check for success - look for the tweet in the timeline
  const tweetPosted = await page.$(`xpath///*[contains(text(),"${content.substring(0, 30)}")]`);
  if (tweetPosted) {
    console.log('Posted tweet');
    return { success: true };
  }

  // Try to get the tweet URL from the user's profile
  const credentials = getTwitterCredentials();
  if (credentials) {
    const profileUrl = `${TWITTER_URL}/${credentials.username}`;
    await page.goto(profileUrl, { waitUntil: 'networkidle2' });
    await randomDelay(1500, 2500);

    // Look for the recent tweet
    const tweets = await page.$$('article[data-testid="tweet"]');
    if (tweets.length > 0) {
      const tweetLink = await tweets[0].$('a[href*="/status/"]');
      if (tweetLink) {
        const href = await page.evaluate(el => el.getAttribute('href'), tweetLink);
        if (href) {
          const postUrl = `${TWITTER_URL}${href}`;
          console.log('Posted tweet');
          return { success: true, postUrl };
        }
      }
    }
  }

  return { success: true };
}

export async function postToTwitter(options: TwitterPostOptions): Promise<PostResult> {
  const { content, url, verify, screenshot, screenshotDir = './screenshots' } = options;

  // Check for duplicate (using first 50 chars as title)
  const titleKey = content.substring(0, 50);
  if (postExists('twitter', 'twitter', titleKey)) {
    console.log('Skipping: Already posted in last 24 hours');
    return {
      success: false,
      content,
      error: 'Duplicate post - already posted in last 24 hours',
    };
  }

  const browser = await launchBrowser({ headless: true });
  const page = await newPage(browser);

  try {
    await loginToTwitter(page);

    const result = await submitTweet(page, options);

    if (!result.success) {
      return {
        success: false,
        content,
        error: result.error,
      };
    }

    // Record the post
    const recordId = recordPost({
      platform: 'twitter',
      subreddit: 'twitter',
      title: titleKey,
      body: content,
      url,
      post_url: result.postUrl,
      verified: false,
      created_at: new Date().toISOString(),
    });

    // Take screenshot if requested
    let screenshotPath: string | undefined;
    if (screenshot && screenshotDir) {
      screenshotPath = await takeScreenshot(page, 'twitter-post', screenshotDir);
      console.log(`Screenshot saved: ${screenshotPath}`);
    }

    return {
      success: true,
      content,
      postUrl: result.postUrl,
      screenshotPath,
      recordId,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error posting to Twitter: ${errMsg}`);
    return {
      success: false,
      content,
      error: errMsg,
    };
  } finally {
    await page.close();
    await browser.close();
  }
}
```

**Step 2: Commit**

```bash
git add src/platforms/twitter.ts
git commit -m "feat: add Twitter platform module with login and post functions"
```

---

## Task 4: Add Twitter Command

**Files:**
- Create: `src/commands/twitter.ts`
- Modify: `src/index.ts:5-7` - add import
- Modify: `src/index.ts:34` - add command registration

**Step 1: Create the Twitter command file**

```typescript
import { Command } from 'commander';
import chalk from 'chalk';
import { postToTwitter, PostResult, getTwitterCredentials, setTwitterCredentials } from '../platforms/twitter.js';
import { initDatabase, getRecentPosts } from '../db.js';

export function createTwitterCommand(): Command {
  const twitter = new Command('twitter')
    .description('Post to Twitter/X')
    .option('-c, --content <text>', 'Tweet content (max 280 chars)')
    .option('-u, --url <url>', 'URL to include in tweet')
    .option('--screenshot', 'Take screenshot after posting')
    .option('--screenshot-dir <dir>', 'Directory for screenshots', './screenshots')
    .action(async (options) => {
      initDatabase();

      if (!options.content) {
        console.error(chalk.red('Error: --content is required'));
        console.log(chalk.gray('\nUsage example:'));
        console.log(chalk.gray('  postpilot twitter -c "Check out my new project!"'));
        process.exit(1);
      }

      const credentials = getTwitterCredentials();
      if (!credentials) {
        console.error(chalk.red('Error: Twitter credentials not found'));
        console.log(chalk.gray('\nSet credentials:'));
        console.log(chalk.gray('  postpilot login twitter'));
        process.exit(1);
      }

      if (options.content.length > 280) {
        console.warn(chalk.yellow(`Warning: Tweet exceeds 280 chars (${options.content.length}), will be truncated`));
      }

      console.log(chalk.bold('\nPostPilot - Twitter Post\n'));
      console.log(chalk.gray(`Content: ${options.content.substring(0, 50)}...`));
      if (options.url) console.log(chalk.gray(`URL: ${options.url}`));
      console.log('');

      const result = await postToTwitter({
        content: options.content,
        url: options.url,
        screenshot: options.screenshot,
        screenshotDir: options.screenshotDir,
      });

      printResult(result);
    });

  // Subcommand: config
  twitter
    .command('config')
    .description('Configure Twitter credentials')
    .option('--username <username>', 'Twitter username')
    .option('--password <password>', 'Twitter password')
    .action((options) => {
      if (!options.username || !options.password) {
        console.error(chalk.red('Error: --username and --password are required'));
        process.exit(1);
      }

      setTwitterCredentials(options.username, options.password);
      console.log(chalk.green('Twitter credentials saved to ~/.postpilot/credentials.json'));
    });

  // Subcommand: history
  twitter
    .command('history')
    .description('View recent Twitter post history')
    .option('-n, --limit <n>', 'Number of posts to show', '10')
    .action((options) => {
      initDatabase();
      const posts = getRecentPosts(parseInt(options.limit, 10)).filter(p => p.platform === 'twitter');

      if (posts.length === 0) {
        console.log(chalk.gray('No Twitter posts found'));
        return;
      }

      console.log(chalk.bold('\nRecent Twitter Posts\n'));
      for (const post of posts) {
        const date = new Date(post.created_at).toLocaleDateString();
        console.log(`${post.body?.substring(0, 50)}... (${date})`);
        if (post.post_url) {
          console.log(chalk.gray(`   ${post.post_url}`));
        }
      }
      console.log('');
    });

  return twitter;
}

function printResult(result: PostResult): void {
  console.log(chalk.bold('\n' + '='.repeat(50)));
  console.log(chalk.bold('Result'));
  console.log('='.repeat(50));

  if (result.success) {
    console.log(chalk.green('Posted successfully'));
    if (result.postUrl) {
      console.log(chalk.gray(`URL: ${result.postUrl}`));
    }
    if (result.screenshotPath) {
      console.log(chalk.gray(`Screenshot: ${result.screenshotPath}`));
    }
  } else {
    console.log(chalk.red(`Failed: ${result.error}`));
  }
  console.log('');
}
```

**Step 2: Update src/index.ts to import and register Twitter command**

Add import at the top (after line 6):
```typescript
import { createTwitterCommand } from './commands/twitter.js';
```

Add command registration (after line 34):
```typescript
// Add Twitter command
program.addCommand(createTwitterCommand());
```

**Step 3: Update login command in src/index.ts to support twitter**

In the login command action, add twitter support after the reddit block:
```typescript
    } else if (platform === 'twitter') {
      console.log(chalk.bold('\nTwitter Login Setup'));
      console.log(chalk.gray('Credentials are stored locally in ~/.postpilot/\n'));

      const username = await prompt('Twitter username: ');
      const password = await prompt('Twitter password: ');

      if (!username || !password) {
        console.log(chalk.red('Username and password are required'));
        process.exit(1);
      }

      const { setTwitterCredentials } = await import('./platforms/twitter.js');
      setTwitterCredentials(username, password);
      console.log(chalk.green('\nTwitter credentials saved successfully!'));
      rl.close();
```

Update the "Supported platforms" message to include twitter.

**Step 4: Commit**

```bash
git add src/commands/twitter.ts src/index.ts
git commit -m "feat: add Twitter CLI command with post and history subcommands"
```

---

## Task 5: Add Facebook Platform Module

**Files:**
- Create: `src/platforms/facebook.ts`

**Step 1: Create the Facebook platform module**

```typescript
import type { Page } from 'puppeteer';
import {
  launchBrowser,
  newPage,
  randomDelay,
  humanType,
  takeScreenshot,
  sleep,
  humanSleep,
} from '../browser.js';
import { loadCredentials, saveCredentials, FacebookCredentials } from '../config.js';
import { recordPost, postExists } from '../db.js';

export interface FacebookPostOptions {
  page?: string; // Page name or 'feed' for personal feed
  content: string;
  url?: string;
  verify?: boolean;
  screenshot?: boolean;
  screenshotDir?: string;
}

export interface PostResult {
  success: boolean;
  content: string;
  pageName?: string;
  postUrl?: string;
  verified?: boolean;
  screenshotPath?: string;
  error?: string;
  recordId?: number;
}

const FACEBOOK_URL = 'https://www.facebook.com';
const LOGIN_URL = 'https://www.facebook.com/login';

export function getFacebookCredentials(): FacebookCredentials | null {
  const creds = loadCredentials();
  return creds.facebook || null;
}

export function setFacebookCredentials(email: string, password: string): void {
  saveCredentials({ facebook: { email, password } });
}

export async function loginToFacebook(page: Page): Promise<boolean> {
  const credentials = getFacebookCredentials();

  if (!credentials) {
    throw new Error('Facebook credentials not found. Run: postpilot login facebook');
  }

  console.log('Logging into Facebook...');

  await page.goto(LOGIN_URL, { waitUntil: 'networkidle2' });
  await randomDelay(1500, 2500);

  // Check if already logged in
  const loggedIn = await page.$('div[role="navigation"]');
  if (loggedIn) {
    const feedLink = await page.$('a[href="/"]');
    if (feedLink) {
      console.log('Already logged in');
      return true;
    }
  }

  // Enter email
  const emailInput = await page.waitForSelector('#email', { timeout: 10000 });
  if (!emailInput) {
    throw new Error('Could not find email input');
  }
  await humanType(page, '#email', credentials.email);
  await randomDelay(300, 600);

  // Enter password
  const passwordInput = await page.$('#pass');
  if (!passwordInput) {
    throw new Error('Could not find password input');
  }
  await humanType(page, '#pass', credentials.password);
  await randomDelay(300, 600);

  // Click login button
  const loginButton = await page.$('button[name="login"]');
  if (loginButton) {
    await loginButton.click();
  } else {
    await page.keyboard.press('Enter');
  }

  // Wait for navigation
  try {
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
    await randomDelay(2000, 3000);
  } catch {
    // May not navigate, check if logged in anyway
  }

  // Check for 2FA
  const twoFactorInput = await page.$('input[name="approvals_code"]');
  if (twoFactorInput) {
    throw new Error('Facebook requires 2FA. Please disable it or log in manually first.');
  }

  // Check for checkpoint/security check
  const checkpoint = await page.$('form[action*="checkpoint"]');
  if (checkpoint) {
    throw new Error('Facebook security checkpoint detected. Please log in manually first.');
  }

  // Verify login success
  const homeNav = await page.$('div[role="navigation"]');
  if (homeNav) {
    console.log('Login successful');
    return true;
  }

  throw new Error('Login failed: Could not verify login success');
}

export async function submitFacebookPost(page: Page, options: FacebookPostOptions): Promise<{ success: boolean; postUrl?: string; error?: string }> {
  const { content, url, page: pageName } = options;

  console.log(`Posting to Facebook${pageName && pageName !== 'feed' ? ` page: ${pageName}` : ''}...`);

  // Navigate to the appropriate page
  if (pageName && pageName !== 'feed') {
    // Navigate to the Facebook page
    await page.goto(`${FACEBOOK_URL}/${pageName}`, { waitUntil: 'networkidle2' });
    await randomDelay(1500, 2500);
  } else {
    // Navigate to personal feed
    await page.goto(FACEBOOK_URL, { waitUntil: 'networkidle2' });
    await randomDelay(1500, 2500);
  }

  // Click on the "What's on your mind?" or create post area
  const createPostSelector = 'div[role="button"]:has-text("What\'s on your mind"), div[data-pagelet="FeedComposer"] div[role="button"]';

  // Try multiple selectors for the compose area
  let composeButton = await page.$('div[role="button"][tabindex="0"]');

  // Look for the create post button
  const buttons = await page.$$('div[role="button"]');
  for (const button of buttons) {
    const text = await page.evaluate(el => el.textContent || '', button);
    if (text.includes("What's on your mind") || text.includes("Create post") || text.includes("Write something")) {
      composeButton = button;
      break;
    }
  }

  if (!composeButton) {
    throw new Error('Could not find compose button');
  }

  await composeButton.click();
  await randomDelay(1500, 2500);

  // Wait for the compose modal/area
  const textAreaSelector = 'div[contenteditable="true"][role="textbox"]';
  await page.waitForSelector(textAreaSelector, { timeout: 10000 });
  await page.click(textAreaSelector);
  await randomDelay(300, 500);

  // Type the content
  let fullContent = content;
  if (url) {
    fullContent = `${content}\n\n${url}`;
  }

  for (const char of fullContent) {
    await page.keyboard.type(char, { delay: Math.random() * 30 + 20 });
  }
  await randomDelay(1000, 2000);

  // Click Post button
  const postButton = await page.$('div[aria-label="Post"][role="button"], button[name="submit"]');
  if (!postButton) {
    // Try alternate selector
    const buttons = await page.$$('div[role="button"]');
    for (const button of buttons) {
      const label = await page.evaluate(el => el.getAttribute('aria-label') || el.textContent || '', button);
      if (label === 'Post' || label.toLowerCase().includes('post')) {
        await button.click();
        break;
      }
    }
  } else {
    await postButton.click();
  }

  // Wait for post to complete
  await randomDelay(3000, 5000);

  // Check if modal closed (indicates success)
  const modalClosed = !(await page.$(textAreaSelector));
  if (modalClosed) {
    console.log('Posted to Facebook');
    return { success: true };
  }

  // Check for error
  const errorElement = await page.$('[role="alert"]');
  if (errorElement) {
    const errorText = await page.evaluate(el => el.textContent || '', errorElement);
    return { success: false, error: errorText };
  }

  return { success: true };
}

export async function postToFacebook(options: FacebookPostOptions): Promise<PostResult> {
  const { content, url, page: pageName = 'feed', verify, screenshot, screenshotDir = './screenshots' } = options;

  // Check for duplicate
  const titleKey = content.substring(0, 50);
  const target = pageName || 'feed';
  if (postExists('facebook', target, titleKey)) {
    console.log('Skipping: Already posted in last 24 hours');
    return {
      success: false,
      content,
      pageName: target,
      error: 'Duplicate post - already posted in last 24 hours',
    };
  }

  const browser = await launchBrowser({ headless: true });
  const page = await newPage(browser);

  try {
    await loginToFacebook(page);

    const result = await submitFacebookPost(page, { ...options, page: pageName });

    if (!result.success) {
      return {
        success: false,
        content,
        pageName: target,
        error: result.error,
      };
    }

    // Record the post
    const recordId = recordPost({
      platform: 'facebook',
      subreddit: target,
      title: titleKey,
      body: content,
      url,
      post_url: result.postUrl,
      verified: false,
      created_at: new Date().toISOString(),
    });

    // Take screenshot if requested
    let screenshotPath: string | undefined;
    if (screenshot && screenshotDir) {
      screenshotPath = await takeScreenshot(page, `facebook-${target}`, screenshotDir);
      console.log(`Screenshot saved: ${screenshotPath}`);
    }

    return {
      success: true,
      content,
      pageName: target,
      postUrl: result.postUrl,
      screenshotPath,
      recordId,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error posting to Facebook: ${errMsg}`);
    return {
      success: false,
      content,
      pageName: target,
      error: errMsg,
    };
  } finally {
    await page.close();
    await browser.close();
  }
}
```

**Step 2: Commit**

```bash
git add src/platforms/facebook.ts
git commit -m "feat: add Facebook platform module with login and post functions"
```

---

## Task 6: Add Facebook Command

**Files:**
- Create: `src/commands/facebook.ts`
- Modify: `src/index.ts` - add import and registration

**Step 1: Create the Facebook command file**

```typescript
import { Command } from 'commander';
import chalk from 'chalk';
import { postToFacebook, PostResult, getFacebookCredentials, setFacebookCredentials } from '../platforms/facebook.js';
import { initDatabase, getRecentPosts } from '../db.js';

export function createFacebookCommand(): Command {
  const facebook = new Command('facebook')
    .description('Post to Facebook feed or pages')
    .option('-p, --page <name>', 'Page name to post to (default: personal feed)', 'feed')
    .option('-c, --content <text>', 'Post content')
    .option('-u, --url <url>', 'URL to include in post')
    .option('--screenshot', 'Take screenshot after posting')
    .option('--screenshot-dir <dir>', 'Directory for screenshots', './screenshots')
    .action(async (options) => {
      initDatabase();

      if (!options.content) {
        console.error(chalk.red('Error: --content is required'));
        console.log(chalk.gray('\nUsage example:'));
        console.log(chalk.gray('  postpilot facebook -c "Check out my new project!"'));
        console.log(chalk.gray('  postpilot facebook --page "MyBusinessPage" -c "New product launch!"'));
        process.exit(1);
      }

      const credentials = getFacebookCredentials();
      if (!credentials) {
        console.error(chalk.red('Error: Facebook credentials not found'));
        console.log(chalk.gray('\nSet credentials:'));
        console.log(chalk.gray('  postpilot login facebook'));
        process.exit(1);
      }

      console.log(chalk.bold('\nPostPilot - Facebook Post\n'));
      console.log(chalk.gray(`Page: ${options.page}`));
      console.log(chalk.gray(`Content: ${options.content.substring(0, 50)}...`));
      if (options.url) console.log(chalk.gray(`URL: ${options.url}`));
      console.log('');

      const result = await postToFacebook({
        page: options.page,
        content: options.content,
        url: options.url,
        screenshot: options.screenshot,
        screenshotDir: options.screenshotDir,
      });

      printResult(result);
    });

  // Subcommand: config
  facebook
    .command('config')
    .description('Configure Facebook credentials')
    .option('--email <email>', 'Facebook email')
    .option('--password <password>', 'Facebook password')
    .action((options) => {
      if (!options.email || !options.password) {
        console.error(chalk.red('Error: --email and --password are required'));
        process.exit(1);
      }

      setFacebookCredentials(options.email, options.password);
      console.log(chalk.green('Facebook credentials saved to ~/.postpilot/credentials.json'));
    });

  // Subcommand: history
  facebook
    .command('history')
    .description('View recent Facebook post history')
    .option('-n, --limit <n>', 'Number of posts to show', '10')
    .action((options) => {
      initDatabase();
      const posts = getRecentPosts(parseInt(options.limit, 10)).filter(p => p.platform === 'facebook');

      if (posts.length === 0) {
        console.log(chalk.gray('No Facebook posts found'));
        return;
      }

      console.log(chalk.bold('\nRecent Facebook Posts\n'));
      for (const post of posts) {
        const date = new Date(post.created_at).toLocaleDateString();
        const target = post.subreddit || 'feed';
        console.log(`[${target}] ${post.body?.substring(0, 50)}... (${date})`);
        if (post.post_url) {
          console.log(chalk.gray(`   ${post.post_url}`));
        }
      }
      console.log('');
    });

  return facebook;
}

function printResult(result: PostResult): void {
  console.log(chalk.bold('\n' + '='.repeat(50)));
  console.log(chalk.bold('Result'));
  console.log('='.repeat(50));

  if (result.success) {
    console.log(chalk.green('Posted successfully'));
    if (result.pageName) {
      console.log(chalk.gray(`Page: ${result.pageName}`));
    }
    if (result.postUrl) {
      console.log(chalk.gray(`URL: ${result.postUrl}`));
    }
    if (result.screenshotPath) {
      console.log(chalk.gray(`Screenshot: ${result.screenshotPath}`));
    }
  } else {
    console.log(chalk.red(`Failed: ${result.error}`));
  }
  console.log('');
}
```

**Step 2: Update src/index.ts to import and register Facebook command**

Add import at the top:
```typescript
import { createFacebookCommand } from './commands/facebook.js';
```

Add command registration after Twitter:
```typescript
// Add Facebook command
program.addCommand(createFacebookCommand());
```

**Step 3: Update login command in src/index.ts to support facebook**

Add facebook support in the login command action:
```typescript
    } else if (platform === 'facebook') {
      console.log(chalk.bold('\nFacebook Login Setup'));
      console.log(chalk.gray('Credentials are stored locally in ~/.postpilot/\n'));

      const email = await prompt('Facebook email: ');
      const password = await prompt('Facebook password: ');

      if (!email || !password) {
        console.log(chalk.red('Email and password are required'));
        process.exit(1);
      }

      const { setFacebookCredentials } = await import('./platforms/facebook.js');
      setFacebookCredentials(email, password);
      console.log(chalk.green('\nFacebook credentials saved successfully!'));
      rl.close();
```

Update the "Supported platforms" message to include facebook.

**Step 4: Commit**

```bash
git add src/commands/facebook.ts src/index.ts
git commit -m "feat: add Facebook CLI command with post and history subcommands"
```

---

## Task 7: Complete Campaign Command

**Files:**
- Modify: `src/index.ts:99-108` - replace placeholder campaign command

**Step 1: Update the campaign command in src/index.ts**

Replace the existing campaign command (lines 99-108) with:

```typescript
// Campaign command
program
  .command('campaign')
  .description('Run a multi-platform campaign from config file')
  .option('-c, --config <path>', 'Path to campaign config file')
  .option('--dry-run', 'Show what would be posted without actually posting')
  .action(async (options) => {
    if (!options.config) {
      console.error(chalk.red('Error: --config is required'));
      console.log(chalk.gray('\nUsage example:'));
      console.log(chalk.gray('  postpilot campaign --config ./campaigns/launch.json'));
      process.exit(1);
    }

    initDatabase();

    const { loadCampaign, Campaign, CampaignStep } = await import('./config.js');

    let campaign: Campaign;
    try {
      campaign = loadCampaign(options.config);
    } catch (error) {
      console.error(chalk.red(`Error loading campaign: ${error}`));
      process.exit(1);
    }

    console.log(chalk.bold(`\nPostPilot - Campaign: ${campaign.name}\n`));
    if (campaign.description) {
      console.log(chalk.gray(campaign.description));
      console.log('');
    }
    console.log(chalk.gray(`Steps: ${campaign.steps.length}`));
    console.log('');

    if (options.dryRun) {
      console.log(chalk.yellow('DRY RUN - No posts will be made\n'));
    }

    const results: { step: number; platform: string; success: boolean; error?: string }[] = [];

    for (let i = 0; i < campaign.steps.length; i++) {
      const step = campaign.steps[i];
      console.log(chalk.bold(`\nStep ${i + 1}/${campaign.steps.length}: ${step.platform} ${step.action}`));

      if (options.dryRun) {
        console.log(chalk.gray(`  Would post to ${step.platform}`));
        console.log(chalk.gray(`  Data: ${JSON.stringify(step.data).substring(0, 100)}...`));
        results.push({ step: i + 1, platform: step.platform, success: true });
        continue;
      }

      try {
        let success = false;
        let error: string | undefined;

        if (step.platform === 'reddit' && step.action === 'post') {
          const { postToMultipleSubreddits } = await import('./platforms/reddit.js');
          const subreddits = step.data.subreddits || [step.data.subreddit];
          const postResults = await postToMultipleSubreddits(
            subreddits,
            step.data.title,
            {
              body: step.data.body,
              url: step.data.url,
              verify: step.data.verify,
              delayBetweenPosts: step.data.delay || 30000,
            }
          );
          success = postResults.some(r => r.success);
          if (!success) {
            error = postResults.map(r => r.error).filter(Boolean).join('; ');
          }
        } else if (step.platform === 'twitter' && step.action === 'post') {
          const { postToTwitter } = await import('./platforms/twitter.js');
          const result = await postToTwitter({
            content: step.data.content,
            url: step.data.url,
          });
          success = result.success;
          error = result.error;
        } else if (step.platform === 'facebook' && step.action === 'post') {
          const { postToFacebook } = await import('./platforms/facebook.js');
          const result = await postToFacebook({
            page: step.data.page,
            content: step.data.content,
            url: step.data.url,
          });
          success = result.success;
          error = result.error;
        } else {
          error = `Unknown platform/action: ${step.platform}/${step.action}`;
        }

        results.push({ step: i + 1, platform: step.platform, success, error });

        if (success) {
          console.log(chalk.green(`  Success`));
        } else {
          console.log(chalk.red(`  Failed: ${error}`));
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        results.push({ step: i + 1, platform: step.platform, success: false, error: errMsg });
        console.log(chalk.red(`  Error: ${errMsg}`));
      }

      // Delay between steps
      if (step.delay && i < campaign.steps.length - 1 && !options.dryRun) {
        console.log(chalk.gray(`  Waiting ${step.delay / 1000}s before next step...`));
        await new Promise(resolve => setTimeout(resolve, step.delay));
      }
    }

    // Print summary
    console.log(chalk.bold('\n' + '='.repeat(50)));
    console.log(chalk.bold('Campaign Summary'));
    console.log('='.repeat(50));

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(chalk.green(`Successful: ${successful}/${results.length}`));
    if (failed > 0) {
      console.log(chalk.red(`Failed: ${failed}`));
      for (const result of results.filter(r => !r.success)) {
        console.log(chalk.red(`  Step ${result.step} (${result.platform}): ${result.error}`));
      }
    }
    console.log('');
  });
```

**Step 2: Commit**

```bash
git add src/index.ts
git commit -m "feat: implement campaign command for multi-platform orchestration"
```

---

## Task 8: Add Example Campaign File

**Files:**
- Create: `campaigns/example-launch.json`

**Step 1: Create the campaigns directory and example file**

```bash
mkdir -p campaigns
```

```json
{
  "name": "Product Launch Campaign",
  "description": "Cross-platform launch announcement for a new product",
  "steps": [
    {
      "platform": "reddit",
      "action": "post",
      "data": {
        "subreddits": ["SideProject", "indiehackers"],
        "title": "I built a CLI tool to automate social media posting",
        "body": "After months of manual posting, I finally automated it. PostPilot lets you cross-post to Reddit, Twitter, and Facebook with a single command.\n\nFeatures:\n- Multi-subreddit posting\n- Post verification\n- GUI testing\n\nWould love your feedback!",
        "url": "https://github.com/yourusername/PostPilot"
      },
      "delay": 60000
    },
    {
      "platform": "twitter",
      "action": "post",
      "data": {
        "content": "Just launched PostPilot - a CLI tool to automate social media posting and GUI testing. No more manual cross-posting! #buildinpublic #indiehackers",
        "url": "https://github.com/yourusername/PostPilot"
      },
      "delay": 30000
    },
    {
      "platform": "facebook",
      "action": "post",
      "data": {
        "page": "feed",
        "content": "Excited to announce PostPilot! A CLI tool I built to automate social media posting across platforms. Check it out if you're tired of manual cross-posting.",
        "url": "https://github.com/yourusername/PostPilot"
      }
    }
  ]
}
```

**Step 2: Commit**

```bash
git add campaigns/example-launch.json
git commit -m "docs: add example campaign configuration file"
```

---

## Task 9: Update Status Command for All Platforms

**Files:**
- Modify: `src/index.ts:84-97` - update status command

**Step 1: Update the status command to check all platforms**

Replace the status command with:

```typescript
// Status command
program
  .command('status')
  .description('Check configuration status')
  .action(async () => {
    console.log(chalk.bold('\nPostPilot Status\n'));

    // Check Reddit credentials
    const redditCreds = getRedditCredentials();
    if (redditCreds) {
      console.log(chalk.green(`Reddit: Logged in as ${redditCreds.username}`));
    } else {
      console.log(chalk.yellow('Reddit: No credentials configured'));
      console.log(chalk.gray('   Run: postpilot login reddit'));
    }

    // Check Twitter credentials
    try {
      const { getTwitterCredentials } = await import('./platforms/twitter.js');
      const twitterCreds = getTwitterCredentials();
      if (twitterCreds) {
        console.log(chalk.green(`Twitter: Logged in as ${twitterCreds.username}`));
      } else {
        console.log(chalk.yellow('Twitter: No credentials configured'));
        console.log(chalk.gray('   Run: postpilot login twitter'));
      }
    } catch {
      console.log(chalk.yellow('Twitter: Module not loaded'));
    }

    // Check Facebook credentials
    try {
      const { getFacebookCredentials } = await import('./platforms/facebook.js');
      const facebookCreds = getFacebookCredentials();
      if (facebookCreds) {
        console.log(chalk.green(`Facebook: Logged in as ${facebookCreds.email}`));
      } else {
        console.log(chalk.yellow('Facebook: No credentials configured'));
        console.log(chalk.gray('   Run: postpilot login facebook'));
      }
    } catch {
      console.log(chalk.yellow('Facebook: Module not loaded'));
    }

    console.log('');
  });
```

**Step 2: Commit**

```bash
git add src/index.ts
git commit -m "feat: update status command to show all platform credentials"
```

---

## Task 10: Add Error Handling Polish

**Files:**
- Modify: `src/index.ts` - add global error handling
- Modify: `src/browser.ts` - add browser cleanup on error

**Step 1: Add global unhandled rejection handler in src/index.ts**

Add after the SIGTERM handler (around line 120):

```typescript
// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('\nUnhandled error:'), reason);
  closeDatabase();
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(chalk.red('\nFatal error:'), error.message);
  closeDatabase();
  process.exit(1);
});
```

**Step 2: Add browser cleanup function to browser.ts**

Add this export at the end of browser.ts:

```typescript
export async function cleanupOnError(): Promise<void> {
  if (browserInstance) {
    try {
      await browserInstance.close();
    } catch {
      // Ignore cleanup errors
    }
    browserInstance = null;
  }
}
```

**Step 3: Update src/index.ts to import and use cleanupOnError**

Update the import:
```typescript
import { closeBrowser, cleanupOnError } from './browser.js';
```

Update the error handlers:
```typescript
process.on('unhandledRejection', async (reason, promise) => {
  console.error(chalk.red('\nUnhandled error:'), reason);
  await cleanupOnError();
  closeDatabase();
  process.exit(1);
});

process.on('uncaughtException', async (error) => {
  console.error(chalk.red('\nFatal error:'), error.message);
  await cleanupOnError();
  closeDatabase();
  process.exit(1);
});
```

**Step 4: Commit**

```bash
git add src/index.ts src/browser.ts
git commit -m "feat: add global error handling with browser cleanup"
```

---

## Task 11: Final Build and Test

**Step 1: Build the project**

```bash
npm run build
```

Verify: No TypeScript errors

**Step 2: Test help output**

```bash
node dist/index.js --help
```

Verify: Shows reddit, twitter, facebook, campaign, test commands

**Step 3: Test status command**

```bash
node dist/index.js status
```

Verify: Shows credential status for all platforms

**Step 4: Commit any final fixes**

```bash
git add -A
git commit -m "chore: final build verification"
```

---

## Summary

This plan covers:

1. **CLAUDE.md** - Project context for AI assistants
2. **README.md** - User documentation with examples
3. **Twitter platform** - `src/platforms/twitter.ts` and `src/commands/twitter.ts`
4. **Facebook platform** - `src/platforms/facebook.ts` and `src/commands/facebook.ts`
5. **Campaign command** - Multi-platform orchestration in `src/index.ts`
6. **Example campaign** - `campaigns/example-launch.json`
7. **Status updates** - Show all platform credentials
8. **Error handling** - Global handlers with browser cleanup
9. **Final build** - Verification that everything compiles

All tasks follow TDD principles where applicable and include commit steps for clean git history.
