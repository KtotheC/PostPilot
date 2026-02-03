import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.postpilot');
const DB_PATH = path.join(CONFIG_DIR, 'postpilot.db');

export interface PostRecord {
  id?: number;
  platform: string;
  subreddit?: string;
  title: string;
  body?: string;
  url?: string;
  post_url?: string;
  verified: boolean;
  created_at: string;
}

export interface TestRecord {
  id?: number;
  flow_name: string;
  base_url: string;
  passed: number;
  failed: number;
  total: number;
  duration_ms: number;
  created_at: string;
}

let db: Database.Database | null = null;

/**
 * Initialize the database and create tables
 */
export function initDatabase(): Database.Database {
  // Ensure config directory exists
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }

  db = new Database(DB_PATH);

  // Create posts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      subreddit TEXT,
      title TEXT NOT NULL,
      body TEXT,
      url TEXT,
      post_url TEXT,
      verified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create test_runs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS test_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flow_name TEXT NOT NULL,
      base_url TEXT NOT NULL,
      passed INTEGER DEFAULT 0,
      failed INTEGER DEFAULT 0,
      total INTEGER DEFAULT 0,
      duration_ms INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create index for faster lookups
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_posts_platform ON posts(platform);
    CREATE INDEX IF NOT EXISTS idx_posts_subreddit ON posts(subreddit);
    CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at);
    CREATE INDEX IF NOT EXISTS idx_tests_flow ON test_runs(flow_name);
  `);

  return db;
}

/**
 * Get the database instance
 */
export function getDatabase(): Database.Database {
  if (!db) {
    db = initDatabase();
  }
  return db;
}

/**
 * Record a post
 */
export function recordPost(post: PostRecord): number {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO posts (platform, subreddit, title, body, url, post_url, verified, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    post.platform,
    post.subreddit || null,
    post.title,
    post.body || null,
    post.url || null,
    post.post_url || null,
    post.verified ? 1 : 0,
    post.created_at || new Date().toISOString()
  );

  return result.lastInsertRowid as number;
}

/**
 * Update post verification status
 */
export function updatePostVerification(id: number, verified: boolean, postUrl?: string): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE posts SET verified = ?, post_url = ? WHERE id = ?
  `);
  stmt.run(verified ? 1 : 0, postUrl || null, id);
}

/**
 * Check if a post already exists (prevent duplicates)
 */
export function postExists(platform: string, subreddit: string, title: string, hoursBack = 24): boolean {
  const db = getDatabase();
  const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

  const stmt = db.prepare(`
    SELECT COUNT(*) as count FROM posts
    WHERE platform = ? AND subreddit = ? AND title = ? AND created_at > ?
  `);

  const result = stmt.get(platform, subreddit, title, cutoff) as { count: number };
  return result.count > 0;
}

/**
 * Get recent posts
 */
export function getRecentPosts(limit = 20): PostRecord[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM posts ORDER BY created_at DESC LIMIT ?
  `);
  return stmt.all(limit) as PostRecord[];
}

/**
 * Get posts by subreddit
 */
export function getPostsBySubreddit(subreddit: string, limit = 10): PostRecord[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM posts WHERE subreddit = ? ORDER BY created_at DESC LIMIT ?
  `);
  return stmt.all(subreddit, limit) as PostRecord[];
}

/**
 * Record a test run
 */
export function recordTestRun(test: TestRecord): number {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO test_runs (flow_name, base_url, passed, failed, total, duration_ms, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    test.flow_name,
    test.base_url,
    test.passed,
    test.failed,
    test.total,
    test.duration_ms,
    test.created_at || new Date().toISOString()
  );

  return result.lastInsertRowid as number;
}

/**
 * Get recent test runs
 */
export function getRecentTestRuns(limit = 20): TestRecord[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM test_runs ORDER BY created_at DESC LIMIT ?
  `);
  return stmt.all(limit) as TestRecord[];
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
