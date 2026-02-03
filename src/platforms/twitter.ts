import type { Browser, Page } from 'puppeteer';
import {
  launchBrowser,
  launchBrowserWithProfile,
  newPage,
  randomDelay,
  humanType,
  takeScreenshot,
  sleep,
  humanSleep,
  autoLoginWithCookies,
} from '../browser.js';
import { getTwitterCredentials } from '../config.js';
import { recordPost, updatePostVerification, postExists } from '../db.js';

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

export async function loginToTwitter(page: Page): Promise<boolean> {
  console.log('🔐 Logging into Twitter...');

  // Try cookie-based auth first (for Google OAuth users)
  const cookieLogin = await autoLoginWithCookies(page, 'twitter');
  if (cookieLogin) {
    return true;
  }

  // Fall back to username/password
  const credentials = getTwitterCredentials();
  if (!credentials) {
    throw new Error('Twitter credentials not found and Chrome cookies unavailable. Run: postpilot login twitter');
  }

  await page.goto(LOGIN_URL, { waitUntil: 'networkidle2' });
  await randomDelay(2000, 3000);

  // Check if already logged in
  const homeLink = await page.$('a[href="/home"]');
  if (homeLink) {
    console.log('✅ Already logged in');
    return true;
  }

  // Enter username
  const usernameInput = await page.$('input[autocomplete="username"]');
  if (usernameInput) {
    await usernameInput.click();
    await humanType(page, 'input[autocomplete="username"]', credentials.username);
    await randomDelay(500, 1000);

    // Click next
    const nextButton = await page.$('xpath///*[contains(text(),"Next")]');
    if (nextButton) {
      await nextButton.click();
      await randomDelay(1500, 2500);
    }
  }

  // Enter password
  const passwordInput = await page.$('input[name="password"]');
  if (passwordInput) {
    await passwordInput.click();
    await humanType(page, 'input[name="password"]', credentials.password);
    await randomDelay(500, 1000);

    // Click login
    const loginButton = await page.$('xpath///*[contains(text(),"Log in")]');
    if (loginButton) {
      await loginButton.click();
    }
  }

  // Wait for navigation
  await randomDelay(3000, 5000);

  // Check for verification challenges
  const verificationInput = await page.$('input[data-testid="ocfEnterTextTextInput"]');
  if (verificationInput) {
    throw new Error('Twitter requires additional verification. Please log in manually first.');
  }

  // Verify login success
  const homeAfterLogin = await page.$('a[href="/home"]');
  if (homeAfterLogin) {
    console.log('✅ Login successful');
    return true;
  }

  throw new Error('Login failed: Could not verify login success');
}

export async function submitTweet(page: Page, options: TwitterPostOptions): Promise<{ success: boolean; postUrl?: string; error?: string }> {
  const { content, url } = options;

  console.log('📤 Posting tweet...');

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
          console.log(`✅ Posted tweet`);
          return { success: true, postUrl };
        }
      }
    }
  }

  console.log(`✅ Posted tweet`);
  return { success: true };
}

export async function postToTwitter(options: TwitterPostOptions): Promise<PostResult> {
  const { content, url, screenshot, screenshotDir = './screenshots' } = options;

  // Check for duplicate (using first 50 chars as title)
  const titleKey = content.substring(0, 50);
  if (postExists('twitter', 'twitter', titleKey)) {
    console.log('⚠️  Skipping: Already posted in last 24 hours');
    return {
      success: false,
      content,
      error: 'Duplicate post - already posted in last 24 hours',
    };
  }

  const browser = await launchBrowserWithProfile({ headless: true });
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
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
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
    console.error(`❌ Error posting to Twitter: ${errMsg}`);
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
