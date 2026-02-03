import { Command } from 'commander';
import chalk from 'chalk';
import { postToTwitter } from '../platforms/twitter.js';
import { getTwitterCredentials, setTwitterCredentials } from '../config.js';
import { initDatabase, getRecentPosts } from '../db.js';
import * as readline from 'readline';

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

export function createTwitterCommand(): Command {
  const twitter = new Command('twitter')
    .description('Post to Twitter/X')
    .option('-c, --content <text>', 'Tweet content (max 280 chars)')
    .option('-u, --url <url>', 'URL to include in tweet')
    .option('--screenshot', 'Take screenshot after posting')
    .option('--screenshot-dir <dir>', 'Directory for screenshots', './screenshots')
    .action(async (options) => {
      initDatabase();

      if (!options.content) {
        console.error(chalk.red('Error: --content is required'));
        console.log(chalk.gray('\nUsage example:'));
        console.log(chalk.gray('  postpilot twitter -c "Check out my new project!"'));
        process.exit(1);
      }

      const credentials = getTwitterCredentials();
      if (!credentials) {
        console.error(chalk.red('Error: Twitter credentials not configured'));
        console.log(chalk.gray('Run: postpilot login twitter'));
        process.exit(1);
      }

      console.log(chalk.cyan('\n🐦 Twitter Post\n'));

      const result = await postToTwitter({
        content: options.content,
        url: options.url,
        screenshot: options.screenshot,
        screenshotDir: options.screenshotDir,
      });

      if (result.success) {
        console.log(chalk.green('\n✅ Tweet posted successfully!'));
        if (result.postUrl) {
          console.log(chalk.gray(`URL: ${result.postUrl}`));
        }
      } else {
        console.log(chalk.red(`\n❌ Failed: ${result.error}`));
        process.exit(1);
      }
    });

  twitter
    .command('config')
    .description('Configure Twitter credentials')
    .action(async () => {
      console.log(chalk.cyan('\n🐦 Twitter Configuration\n'));

      const username = await prompt('Twitter username: ');
      const password = await prompt('Twitter password: ');

      setTwitterCredentials(username, password);
      console.log(chalk.green('\n✅ Twitter credentials saved!'));
    });

  twitter
    .command('history')
    .description('View recent tweets')
    .option('-n, --limit <number>', 'Number of posts to show', '10')
    .action((options) => {
      initDatabase();
      const posts = getRecentPosts(parseInt(options.limit)).filter(p => p.platform === 'twitter');

      if (posts.length === 0) {
        console.log(chalk.gray('No recent tweets found.'));
        return;
      }

      console.log(chalk.cyan('\n📜 Recent Tweets\n'));
      for (const post of posts) {
        console.log(chalk.white(`• ${post.title}`));
        console.log(chalk.gray(`  ${new Date(post.created_at).toLocaleString()}`));
        if (post.post_url) {
          console.log(chalk.blue(`  ${post.post_url}`));
        }
        console.log();
      }
    });

  return twitter;
}
