import Database from 'better-sqlite3';

const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './dev.db';

export const db = new Database(dbPath);

// Initialize schema
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id TEXT NOT NULL,
    page_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    FOREIGN KEY (document_id) REFERENCES documents (id)
  );

  CREATE TABLE IF NOT EXISTS concepts (
    id TEXT PRIMARY KEY,
    document_id TEXT,
    name TEXT NOT NULL,
    topic TEXT NOT NULL DEFAULT 'General',
    description TEXT NOT NULL DEFAULT '',
    bloom_mastery INTEGER NOT NULL DEFAULT 1,
    mastery_score REAL NOT NULL DEFAULT 0.0,
    correct_streak INTEGER NOT NULL DEFAULT 0,
    last_reviewed DATETIME,
    review_count INTEGER NOT NULL DEFAULT 0,
    source_chunk_ids TEXT NOT NULL DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents (id)
  );

  CREATE TABLE IF NOT EXISTS flashcards (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    concept_id TEXT,
    page_number INTEGER NOT NULL,
    source_snippet TEXT NOT NULL,
    question TEXT NOT NULL,
    options TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    explanation TEXT NOT NULL,
    bloom_level INTEGER NOT NULL DEFAULT 1,
    difficulty INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (document_id) REFERENCES documents (id),
    FOREIGN KEY (concept_id) REFERENCES concepts (id)
  );

  CREATE TABLE IF NOT EXISTS user_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flashcard_id TEXT NOT NULL,
    concept_id TEXT,
    is_correct BOOLEAN NOT NULL,
    confidence_before INTEGER DEFAULT 50,
    bloom_level INTEGER DEFAULT 1,
    time_taken_ms INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    coins_earned INTEGER DEFAULT 0,
    calibration_accuracy REAL DEFAULT 0.0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (flashcard_id) REFERENCES flashcards (id),
    FOREIGN KEY (concept_id) REFERENCES concepts (id)
  );

  CREATE TABLE IF NOT EXISTS player_resources (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    coins INTEGER NOT NULL DEFAULT 0,
    total_coins_earned INTEGER NOT NULL DEFAULT 0,
    total_coins_spent INTEGER NOT NULL DEFAULT 0
  );

  INSERT OR IGNORE INTO player_resources (id, coins) VALUES (1, 0);
`);
