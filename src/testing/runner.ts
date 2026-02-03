import type { Browser, Page } from 'puppeteer';
import { launchBrowser, newPage, closeBrowser } from '../browser.js';
import { loadTestFlow } from '../config.js';
import { recordTestRun } from '../db.js';
import { executeStep, StepResult, TestStep } from './actions.js';
import {
  TestResults,
  reportStep,
  reportSummary,
  printTestHeader,
  reportSmokeTest,
  createJsonReport,
} from './reporter.js';
import * as fs from 'fs';

export interface TestFlow {
  name: string;
  baseUrl?: string;
  steps: TestStep[];
}

export interface RunTestOptions {
  flowPath?: string;
  flow?: TestFlow;
  baseUrl?: string;
  screenshotDir?: string;
  headless?: boolean;
  stopOnFailure?: boolean;
  jsonOutput?: boolean;
}

export async function runTestFlow(options: RunTestOptions): Promise<TestResults> {
  const {
    flowPath,
    flow: providedFlow,
    baseUrl: overrideBaseUrl,
    screenshotDir = './screenshots',
    headless = true,
    stopOnFailure = false,
    jsonOutput = false,
  } = options;

  // Load test flow
  let flow: TestFlow;
  if (providedFlow) {
    flow = providedFlow;
  } else if (flowPath) {
    flow = loadTestFlow(flowPath) as TestFlow;
  } else {
    throw new Error('Either flowPath or flow must be provided');
  }

  const baseUrl = overrideBaseUrl || flow.baseUrl || '';

  // Ensure screenshot directory exists
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  // Print header
  if (!jsonOutput) {
    printTestHeader(flow.name, baseUrl);
  }

  const browser = await launchBrowser({ headless });
  const page = await newPage(browser);

  const startTime = Date.now();
  const stepResults: StepResult[] = [];
  let passed = 0;
  let failed = 0;

  try {
    for (let i = 0; i < flow.steps.length; i++) {
      const step = flow.steps[i];
      const result = await executeStep(page, step, baseUrl, screenshotDir);

      stepResults.push(result);

      if (result.success) {
        passed++;
      } else {
        failed++;
      }

      // Report step in real-time
      if (!jsonOutput) {
        reportStep(result, i);
      }

      // Stop on failure if requested
      if (!result.success && stopOnFailure) {
        break;
      }
    }
  } finally {
    await page.close();
    await browser.close();
  }

  const duration = Date.now() - startTime;

  const results: TestResults = {
    name: flow.name,
    baseUrl,
    steps: stepResults,
    passed,
    failed,
    total: flow.steps.length,
    duration,
    screenshotDir,
  };

  // Record test run in database
  recordTestRun({
    flow_name: flow.name,
    base_url: baseUrl,
    passed,
    failed,
    total: flow.steps.length,
    duration_ms: duration,
    created_at: new Date().toISOString(),
  });

  // Print summary or JSON output
  if (jsonOutput) {
    console.log(JSON.stringify(createJsonReport(results), null, 2));
  } else {
    reportSummary(results);
  }

  return results;
}

export async function runSmokeTest(
  url: string,
  options: { headless?: boolean; timeout?: number } = {}
): Promise<boolean> {
  const { headless = true, timeout = 30000 } = options;

  const browser = await launchBrowser({ headless });
  const page = await newPage(browser);

  const startTime = Date.now();
  let success = false;
  let error: string | undefined;

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout });

    // Basic checks
    const title = await page.title();
    const content = await page.content();

    // Check for common error indicators
    const hasError =
      content.includes('502 Bad Gateway') ||
      content.includes('503 Service Unavailable') ||
      content.includes('500 Internal Server Error') ||
      content.includes('404 Not Found');

    if (hasError) {
      error = 'Page returned an error status';
    } else if (!title && content.length < 100) {
      error = 'Page appears to be empty';
    } else {
      success = true;
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Unknown error';
  } finally {
    await page.close();
    await browser.close();
  }

  const duration = Date.now() - startTime;
  reportSmokeTest(url, success, duration, error);

  // Record test run
  recordTestRun({
    flow_name: 'Smoke Test',
    base_url: url,
    passed: success ? 1 : 0,
    failed: success ? 0 : 1,
    total: 1,
    duration_ms: duration,
    created_at: new Date().toISOString(),
  });

  return success;
}

export async function runMultipleFlows(
  flowPaths: string[],
  options: { baseUrl?: string; screenshotDir?: string; headless?: boolean; stopOnFailure?: boolean }
): Promise<{ results: TestResults[]; totalPassed: number; totalFailed: number }> {
  const results: TestResults[] = [];
  let totalPassed = 0;
  let totalFailed = 0;

  for (const flowPath of flowPaths) {
    try {
      const result = await runTestFlow({
        flowPath,
        ...options,
      });

      results.push(result);
      totalPassed += result.passed;
      totalFailed += result.failed;

      if (result.failed > 0 && options.stopOnFailure) {
        break;
      }
    } catch (err) {
      console.error(`Error running flow ${flowPath}:`, err);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`Total: ${totalPassed}/${totalPassed + totalFailed} passed across ${results.length} flows`);
  console.log('='.repeat(50) + '\n');

  return { results, totalPassed, totalFailed };
}
