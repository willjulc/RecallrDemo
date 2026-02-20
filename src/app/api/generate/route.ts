import { NextRequest, NextResponse } from "next/server";

const FALLBACK_CARDS = [
  {
    "id": "deck-card-1",
    "concept_id": "concept-scm",
    "concept_name": "Supply Chain Management",
    "topic": "Operations",
    "question": "What is the main goal of supply chain management?",
    "explanation": "To maximize customer value and achieve a sustainable competitive advantage by managing supply chain activities effectively.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-2",
    "concept_id": "concept-scm",
    "concept_name": "Supply Chain Management",
    "topic": "Operations",
    "question": "What kinds of activities does supply chain management cover?",
    "explanation": "Product development, sourcing, production, logistics, and the information systems needed to coordinate them.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-3",
    "concept_id": "concept-scm",
    "concept_name": "Supply Chain Management",
    "topic": "Operations",
    "question": "Why would a company invest in improving its supply chain?",
    "explanation": "To run supply chains more effectively and efficiently, giving them a competitive advantage.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-4",
    "concept_id": "concept-scm",
    "concept_name": "Supply Chain Management",
    "topic": "Operations",
    "question": "How does supply chain management create competitive advantage?",
    "explanation": "By consciously developing and running supply chains in the most effective and efficient ways possible.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-5",
    "concept_id": "concept-scm",
    "concept_name": "Supply Chain Management",
    "topic": "Operations",
    "question": "What role do information systems play in supply chain management?",
    "explanation": "They coordinate the various activities across the supply chain, from product development through logistics.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-6",
    "concept_id": "concept-jit",
    "concept_name": "Just-in-Time (JIT)",
    "topic": "Operations",
    "question": "What is the core idea behind Just-in-Time manufacturing?",
    "explanation": "Materials arrive exactly when needed in the production process, minimizing inventory and storage costs.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-7",
    "concept_id": "concept-jit",
    "concept_name": "Just-in-Time (JIT)",
    "topic": "Operations",
    "question": "Where did JIT manufacturing originate?",
    "explanation": "It originated mainly in Japan in the 1960s-70s, particularly at Toyota.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-8",
    "concept_id": "concept-jit",
    "concept_name": "Just-in-Time (JIT)",
    "topic": "Operations",
    "question": "What problem does JIT primarily try to solve?",
    "explanation": "Reducing production times and response times while minimizing inventory costs.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-9",
    "concept_id": "concept-jit",
    "concept_name": "Just-in-Time (JIT)",
    "topic": "Operations",
    "question": "How does JIT affect inventory levels?",
    "explanation": "It dramatically reduces inventory because materials flow in just as they are needed.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-10",
    "concept_id": "concept-jit",
    "concept_name": "Just-in-Time (JIT)",
    "topic": "Operations",
    "question": "Why is JIT also called the Toyota Production System?",
    "explanation": "Because Toyota was the primary developer of this methodology.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-11",
    "concept_id": "concept-lean",
    "concept_name": "Lean Manufacturing",
    "topic": "Operations",
    "question": "What does 'waste' (muda) mean in Lean Manufacturing?",
    "explanation": "Any activity that does not add value from the customer's perspective.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-12",
    "concept_id": "concept-lean",
    "concept_name": "Lean Manufacturing",
    "topic": "Operations",
    "question": "What are the two main principles of Lean?",
    "explanation": "Continuous improvement (kaizen) and respect for people.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-13",
    "concept_id": "concept-lean",
    "concept_name": "Lean Manufacturing",
    "topic": "Operations",
    "question": "How does Lean differ from simply cutting costs?",
    "explanation": "Lean eliminates waste without sacrificing productivity — efficiency, not just spending less.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-14",
    "concept_id": "concept-lean",
    "concept_name": "Lean Manufacturing",
    "topic": "Operations",
    "question": "What is kaizen?",
    "explanation": "Continuous improvement — the ongoing effort to improve processes, products, and services.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-15",
    "concept_id": "concept-lean",
    "concept_name": "Lean Manufacturing",
    "topic": "Operations",
    "question": "How is Lean related to total quality management?",
    "explanation": "They are closely related — both focus on improving production quality and reducing waste.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-16",
    "concept_id": "concept-6sig",
    "concept_name": "Six Sigma",
    "topic": "Operations",
    "question": "What is the primary goal of Six Sigma?",
    "explanation": "To improve process quality by identifying and removing causes of defects and minimizing variability.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-17",
    "concept_id": "concept-6sig",
    "concept_name": "Six Sigma",
    "topic": "Operations",
    "question": "Who introduced Six Sigma?",
    "explanation": "Bill Smith at Motorola in 1986.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-18",
    "concept_id": "concept-6sig",
    "concept_name": "Six Sigma",
    "topic": "Operations",
    "question": "What methods does Six Sigma rely on?",
    "explanation": "Empirical and statistical methods for quality management.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-19",
    "concept_id": "concept-6sig",
    "concept_name": "Six Sigma",
    "topic": "Operations",
    "question": "What does Six Sigma minimize?",
    "explanation": "Variability in manufacturing and business processes that leads to defects.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-20",
    "concept_id": "concept-6sig",
    "concept_name": "Six Sigma",
    "topic": "Operations",
    "question": "How does Six Sigma organize people?",
    "explanation": "It creates a special infrastructure of trained people dedicated to process improvement.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-21",
    "concept_id": "concept-ops",
    "concept_name": "Operations Management",
    "topic": "Operations",
    "question": "What is the core focus of operations management?",
    "explanation": "Designing, controlling, and redesigning production processes for goods and services.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-22",
    "concept_id": "concept-ops",
    "concept_name": "Operations Management",
    "topic": "Operations",
    "question": "What does operations management try to balance?",
    "explanation": "Efficiency (few resources) and effectiveness (meeting customer requirements).",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-23",
    "concept_id": "concept-ops",
    "concept_name": "Operations Management",
    "topic": "Operations",
    "question": "What do operations managers do?",
    "explanation": "Coordinate and develop new production processes while evaluating existing ones.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-24",
    "concept_id": "concept-ops",
    "concept_name": "Operations Management",
    "topic": "Operations",
    "question": "Why is ops management relevant to both products and services?",
    "explanation": "Both involve production processes needing design, control, and improvement.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-25",
    "concept_id": "concept-ops",
    "concept_name": "Operations Management",
    "topic": "Operations",
    "question": "How does operations management help customer satisfaction?",
    "explanation": "By ensuring operations effectively meet customer requirements through well-designed processes.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-26",
    "concept_id": "concept-scm-goals",
    "concept_name": "SCM Core Goals",
    "topic": "Supply Chain Management",
    "question": "What are the two core goals of SCM?",
    "explanation": "Maximizing customer value and achieving sustainable competitive advantage.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-27",
    "concept_id": "concept-scm-goals",
    "concept_name": "SCM Core Goals",
    "topic": "Supply Chain Management",
    "question": "Why is competitive advantage a goal of SCM?",
    "explanation": "Effective supply chains allow firms to outperform competitors through better efficiency and service.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-28",
    "concept_id": "concept-scm-scope",
    "concept_name": "SCM Activity Scope",
    "topic": "Supply Chain Management",
    "question": "Name three types of activities within SCM's scope.",
    "explanation": "Product development, sourcing, and logistics coordination.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-29",
    "concept_id": "concept-scm-scope",
    "concept_name": "SCM Activity Scope",
    "topic": "Supply Chain Management",
    "question": "Why do information systems matter in SCM?",
    "explanation": "They coordinate all supply chain activities from development through delivery.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-30",
    "concept_id": "concept-scm-ops",
    "concept_name": "SCM Operational Principles",
    "topic": "Supply Chain Management",
    "question": "What does 'conscious effort' mean in the context of SCM?",
    "explanation": "Firms deliberately plan and optimize their supply chains rather than letting them evolve randomly.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-31",
    "concept_id": "concept-scm-ops",
    "concept_name": "SCM Operational Principles",
    "topic": "Supply Chain Management",
    "question": "How should supply chains ideally be run?",
    "explanation": "In the most effective and efficient ways possible, through deliberate management.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-32",
    "concept_id": "concept-jit-mfg",
    "concept_name": "Just-in-Time Manufacturing",
    "topic": "Production Systems",
    "question": "What makes JIT a 'manufacturing methodology'?",
    "explanation": "It's a systematic approach to production focused on timing material flow to match production needs.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-33",
    "concept_id": "concept-jit-mfg",
    "concept_name": "Just-in-Time Manufacturing",
    "topic": "Production Systems",
    "question": "How does JIT synchronize material arrival?",
    "explanation": "Materials are scheduled to arrive exactly when they're needed in the production process.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-34",
    "concept_id": "concept-inv-cost",
    "concept_name": "Inventory Cost Reduction",
    "topic": "Operations Management",
    "question": "How does JIT reduce inventory costs?",
    "explanation": "By eliminating excess stock — materials arrive just when needed, avoiding storage costs.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-35",
    "concept_id": "concept-inv-cost",
    "concept_name": "Inventory Cost Reduction",
    "topic": "Operations Management",
    "question": "What is a holding cost in inventory management?",
    "explanation": "The cost of storing unsold goods — warehousing, insurance, depreciation, etc.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-36",
    "concept_id": "concept-lean-ovw",
    "concept_name": "Lean Manufacturing Overview",
    "topic": "Production Management",
    "question": "What is Lean Manufacturing's primary aim?",
    "explanation": "Reducing system and response times to improve overall efficiency.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-37",
    "concept_id": "concept-lean-ovw",
    "concept_name": "Lean Manufacturing Overview",
    "topic": "Production Management",
    "question": "How does Lean relate to customer satisfaction?",
    "explanation": "By reducing response times and improving efficiency, customers get better and faster service.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-38",
    "concept_id": "concept-muda",
    "concept_name": "Waste Minimization (Muda)",
    "topic": "Lean Principles",
    "question": "Give an example of 'muda' in a business process.",
    "explanation": "Overproduction, waiting time, unnecessary transport — any activity that doesn't add customer value.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-39",
    "concept_id": "concept-muda",
    "concept_name": "Waste Minimization (Muda)",
    "topic": "Lean Principles",
    "question": "Who defines what counts as 'waste' in Lean?",
    "explanation": "The customer's perspective — if they wouldn't pay for it, it's waste.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-40",
    "concept_id": "concept-kaizen",
    "concept_name": "Continuous Improvement (Kaizen)",
    "topic": "Lean Principles",
    "question": "Is kaizen about big changes or small ones?",
    "explanation": "Small, continuous, incremental improvements over time — not dramatic overhauls.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-41",
    "concept_id": "concept-kaizen",
    "concept_name": "Continuous Improvement (Kaizen)",
    "topic": "Lean Principles",
    "question": "How does kaizen contribute to Lean Manufacturing?",
    "explanation": "It drives ongoing improvement that steadily reduces waste and increases efficiency.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-42",
    "concept_id": "concept-6sig-pi",
    "concept_name": "Six Sigma Process Improvement",
    "topic": "Quality Management",
    "question": "How does Six Sigma approach process improvement?",
    "explanation": "By systematically identifying defect causes and removing them using data-driven methods.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-43",
    "concept_id": "concept-6sig-pi",
    "concept_name": "Six Sigma Process Improvement",
    "topic": "Quality Management",
    "question": "What distinguishes Six Sigma from other quality methods?",
    "explanation": "Its heavy reliance on empirical data and statistical analysis for decision-making.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-44",
    "concept_id": "concept-defect",
    "concept_name": "Defect Reduction & Variability",
    "topic": "Six Sigma Principles",
    "question": "Why is variability a problem in manufacturing?",
    "explanation": "Inconsistent processes lead to defects and unpredictable quality in outputs.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-45",
    "concept_id": "concept-defect",
    "concept_name": "Defect Reduction & Variability",
    "topic": "Six Sigma Principles",
    "question": "How does reducing variability improve quality?",
    "explanation": "Consistent processes produce uniform outputs, resulting in fewer defects.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-46",
    "concept_id": "concept-stat",
    "concept_name": "Empirical Statistical Methods",
    "topic": "Six Sigma Methodology",
    "question": "Why are statistical methods central to Six Sigma?",
    "explanation": "They provide objective, data-driven insights into process performance and improvement opportunities.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-47",
    "concept_id": "concept-stat",
    "concept_name": "Empirical Statistical Methods",
    "topic": "Six Sigma Methodology",
    "question": "What kind of data does Six Sigma analyze?",
    "explanation": "Empirical data from manufacturing and business processes to identify patterns and defects.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-48",
    "concept_id": "concept-ops-def",
    "concept_name": "Operations Management Definition",
    "topic": "Business Management",
    "question": "What distinguishes operations management from other management fields?",
    "explanation": "Its specific focus on production processes — how goods and services are created and delivered.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-49",
    "concept_id": "concept-ops-def",
    "concept_name": "Operations Management Definition",
    "topic": "Business Management",
    "question": "Does operations management only apply to manufacturing?",
    "explanation": "No — it applies to any organization that produces goods OR provides services.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-50",
    "concept_id": "concept-eff",
    "concept_name": "Operational Efficiency",
    "topic": "Operations Management Principles",
    "question": "What does operational efficiency mean?",
    "explanation": "Using as few resources as needed to produce the desired output.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-51",
    "concept_id": "concept-eff",
    "concept_name": "Operational Efficiency",
    "topic": "Operations Management Principles",
    "question": "Give an example of improving operational efficiency.",
    "explanation": "Reducing material waste in production while maintaining the same output quality.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-52",
    "concept_id": "concept-effect",
    "concept_name": "Operational Effectiveness",
    "topic": "Operations Management Principles",
    "question": "What does operational effectiveness mean?",
    "explanation": "Successfully meeting customer requirements through production processes.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-53",
    "concept_id": "concept-effect",
    "concept_name": "Operational Effectiveness",
    "topic": "Operations Management Principles",
    "question": "How is effectiveness different from efficiency?",
    "explanation": "Efficiency is about resource use; effectiveness is about meeting customer needs.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-54",
    "concept_id": "concept-proc",
    "concept_name": "Defined Production Processes",
    "topic": "Process Management",
    "question": "Why are defined processes important for quality?",
    "explanation": "Clear, well-managed processes ensure consistency and make quality requirements achievable.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-55",
    "concept_id": "concept-proc",
    "concept_name": "Defined Production Processes",
    "topic": "Process Management",
    "question": "What happens without defined production processes?",
    "explanation": "Inconsistency, unpredictable quality, and difficulty meeting standards.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-56",
    "concept_id": "concept-perf",
    "concept_name": "Performance & Integrity Criteria",
    "topic": "Quality Standards",
    "question": "Why set performance criteria?",
    "explanation": "To have clear benchmarks for evaluating whether products/services meet quality standards.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-57",
    "concept_id": "concept-perf",
    "concept_name": "Performance & Integrity Criteria",
    "topic": "Quality Standards",
    "question": "What is 'integrity criteria' in quality management?",
    "explanation": "Standards ensuring products/services are complete, accurate, and meet specifications.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-58",
    "concept_id": "concept-qr",
    "concept_name": "Quality Record Identification",
    "topic": "Documentation & Traceability",
    "question": "Why are quality records important?",
    "explanation": "They provide evidence that quality requirements have been met and enable traceability.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  },
  {
    "id": "deck-card-59",
    "concept_id": "concept-qr",
    "concept_name": "Quality Record Identification",
    "topic": "Documentation & Traceability",
    "question": "What does 'traceability' mean in quality control?",
    "explanation": "The ability to track a product or process back through its production history.",
    "bloom_level": 1,
    "source_snippet": "Extracted from course materials."
  }
];
const FALLBACK_CONCEPTS = [
  {
    "id": "concept-scm",
    "name": "Supply Chain Management",
    "topic": "Operations",
    "bloom_mastery": 1,
    "mastery_score": 0
  },
  {
    "id": "concept-jit",
    "name": "Just-in-Time (JIT)",
    "topic": "Operations",
    "bloom_mastery": 1,
    "mastery_score": 0
  },
  {
    "id": "concept-lean",
    "name": "Lean Manufacturing",
    "topic": "Operations",
    "bloom_mastery": 1,
    "mastery_score": 0
  },
  {
    "id": "concept-6sig",
    "name": "Six Sigma",
    "topic": "Operations",
    "bloom_mastery": 1,
    "mastery_score": 0
  },
  {
    "id": "concept-ops",
    "name": "Operations Management",
    "topic": "Operations",
    "bloom_mastery": 1,
    "mastery_score": 0
  },
  {
    "id": "concept-scm-goals",
    "name": "SCM Core Goals",
    "topic": "Supply Chain Management",
    "bloom_mastery": 1,
    "mastery_score": 0
  },
  {
    "id": "concept-scm-scope",
    "name": "SCM Activity Scope",
    "topic": "Supply Chain Management",
    "bloom_mastery": 1,
    "mastery_score": 0
  },
  {
    "id": "concept-scm-ops",
    "name": "SCM Operational Principles",
    "topic": "Supply Chain Management",
    "bloom_mastery": 1,
    "mastery_score": 0
  },
  {
    "id": "concept-jit-mfg",
    "name": "Just-in-Time Manufacturing",
    "topic": "Production Systems",
    "bloom_mastery": 1,
    "mastery_score": 0
  },
  {
    "id": "concept-inv-cost",
    "name": "Inventory Cost Reduction",
    "topic": "Operations Management",
    "bloom_mastery": 1,
    "mastery_score": 0
  },
  {
    "id": "concept-lean-ovw",
    "name": "Lean Manufacturing Overview",
    "topic": "Production Management",
    "bloom_mastery": 1,
    "mastery_score": 0
  },
  {
    "id": "concept-muda",
    "name": "Waste Minimization (Muda)",
    "topic": "Lean Principles",
    "bloom_mastery": 1,
    "mastery_score": 0
  },
  {
    "id": "concept-kaizen",
    "name": "Continuous Improvement (Kaizen)",
    "topic": "Lean Principles",
    "bloom_mastery": 1,
    "mastery_score": 0
  },
  {
    "id": "concept-6sig-pi",
    "name": "Six Sigma Process Improvement",
    "topic": "Quality Management",
    "bloom_mastery": 1,
    "mastery_score": 0
  },
  {
    "id": "concept-defect",
    "name": "Defect Reduction & Variability",
    "topic": "Six Sigma Principles",
    "bloom_mastery": 1,
    "mastery_score": 0
  },
  {
    "id": "concept-stat",
    "name": "Empirical Statistical Methods",
    "topic": "Six Sigma Methodology",
    "bloom_mastery": 1,
    "mastery_score": 0
  },
  {
    "id": "concept-ops-def",
    "name": "Operations Management Definition",
    "topic": "Business Management",
    "bloom_mastery": 1,
    "mastery_score": 0
  },
  {
    "id": "concept-eff",
    "name": "Operational Efficiency",
    "topic": "Operations Management Principles",
    "bloom_mastery": 1,
    "mastery_score": 0
  },
  {
    "id": "concept-effect",
    "name": "Operational Effectiveness",
    "topic": "Operations Management Principles",
    "bloom_mastery": 1,
    "mastery_score": 0
  },
  {
    "id": "concept-proc",
    "name": "Defined Production Processes",
    "topic": "Process Management",
    "bloom_mastery": 1,
    "mastery_score": 0
  },
  {
    "id": "concept-perf",
    "name": "Performance & Integrity Criteria",
    "topic": "Quality Standards",
    "bloom_mastery": 1,
    "mastery_score": 0
  },
  {
    "id": "concept-qr",
    "name": "Quality Record Identification",
    "topic": "Documentation & Traceability",
    "bloom_mastery": 1,
    "mastery_score": 0
  }
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const targetConceptId = body.conceptId || null;

    let selectedFlashcards: any[] = [];
    let conceptsUsed: any[] = [];

    if (targetConceptId) {
        selectedFlashcards = FALLBACK_CARDS.filter(c => c.concept_id === targetConceptId);
        const targetConcept = FALLBACK_CONCEPTS.find(c => c.id === targetConceptId);
        if (targetConcept) conceptsUsed.push(targetConcept);
    }

    // IF the target concept wasn't found in our hardcoded list (e.g. from an old DB seeding UUID),
    // or if no target concept was requested, fallback to a random mix of cards.
    if (selectedFlashcards.length === 0) {
        const shuffledConcepts = [...FALLBACK_CONCEPTS].sort(() => 0.5 - Math.random()).slice(0, 5);
        conceptsUsed = shuffledConcepts;
        
        const conceptIds = shuffledConcepts.map(c => c.id);
        selectedFlashcards = FALLBACK_CARDS.filter(c => conceptIds.includes(c.concept_id));
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
    
  } catch (error: any) {
    console.error("Failed to fetch study deck:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch study deck" }, { status: 500 });
  }
}
