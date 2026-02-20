import Database from 'better-sqlite3';

const isVercel = process.env.VERCEL === '1';
const dbPath = process.env.DATABASE_URL?.replace('file:', '') || (isVercel ? '/tmp/dev.db' : './dev.db');

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
    const docCount = db.prepare("SELECT COUNT(*) as c FROM documents").get() as { c: number };
    if (docCount.c > 0) return;

    console.log("Seeding Demo Database with Business Operations Course...");

    const docId = 'demo-doc-001';
    db.prepare("INSERT INTO documents (id, name) VALUES (?, ?)").run(docId, "Business Operations & Supply Chain Management");

    const chunks = [
      { page: 1, text: "Supply Chain Management (SCM) is the active management of supply chain activities to maximize customer value and achieve a sustainable competitive advantage. It represents a conscious effort by the supply chain firms to develop and run supply chains in the most effective and efficient ways possible. Supply chain activities cover everything from product development, sourcing, production, and logistics, as well as the information systems needed to coordinate these activities." },
      { page: 1, text: "Just-in-Time (JIT) manufacturing, also known as the Toyota Production System (TPS), is a methodology aimed primarily at reducing times within the production system as well as response times from suppliers and to customers. Its origin and development was mainly in Japan, largely in the 1960s and 1970s and particularly at Toyota. JIT manufacturing tries to smooth the flow of material to arrive just as it is needed, minimizing inventory costs." },
      { page: 2, text: "Lean Manufacturing is a production method aimed at reducing times within the production system as well as response times from suppliers and to customers. It is closely related to another concept called total quality management. Lean principles focus on minimizing waste (muda) without sacrificing productivity. Waste is defined as any activity that does not add value from the customer's perspective. Lean emphasizes continuous improvement (kaizen) and respect for people." },
      { page: 2, text: "Six Sigma is a set of techniques and tools for process improvement. It was introduced by American engineer Bill Smith while working at Motorola in 1986. Six Sigma seeks to improve the quality of the output of a process by identifying and removing the causes of defects and minimizing variability in manufacturing and business processes. It uses a set of quality management methods, mainly empirical, statistical methods, and creates a special infrastructure of people within the organization." },
      { page: 3, text: "Operations Management is an area of management concerned with designing and controlling the process of production and redesigning business operations in the production of goods or services. It involves the responsibility of ensuring that business operations are efficient in terms of using as few resources as needed and effective in terms of meeting customer requirements. Operations managers are involved in coordinating and developing new processes while evaluating current structures." }
    ];

    // Deterministic concept IDs for pre-seeded flashcards
    const concepts = [
      { id: 'concept-scm', name: "Supply Chain Management", desc: "Active management of activities to maximize customer value and coordinate logistics.", chunkIdx: 0 },
      { id: 'concept-jit', name: "Just-in-Time (JIT)", desc: "Methodology to reduce times and smooth material flow to arrive precisely when needed.", chunkIdx: 1 },
      { id: 'concept-lean', name: "Lean Manufacturing", desc: "Production method focused on minimizing waste (muda) while respecting people.", chunkIdx: 2 },
      { id: 'concept-6sig', name: "Six Sigma", desc: "Empirical techniques for process improvement and minimizing manufacturing variability.", chunkIdx: 3 },
      { id: 'concept-ops', name: "Operations Management", desc: "Designing and controlling production processes to efficiently meet customer requirements.", chunkIdx: 4 }
    ];

    // Pre-baked flashcards — 5 per concept, ready for immediate study
    const flashcards = [
      // Supply Chain Management
      { cid: 'concept-scm', page: 1, q: "What is the main goal of supply chain management?", a: "To maximize customer value and achieve a sustainable competitive advantage by managing supply chain activities effectively.", ci: 0 },
      { cid: 'concept-scm', page: 1, q: "What kinds of activities does supply chain management cover?", a: "Product development, sourcing, production, logistics, and the information systems needed to coordinate them.", ci: 0 },
      { cid: 'concept-scm', page: 1, q: "Why would a company invest in improving its supply chain?", a: "To run supply chains more effectively and efficiently, giving them a competitive advantage and better serving customers.", ci: 0 },
      { cid: 'concept-scm', page: 1, q: "How does supply chain management create competitive advantage?", a: "By consciously developing and running supply chains in the most effective and efficient ways possible.", ci: 0 },
      { cid: 'concept-scm', page: 1, q: "What role do information systems play in supply chain management?", a: "They coordinate the various activities across the supply chain, from product development through logistics.", ci: 0 },
      // JIT
      { cid: 'concept-jit', page: 1, q: "What is the core idea behind Just-in-Time manufacturing?", a: "Materials arrive exactly when needed in the production process, minimizing inventory and storage costs.", ci: 1 },
      { cid: 'concept-jit', page: 1, q: "Where did JIT manufacturing originate and develop?", a: "It originated mainly in Japan in the 1960s-70s, particularly at Toyota, also known as the Toyota Production System.", ci: 1 },
      { cid: 'concept-jit', page: 1, q: "What problem does JIT manufacturing primarily try to solve?", a: "Reducing production times and response times from suppliers and to customers, while minimizing inventory costs.", ci: 1 },
      { cid: 'concept-jit', page: 1, q: "How does JIT affect a company's inventory levels?", a: "It dramatically reduces inventory because materials flow in just as they are needed, rather than being stockpiled.", ci: 1 },
      { cid: 'concept-jit', page: 1, q: "Why is JIT also called the Toyota Production System?", a: "Because Toyota was the primary developer of this methodology in Japan during the 1960s and 1970s.", ci: 1 },
      // Lean Manufacturing
      { cid: 'concept-lean', page: 2, q: "What does 'waste' (muda) mean in Lean Manufacturing?", a: "Any activity that does not add value from the customer's perspective is considered waste.", ci: 2 },
      { cid: 'concept-lean', page: 2, q: "What are the two main principles that Lean Manufacturing emphasizes?", a: "Continuous improvement (kaizen) and respect for people.", ci: 2 },
      { cid: 'concept-lean', page: 2, q: "How does Lean Manufacturing differ from simply cutting costs?", a: "Lean focuses on eliminating waste without sacrificing productivity — it's about efficiency, not just spending less.", ci: 2 },
      { cid: 'concept-lean', page: 2, q: "What is kaizen and why is it important in Lean?", a: "Kaizen means continuous improvement — it's the ongoing effort to improve processes, products, and services.", ci: 2 },
      { cid: 'concept-lean', page: 2, q: "How is Lean Manufacturing related to total quality management?", a: "They are closely related approaches — both focus on improving production quality and reducing waste.", ci: 2 },
      // Six Sigma
      { cid: 'concept-6sig', page: 2, q: "What is the primary goal of Six Sigma?", a: "To improve process quality by identifying and removing causes of defects and minimizing variability.", ci: 3 },
      { cid: 'concept-6sig', page: 2, q: "Who introduced Six Sigma and where?", a: "Bill Smith, an American engineer, introduced it while working at Motorola in 1986.", ci: 3 },
      { cid: 'concept-6sig', page: 2, q: "What methods does Six Sigma primarily rely on?", a: "Empirical and statistical methods for quality management and process improvement.", ci: 3 },
      { cid: 'concept-6sig', page: 2, q: "What does Six Sigma try to minimize in business processes?", a: "Variability — the inconsistency in manufacturing and business process outputs that leads to defects.", ci: 3 },
      { cid: 'concept-6sig', page: 2, q: "How does Six Sigma organize people within a company?", a: "It creates a special infrastructure of trained people within the organization dedicated to process improvement.", ci: 3 },
      // Operations Management
      { cid: 'concept-ops', page: 3, q: "What is the core focus of operations management?", a: "Designing, controlling, and redesigning the production processes for goods and services.", ci: 4 },
      { cid: 'concept-ops', page: 3, q: "What two things does operations management try to balance?", a: "Efficiency (using as few resources as needed) and effectiveness (meeting customer requirements).", ci: 4 },
      { cid: 'concept-ops', page: 3, q: "What role do operations managers play in a company?", a: "They coordinate and develop new production processes while evaluating and improving existing ones.", ci: 4 },
      { cid: 'concept-ops', page: 3, q: "Why is operations management relevant to both products and services?", a: "Both involve production processes that need designing, controlling, and improving for efficiency.", ci: 4 },
      { cid: 'concept-ops', page: 3, q: "How does operations management contribute to customer satisfaction?", a: "By ensuring business operations effectively meet customer requirements through well-designed processes.", ci: 4 },
    ];

    const insertChunk = db.prepare("INSERT INTO chunks (document_id, page_number, content, processed_status) VALUES (?, ?, ?, 'completed')");
    const insertConcept = db.prepare("INSERT INTO concepts (id, document_id, name, topic, description, bloom_mastery, needs_generation_level, source_chunk_ids) VALUES (?, ?, ?, ?, ?, 1, 2, ?)");
    const insertFlashcard = db.prepare("INSERT INTO flashcards (id, document_id, concept_id, page_number, source_snippet, question, explanation, bloom_level) VALUES (?, ?, ?, ?, ?, ?, ?, 1)");

    db.transaction(() => {
      const chunkIds: number[] = [];
      chunks.forEach((c, i) => {
        const info = insertChunk.run(docId, c.page, c.text);
        chunkIds.push(Number(info.lastInsertRowid));
      });

      concepts.forEach(c => {
        insertConcept.run(c.id, docId, c.name, "Operations", c.desc, JSON.stringify([chunkIds[c.chunkIdx]]));
      });

      flashcards.forEach((f, i) => {
        insertFlashcard.run(`flash-${i+1}`, docId, f.cid, f.page, chunks[f.ci].text, f.q, f.a);
      });
    })();

    db.prepare("INSERT INTO player_resources (id, player_id, resource_type, amount) VALUES (?, ?, ?, ?)").run('res-capital', 'default_player', 'capital', 100);

    console.log("Demo Database seeded with 25 pre-built flashcards across 5 concepts.");
  } catch (err) {
    console.error("Error seeding demo database:", err);
  }
}

// Auto-seed on load
seedDemoDatabase();
