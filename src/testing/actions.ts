import { Page } from 'puppeteer';
import { humanType, takeScreenshot, sleep, scrollToElement, randomDelay } from '../browser.js';
import chalk from 'chalk';

export interface TestStep {
  goto?: string;
  click?: string;
  type?: string;
  text?: string;
  waitFor?: string;
  timeout?: number;
  screenshot?: string;
  verify?: string;
  contains?: string;
  wait?: number;
  scroll?: string;
  hover?: string;
  select?: string;
  value?: string;
  press?: string;
  evaluate?: string;
}

export interface StepResult {
  step: TestStep;
  success: boolean;
  duration: number;
  error?: string;
  screenshotPath?: string;
}

/**
 * Execute a single test step
 */
export async function executeStep(
  page: Page,
  step: TestStep,
  baseUrl: string,
  screenshotDir: string
): Promise<StepResult> {
  const startTime = Date.now();
  const result: StepResult = {
    step,
    success: false,
    duration: 0,
  };

  try {
    // GOTO - Navigate to URL
    if (step.goto !== undefined) {
      const url = step.goto.startsWith('http') ? step.goto : `${baseUrl}${step.goto}`;
      await page.goto(url, { waitUntil: 'networkidle2', timeout: step.timeout || 30000 });
      result.success = true;
    }

    // CLICK - Click an element
    else if (step.click !== undefined) {
      const selector = resolveSelector(step.click);
      await page.waitForSelector(selector, { visible: true, timeout: step.timeout || 10000 });
      await randomDelay(100, 300);
      await page.click(selector);
      result.success = true;
    }

    // TYPE - Type text into an input
    else if (step.type !== undefined && step.text !== undefined) {
      const selector = resolveSelector(step.type);
      await page.waitForSelector(selector, { visible: true, timeout: step.timeout || 10000 });
      await page.click(selector);
      await page.evaluate((sel) => {
        const el = document.querySelector(sel) as HTMLInputElement;
        if (el) el.value = '';
      }, selector);
      await humanType(page, selector, step.text);
      result.success = true;
    }

    // WAIT FOR - Wait for element to appear
    else if (step.waitFor !== undefined) {
      const selector = resolveSelector(step.waitFor);
      await page.waitForSelector(selector, { visible: true, timeout: step.timeout || 30000 });
      result.success = true;
    }

    // SCREENSHOT - Take a screenshot
    else if (step.screenshot !== undefined) {
      result.screenshotPath = await takeScreenshot(page, step.screenshot, screenshotDir);
      result.success = true;
    }

    // VERIFY - Assert element contains text
    else if (step.verify !== undefined && step.contains !== undefined) {
      const selector = resolveSelector(step.verify);
      await page.waitForSelector(selector, { timeout: step.timeout || 10000 });
      const text = await page.$eval(selector, (el) => el.textContent || '');

      if (text.toLowerCase().includes(step.contains.toLowerCase())) {
        result.success = true;
      } else {
        result.success = false;
        result.error = `Expected "${step.contains}" but found "${text.slice(0, 100)}"`;
      }
    }

    // WAIT - Wait for specified milliseconds
    else if (step.wait !== undefined) {
      await sleep(step.wait);
      result.success = true;
    }

    // SCROLL - Scroll to element
    else if (step.scroll !== undefined) {
      const selector = resolveSelector(step.scroll);
      await scrollToElement(page, selector);
      result.success = true;
    }

    // HOVER - Hover over element
    else if (step.hover !== undefined) {
      const selector = resolveSelector(step.hover);
      await page.waitForSelector(selector, { visible: true, timeout: step.timeout || 10000 });
      await page.hover(selector);
      result.success = true;
    }

    // SELECT - Select option from dropdown
    else if (step.select !== undefined && step.value !== undefined) {
      const selector = resolveSelector(step.select);
      await page.waitForSelector(selector, { timeout: step.timeout || 10000 });
      await page.select(selector, step.value);
      result.success = true;
    }

    // PRESS - Press a keyboard key
    else if (step.press !== undefined) {
      await page.keyboard.press(step.press as any);
      result.success = true;
    }

    // EVALUATE - Run JavaScript in page context
    else if (step.evaluate !== undefined) {
      await page.evaluate(step.evaluate);
      result.success = true;
    }

    // Unknown step type
    else {
      result.error = `Unknown step type: ${JSON.stringify(step)}`;
    }
  } catch (error) {
    result.success = false;
    result.error = String(error);
  }

  result.duration = Date.now() - startTime;
  return result;
}

/**
 * Resolve text= selectors to XPath
 */
function resolveSelector(selector: string): string {
  // Handle text= selector (e.g., "text=Get Started")
  if (selector.startsWith('text=')) {
    const text = selector.slice(5);
    return `xpath=//*[contains(text(),"${text}")]`;
  }

  // Handle xpath= prefix
  if (selector.startsWith('xpath=')) {
    return selector;
  }

  // Return as-is for CSS selectors
  return selector;
}

/**
 * Get action name for display
 */
export function getActionName(step: TestStep): string {
  if (step.goto !== undefined) return `goto ${step.goto}`;
  if (step.click !== undefined) return `click "${step.click}"`;
  if (step.type !== undefined) return `type ${step.type}`;
  if (step.waitFor !== undefined) return `waitFor ${step.waitFor}`;
  if (step.screenshot !== undefined) return `screenshot "${step.screenshot}"`;
  if (step.verify !== undefined) return `verify ${step.verify} contains "${step.contains}"`;
  if (step.wait !== undefined) return `wait ${step.wait}ms`;
  if (step.scroll !== undefined) return `scroll ${step.scroll}`;
  if (step.hover !== undefined) return `hover ${step.hover}`;
  if (step.select !== undefined) return `select ${step.select}`;
  if (step.press !== undefined) return `press ${step.press}`;
  if (step.evaluate !== undefined) return `evaluate (custom JS)`;
  return 'unknown action';
}

/**
 * Format duration for display
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
