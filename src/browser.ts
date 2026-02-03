import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { Browser, Page } from 'puppeteer';

puppeteer.use(StealthPlugin());

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
