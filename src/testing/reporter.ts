import chalk from 'chalk';
import { StepResult, getActionName, formatDuration } from './actions.js';

export interface TestResults {
  name: string;
  baseUrl: string;
  steps: StepResult[];
  passed: number;
  failed: number;
  total: number;
  duration: number;
  screenshotDir: string;
}

/**
 * Report a single step result in real-time
 */
export function reportStep(result: StepResult, index: number): void {
  const actionName = getActionName(result.step);
  const duration = formatDuration(result.duration);

  if (result.success) {
    if (result.step.screenshot !== undefined) {
      console.log(chalk.cyan(`  📸 ${actionName}`));
      if (result.screenshotPath) {
        console.log(chalk.gray(`     → ${result.screenshotPath}`));
      }
    } else {
      console.log(chalk.green(`  ✅ ${actionName}`) + chalk.gray(` (${duration})`));
    }
  } else {
    console.log(chalk.red(`  ❌ ${actionName}`) + chalk.gray(` (${duration})`));
    if (result.error) {
      console.log(chalk.red(`     Error: ${result.error}`));
    }
  }
}

/**
 * Report the final test summary
 */
export function reportSummary(results: TestResults): void {
  console.log('');
  console.log(chalk.bold('─'.repeat(50)));

  const { passed, failed, total, duration, screenshotDir } = results;
  const totalDuration = formatDuration(duration);

  if (failed === 0) {
    console.log(chalk.green.bold(`\nResult: ${passed}/${total} passed ✅`));
  } else {
    console.log(chalk.red.bold(`\nResult: ${passed}/${total} passed, ${failed} failed ❌`));
  }

  console.log(chalk.gray(`Duration: ${totalDuration}`));

  // List screenshots taken
  const screenshots = results.steps.filter((s) => s.screenshotPath);
  if (screenshots.length > 0) {
    console.log(chalk.gray(`Screenshots saved to: ${screenshotDir}/`));
  }

  console.log('');
}

/**
 * Report smoke test result
 */
export function reportSmokeTest(url: string, success: boolean, duration: number, error?: string): void {
  console.log('');
  console.log(chalk.bold(`🔥 Smoke Test: ${url}`));
  console.log(chalk.bold('─'.repeat(50)));

  if (success) {
    console.log(chalk.green(`  ✅ Page loaded successfully`) + chalk.gray(` (${formatDuration(duration)})`));
    console.log(chalk.green.bold(`\nResult: PASSED ✅`));
  } else {
    console.log(chalk.red(`  ❌ Page failed to load`) + chalk.gray(` (${formatDuration(duration)})`));
    if (error) {
      console.log(chalk.red(`     Error: ${error}`));
    }
    console.log(chalk.red.bold(`\nResult: FAILED ❌`));
  }

  console.log('');
}

/**
 * Create JSON report
 */
export function createJsonReport(results: TestResults): object {
  return {
    name: results.name,
    baseUrl: results.baseUrl,
    timestamp: new Date().toISOString(),
    summary: {
      passed: results.passed,
      failed: results.failed,
      total: results.total,
      duration: results.duration,
      success: results.failed === 0,
    },
    steps: results.steps.map((s, i) => ({
      index: i + 1,
      action: getActionName(s.step),
      success: s.success,
      duration: s.duration,
      error: s.error,
      screenshot: s.screenshotPath,
    })),
  };
}

/**
 * Print test header
 */
export function printTestHeader(name: string, baseUrl: string): void {
  console.log('');
  console.log(chalk.bold(`🧪 Testing: ${name}`));
  console.log(chalk.gray(`   Base URL: ${baseUrl}`));
  console.log(chalk.bold('─'.repeat(50)));
}
