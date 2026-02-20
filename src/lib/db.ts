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

    // Deterministic concept IDs — 5 core + 17 sub-concepts for a rich dashboard
    const concepts = [
      // 5 Core concepts
      { id: 'concept-scm', name: "Supply Chain Management", topic: "Operations", desc: "Active management of activities to maximize customer value and coordinate logistics.", chunkIdx: 0 },
      { id: 'concept-jit', name: "Just-in-Time (JIT)", topic: "Operations", desc: "Methodology to reduce times and smooth material flow to arrive precisely when needed.", chunkIdx: 1 },
      { id: 'concept-lean', name: "Lean Manufacturing", topic: "Operations", desc: "Production method focused on minimizing waste (muda) while respecting people.", chunkIdx: 2 },
      { id: 'concept-6sig', name: "Six Sigma", topic: "Operations", desc: "Empirical techniques for process improvement and minimizing manufacturing variability.", chunkIdx: 3 },
      { id: 'concept-ops', name: "Operations Management", topic: "Operations", desc: "Designing and controlling production processes to efficiently meet customer requirements.", chunkIdx: 4 },
      // SCM sub-concepts
      { id: 'concept-scm-goals', name: "SCM Core Goals", topic: "Supply Chain Management", desc: "Maximizing customer value and achieving sustainable competitive advantage through active supply chain management.", chunkIdx: 0 },
      { id: 'concept-scm-scope', name: "SCM Activity Scope", topic: "Supply Chain Management", desc: "SCM covers product development, sourcing, production, logistics, and coordination information systems.", chunkIdx: 0 },
      { id: 'concept-scm-ops', name: "SCM Operational Principles", topic: "Supply Chain Management", desc: "Developing and operating supply chains using the most effective and efficient methods possible.", chunkIdx: 0 },
      // JIT sub-concepts
      { id: 'concept-jit-mfg', name: "Just-in-Time Manufacturing", topic: "Production Systems", desc: "A manufacturing methodology focused on reducing production and response times by synchronizing material arrival.", chunkIdx: 1 },
      { id: 'concept-inv-cost', name: "Inventory Cost Reduction", topic: "Operations Management", desc: "Minimizing excess stock and holding costs by ensuring materials arrive precisely when needed.", chunkIdx: 1 },
      // Lean sub-concepts
      { id: 'concept-lean-ovw', name: "Lean Manufacturing Overview", topic: "Production Management", desc: "A production methodology focused on reducing system and response times to improve efficiency.", chunkIdx: 2 },
      { id: 'concept-muda', name: "Waste Minimization (Muda)", topic: "Lean Principles", desc: "Identifying and eliminating any activity that does not add value from the customer's perspective.", chunkIdx: 2 },
      { id: 'concept-kaizen', name: "Continuous Improvement (Kaizen)", topic: "Lean Principles", desc: "Ongoing incremental improvement across all processes and operations within an organization.", chunkIdx: 2 },
      // Six Sigma sub-concepts
      { id: 'concept-6sig-pi', name: "Six Sigma Process Improvement", topic: "Quality Management", desc: "Improving process quality by identifying and removing defects and minimizing variability.", chunkIdx: 3 },
      { id: 'concept-defect', name: "Defect Reduction & Variability", topic: "Six Sigma Principles", desc: "Reducing defects and minimizing process variability to achieve higher quality output.", chunkIdx: 3 },
      { id: 'concept-stat', name: "Empirical Statistical Methods", topic: "Six Sigma Methodology", desc: "Utilizing empirical and statistical methods for analyzing and improving process performance.", chunkIdx: 3 },
      // Ops sub-concepts
      { id: 'concept-ops-def', name: "Operations Management Definition", topic: "Business Management", desc: "The field of management focused on designing, controlling, and redesigning production processes.", chunkIdx: 4 },
      { id: 'concept-eff', name: "Operational Efficiency", topic: "Operations Management Principles", desc: "Minimizing resource usage in production processes while maintaining output quality.", chunkIdx: 4 },
      { id: 'concept-effect', name: "Operational Effectiveness", topic: "Operations Management Principles", desc: "Ensuring production processes successfully meet customer requirements.", chunkIdx: 4 },
      { id: 'concept-proc', name: "Defined Production Processes", topic: "Process Management", desc: "Having clearly defined and well-managed processes to ensure consistency and quality.", chunkIdx: 4 },
      { id: 'concept-perf', name: "Performance & Integrity Criteria", topic: "Quality Standards", desc: "Establishing clear performance and integrity criteria for evaluating products and services.", chunkIdx: 4 },
      { id: 'concept-qr', name: "Quality Record Identification", topic: "Documentation & Traceability", desc: "Managing records for evidence of quality fulfillment and ensuring traceability.", chunkIdx: 4 },
    ];

    // Pre-baked flashcards — 5 per core concept, 2 per sub-concept
    const flashcards = [
      // === CORE: Supply Chain Management ===
      { cid: 'concept-scm', page: 1, q: "What is the main goal of supply chain management?", a: "To maximize customer value and achieve a sustainable competitive advantage by managing supply chain activities effectively.", ci: 0 },
      { cid: 'concept-scm', page: 1, q: "What kinds of activities does supply chain management cover?", a: "Product development, sourcing, production, logistics, and the information systems needed to coordinate them.", ci: 0 },
      { cid: 'concept-scm', page: 1, q: "Why would a company invest in improving its supply chain?", a: "To run supply chains more effectively and efficiently, giving them a competitive advantage.", ci: 0 },
      { cid: 'concept-scm', page: 1, q: "How does supply chain management create competitive advantage?", a: "By consciously developing and running supply chains in the most effective and efficient ways possible.", ci: 0 },
      { cid: 'concept-scm', page: 1, q: "What role do information systems play in supply chain management?", a: "They coordinate the various activities across the supply chain, from product development through logistics.", ci: 0 },
      // === CORE: JIT ===
      { cid: 'concept-jit', page: 1, q: "What is the core idea behind Just-in-Time manufacturing?", a: "Materials arrive exactly when needed in the production process, minimizing inventory and storage costs.", ci: 1 },
      { cid: 'concept-jit', page: 1, q: "Where did JIT manufacturing originate?", a: "It originated mainly in Japan in the 1960s-70s, particularly at Toyota.", ci: 1 },
      { cid: 'concept-jit', page: 1, q: "What problem does JIT primarily try to solve?", a: "Reducing production times and response times while minimizing inventory costs.", ci: 1 },
      { cid: 'concept-jit', page: 1, q: "How does JIT affect inventory levels?", a: "It dramatically reduces inventory because materials flow in just as they are needed.", ci: 1 },
      { cid: 'concept-jit', page: 1, q: "Why is JIT also called the Toyota Production System?", a: "Because Toyota was the primary developer of this methodology.", ci: 1 },
      // === CORE: Lean ===
      { cid: 'concept-lean', page: 2, q: "What does 'waste' (muda) mean in Lean Manufacturing?", a: "Any activity that does not add value from the customer's perspective.", ci: 2 },
      { cid: 'concept-lean', page: 2, q: "What are the two main principles of Lean?", a: "Continuous improvement (kaizen) and respect for people.", ci: 2 },
      { cid: 'concept-lean', page: 2, q: "How does Lean differ from simply cutting costs?", a: "Lean eliminates waste without sacrificing productivity — efficiency, not just spending less.", ci: 2 },
      { cid: 'concept-lean', page: 2, q: "What is kaizen?", a: "Continuous improvement — the ongoing effort to improve processes, products, and services.", ci: 2 },
      { cid: 'concept-lean', page: 2, q: "How is Lean related to total quality management?", a: "They are closely related — both focus on improving production quality and reducing waste.", ci: 2 },
      // === CORE: Six Sigma ===
      { cid: 'concept-6sig', page: 2, q: "What is the primary goal of Six Sigma?", a: "To improve process quality by identifying and removing causes of defects and minimizing variability.", ci: 3 },
      { cid: 'concept-6sig', page: 2, q: "Who introduced Six Sigma?", a: "Bill Smith at Motorola in 1986.", ci: 3 },
      { cid: 'concept-6sig', page: 2, q: "What methods does Six Sigma rely on?", a: "Empirical and statistical methods for quality management.", ci: 3 },
      { cid: 'concept-6sig', page: 2, q: "What does Six Sigma minimize?", a: "Variability in manufacturing and business processes that leads to defects.", ci: 3 },
      { cid: 'concept-6sig', page: 2, q: "How does Six Sigma organize people?", a: "It creates a special infrastructure of trained people dedicated to process improvement.", ci: 3 },
      // === CORE: Operations Management ===
      { cid: 'concept-ops', page: 3, q: "What is the core focus of operations management?", a: "Designing, controlling, and redesigning production processes for goods and services.", ci: 4 },
      { cid: 'concept-ops', page: 3, q: "What does operations management try to balance?", a: "Efficiency (few resources) and effectiveness (meeting customer requirements).", ci: 4 },
      { cid: 'concept-ops', page: 3, q: "What do operations managers do?", a: "Coordinate and develop new production processes while evaluating existing ones.", ci: 4 },
      { cid: 'concept-ops', page: 3, q: "Why is ops management relevant to both products and services?", a: "Both involve production processes needing design, control, and improvement.", ci: 4 },
      { cid: 'concept-ops', page: 3, q: "How does operations management help customer satisfaction?", a: "By ensuring operations effectively meet customer requirements through well-designed processes.", ci: 4 },
      // === SUB-CONCEPTS (2 cards each) ===
      { cid: 'concept-scm-goals', page: 1, q: "What are the two core goals of SCM?", a: "Maximizing customer value and achieving sustainable competitive advantage.", ci: 0 },
      { cid: 'concept-scm-goals', page: 1, q: "Why is competitive advantage a goal of SCM?", a: "Effective supply chains allow firms to outperform competitors through better efficiency and service.", ci: 0 },
      { cid: 'concept-scm-scope', page: 1, q: "Name three types of activities within SCM's scope.", a: "Product development, sourcing, and logistics coordination.", ci: 0 },
      { cid: 'concept-scm-scope', page: 1, q: "Why do information systems matter in SCM?", a: "They coordinate all supply chain activities from development through delivery.", ci: 0 },
      { cid: 'concept-scm-ops', page: 1, q: "What does 'conscious effort' mean in the context of SCM?", a: "Firms deliberately plan and optimize their supply chains rather than letting them evolve randomly.", ci: 0 },
      { cid: 'concept-scm-ops', page: 1, q: "How should supply chains ideally be run?", a: "In the most effective and efficient ways possible, through deliberate management.", ci: 0 },
      { cid: 'concept-jit-mfg', page: 1, q: "What makes JIT a 'manufacturing methodology'?", a: "It's a systematic approach to production focused on timing material flow to match production needs.", ci: 1 },
      { cid: 'concept-jit-mfg', page: 1, q: "How does JIT synchronize material arrival?", a: "Materials are scheduled to arrive exactly when they're needed in the production process.", ci: 1 },
      { cid: 'concept-inv-cost', page: 1, q: "How does JIT reduce inventory costs?", a: "By eliminating excess stock — materials arrive just when needed, avoiding storage costs.", ci: 1 },
      { cid: 'concept-inv-cost', page: 1, q: "What is a holding cost in inventory management?", a: "The cost of storing unsold goods — warehousing, insurance, depreciation, etc.", ci: 1 },
      { cid: 'concept-lean-ovw', page: 2, q: "What is Lean Manufacturing's primary aim?", a: "Reducing system and response times to improve overall efficiency.", ci: 2 },
      { cid: 'concept-lean-ovw', page: 2, q: "How does Lean relate to customer satisfaction?", a: "By reducing response times and improving efficiency, customers get better and faster service.", ci: 2 },
      { cid: 'concept-muda', page: 2, q: "Give an example of 'muda' in a business process.", a: "Overproduction, waiting time, unnecessary transport — any activity that doesn't add customer value.", ci: 2 },
      { cid: 'concept-muda', page: 2, q: "Who defines what counts as 'waste' in Lean?", a: "The customer's perspective — if they wouldn't pay for it, it's waste.", ci: 2 },
      { cid: 'concept-kaizen', page: 2, q: "Is kaizen about big changes or small ones?", a: "Small, continuous, incremental improvements over time — not dramatic overhauls.", ci: 2 },
      { cid: 'concept-kaizen', page: 2, q: "How does kaizen contribute to Lean Manufacturing?", a: "It drives ongoing improvement that steadily reduces waste and increases efficiency.", ci: 2 },
      { cid: 'concept-6sig-pi', page: 2, q: "How does Six Sigma approach process improvement?", a: "By systematically identifying defect causes and removing them using data-driven methods.", ci: 3 },
      { cid: 'concept-6sig-pi', page: 2, q: "What distinguishes Six Sigma from other quality methods?", a: "Its heavy reliance on empirical data and statistical analysis for decision-making.", ci: 3 },
      { cid: 'concept-defect', page: 2, q: "Why is variability a problem in manufacturing?", a: "Inconsistent processes lead to defects and unpredictable quality in outputs.", ci: 3 },
      { cid: 'concept-defect', page: 2, q: "How does reducing variability improve quality?", a: "Consistent processes produce uniform outputs, resulting in fewer defects.", ci: 3 },
      { cid: 'concept-stat', page: 2, q: "Why are statistical methods central to Six Sigma?", a: "They provide objective, data-driven insights into process performance and improvement opportunities.", ci: 3 },
      { cid: 'concept-stat', page: 2, q: "What kind of data does Six Sigma analyze?", a: "Empirical data from manufacturing and business processes to identify patterns and defects.", ci: 3 },
      { cid: 'concept-ops-def', page: 3, q: "What distinguishes operations management from other management fields?", a: "Its specific focus on production processes — how goods and services are created and delivered.", ci: 4 },
      { cid: 'concept-ops-def', page: 3, q: "Does operations management only apply to manufacturing?", a: "No — it applies to any organization that produces goods OR provides services.", ci: 4 },
      { cid: 'concept-eff', page: 3, q: "What does operational efficiency mean?", a: "Using as few resources as needed to produce the desired output.", ci: 4 },
      { cid: 'concept-eff', page: 3, q: "Give an example of improving operational efficiency.", a: "Reducing material waste in production while maintaining the same output quality.", ci: 4 },
      { cid: 'concept-effect', page: 3, q: "What does operational effectiveness mean?", a: "Successfully meeting customer requirements through production processes.", ci: 4 },
      { cid: 'concept-effect', page: 3, q: "How is effectiveness different from efficiency?", a: "Efficiency is about resource use; effectiveness is about meeting customer needs.", ci: 4 },
      { cid: 'concept-proc', page: 3, q: "Why are defined processes important for quality?", a: "Clear, well-managed processes ensure consistency and make quality requirements achievable.", ci: 4 },
      { cid: 'concept-proc', page: 3, q: "What happens without defined production processes?", a: "Inconsistency, unpredictable quality, and difficulty meeting standards.", ci: 4 },
      { cid: 'concept-perf', page: 3, q: "Why set performance criteria?", a: "To have clear benchmarks for evaluating whether products/services meet quality standards.", ci: 4 },
      { cid: 'concept-perf', page: 3, q: "What is 'integrity criteria' in quality management?", a: "Standards ensuring products/services are complete, accurate, and meet specifications.", ci: 4 },
      { cid: 'concept-qr', page: 3, q: "Why are quality records important?", a: "They provide evidence that quality requirements have been met and enable traceability.", ci: 4 },
      { cid: 'concept-qr', page: 3, q: "What does 'traceability' mean in quality control?", a: "The ability to track a product or process back through its production history.", ci: 4 },
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
        insertConcept.run(c.id, docId, c.name, c.topic, c.desc, JSON.stringify([chunkIds[c.chunkIdx]]));
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
