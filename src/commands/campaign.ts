import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { postToMultipleSubreddits } from '../platforms/reddit.js';
import { postToTwitter } from '../platforms/twitter.js';
import { postToFacebook } from '../platforms/facebook.js';
import { initDatabase } from '../db.js';
import { sleep } from '../browser.js';

interface CampaignStep {
  platform: 'reddit' | 'twitter' | 'facebook';
  action: 'post';
  data: {
    // Reddit
    subreddits?: string[];
    title?: string;
    body?: string;
    url?: string;
    flair?: string;
    // Twitter
    content?: string;
    // Facebook
    page?: string;
  };
  delay?: number; // ms to wait after this step
}

interface CampaignConfig {
  name: string;
  description?: string;
  steps: CampaignStep[];
}

export function createCampaignCommand(): Command {
  const campaign = new Command('campaign')
    .description('Run a multi-platform posting campaign')
    .option('-c, --config <path>', 'Path to campaign JSON config file')
    .option('--dry-run', 'Show what would be posted without actually posting')
    .action(async (options) => {
      initDatabase();

      if (!options.config) {
        console.error(chalk.red('Error: --config is required'));
        console.log(chalk.gray('\nUsage example:'));
        console.log(chalk.gray('  postpilot campaign --config ./campaigns/launch.json'));
        process.exit(1);
      }

      const configPath = path.resolve(options.config);
      if (!fs.existsSync(configPath)) {
        console.error(chalk.red(`Error: Config file not found: ${configPath}`));
        process.exit(1);
      }

      let config: CampaignConfig;
      try {
        const content = fs.readFileSync(configPath, 'utf-8');
        config = JSON.parse(content);
      } catch (error) {
        console.error(chalk.red(`Error: Invalid JSON in config file`));
        process.exit(1);
      }

      console.log(chalk.cyan(`\n🚀 Campaign: ${config.name}\n`));
      if (config.description) {
        console.log(chalk.gray(config.description));
        console.log();
      }

      console.log(chalk.white(`Steps: ${config.steps.length}`));
      console.log();

      if (options.dryRun) {
        console.log(chalk.yellow('DRY RUN - No posts will be created\n'));
      }

      const results: { step: number; platform: string; success: boolean; error?: string }[] = [];

      for (let i = 0; i < config.steps.length; i++) {
        const step = config.steps[i];
        console.log(chalk.cyan(`\n📌 Step ${i + 1}/${config.steps.length}: ${step.platform}`));

        if (options.dryRun) {
          console.log(chalk.gray(`  Would post to ${step.platform}:`));
          console.log(chalk.gray(`  ${JSON.stringify(step.data, null, 2)}`));
          results.push({ step: i + 1, platform: step.platform, success: true });
          continue;
        }

        try {
          switch (step.platform) {
            case 'reddit': {
              if (!step.data.subreddits || !step.data.title) {
                throw new Error('Reddit posts require subreddits and title');
              }
              const redditResults = await postToMultipleSubreddits(
                step.data.subreddits,
                step.data.title,
                {
                  body: step.data.body,
                  url: step.data.url,
                  flair: step.data.flair,
                  verify: false,
                }
              );
              const allSuccess = redditResults.every(r => r.success);
              results.push({ step: i + 1, platform: 'reddit', success: allSuccess });
              break;
            }

            case 'twitter': {
              if (!step.data.content) {
                throw new Error('Twitter posts require content');
              }
              const twitterResult = await postToTwitter({
                content: step.data.content,
                url: step.data.url,
              });
              results.push({ step: i + 1, platform: 'twitter', success: twitterResult.success, error: twitterResult.error });
              break;
            }

            case 'facebook': {
              if (!step.data.content) {
                throw new Error('Facebook posts require content');
              }
              const fbResult = await postToFacebook({
                content: step.data.content,
                page: step.data.page,
                url: step.data.url,
              });
              results.push({ step: i + 1, platform: 'facebook', success: fbResult.success, error: fbResult.error });
              break;
            }

            default:
              throw new Error(`Unknown platform: ${step.platform}`);
          }
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : 'Unknown error';
          console.error(chalk.red(`  Error: ${errMsg}`));
          results.push({ step: i + 1, platform: step.platform, success: false, error: errMsg });
        }

        // Delay between steps
        if (step.delay && i < config.steps.length - 1) {
          console.log(chalk.gray(`  Waiting ${step.delay / 1000}s before next step...`));
          await sleep(step.delay);
        }
      }

      // Summary
      console.log(chalk.cyan('\n═══════════════════════════════════════'));
      console.log(chalk.cyan('📊 Campaign Summary'));
      console.log(chalk.cyan('═══════════════════════════════════════\n'));

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      for (const result of results) {
        const icon = result.success ? chalk.green('✅') : chalk.red('❌');
        console.log(`${icon} Step ${result.step}: ${result.platform}${result.error ? ` - ${result.error}` : ''}`);
      }

      console.log();
      console.log(chalk.white(`Total: ${results.length} steps`));
      console.log(chalk.green(`Successful: ${successful}`));
      if (failed > 0) {
        console.log(chalk.red(`Failed: ${failed}`));
      }
      console.log();

      if (failed > 0) {
        process.exit(1);
      }
    });

  campaign
    .command('create <name>')
    .description('Create a new campaign config file')
    .option('-o, --output <dir>', 'Output directory', './campaigns')
    .action((name, options) => {
      const outputDir = path.resolve(options.output);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const filename = `${name.toLowerCase().replace(/\s+/g, '-')}.json`;
      const filepath = path.join(outputDir, filename);

      const template: CampaignConfig = {
        name,
        description: 'Campaign description here',
        steps: [
          {
            platform: 'reddit',
            action: 'post',
            data: {
              subreddits: ['subreddit1', 'subreddit2'],
              title: 'Your post title',
              body: 'Your post body',
            },
            delay: 60000,
          },
          {
            platform: 'twitter',
            action: 'post',
            data: {
              content: 'Your tweet content #hashtag',
            },
            delay: 30000,
          },
          {
            platform: 'facebook',
            action: 'post',
            data: {
              page: 'feed',
              content: 'Your Facebook post content',
            },
          },
        ],
      };

      fs.writeFileSync(filepath, JSON.stringify(template, null, 2));
      console.log(chalk.green(`✅ Created campaign config: ${filepath}`));
      console.log(chalk.gray('\nEdit the file to customize your campaign, then run:'));
      console.log(chalk.gray(`  postpilot campaign --config ${filepath}`));
    });

  return campaign;
}
