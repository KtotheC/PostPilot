import type { Browser, Page } from 'puppeteer';
import {
  launchBrowser,
  newPage,
  randomDelay,
  humanType,
  takeScreenshot,
  sleep,
  humanSleep,
} from '../browser.js';
import { getFacebookCredentials } from '../config.js';
import { recordPost, updatePostVerification, postExists } from '../db.js';

export interface FacebookPostOptions {
  content: string;
  page?: string; // Page name or 'feed' for personal feed
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

export async function loginToFacebook(page: Page): Promise<boolean> {
  const credentials = getFacebookCredentials();

  if (!credentials) {
    throw new Error('Facebook credentials not found. Set FACEBOOK_EMAIL and FACEBOOK_PASSWORD in .env or use postpilot login facebook');
  }

  console.log('🔐 Logging into Facebook...');

  await page.goto(LOGIN_URL, { waitUntil: 'networkidle2' });
  await randomDelay(1500, 2500);

  // Check if already logged in
  const homeButton = await page.$('a[href="/"]');
  const createPost = await page.$('div[role="button"][aria-label*="Create"]');
  if (createPost) {
    console.log('✅ Already logged in');
    return true;
  }

  // Enter email
  const emailInput = await page.$('input[name="email"]');
  if (emailInput) {
    await emailInput.click();
    await humanType(page, 'input[name="email"]', credentials.email);
    await randomDelay(300, 600);
  }

  // Enter password
  const passwordInput = await page.$('input[name="pass"]');
  if (passwordInput) {
    await passwordInput.click();
    await humanType(page, 'input[name="pass"]', credentials.password);
    await randomDelay(300, 600);
  }

  // Click login button
  const loginButton = await page.$('button[name="login"]');
  if (loginButton) {
    await loginButton.click();
  }

  // Wait for navigation
  await randomDelay(3000, 5000);

  // Check for 2FA
  const twoFactorInput = await page.$('input[name="approvals_code"]');
  if (twoFactorInput) {
    throw new Error('Facebook requires 2FA. Please log in manually first or disable 2FA.');
  }

  // Check for checkpoint
  const checkpoint = await page.$('form[action*="checkpoint"]');
  if (checkpoint) {
    throw new Error('Facebook requires identity verification. Please log in manually first.');
  }

  // Verify login success
  await page.goto(FACEBOOK_URL, { waitUntil: 'networkidle2' });
  await randomDelay(1500, 2500);

  const createPostAfterLogin = await page.$('div[role="button"][aria-label*="Create"]');
  if (createPostAfterLogin) {
    console.log('✅ Login successful');
    return true;
  }

  throw new Error('Login failed: Could not verify login success');
}

export async function submitFacebookPost(page: Page, options: FacebookPostOptions): Promise<{ success: boolean; postUrl?: string; error?: string }> {
  const { content, page: pageName, url } = options;

  console.log(`📤 Posting to Facebook${pageName && pageName !== 'feed' ? ` page "${pageName}"` : ' feed'}...`);

  // If posting to a page, navigate there first
  if (pageName && pageName !== 'feed') {
    await page.goto(`${FACEBOOK_URL}/${pageName}`, { waitUntil: 'networkidle2' });
    await randomDelay(2000, 3000);
  } else {
    await page.goto(FACEBOOK_URL, { waitUntil: 'networkidle2' });
    await randomDelay(1500, 2500);
  }

  // Find and click the "What's on your mind" or create post button
  const createPostSelectors = [
    'div[role="button"][aria-label*="Create"]',
    'div[aria-label="Create a post"]',
    'span:has-text("What\'s on your mind")',
    'div[data-pagelet="FeedComposer"] div[role="button"]',
  ];

  let clicked = false;
  for (const selector of createPostSelectors) {
    try {
      const element = await page.$(selector);
      if (element) {
        await element.click();
        clicked = true;
        break;
      }
    } catch {}
  }

  if (!clicked) {
    throw new Error('Could not find create post button');
  }

  await randomDelay(1500, 2500);

  // Find the text input area
  const textInputSelectors = [
    'div[contenteditable="true"][role="textbox"]',
    'div[aria-label*="What\'s on your mind"]',
    'div[data-lexical-editor="true"]',
  ];

  let textArea = null;
  for (const selector of textInputSelectors) {
    textArea = await page.$(selector);
    if (textArea) break;
  }

  if (!textArea) {
    throw new Error('Could not find post text area');
  }

  await textArea.click();
  await randomDelay(300, 500);

  // Type content
  let fullContent = content;
  if (url) {
    fullContent = `${content}\n\n${url}`;
  }

  for (const char of fullContent) {
    await page.keyboard.type(char, { delay: Math.random() * 30 + 20 });
  }
  await randomDelay(1000, 2000);

  // Click Post button
  const postButtonSelectors = [
    'div[aria-label="Post"][role="button"]',
    'span:has-text("Post")',
    'button[type="submit"]',
  ];

  let postClicked = false;
  for (const selector of postButtonSelectors) {
    try {
      const button = await page.$(selector);
      if (button) {
        await button.click();
        postClicked = true;
        break;
      }
    } catch {}
  }

  if (!postClicked) {
    // Try keyboard shortcut
    await page.keyboard.down('Control');
    await page.keyboard.press('Enter');
    await page.keyboard.up('Control');
  }

  // Wait for post to be submitted
  await randomDelay(3000, 5000);

  console.log(`✅ Posted to Facebook`);
  return { success: true };
}

export async function postToFacebook(options: FacebookPostOptions): Promise<PostResult> {
  const { content, page: pageName = 'feed', url, screenshot, screenshotDir = './screenshots' } = options;

  // Check for duplicate
  const titleKey = content.substring(0, 50);
  const target = pageName || 'feed';
  if (postExists('facebook', target, titleKey)) {
    console.log('⚠️  Skipping: Already posted in last 24 hours');
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

    const result = await submitFacebookPost(page, options);

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
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
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
    console.error(`❌ Error posting to Facebook: ${errMsg}`);
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
