import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  let db;
  try {
    // Dynamic import to catch SQLite native binary loading errors on Vercel
    const dbModule = require("@/lib/db");
    db = dbModule.db;
  } catch (err: any) {
    console.error("Failed to load SQLite:", err);
    return NextResponse.json({ error: "Database failed to load on Vercel: " + err.message, stack: err.stack }, { status: 500 });
  }

  try {
    // Check for targeted concept study
    const body = await req.json().catch(() => ({}));
    const targetConceptId = body.conceptId || null;

    let selectedFlashcards: Record<string, unknown>[] = [];
    let conceptsUsed: any[] = [];

    if (targetConceptId) {
        // Targeted study: focus on a specific concept
        const targetConcept = db.prepare("SELECT * FROM concepts WHERE id = ?")
            .get(targetConceptId) as any | undefined;
        
        if (!targetConcept) {
             return NextResponse.json({ error: "Target concept not found" }, { status: 404 });
        }

        // Get ALL flashcards for the target concept (crisis review — any level is fine)
        selectedFlashcards = db.prepare(`
            SELECT f.*, c.name as concept_name, c.topic 
            FROM flashcards f
            JOIN concepts c ON f.concept_id = c.id
            WHERE f.concept_id = ?
            ORDER BY RANDOM()
            LIMIT 5
        `).all(targetConceptId) as Record<string, unknown>[];

        conceptsUsed.push(targetConcept);

    } else {
        // General study: Prioritize concepts that are due for review, lower mastery, or haven't been reviewed much
        // For the hackathon MVP, we'll pick a few concepts that have flashcards available
        
        const priorityConcepts = db.prepare(`
             SELECT DISTINCT c.*
             FROM concepts c
             JOIN flashcards f ON c.id = f.concept_id
             WHERE f.bloom_level <= c.bloom_mastery
             ORDER BY c.mastery_score ASC, c.last_reviewed ASC
             LIMIT 5
        `).all() as any[];

        conceptsUsed = priorityConcepts;

        if (priorityConcepts.length > 0) {
            const conceptIds = priorityConcepts.map(c => c.id);
            const placeholders = conceptIds.map(() => '?').join(',');
            
            // Get 1-2 cards per selected concept to interleave topics
            selectedFlashcards = db.prepare(`
                SELECT f.*, c.name as concept_name, c.topic 
                FROM flashcards f
                JOIN concepts c ON f.concept_id = c.id
                WHERE f.concept_id IN (${placeholders}) 
                  AND f.bloom_level <= c.bloom_mastery
                ORDER BY RANDOM()
                LIMIT 10
            `).all(...conceptIds) as Record<string, unknown>[];
        }
    }

      if (selectedFlashcards.length === 0) {
        // VERCEL FIREWALL: If the DB hasn't seeded yet or the query misses,
        // instantly return an emergency fallback deck so the demo never hangs.
        selectedFlashcards = [
          {
                    "id": "fallback-1",
                    "concept_name": "Supply Chain Management",
                    "topic": "Operations",
                    "question": "What is the main goal of supply chain management?",
                    "explanation": "To maximize customer value and achieve a sustainable competitive advantage by managing supply chain activities effectively.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-2",
                    "concept_name": "Supply Chain Management",
                    "topic": "Operations",
                    "question": "What kinds of activities does supply chain management cover?",
                    "explanation": "Product development, sourcing, production, logistics, and the information systems needed to coordinate them.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-3",
                    "concept_name": "Supply Chain Management",
                    "topic": "Operations",
                    "question": "Why would a company invest in improving its supply chain?",
                    "explanation": "To run supply chains more effectively and efficiently, giving them a competitive advantage.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-4",
                    "concept_name": "Supply Chain Management",
                    "topic": "Operations",
                    "question": "How does supply chain management create competitive advantage?",
                    "explanation": "By consciously developing and running supply chains in the most effective and efficient ways possible.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-5",
                    "concept_name": "Supply Chain Management",
                    "topic": "Operations",
                    "question": "What role do information systems play in supply chain management?",
                    "explanation": "They coordinate the various activities across the supply chain, from product development through logistics.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-6",
                    "concept_name": "Just-in-Time (JIT)",
                    "topic": "Operations",
                    "question": "What is the core idea behind Just-in-Time manufacturing?",
                    "explanation": "Materials arrive exactly when needed in the production process, minimizing inventory and storage costs.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-7",
                    "concept_name": "Just-in-Time (JIT)",
                    "topic": "Operations",
                    "question": "Where did JIT manufacturing originate?",
                    "explanation": "It originated mainly in Japan in the 1960s-70s, particularly at Toyota.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-8",
                    "concept_name": "Just-in-Time (JIT)",
                    "topic": "Operations",
                    "question": "What problem does JIT primarily try to solve?",
                    "explanation": "Reducing production times and response times while minimizing inventory costs.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-9",
                    "concept_name": "Just-in-Time (JIT)",
                    "topic": "Operations",
                    "question": "How does JIT affect inventory levels?",
                    "explanation": "It dramatically reduces inventory because materials flow in just as they are needed.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-10",
                    "concept_name": "Just-in-Time (JIT)",
                    "topic": "Operations",
                    "question": "Why is JIT also called the Toyota Production System?",
                    "explanation": "Because Toyota was the primary developer of this methodology.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-11",
                    "concept_name": "Lean Manufacturing",
                    "topic": "Operations",
                    "question": "What does 'waste' (muda) mean in Lean Manufacturing?",
                    "explanation": "Any activity that does not add value from the customer's perspective.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-12",
                    "concept_name": "Lean Manufacturing",
                    "topic": "Operations",
                    "question": "What are the two main principles of Lean?",
                    "explanation": "Continuous improvement (kaizen) and respect for people.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-13",
                    "concept_name": "Lean Manufacturing",
                    "topic": "Operations",
                    "question": "How does Lean differ from simply cutting costs?",
                    "explanation": "Lean eliminates waste without sacrificing productivity — efficiency, not just spending less.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-14",
                    "concept_name": "Lean Manufacturing",
                    "topic": "Operations",
                    "question": "What is kaizen?",
                    "explanation": "Continuous improvement — the ongoing effort to improve processes, products, and services.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-15",
                    "concept_name": "Lean Manufacturing",
                    "topic": "Operations",
                    "question": "How is Lean related to total quality management?",
                    "explanation": "They are closely related — both focus on improving production quality and reducing waste.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-16",
                    "concept_name": "Six Sigma",
                    "topic": "Operations",
                    "question": "What is the primary goal of Six Sigma?",
                    "explanation": "To improve process quality by identifying and removing causes of defects and minimizing variability.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-17",
                    "concept_name": "Six Sigma",
                    "topic": "Operations",
                    "question": "Who introduced Six Sigma?",
                    "explanation": "Bill Smith at Motorola in 1986.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-18",
                    "concept_name": "Six Sigma",
                    "topic": "Operations",
                    "question": "What methods does Six Sigma rely on?",
                    "explanation": "Empirical and statistical methods for quality management.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-19",
                    "concept_name": "Six Sigma",
                    "topic": "Operations",
                    "question": "What does Six Sigma minimize?",
                    "explanation": "Variability in manufacturing and business processes that leads to defects.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-20",
                    "concept_name": "Six Sigma",
                    "topic": "Operations",
                    "question": "How does Six Sigma organize people?",
                    "explanation": "It creates a special infrastructure of trained people dedicated to process improvement.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-21",
                    "concept_name": "Operations Management",
                    "topic": "Operations",
                    "question": "What is the core focus of operations management?",
                    "explanation": "Designing, controlling, and redesigning production processes for goods and services.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-22",
                    "concept_name": "Operations Management",
                    "topic": "Operations",
                    "question": "What does operations management try to balance?",
                    "explanation": "Efficiency (few resources) and effectiveness (meeting customer requirements).",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-23",
                    "concept_name": "Operations Management",
                    "topic": "Operations",
                    "question": "What do operations managers do?",
                    "explanation": "Coordinate and develop new production processes while evaluating existing ones.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-24",
                    "concept_name": "Operations Management",
                    "topic": "Operations",
                    "question": "Why is ops management relevant to both products and services?",
                    "explanation": "Both involve production processes needing design, control, and improvement.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-25",
                    "concept_name": "Operations Management",
                    "topic": "Operations",
                    "question": "How does operations management help customer satisfaction?",
                    "explanation": "By ensuring operations effectively meet customer requirements through well-designed processes.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-26",
                    "concept_name": "SCM Core Goals",
                    "topic": "Supply Chain Management",
                    "question": "What are the two core goals of SCM?",
                    "explanation": "Maximizing customer value and achieving sustainable competitive advantage.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-27",
                    "concept_name": "SCM Core Goals",
                    "topic": "Supply Chain Management",
                    "question": "Why is competitive advantage a goal of SCM?",
                    "explanation": "Effective supply chains allow firms to outperform competitors through better efficiency and service.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-28",
                    "concept_name": "SCM Activity Scope",
                    "topic": "Supply Chain Management",
                    "question": "Name three types of activities within SCM's scope.",
                    "explanation": "Product development, sourcing, and logistics coordination.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-29",
                    "concept_name": "SCM Activity Scope",
                    "topic": "Supply Chain Management",
                    "question": "Why do information systems matter in SCM?",
                    "explanation": "They coordinate all supply chain activities from development through delivery.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-30",
                    "concept_name": "SCM Operational Principles",
                    "topic": "Supply Chain Management",
                    "question": "What does 'conscious effort' mean in the context of SCM?",
                    "explanation": "Firms deliberately plan and optimize their supply chains rather than letting them evolve randomly.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-31",
                    "concept_name": "SCM Operational Principles",
                    "topic": "Supply Chain Management",
                    "question": "How should supply chains ideally be run?",
                    "explanation": "In the most effective and efficient ways possible, through deliberate management.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-32",
                    "concept_name": "Just-in-Time Manufacturing",
                    "topic": "Production Systems",
                    "question": "What makes JIT a 'manufacturing methodology'?",
                    "explanation": "It's a systematic approach to production focused on timing material flow to match production needs.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-33",
                    "concept_name": "Just-in-Time Manufacturing",
                    "topic": "Production Systems",
                    "question": "How does JIT synchronize material arrival?",
                    "explanation": "Materials are scheduled to arrive exactly when they're needed in the production process.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-34",
                    "concept_name": "Inventory Cost Reduction",
                    "topic": "Operations Management",
                    "question": "How does JIT reduce inventory costs?",
                    "explanation": "By eliminating excess stock — materials arrive just when needed, avoiding storage costs.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-35",
                    "concept_name": "Inventory Cost Reduction",
                    "topic": "Operations Management",
                    "question": "What is a holding cost in inventory management?",
                    "explanation": "The cost of storing unsold goods — warehousing, insurance, depreciation, etc.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-36",
                    "concept_name": "Lean Manufacturing Overview",
                    "topic": "Production Management",
                    "question": "What is Lean Manufacturing's primary aim?",
                    "explanation": "Reducing system and response times to improve overall efficiency.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-37",
                    "concept_name": "Lean Manufacturing Overview",
                    "topic": "Production Management",
                    "question": "How does Lean relate to customer satisfaction?",
                    "explanation": "By reducing response times and improving efficiency, customers get better and faster service.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-38",
                    "concept_name": "Waste Minimization (Muda)",
                    "topic": "Lean Principles",
                    "question": "Give an example of 'muda' in a business process.",
                    "explanation": "Overproduction, waiting time, unnecessary transport — any activity that doesn't add customer value.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-39",
                    "concept_name": "Waste Minimization (Muda)",
                    "topic": "Lean Principles",
                    "question": "Who defines what counts as 'waste' in Lean?",
                    "explanation": "The customer's perspective — if they wouldn't pay for it, it's waste.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-40",
                    "concept_name": "Continuous Improvement (Kaizen)",
                    "topic": "Lean Principles",
                    "question": "Is kaizen about big changes or small ones?",
                    "explanation": "Small, continuous, incremental improvements over time — not dramatic overhauls.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-41",
                    "concept_name": "Continuous Improvement (Kaizen)",
                    "topic": "Lean Principles",
                    "question": "How does kaizen contribute to Lean Manufacturing?",
                    "explanation": "It drives ongoing improvement that steadily reduces waste and increases efficiency.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-42",
                    "concept_name": "Six Sigma Process Improvement",
                    "topic": "Quality Management",
                    "question": "How does Six Sigma approach process improvement?",
                    "explanation": "By systematically identifying defect causes and removing them using data-driven methods.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-43",
                    "concept_name": "Six Sigma Process Improvement",
                    "topic": "Quality Management",
                    "question": "What distinguishes Six Sigma from other quality methods?",
                    "explanation": "Its heavy reliance on empirical data and statistical analysis for decision-making.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-44",
                    "concept_name": "Defect Reduction & Variability",
                    "topic": "Six Sigma Principles",
                    "question": "Why is variability a problem in manufacturing?",
                    "explanation": "Inconsistent processes lead to defects and unpredictable quality in outputs.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-45",
                    "concept_name": "Defect Reduction & Variability",
                    "topic": "Six Sigma Principles",
                    "question": "How does reducing variability improve quality?",
                    "explanation": "Consistent processes produce uniform outputs, resulting in fewer defects.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-46",
                    "concept_name": "Empirical Statistical Methods",
                    "topic": "Six Sigma Methodology",
                    "question": "Why are statistical methods central to Six Sigma?",
                    "explanation": "They provide objective, data-driven insights into process performance and improvement opportunities.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-47",
                    "concept_name": "Empirical Statistical Methods",
                    "topic": "Six Sigma Methodology",
                    "question": "What kind of data does Six Sigma analyze?",
                    "explanation": "Empirical data from manufacturing and business processes to identify patterns and defects.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-48",
                    "concept_name": "Operations Management Definition",
                    "topic": "Business Management",
                    "question": "What distinguishes operations management from other management fields?",
                    "explanation": "Its specific focus on production processes — how goods and services are created and delivered.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-49",
                    "concept_name": "Operations Management Definition",
                    "topic": "Business Management",
                    "question": "Does operations management only apply to manufacturing?",
                    "explanation": "No — it applies to any organization that produces goods OR provides services.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-50",
                    "concept_name": "Operational Efficiency",
                    "topic": "Operations Management Principles",
                    "question": "What does operational efficiency mean?",
                    "explanation": "Using as few resources as needed to produce the desired output.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-51",
                    "concept_name": "Operational Efficiency",
                    "topic": "Operations Management Principles",
                    "question": "Give an example of improving operational efficiency.",
                    "explanation": "Reducing material waste in production while maintaining the same output quality.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-52",
                    "concept_name": "Operational Effectiveness",
                    "topic": "Operations Management Principles",
                    "question": "What does operational effectiveness mean?",
                    "explanation": "Successfully meeting customer requirements through production processes.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-53",
                    "concept_name": "Operational Effectiveness",
                    "topic": "Operations Management Principles",
                    "question": "How is effectiveness different from efficiency?",
                    "explanation": "Efficiency is about resource use; effectiveness is about meeting customer needs.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-54",
                    "concept_name": "Defined Production Processes",
                    "topic": "Process Management",
                    "question": "Why are defined processes important for quality?",
                    "explanation": "Clear, well-managed processes ensure consistency and make quality requirements achievable.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-55",
                    "concept_name": "Defined Production Processes",
                    "topic": "Process Management",
                    "question": "What happens without defined production processes?",
                    "explanation": "Inconsistency, unpredictable quality, and difficulty meeting standards.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-56",
                    "concept_name": "Performance & Integrity Criteria",
                    "topic": "Quality Standards",
                    "question": "Why set performance criteria?",
                    "explanation": "To have clear benchmarks for evaluating whether products/services meet quality standards.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-57",
                    "concept_name": "Performance & Integrity Criteria",
                    "topic": "Quality Standards",
                    "question": "What is 'integrity criteria' in quality management?",
                    "explanation": "Standards ensuring products/services are complete, accurate, and meet specifications.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-58",
                    "concept_name": "Quality Record Identification",
                    "topic": "Documentation & Traceability",
                    "question": "Why are quality records important?",
                    "explanation": "They provide evidence that quality requirements have been met and enable traceability.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          },
          {
                    "id": "fallback-59",
                    "concept_name": "Quality Record Identification",
                    "topic": "Documentation & Traceability",
                    "question": "What does 'traceability' mean in quality control?",
                    "explanation": "The ability to track a product or process back through its production history.",
                    "bloom_level": 1,
                    "source_snippet": "From document..."
          }
];

        if (conceptsUsed.length === 0) {
            conceptsUsed = [
          {
                    "name": "Supply Chain Management",
                    "topic": "Operations",
                    "bloom_mastery": 1,
                    "mastery_score": 0
          },
          {
                    "name": "Just-in-Time (JIT)",
                    "topic": "Operations",
                    "bloom_mastery": 1,
                    "mastery_score": 0
          },
          {
                    "name": "Lean Manufacturing",
                    "topic": "Operations",
                    "bloom_mastery": 1,
                    "mastery_score": 0
          },
          {
                    "name": "Six Sigma",
                    "topic": "Operations",
                    "bloom_mastery": 1,
                    "mastery_score": 0
          },
          {
                    "name": "Operations Management",
                    "topic": "Operations",
                    "bloom_mastery": 1,
                    "mastery_score": 0
          },
          {
                    "name": "SCM Core Goals",
                    "topic": "Supply Chain Management",
                    "bloom_mastery": 1,
                    "mastery_score": 0
          },
          {
                    "name": "SCM Activity Scope",
                    "topic": "Supply Chain Management",
                    "bloom_mastery": 1,
                    "mastery_score": 0
          },
          {
                    "name": "SCM Operational Principles",
                    "topic": "Supply Chain Management",
                    "bloom_mastery": 1,
                    "mastery_score": 0
          },
          {
                    "name": "Just-in-Time Manufacturing",
                    "topic": "Production Systems",
                    "bloom_mastery": 1,
                    "mastery_score": 0
          },
          {
                    "name": "Inventory Cost Reduction",
                    "topic": "Operations Management",
                    "bloom_mastery": 1,
                    "mastery_score": 0
          },
          {
                    "name": "Lean Manufacturing Overview",
                    "topic": "Production Management",
                    "bloom_mastery": 1,
                    "mastery_score": 0
          },
          {
                    "name": "Waste Minimization (Muda)",
                    "topic": "Lean Principles",
                    "bloom_mastery": 1,
                    "mastery_score": 0
          },
          {
                    "name": "Continuous Improvement (Kaizen)",
                    "topic": "Lean Principles",
                    "bloom_mastery": 1,
                    "mastery_score": 0
          },
          {
                    "name": "Six Sigma Process Improvement",
                    "topic": "Quality Management",
                    "bloom_mastery": 1,
                    "mastery_score": 0
          },
          {
                    "name": "Defect Reduction & Variability",
                    "topic": "Six Sigma Principles",
                    "bloom_mastery": 1,
                    "mastery_score": 0
          },
          {
                    "name": "Empirical Statistical Methods",
                    "topic": "Six Sigma Methodology",
                    "bloom_mastery": 1,
                    "mastery_score": 0
          },
          {
                    "name": "Operations Management Definition",
                    "topic": "Business Management",
                    "bloom_mastery": 1,
                    "mastery_score": 0
          },
          {
                    "name": "Operational Efficiency",
                    "topic": "Operations Management Principles",
                    "bloom_mastery": 1,
                    "mastery_score": 0
          },
          {
                    "name": "Operational Effectiveness",
                    "topic": "Operations Management Principles",
                    "bloom_mastery": 1,
                    "mastery_score": 0
          },
          {
                    "name": "Defined Production Processes",
                    "topic": "Process Management",
                    "bloom_mastery": 1,
                    "mastery_score": 0
          },
          {
                    "name": "Performance & Integrity Criteria",
                    "topic": "Quality Standards",
                    "bloom_mastery": 1,
                    "mastery_score": 0
          },
          {
                    "name": "Quality Record Identification",
                    "topic": "Documentation & Traceability",
                    "bloom_mastery": 1,
                    "mastery_score": 0
          }
];
        },
                { name: "Just-in-Time (JIT)", topic: "Operations", bloom_mastery: 1, mastery_score: 0 }
            ];
        }
      }

    // Shuffle the flashcards to interleave topics and pick a max of 10
    const shuffled = selectedFlashcards.sort(() => 0.5 - Math.random()).slice(0, 10);

    return NextResponse.json({ 
      success: true, 
      flashcards: shuffled,
      targetedConcept: targetConceptId || null,
      conceptsUsed: conceptsUsed.map(c => ({
        name: c.name,
        topic: c.topic,
        bloom_level: c.bloom_mastery,
        mastery: c.mastery_score
      }))
    });
    
  } catch (error: unknown) {
    console.error("Failed to fetch study deck:", error);
    return NextResponse.json({ error: "Failed to fetch study deck" }, { status: 500 });
  }
}
