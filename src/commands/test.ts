import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { runTestFlow, runSmokeTest, TestFlow } from '../testing/runner.js';
import { initDatabase, getRecentTestRuns, closeDatabase } from '../db.js';
import { closeBrowser } from '../browser.js';

export function createTestCommand(): Command {
  const test = new Command('test')
    .description('Run GUI tests on web applications');

  // Run test flow
  test
    .command('run')
    .description('Run a test flow from a JSON file')
    .argument('<flow>', 'Path to test flow JSON file')
    .option('-u, --url <url>', 'Override base URL')
    .option('--no-headless', 'Run browser in visible mode')
    .option('--screenshot-dir <dir>', 'Screenshot directory', './screenshots')
    .option('--timeout <ms>', 'Default timeout in ms', '30000')
    .option('--stop-on-failure', 'Stop test on first failure', false)
    .action(async (flowPath, options) => {
      initDatabase();

      // Resolve path
      const resolvedPath = path.resolve(flowPath);

      if (!fs.existsSync(resolvedPath)) {
        console.log(chalk.red(`❌ Test flow not found: ${resolvedPath}`));
        process.exit(1);
      }

      try {
        const results = await runTestFlow({
          flowPath: resolvedPath,
          baseUrl: options.url,
          headless: options.headless,
          screenshotDir: options.screenshotDir,
          stopOnFailure: options.stopOnFailure,
        });

        process.exit(results.failed > 0 ? 1 : 0);
      } catch (error) {
        console.log(chalk.red(`\n❌ Error: ${error}`));
        process.exit(1);
      } finally {
        await closeBrowser();
        closeDatabase();
      }
    });

  // Smoke test
  test
    .command('smoke')
    .description('Quick smoke test - check if page loads')
    .argument('<url>', 'URL to test')
    .option('--no-headless', 'Run browser in visible mode')
    .option('--timeout <ms>', 'Timeout in ms', '30000')
    .action(async (url, options) => {
      try {
        const success = await runSmokeTest(url, {
          headless: options.headless,
          timeout: parseInt(options.timeout, 10),
        });

        process.exit(success ? 0 : 1);
      } catch (error) {
        console.log(chalk.red(`\n❌ Error: ${error}`));
        process.exit(1);
      } finally {
        await closeBrowser();
      }
    });

  // List available templates
  test
    .command('templates')
    .description('List available test templates')
    .action(() => {
      console.log(chalk.bold('\n📋 Available Test Templates'));
      console.log(chalk.bold('─'.repeat(50)));

      const templates = [
        { name: 'signup', desc: 'User registration flow' },
        { name: 'login', desc: 'User authentication flow' },
        { name: 'checkout', desc: 'Payment/checkout flow (Stripe)' },
      ];

      for (const template of templates) {
        console.log(`  ${chalk.cyan(template.name.padEnd(15))} ${template.desc}`);
      }

      console.log('');
      console.log(chalk.gray('Use: postpilot test run ./tests/<template>.json'));
    });

  // History command
  test
    .command('history')
    .description('Show recent test runs')
    .option('-n, --limit <number>', 'Number of runs to show', '10')
    .action((options) => {
      initDatabase();
      const runs = getRecentTestRuns(parseInt(options.limit, 10));
      closeDatabase();

      if (runs.length === 0) {
        console.log(chalk.yellow('No test runs found'));
        return;
      }

      console.log(chalk.bold('\n📋 Recent Test Runs'));
      console.log(chalk.bold('─'.repeat(60)));

      for (const run of runs) {
        const passIcon = run.failed === 0 ? '✅' : '❌';
        const date = new Date(run.created_at).toLocaleString();

        console.log(`${passIcon} ${chalk.cyan(run.flow_name)}`);
        console.log(`   ${run.base_url}`);
        console.log(chalk.gray(`   ${run.passed}/${run.total} passed, ${run.duration_ms}ms`));
        console.log(chalk.gray(`   ${date}`));
        console.log('');
      }
    });

  // Create test from template
  test
    .command('create')
    .description('Create a new test flow from template')
    .argument('<name>', 'Test name')
    .option('-t, --template <template>', 'Template to use (signup, login, checkout)', 'login')
    .option('-u, --url <url>', 'Base URL for the test')
    .option('-o, --output <path>', 'Output path', './tests')
    .action((name, options) => {
      const template = getTemplate(options.template);

      if (!template) {
        console.log(chalk.red(`❌ Unknown template: ${options.template}`));
        console.log(chalk.gray('Available templates: signup, login, checkout'));
        process.exit(1);
      }

      // Customize template
      template.name = name;
      if (options.url) {
        template.baseUrl = options.url;
      }

      // Ensure output directory exists
      const outputDir = path.resolve(options.output);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Write test file
      const outputPath = path.join(outputDir, `${name.toLowerCase().replace(/\s+/g, '-')}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(template, null, 2));

      console.log(chalk.green(`✅ Created test flow: ${outputPath}`));
      console.log(chalk.gray(`Edit the file to customize selectors and test data.`));
    });

  return test;
}

function getTemplate(templateName: string): TestFlow | null {
  const templates: Record<string, TestFlow> = {
    signup: {
      name: 'Signup Flow',
      baseUrl: 'https://example.com',
      steps: [
        { goto: '/' },
        { click: 'text=Sign Up' },
        { waitFor: '#email' },
        { type: '#email', text: 'test@example.com' },
        { type: '#password', text: 'SecurePass123!' },
        { type: '#confirm-password', text: 'SecurePass123!' },
        { click: 'button[type=submit]' },
        { waitFor: '.dashboard', timeout: 10000 },
        { screenshot: 'signup-complete' },
        { verify: 'h1', contains: 'Welcome' },
      ],
    },
    login: {
      name: 'Login Flow',
      baseUrl: 'https://example.com',
      steps: [
        { goto: '/login' },
        { waitFor: '#email' },
        { type: '#email', text: 'user@example.com' },
        { type: '#password', text: 'password123' },
        { click: 'button[type=submit]' },
        { waitFor: '.dashboard', timeout: 10000 },
        { screenshot: 'login-complete' },
        { verify: 'h1', contains: 'Dashboard' },
      ],
    },
    checkout: {
      name: 'Checkout Flow',
      baseUrl: 'https://example.com',
      steps: [
        { goto: '/products' },
        { click: '.product-card:first-child button' },
        { waitFor: '.cart-badge' },
        { click: 'text=Checkout' },
        { waitFor: '#card-element', timeout: 10000 },
        { screenshot: 'checkout-page' },
        { type: '#email', text: 'customer@example.com' },
        { type: '#name', text: 'Test Customer' },
        // Stripe elements would need special handling
        { screenshot: 'checkout-filled' },
      ],
    },
  };

  return templates[templateName] || null;
}

export default createTestCommand;
