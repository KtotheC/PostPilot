import { Command } from 'commander';
import chalk from 'chalk';
import { postToMultipleSubreddits, PostResult } from '../platforms/reddit.js';
import { getRedditCredentials, setRedditCredentials } from '../config.js';
import { initDatabase, getRecentPosts } from '../db.js';

export function createRedditCommand(): Command {
  const reddit = new Command('reddit')
    .description('Post to Reddit subreddits')
    .option('-s, --subreddits <list>', 'Comma-separated list of subreddits (e.g., "Homeplate,travelball")')
    .option('-t, --title <title>', 'Post title')
    .option('-b, --body <body>', 'Post body text')
    .option('-u, --url <url>', 'Link URL (creates link post if no body)')
    .option('-f, --flair <flair>', 'Post flair')
    .option('--verify', 'Verify posts are live after posting')
    .option('--screenshot', 'Take screenshots for verification (requires --verify)')
    .option('--screenshot-dir <dir>', 'Directory for screenshots', './screenshots')
    .option('--delay <ms>', 'Delay between posts in milliseconds', '30000')
    .option('--headless', 'Run browser in headless mode', true)
    .option('--no-headless', 'Run browser with visible window')
    .action(async (options) => {
      initDatabase();

      if (!options.subreddits || !options.title) {
        console.error(chalk.red('Error: --subreddits and --title are required'));
        console.log(chalk.gray('\nUsage example:'));
        console.log(chalk.gray('  postpilot reddit -s "Homeplate,travelball" -t "Your title" -b "Your content"'));
        process.exit(1);
      }

      const credentials = getRedditCredentials();
      if (!credentials) {
        console.error(chalk.red('Error: Reddit credentials not found'));
        console.log(chalk.gray('\nSet credentials using environment variables:'));
        console.log(chalk.gray('  export REDDIT_USERNAME="your_username"'));
        console.log(chalk.gray('  export REDDIT_PASSWORD="your_password"'));
        console.log(chalk.gray('\nOr create a .env file in the project root.'));
        process.exit(1);
      }

      const subreddits = options.subreddits.split(',').map((s: string) => s.trim());
      const delay = parseInt(options.delay, 10);

      console.log(chalk.bold('\n📮 PostPilot - Reddit Multi-Post\n'));
      console.log(chalk.gray(`Subreddits: ${subreddits.join(', ')}`));
      console.log(chalk.gray(`Title: ${options.title}`));
      if (options.body) console.log(chalk.gray(`Body: ${options.body.substring(0, 50)}...`));
      if (options.url) console.log(chalk.gray(`URL: ${options.url}`));
      if (options.verify) console.log(chalk.gray(`Verification: enabled`));
      console.log(chalk.gray(`Delay: ${delay / 1000}s between posts\n`));

      const results = await postToMultipleSubreddits(subreddits, options.title, {
        body: options.body,
        url: options.url,
        flair: options.flair,
        verify: options.verify,
        screenshot: options.screenshot,
        screenshotDir: options.screenshotDir,
        delayBetweenPosts: delay,
      });

      printSummary(results);
    });

  // Subcommand: config - set credentials
  reddit
    .command('config')
    .description('Configure Reddit credentials')
    .option('--username <username>', 'Reddit username')
    .option('--password <password>', 'Reddit password')
    .action((options) => {
      if (!options.username || !options.password) {
        console.error(chalk.red('Error: --username and --password are required'));
        process.exit(1);
      }

      setRedditCredentials(options.username, options.password);
      console.log(chalk.green('✅ Reddit credentials saved to ~/.postpilot/credentials.json'));
    });

  // Subcommand: history - view post history
  reddit
    .command('history')
    .description('View recent post history')
    .option('-n, --limit <n>', 'Number of posts to show', '10')
    .action((options) => {
      initDatabase();
      const posts = getRecentPosts(parseInt(options.limit, 10));

      if (posts.length === 0) {
        console.log(chalk.gray('No posts found'));
        return;
      }

      console.log(chalk.bold('\n📜 Recent Reddit Posts\n'));
      for (const post of posts) {
        const verified = post.verified ? chalk.green('✓') : chalk.gray('○');
        const date = new Date(post.created_at).toLocaleDateString();
        console.log(`${verified} r/${post.subreddit} - ${post.title.substring(0, 50)}... (${date})`);
        if (post.post_url) {
          console.log(chalk.gray(`   ${post.post_url}`));
        }
      }
      console.log('');
    });

  return reddit;
}

function printSummary(results: PostResult[]): void {
  console.log(chalk.bold('\n═'.repeat(50)));
  console.log(chalk.bold('Summary'));
  console.log('═'.repeat(50));

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);
  const verified = results.filter((r) => r.verified);

  console.log(chalk.green(`✅ Posted: ${successful.length}/${results.length}`));

  if (verified.length > 0) {
    console.log(chalk.green(`🔍 Verified: ${verified.length}/${successful.length}`));
  }

  if (failed.length > 0) {
    console.log(chalk.red(`❌ Failed: ${failed.length}`));
    for (const result of failed) {
      console.log(chalk.red(`   - r/${result.subreddit}: ${result.error}`));
    }
  }

  // List successful posts with URLs
  if (successful.length > 0) {
    console.log(chalk.gray('\nPosted URLs:'));
    for (const result of successful) {
      if (result.postUrl) {
        console.log(chalk.gray(`  r/${result.subreddit}: ${result.postUrl}`));
      }
    }
  }

  console.log('');
}
