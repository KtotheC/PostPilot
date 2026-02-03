import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { Browser, Page, CookieParam } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

puppeteer.use(StealthPlugin());

// Get Chrome user data directory by OS
export function getChromeUserDataDir(): string {
  const platform = os.platform();
  const home = os.homedir();
  
  if (platform === 'darwin') {
    return path.join(home, 'Library/Application Support/Google/Chrome');
  } else if (platform === 'win32') {
    return path.join(home, 'AppData/Local/Google/Chrome/User Data');
  } else {
    return path.join(home, '.config/google-chrome');
  }
}

// Get PostPilot's own Chrome profile directory (copy of user's profile)
export function getPostPilotProfileDir(): string {
  const home = os.homedir();
  return path.join(home, '.postpilot', 'chrome-profile');
}

// Copy Chrome profile for PostPilot use (one-time setup)
export async function setupChromeProfile(): Promise<string> {
  const sourceDir = getChromeUserDataDir();
  const targetDir = getPostPilotProfileDir();
  
  // Check if Chrome profile exists
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Chrome user data not found at ${sourceDir}`);
  }
  
  // Create target directory
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  
  // Copy essential profile files (cookies, login data, etc.)
  const filesToCopy = [
    'Default/Cookies',
    'Default/Login Data',
    'Default/Web Data',
    'Default/Preferences',
    'Local State',
  ];
  
  for (const file of filesToCopy) {
    const sourcePath = path.join(sourceDir, file);
    const targetPath = path.join(targetDir, file);
    
    if (fs.existsSync(sourcePath)) {
      const targetFolder = path.dirname(targetPath);
      if (!fs.existsSync(targetFolder)) {
        fs.mkdirSync(targetFolder, { recursive: true });
      }
      try {
        fs.copyFileSync(sourcePath, targetPath);
      } catch (err) {
        // File might be locked, skip it
        console.warn(`⚠️  Could not copy ${file} (may be locked)`);
      }
    }
  }
  
  return targetDir;
}

// Chrome cookie paths by OS (legacy)
function getChromeCookiePath(): string {
  const platform = os.platform();
  const home = os.homedir();
  
  if (platform === 'darwin') {
    return path.join(home, 'Library/Application Support/Google/Chrome/Default/Cookies');
  } else if (platform === 'win32') {
    return path.join(home, 'AppData/Local/Google/Chrome/User Data/Default/Cookies');
  } else {
    return path.join(home, '.config/google-chrome/Default/Cookies');
  }
}

// Load cookies for a specific domain from Chrome
export async function loadChromeCookies(domain: string): Promise<CookieParam[]> {
  try {
    // Try to use chrome-cookies-secure if available
    const chromeCookies = await import('chrome-cookies-secure');
    
    return new Promise((resolve, reject) => {
      chromeCookies.getCookies(`https://${domain}/`, 'puppeteer', (err: Error | null, cookies: any[]) => {
        if (err) {
          console.warn(`⚠️  Could not load Chrome cookies for ${domain}: ${err.message}`);
          resolve([]);
        } else {
          // Map to puppeteer cookie format
          const mappedCookies: CookieParam[] = (cookies || []).map((c: any) => ({
            name: c.name,
            value: c.value,
            domain: c.domain,
            path: c.path,
            expires: c.expires,
            httpOnly: c.httpOnly,
            secure: c.secure,
            sameSite: c.sameSite as 'Strict' | 'Lax' | 'None' | undefined,
          }));
          resolve(mappedCookies);
        }
      });
    });
  } catch (error) {
    console.warn('⚠️  Chrome cookie extraction not available. Using manual login.');
    return [];
  }
}

// Apply cookies to a page
export async function applyCookiesToPage(page: Page, cookies: CookieParam[]): Promise<void> {
  if (cookies.length > 0) {
    await page.setCookie(...cookies);
  }
}

// Check if user is logged in on a page
export async function checkLoggedIn(page: Page, platform: 'reddit' | 'twitter' | 'facebook'): Promise<boolean> {
  const selectors: Record<string, string[]> = {
    reddit: ['header [data-testid="user-menu-button"]', 'a[href*="/user/"]'],
    twitter: ['a[href="/home"]', '[data-testid="SideNav_AccountSwitcher_Button"]'],
    facebook: ['div[role="navigation"] a[href*="/me"]', '[aria-label="Your profile"]'],
  };

  for (const selector of selectors[platform]) {
    try {
      const element = await page.$(selector);
      if (element) return true;
    } catch {}
  }
  return false;
}

// Auto-login using Chrome profile or cookies
export async function autoLoginWithCookies(page: Page, platform: 'reddit' | 'twitter' | 'facebook'): Promise<boolean> {
  const urls: Record<string, string> = {
    reddit: 'https://www.reddit.com',
    twitter: 'https://twitter.com',
    facebook: 'https://www.facebook.com',
  };

  console.log(`🔐 Checking ${platform} login status...`);
  
  // Navigate to the site
  await page.goto(urls[platform], { waitUntil: 'networkidle2' });
  await sleep(2000);
  
  // Check if logged in (browser might have profile cookies)
  const loggedIn = await checkLoggedIn(page, platform);
  
  if (loggedIn) {
    console.log(`✅ Already logged into ${platform}`);
    return true;
  }
  
  // Try loading cookies from Chrome if not logged in
  console.log(`🍪 Trying Chrome cookies for ${platform}...`);
  
  const domains: Record<string, string> = {
    reddit: 'reddit.com',
    twitter: 'twitter.com',
    facebook: 'facebook.com',
  };
  
  try {
    const cookies = await loadChromeCookies(domains[platform]);
    
    if (cookies.length > 0) {
      console.log(`📦 Found ${cookies.length} cookies`);
      await applyCookiesToPage(page, cookies);
      
      // Reload and check again
      await page.goto(urls[platform], { waitUntil: 'networkidle2' });
      await sleep(2000);
      
      const loggedInNow = await checkLoggedIn(page, platform);
      if (loggedInNow) {
        console.log(`✅ Logged into ${platform} via cookies`);
        return true;
      }
    }
  } catch (err) {
    // Cookie extraction might fail if Chrome is open
  }
  
  console.log(`⚠️  Not logged into ${platform}. Manual login required.`);
  return false;
}

export interface BrowserOptions {
  headless?: boolean;
  slowMo?: number;
  userDataDir?: string;
}

let browserInstance: Browser | null = null;

export async function launchBrowser(options: BrowserOptions = {}): Promise<Browser> {
  if (browserInstance) {
    return browserInstance;
  }

  const { headless = true, slowMo = 0, userDataDir } = options;

  browserInstance = await puppeteer.launch({
    headless: headless ? 'shell' : false,
    slowMo,
    userDataDir,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1920,1080',
    ],
    defaultViewport: {
      width: 1920,
      height: 1080,
    },
  });

  return browserInstance;
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

// Launch browser with Chrome profile (uses your existing logins)
export async function launchBrowserWithProfile(options: BrowserOptions = {}): Promise<Browser> {
  if (browserInstance) {
    return browserInstance;
  }

  const { headless = true, slowMo = 0 } = options;
  const chromeUserDataDir = getChromeUserDataDir();
  
  // Check if Chrome profile exists
  if (!fs.existsSync(chromeUserDataDir)) {
    console.warn('⚠️  Chrome profile not found, using fresh browser');
    return launchBrowser(options);
  }

  console.log('🔗 Launching browser with Chrome profile...');
  
  try {
    browserInstance = await puppeteer.launch({
      headless: headless ? 'shell' : false,
      slowMo,
      // Use Chrome profile directly
      userDataDir: chromeUserDataDir,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-infobars',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1920,1080',
        // Use a different profile to avoid conflicts with running Chrome
        '--profile-directory=PostPilot',
      ],
      defaultViewport: {
        width: 1920,
        height: 1080,
      },
    });
    
    console.log('✅ Browser launched with Chrome profile');
    return browserInstance;
  } catch (error) {
    console.warn('⚠️  Could not use Chrome profile, falling back to fresh browser');
    return launchBrowser(options);
  }
}

export async function newPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });
  });

  return page;
}

export async function randomDelay(min: number = 500, max: number = 2000): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  await new Promise(resolve => setTimeout(resolve, delay));
}

export async function humanType(page: Page, selector: string, text: string): Promise<void> {
  await page.waitForSelector(selector);
  await page.click(selector);

  for (const char of text) {
    await page.type(selector, char, { delay: Math.random() * 100 + 50 });
  }
}

export async function waitAndClick(page: Page, selector: string, timeout: number = 10000): Promise<void> {
  await page.waitForSelector(selector, { timeout });
  await randomDelay(200, 500);
  await page.click(selector);
}

export async function safeClick(page: Page, selector: string): Promise<boolean> {
  try {
    const element = await page.$(selector);
    if (element) {
      await element.click();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function takeScreenshot(page: Page, name: string, dir: string = './screenshots'): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${name}-${timestamp}.png`;
  const filepath = `${dir}/${filename}`;

  await page.screenshot({ path: filepath, fullPage: false });
  return filepath;
}

export async function waitForNavigation(page: Page, timeout: number = 30000): Promise<void> {
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout });
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function humanSleep(baseMs: number, variation = 0.3): Promise<void> {
  const min = baseMs * (1 - variation);
  const max = baseMs * (1 + variation);
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  await sleep(delay);
}

export async function scrollToElement(page: Page, selector: string): Promise<void> {
  await page.waitForSelector(selector);
  await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, selector);
  await sleep(500);
}

export async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.connected) {
    browserInstance = await launchBrowser();
  }
  return browserInstance;
}
