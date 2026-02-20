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

  CREATE TABLE IF NOT EXISTS flashcards (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    page_number INTEGER NOT NULL,
    source_snippet TEXT NOT NULL,
    question TEXT NOT NULL,
    options TEXT NOT NULL, -- JSON array
    correct_answer TEXT NOT NULL,
    explanation TEXT NOT NULL,
    FOREIGN KEY (document_id) REFERENCES documents (id)
  );

  CREATE TABLE IF NOT EXISTS user_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flashcard_id TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (flashcard_id) REFERENCES flashcards (id)
  );
`);
