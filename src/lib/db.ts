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
    processed_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
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
    needs_generation_level INTEGER NOT NULL DEFAULT 1, -- Tracks if we need to generate new cards for this concept
    source_chunk_ids TEXT NOT NULL DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents (id)
  );

  CREATE TABLE IF NOT EXISTS flashcards (
    id TEXT PRIMARY KEY,
    document_id TEXT,
    concept_id TEXT,
    page_number INTEGER,
    source_snippet TEXT,
    question TEXT NOT NULL,
    explanation TEXT NOT NULL,
    bloom_level INTEGER NOT NULL DEFAULT 1,
    difficulty INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    amount INTEGER NOT NULL DEFAULT 0
  );
`);

import crypto from 'crypto';

export function seedDemoDatabase() {
  try {
    // Check if documents table is empty
    const docCount = db.prepare("SELECT COUNT(*) as c FROM documents").get() as { c: number };
    if (docCount.c > 0) return; // Already seeded or has data

    console.log("Seeding Demo Database with Business Operations Course...");

    const docId = crypto.randomUUID();
    db.prepare("INSERT INTO documents (id, name) VALUES (?, ?)").run(docId, "Business Operations & Supply Chain Management");

    // Add robust Business Operations chunks
    const chunks = [
      { page: 1, text: "Supply Chain Management (SCM) is the active management of supply chain activities to maximize customer value and achieve a sustainable competitive advantage. It represents a conscious effort by the supply chain firms to develop and run supply chains in the most effective and efficient ways possible. Supply chain activities cover everything from product development, sourcing, production, and logistics, as well as the information systems needed to coordinate these activities." },
      { page: 1, text: "Just-in-Time (JIT) manufacturing, also known as the Toyota Production System (TPS), is a methodology aimed primarily at reducing times within the production system as well as response times from suppliers and to customers. Its origin and development was mainly in Japan, largely in the 1960s and 1970s and particularly at Toyota. JIT manufacturing tries to smooth the flow of material to arrive just as it is needed, minimizing inventory costs." },
      { page: 2, text: "Lean Manufacturing is a production method aimed at reducing times within the production system as well as response times from suppliers and to customers. It is closely related to another concept called total quality management. Lean principles focus on minimizing waste (muda) without sacrificing productivity. Waste is defined as any activity that does not add value from the customer's perspective. Lean emphasizes continuous improvement (kaizen) and respect for people." },
      { page: 2, text: "Six Sigma is a set of techniques and tools for process improvement. It was introduced by American engineer Bill Smith while working at Motorola in 1986. Six Sigma seeks to improve the quality of the output of a process by identifying and removing the causes of defects and minimizing variability in manufacturing and business processes. It uses a set of quality management methods, mainly empirical, statistical methods, and creates a special infrastructure of people within the organization." },
      { page: 3, text: "Quality Control (QC) is a process by which entities review the quality of all factors involved in production. ISO 9000 defines quality control as A part of quality management focused on fulfilling quality requirements. This approach places an emphasis on three aspects: elements such as controls, job management, defined and well managed processes, performance and integrity criteria, and identification of records." },
      { page: 3, text: "Operations Management is an area of management concerned with designing and controlling the process of production and redesigning business operations in the production of goods or services. It involves the responsibility of ensuring that business operations are efficient in terms of using as few resources as needed and effective in terms of meeting customer requirements. Operations managers are involved in coordinating and developing new processes while evaluating current structures." }
    ];

    const insertChunk = db.prepare("INSERT INTO chunks (document_id, page_number, content) VALUES (?, ?, ?)");
    
    // Extracted concepts to kickstart the Generate Queue
    const concepts = [
      { name: "Supply Chain Management", desc: "Active management of activities to maximize customer value and coordinate logistics." },
      { name: "Just-in-Time (JIT)", desc: "Methodology to reduce times and smooth material flow to arrive precisely when needed." },
      { name: "Lean Manufacturing", desc: "Production method focused on minimizing waste (muda) while respecting people." },
      { name: "Six Sigma", desc: "Empirical techniques for process improvement and minimizing manufacturing variability." },
      { name: "Operations Management", desc: "Designing and controlling production processes to efficiently meet customer requirements." }
    ];

    const insertConcept = db.prepare("INSERT INTO concepts (id, document_id, name, topic, description, bloom_mastery) VALUES (?, ?, ?, ?, ?, ?)");

    db.transaction(() => {
      chunks.forEach(c => insertChunk.run(docId, c.page, c.text));
      concepts.forEach(c => insertConcept.run(crypto.randomUUID(), docId, c.name, "Operations", c.desc, 1));
    })();

    // Pre-seed Capital to 100 so the UI isn't completely at 0
    db.prepare("INSERT INTO player_resources (id, player_id, resource_type, amount) VALUES (?, ?, ?, ?)").run(crypto.randomUUID(), 'default_player', 'capital', 100);

    console.log("Demo Database successfully seeded. The background queue will begin processing these chunks shortly.");
  } catch (err) {
    console.error("Error seeding demo database:", err);
  }
}

// Auto-seed on load
seedDemoDatabase();
