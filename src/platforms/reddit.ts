import type { Browser, Page } from 'puppeteer';
import {
  launchBrowser,
  launchBrowserWithProfile,
  newPage,
  randomDelay,
  humanType,
  waitAndClick,
  takeScreenshot,
  sleep,
  humanSleep,
  scrollToElement,
  autoLoginWithCookies,
} from '../browser.js';
import { getRedditCredentials } from '../config.js';
import { recordPost, updatePostVerification, postExists } from '../db.js';

export interface RedditPostOptions {
  subreddit: string;
  title: string;
  body?: string;
  url?: string;
  flair?: string;
  verify?: boolean;
  screenshot?: boolean;
  screenshotDir?: string;
}

export interface PostResult {
  success: boolean;
  subreddit: string;
  title: string;
  postUrl?: string;
  verified?: boolean;
  screenshotPath?: string;
  error?: string;
  recordId?: number;
}

const REDDIT_URL = 'https://www.reddit.com';
const LOGIN_URL = 'https://www.reddit.com/login';

export async function loginToReddit(page: Page): Promise<boolean> {
  console.log('🔐 Logging into Reddit...');

  // Try cookie-based auth first (for Google OAuth users)
  const cookieLogin = await autoLoginWithCookies(page, 'reddit');
  if (cookieLogin) {
    return true;
  }

  // Fall back to username/password
  const credentials = getRedditCredentials();
  if (!credentials) {
    throw new Error('Reddit credentials not found and Chrome cookies unavailable. Run: postpilot login reddit');
  }

  await page.goto(LOGIN_URL, { waitUntil: 'networkidle2' });
  await randomDelay(1000, 2000);

  // Check if already logged in
  const loggedIn = await page.$('header [data-testid="user-menu-button"]');
  if (loggedIn) {
    console.log('✅ Already logged in');
    return true;
  }

  // Type username
  const usernameSelector = 'input[name="username"]';
  await page.waitForSelector(usernameSelector);
  await humanType(page, usernameSelector, credentials.username);
  await randomDelay(300, 600);

  // Type password
  const passwordSelector = 'input[name="password"]';
  await humanType(page, passwordSelector, credentials.password);
  await randomDelay(300, 600);

  // Click login button
  const loginButtonSelector = 'button[type="submit"]';
  await page.click(loginButtonSelector);

  // Wait for navigation or error
  try {
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
    await randomDelay(2000, 3000);

    // Check for 2FA
    const twoFactorInput = await page.$('input[name="otp"]');
    if (twoFactorInput) {
      throw new Error('2FA is enabled on this account. Please disable it or use a different account.');
    }

    // Verify login success
    const userMenu = await page.$('header [data-testid="user-menu-button"]');
    if (userMenu) {
      console.log('✅ Login successful');
      return true;
    }

    // Check for error messages
    const errorElement = await page.$('[data-testid="login-error"]');
    if (errorElement) {
      const errorText = await page.evaluate(el => el?.textContent || 'Unknown error', errorElement);
      throw new Error(`Login failed: ${errorText}`);
    }

    throw new Error('Login failed: Could not verify login success');
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    if (errMsg.includes('Navigation timeout')) {
      // Check if we're actually logged in despite timeout
      const userMenu = await page.$('header [data-testid="user-menu-button"]');
      if (userMenu) {
        console.log('✅ Login successful (slow response)');
        return true;
      }
    }
    throw error;
  }
}

export async function submitPost(page: Page, options: RedditPostOptions): Promise<{ success: boolean; postUrl?: string; error?: string }> {
  const { subreddit, title, body, url } = options;

  console.log(`📤 Posting to r/${subreddit}...`);

  const isLinkPost = !!url && !body;
  const submitUrl = `${REDDIT_URL}/r/${subreddit}/submit`;

  await page.goto(submitUrl, { waitUntil: 'networkidle2' });
  await randomDelay(1500, 2500);

  // Check if we need to join the subreddit
  const joinButton = await page.$('button:has-text("Join")');
  if (joinButton) {
    console.log(`📝 Joining r/${subreddit}...`);
    await joinButton.click();
    await randomDelay(1000, 2000);
  }

  // Select post type (link or text)
  if (isLinkPost) {
    const linkTab = await page.$('button[role="tab"]:has-text("Link")');
    if (linkTab) {
      await linkTab.click();
      await randomDelay(500, 1000);
    }
  } else {
    const textTab = await page.$('button[role="tab"]:has-text("Text")');
    if (textTab) {
      await textTab.click();
      await randomDelay(500, 1000);
    }
  }

  // Enter title
  const titleInput = await page.$('textarea[placeholder*="Title"], input[placeholder*="Title"], [data-test-id="post-title"]');
  if (!titleInput) {
    // Try new Reddit UI
    const altTitleInput = await page.$('div[data-placeholder*="Title"] div[contenteditable="true"], textarea[name="title"]');
    if (altTitleInput) {
      await altTitleInput.click();
      await humanType(page, 'textarea[name="title"], div[contenteditable="true"]', title);
    } else {
      throw new Error('Could not find title input field');
    }
  } else {
    await titleInput.click();
    for (const char of title) {
      await page.keyboard.type(char, { delay: Math.random() * 50 + 25 });
    }
  }
  await randomDelay(500, 1000);

  // Enter URL or body
  if (isLinkPost && url) {
    const urlInput = await page.$('input[placeholder*="URL"], textarea[placeholder*="URL"], input[name="url"]');
    if (urlInput) {
      await urlInput.click();
      for (const char of url) {
        await page.keyboard.type(char, { delay: Math.random() * 30 + 15 });
      }
    }
  } else if (body) {
    const bodyInput = await page.$('div[role="textbox"], textarea[placeholder*="Text"], div[data-placeholder*="body"]');
    if (bodyInput) {
      await bodyInput.click();
      for (const char of body) {
        await page.keyboard.type(char, { delay: Math.random() * 30 + 15 });
      }
    }

    // If URL is provided with body, add it at the end
    if (url) {
      await page.keyboard.type(`\n\n${url}`, { delay: 30 });
    }
  }
  await randomDelay(500, 1000);

  // Click submit button
  const submitButton = await page.$('button[type="submit"]:has-text("Post"), button:has-text("Post")');
  if (!submitButton) {
    throw new Error('Could not find submit button');
  }

  await submitButton.click();

  // Wait for navigation to the post
  try {
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 });
    await randomDelay(1000, 2000);

    // Check for error messages
    const errorBanner = await page.$('[class*="error"], [role="alert"]');
    if (errorBanner) {
      const errorText = await page.evaluate(el => el?.textContent || 'Unknown error', errorBanner);
      if (errorText.toLowerCase().includes('error')) {
        return { success: false, error: errorText };
      }
    }

    // Get the post URL
    const currentUrl = page.url();
    if (currentUrl.includes('/comments/')) {
      console.log(`✅ Posted: "${title}"`);
      return { success: true, postUrl: currentUrl };
    }

    // Try to extract post URL from success message
    const postLink = await page.$('a[href*="/comments/"]');
    if (postLink) {
      const href = await page.evaluate(el => el?.getAttribute('href'), postLink);
      if (href) {
        const postUrl = href.startsWith('http') ? href : `${REDDIT_URL}${href}`;
        console.log(`✅ Posted: "${title}"`);
        return { success: true, postUrl };
      }
    }

    console.log(`✅ Posted: "${title}" (URL not captured)`);
    return { success: true };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';

    // Check if we're on the post page despite timeout
    const currentUrl = page.url();
    if (currentUrl.includes('/comments/')) {
      console.log(`✅ Posted: "${title}"`);
      return { success: true, postUrl: currentUrl };
    }

    return { success: false, error: errMsg };
  }
}

export async function verifyPost(
  page: Page,
  subreddit: string,
  title: string,
  screenshotDir?: string
): Promise<{ verified: boolean; postUrl?: string; screenshotPath?: string }> {
  console.log('🔍 Verifying...');

  await humanSleep(5000); // Wait for Reddit to process

  // Check user's profile for the post
  const credentials = getRedditCredentials();
  if (!credentials) {
    return { verified: false };
  }

  const profileUrl = `${REDDIT_URL}/user/${credentials.username}/submitted/?sort=new`;
  await page.goto(profileUrl, { waitUntil: 'networkidle2' });
  await randomDelay(2000, 3000);

  // Look for the post by title
  const posts = await page.$$('article, [data-testid="post-container"], div[data-fullname]');

  for (const post of posts) {
    const postTitle = await page.evaluate(el => {
      const titleEl = el.querySelector('h3, [data-click-id="body"] h3, a[data-click-id="body"]');
      return titleEl?.textContent?.trim() || '';
    }, post);

    if (postTitle.toLowerCase().includes(title.toLowerCase().substring(0, 50))) {
      // Found the post - get its URL
      const postUrl = await page.evaluate(el => {
        const link = el.querySelector('a[href*="/comments/"]');
        return link?.getAttribute('href') || '';
      }, post);

      const fullPostUrl = postUrl.startsWith('http') ? postUrl : `${REDDIT_URL}${postUrl}`;

      // Take screenshot
      let screenshotPath: string | undefined;
      if (screenshotDir) {
        screenshotPath = await takeScreenshot(page, `${subreddit}-verified`, screenshotDir);
        console.log(`📸 Screenshot saved: ${screenshotPath}`);
      }

      console.log(`✅ Verified: ${fullPostUrl}`);
      return { verified: true, postUrl: fullPostUrl, screenshotPath };
    }
  }

  // Try checking the subreddit's new posts
  const newPostsUrl = `${REDDIT_URL}/r/${subreddit}/new`;
  await page.goto(newPostsUrl, { waitUntil: 'networkidle2' });
  await randomDelay(2000, 3000);

  const subredditPosts = await page.$$('article, [data-testid="post-container"], div[data-fullname]');

  for (const post of subredditPosts) {
    const postTitle = await page.evaluate(el => {
      const titleEl = el.querySelector('h3, [data-click-id="body"] h3, a[data-click-id="body"]');
      return titleEl?.textContent?.trim() || '';
    }, post);

    if (postTitle.toLowerCase().includes(title.toLowerCase().substring(0, 50))) {
      const postUrl = await page.evaluate(el => {
        const link = el.querySelector('a[href*="/comments/"]');
        return link?.getAttribute('href') || '';
      }, post);

      const fullPostUrl = postUrl.startsWith('http') ? postUrl : `${REDDIT_URL}${postUrl}`;

      let screenshotPath: string | undefined;
      if (screenshotDir) {
        screenshotPath = await takeScreenshot(page, `${subreddit}-verified`, screenshotDir);
        console.log(`📸 Screenshot saved: ${screenshotPath}`);
      }

      console.log(`✅ Verified: ${fullPostUrl}`);
      return { verified: true, postUrl: fullPostUrl, screenshotPath };
    }
  }

  console.log('❌ Failed: Post not found');
  return { verified: false };
}

export async function postToReddit(options: RedditPostOptions): Promise<PostResult> {
  const { subreddit, title, body, url, verify, screenshot, screenshotDir = './screenshots' } = options;

  // Check for duplicate
  if (postExists('reddit', subreddit, title)) {
    console.log(`⚠️  Skipping r/${subreddit}: Already posted in last 24 hours`);
    return {
      success: false,
      subreddit,
      title,
      error: 'Duplicate post - already posted in last 24 hours',
    };
  }

  const browser = await launchBrowserWithProfile({ headless: true });
  const page = await newPage(browser);

  try {
    await loginToReddit(page);

    const result = await submitPost(page, options);

    if (!result.success) {
      return {
        success: false,
        subreddit,
        title,
        error: result.error,
      };
    }

    // Record the post
    const recordId = recordPost({
      platform: 'reddit',
      subreddit,
      title,
      body,
      url,
      post_url: result.postUrl,
      verified: false,
      created_at: new Date().toISOString(),
    });

    // Verify if requested
    if (verify) {
      const verifyResult = await verifyPost(page, subreddit, title, screenshot ? screenshotDir : undefined);

      updatePostVerification(recordId, verifyResult.verified, verifyResult.postUrl);

      return {
        success: true,
        subreddit,
        title,
        postUrl: verifyResult.postUrl || result.postUrl,
        verified: verifyResult.verified,
        screenshotPath: verifyResult.screenshotPath,
        recordId,
      };
    }

    return {
      success: true,
      subreddit,
      title,
      postUrl: result.postUrl,
      recordId,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Error posting to r/${subreddit}: ${errMsg}`);
    return {
      success: false,
      subreddit,
      title,
      error: errMsg,
    };
  } finally {
    await page.close();
  }
}

export async function postToMultipleSubreddits(
  subreddits: string[],
  title: string,
  options: {
    body?: string;
    url?: string;
    flair?: string;
    verify?: boolean;
    screenshot?: boolean;
    screenshotDir?: string;
    delayBetweenPosts?: number;
  }
): Promise<PostResult[]> {
  const results: PostResult[] = [];
  const {
    body,
    url,
    verify = false,
    screenshot = false,
    screenshotDir = './screenshots',
    delayBetweenPosts = 30000,
  } = options;

  const browser = await launchBrowserWithProfile({ headless: true });
  const page = await newPage(browser);

  try {
    await loginToReddit(page);

    for (let i = 0; i < subreddits.length; i++) {
      const subreddit = subreddits[i].trim();

      if (postExists('reddit', subreddit, title)) {
        console.log(`⚠️  Skipping r/${subreddit}: Already posted in last 24 hours`);
        results.push({
          success: false,
          subreddit,
          title,
          error: 'Duplicate post - already posted in last 24 hours',
        });
        continue;
      }

      try {
        const submitResult = await submitPost(page, { subreddit, title, body, url });

        if (!submitResult.success) {
          results.push({
            success: false,
            subreddit,
            title,
            error: submitResult.error,
          });
          continue;
        }

        // Record the post
        const recordId = recordPost({
          platform: 'reddit',
          subreddit,
          title,
          body,
          url,
          post_url: submitResult.postUrl,
          verified: false,
          created_at: new Date().toISOString(),
        });

        // Verify if requested
        if (verify) {
          const verifyResult = await verifyPost(page, subreddit, title, screenshot ? screenshotDir : undefined);
          updatePostVerification(recordId, verifyResult.verified, verifyResult.postUrl);

          results.push({
            success: true,
            subreddit,
            title,
            postUrl: verifyResult.postUrl || submitResult.postUrl,
            verified: verifyResult.verified,
            screenshotPath: verifyResult.screenshotPath,
            recordId,
          });
        } else {
          results.push({
            success: true,
            subreddit,
            title,
            postUrl: submitResult.postUrl,
            recordId,
          });
        }

        // Delay between posts (except for the last one)
        if (i < subreddits.length - 1) {
          console.log(`⏳ Waiting ${delayBetweenPosts / 1000}s before next post...`);
          await sleep(delayBetweenPosts);
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Error posting to r/${subreddit}: ${errMsg}`);
        results.push({
          success: false,
          subreddit,
          title,
          error: errMsg,
        });
      }
    }

    return results;
  } finally {
    await page.close();
    await browser.close();
  }
}
