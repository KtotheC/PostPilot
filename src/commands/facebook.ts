import { Command } from 'commander';
import chalk from 'chalk';
import { postToFacebook } from '../platforms/facebook.js';
import { getFacebookCredentials, setFacebookCredentials } from '../config.js';
import { initDatabase, getRecentPosts } from '../db.js';
import * as readline from 'readline';

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdin,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

export function createFacebookCommand(): Command {
  const facebook = new Command('facebook')
    .description('Post to Facebook feed or pages')
    .option('-c, --content <text>', 'Post content')
    .option('-p, --page <name>', 'Page name to post to (or "feed" for personal)', 'feed')
    .option('-u, --url <url>', 'URL to include in post')
    .option('--screenshot', 'Take screenshot after posting')
    .option('--screenshot-dir <dir>', 'Directory for screenshots', './screenshots')
    .action(async (options) => {
      initDatabase();

      if (!options.content) {
        console.error(chalk.red('Error: --content is required'));
        console.log(chalk.gray('\nUsage example:'));
        console.log(chalk.gray('  postpilot facebook -c "Check out our new product!"'));
        process.exit(1);
      }

      const credentials = getFacebookCredentials();
      if (!credentials) {
        console.error(chalk.red('Error: Facebook credentials not configured'));
        console.log(chalk.gray('Run: postpilot login facebook'));
        process.exit(1);
      }

      console.log(chalk.cyan('\n📘 Facebook Post\n'));

      const result = await postToFacebook({
        content: options.content,
        page: options.page,
        url: options.url,
        screenshot: options.screenshot,
        screenshotDir: options.screenshotDir,
      });

      if (result.success) {
        console.log(chalk.green('\n✅ Posted to Facebook successfully!'));
        if (result.postUrl) {
          console.log(chalk.gray(`URL: ${result.postUrl}`));
        }
      } else {
        console.log(chalk.red(`\n❌ Failed: ${result.error}`));
        process.exit(1);
      }
    });

  facebook
    .command('config')
    .description('Configure Facebook credentials')
    .action(async () => {
      console.log(chalk.cyan('\n📘 Facebook Configuration\n'));

      const email = await prompt('Facebook email: ');
      const password = await prompt('Facebook password: ');

      setFacebookCredentials(email, password);
      console.log(chalk.green('\n✅ Facebook credentials saved!'));
    });

  facebook
    .command('history')
    .description('View recent Facebook posts')
    .option('-n, --limit <number>', 'Number of posts to show', '10')
    .action((options) => {
      initDatabase();
      const posts = getRecentPosts(parseInt(options.limit)).filter(p => p.platform === 'facebook');

      if (posts.length === 0) {
        console.log(chalk.gray('No recent Facebook posts found.'));
        return;
      }

      console.log(chalk.cyan('\n📜 Recent Facebook Posts\n'));
      for (const post of posts) {
        console.log(chalk.white(`• ${post.title}`));
        console.log(chalk.gray(`  ${post.subreddit} • ${new Date(post.created_at).toLocaleString()}`));
        if (post.post_url) {
          console.log(chalk.blue(`  ${post.post_url}`));
        }
        console.log();
      }
    });

  return facebook;
}
