#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { createRedditCommand } from './commands/reddit.js';
import { createTestCommand } from './commands/test.js';
import { createTwitterCommand } from './commands/twitter.js';
import { createFacebookCommand } from './commands/facebook.js';
import { createCampaignCommand } from './commands/campaign.js';
import { initDatabase, closeDatabase } from './db.js';
import {
  setRedditCredentials,
  getRedditCredentials,
  setTwitterCredentials,
  getTwitterCredentials,
  setFacebookCredentials,
  getFacebookCredentials,
  ensureConfigDir,
} from './config.js';

const VERSION = '1.0.0';

const program = new Command();

program
  .name('postpilot')
  .description('CLI automation tool for social media posting and GUI testing')
  .version(VERSION);

// Banner
console.log(chalk.bold.cyan(`
╔═══════════════════════════════════════╗
║       🚀 PostPilot v${VERSION}            ║
║   Social Media Automation & Testing   ║
╚═══════════════════════════════════════╝
`));

// Initialize config directory
ensureConfigDir();

// Add platform commands
program.addCommand(createRedditCommand());
program.addCommand(createTwitterCommand());
program.addCommand(createFacebookCommand());

// Add Test command
program.addCommand(createTestCommand());

// Add Campaign command
program.addCommand(createCampaignCommand());

// Login command (shorthand for platform login)
program
  .command('login')
  .description('Store credentials for a platform')
  .argument('<platform>', 'Platform to login to (reddit, twitter, facebook)')
  .action(async (platform) => {
    const readline = await import('readline');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const prompt = (question: string): Promise<string> => {
      return new Promise((resolve) => {
        rl.question(question, (answer) => {
          resolve(answer);
        });
      });
    };

    if (platform === 'reddit') {
      console.log(chalk.bold('\n🔐 Reddit Login Setup'));
      console.log(chalk.gray('Credentials are stored locally in ~/.postpilot/\n'));

      const username = await prompt('Reddit username: ');
      const password = await prompt('Reddit password: ');

      if (!username || !password) {
        console.log(chalk.red('❌ Username and password are required'));
        rl.close();
        process.exit(1);
      }

      setRedditCredentials(username, password);
      console.log(chalk.green('\n✅ Reddit credentials saved successfully!'));
      rl.close();
    } else if (platform === 'twitter') {
      console.log(chalk.bold('\n🐦 Twitter Login Setup'));
      console.log(chalk.gray('Credentials are stored locally in ~/.postpilot/\n'));

      const username = await prompt('Twitter username: ');
      const password = await prompt('Twitter password: ');

      if (!username || !password) {
        console.log(chalk.red('❌ Username and password are required'));
        rl.close();
        process.exit(1);
      }

      setTwitterCredentials(username, password);
      console.log(chalk.green('\n✅ Twitter credentials saved successfully!'));
      rl.close();
    } else if (platform === 'facebook') {
      console.log(chalk.bold('\n📘 Facebook Login Setup'));
      console.log(chalk.gray('Credentials are stored locally in ~/.postpilot/\n'));

      const email = await prompt('Facebook email: ');
      const password = await prompt('Facebook password: ');

      if (!email || !password) {
        console.log(chalk.red('❌ Email and password are required'));
        rl.close();
        process.exit(1);
      }

      setFacebookCredentials(email, password);
      console.log(chalk.green('\n✅ Facebook credentials saved successfully!'));
      rl.close();
    } else {
      console.log(chalk.red(`❌ Unknown platform: ${platform}`));
      console.log(chalk.gray('Supported platforms: reddit, twitter, facebook'));
      rl.close();
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('Check configuration status')
  .action(() => {
    console.log(chalk.bold('\n📊 PostPilot Status\n'));

    // Check Reddit credentials
    const redditCreds = getRedditCredentials();
    if (redditCreds) {
      console.log(chalk.green(`✅ Reddit: Logged in as ${redditCreds.username}`));
    } else {
      console.log(chalk.yellow('⚠️  Reddit: No credentials configured'));
      console.log(chalk.gray('   Run: postpilot login reddit'));
    }

    // Check Twitter credentials
    const twitterCreds = getTwitterCredentials();
    if (twitterCreds) {
      console.log(chalk.green(`✅ Twitter: Logged in as ${twitterCreds.username}`));
    } else {
      console.log(chalk.yellow('⚠️  Twitter: No credentials configured'));
      console.log(chalk.gray('   Run: postpilot login twitter'));
    }

    // Check Facebook credentials
    const facebookCreds = getFacebookCredentials();
    if (facebookCreds) {
      console.log(chalk.green(`✅ Facebook: Logged in as ${facebookCreds.email}`));
    } else {
      console.log(chalk.yellow('⚠️  Facebook: No credentials configured'));
      console.log(chalk.gray('   Run: postpilot login facebook'));
    }

    console.log('');
  });

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.gray('\n\nShutting down...'));
  closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeDatabase();
  process.exit(0);
});

// Parse args
program.parse(process.argv);

// Show help if no args
if (process.argv.length === 2) {
  program.outputHelp();
}
