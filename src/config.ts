import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import dotenv from 'dotenv';

// Load .env file if present
dotenv.config();

export interface RedditCredentials {
  username: string;
  password: string;
}

export interface FacebookCredentials {
  email: string;
  password: string;
}

export interface TwitterCredentials {
  username: string;
  password: string;
}

export interface Credentials {
  reddit?: RedditCredentials;
  facebook?: FacebookCredentials;
  twitter?: TwitterCredentials;
}

export interface CampaignStep {
  platform: 'reddit' | 'facebook' | 'twitter';
  action: 'post' | 'comment' | 'like';
  data: Record<string, any>;
  delay?: number;
}

export interface Campaign {
  name: string;
  description?: string;
  steps: CampaignStep[];
}

const CONFIG_DIR = path.join(os.homedir(), '.postpilot');
const CREDENTIALS_FILE = path.join(CONFIG_DIR, 'credentials.json');

/**
 * Ensure the config directory exists
 */
export function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

/**
 * Load credentials from file or environment
 */
export function loadCredentials(): Credentials {
  const credentials: Credentials = {};

  // Try environment variables first
  if (process.env.REDDIT_USERNAME && process.env.REDDIT_PASSWORD) {
    credentials.reddit = {
      username: process.env.REDDIT_USERNAME,
      password: process.env.REDDIT_PASSWORD,
    };
  }

  if (process.env.FACEBOOK_EMAIL && process.env.FACEBOOK_PASSWORD) {
    credentials.facebook = {
      email: process.env.FACEBOOK_EMAIL,
      password: process.env.FACEBOOK_PASSWORD,
    };
  }

  if (process.env.TWITTER_USERNAME && process.env.TWITTER_PASSWORD) {
    credentials.twitter = {
      username: process.env.TWITTER_USERNAME,
      password: process.env.TWITTER_PASSWORD,
    };
  }

  // Load from credentials file (file takes precedence)
  if (fs.existsSync(CREDENTIALS_FILE)) {
    try {
      const fileContent = fs.readFileSync(CREDENTIALS_FILE, 'utf-8');
      const fileCredentials = JSON.parse(fileContent) as Credentials;

      if (fileCredentials.reddit) credentials.reddit = fileCredentials.reddit;
      if (fileCredentials.facebook) credentials.facebook = fileCredentials.facebook;
      if (fileCredentials.twitter) credentials.twitter = fileCredentials.twitter;
    } catch (error) {
      console.error('Warning: Could not parse credentials file');
    }
  }

  return credentials;
}

/**
 * Save credentials to file
 */
export function saveCredentials(credentials: Credentials): void {
  ensureConfigDir();

  // Load existing credentials and merge
  let existing: Credentials = {};
  if (fs.existsSync(CREDENTIALS_FILE)) {
    try {
      existing = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf-8'));
    } catch {
      // Ignore parse errors
    }
  }

  const merged = { ...existing, ...credentials };

  fs.writeFileSync(
    CREDENTIALS_FILE,
    JSON.stringify(merged, null, 2),
    { mode: 0o600 }
  );
}

/**
 * Get Reddit credentials
 */
export function getRedditCredentials(): RedditCredentials | null {
  const creds = loadCredentials();
  return creds.reddit || null;
}

/**
 * Set Reddit credentials
 */
export function setRedditCredentials(username: string, password: string): void {
  saveCredentials({ reddit: { username, password } });
}

/**
 * Get Twitter credentials
 */
export function getTwitterCredentials(): TwitterCredentials | null {
  const creds = loadCredentials();
  return creds.twitter || null;
}

/**
 * Set Twitter credentials
 */
export function setTwitterCredentials(username: string, password: string): void {
  saveCredentials({ twitter: { username, password } });
}

/**
 * Get Facebook credentials
 */
export function getFacebookCredentials(): FacebookCredentials | null {
  const creds = loadCredentials();
  return creds.facebook || null;
}

/**
 * Set Facebook credentials
 */
export function setFacebookCredentials(email: string, password: string): void {
  saveCredentials({ facebook: { email, password } });
}

/**
 * Load a campaign from a JSON file
 */
export function loadCampaign(filepath: string): Campaign {
  if (!fs.existsSync(filepath)) {
    throw new Error(`Campaign file not found: ${filepath}`);
  }

  const content = fs.readFileSync(filepath, 'utf-8');
  return JSON.parse(content) as Campaign;
}

/**
 * Load a test flow from a JSON file
 */
export function loadTestFlow(filepath: string): any {
  if (!fs.existsSync(filepath)) {
    throw new Error(`Test flow file not found: ${filepath}`);
  }

  const content = fs.readFileSync(filepath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Get the config directory path
 */
export function getConfigDir(): string {
  return CONFIG_DIR;
}

/**
 * Check if credentials exist for a platform
 */
export function hasCredentials(platform: 'reddit' | 'facebook' | 'twitter'): boolean {
  const creds = loadCredentials();
  return !!creds[platform];
}
