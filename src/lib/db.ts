import { supabase } from "./supabase";
import crypto from "crypto";

/**
 * Seed the database with a complete demo dataset.
 * Includes pre-generated flashcards so the demo loads instantly
 * without waiting on Gemini for question generation.
 */
export async function seedDemoDatabase() {
  try {
    const { count } = await supabase
      .from("documents")
      .select("*", { count: "exact", head: true });

    if (count && count > 0) return; // Already seeded or has data

    console.log("Seeding Demo Database with Business Operations Course...");

    const docId = crypto.randomUUID();
    await supabase
      .from("documents")
      .insert({ id: docId, name: "Business Operations & Supply Chain Management" });

    // ── CHUNKS (marked completed — no processing needed) ──
    const chunks = [
      { page: 1, text: "Supply Chain Management (SCM) is the active management of supply chain activities to maximize customer value and achieve a sustainable competitive advantage. It represents a conscious effort by the supply chain firms to develop and run supply chains in the most effective and efficient ways possible. Supply chain activities cover everything from product development, sourcing, production, and logistics, as well as the information systems needed to coordinate these activities." },
      { page: 1, text: "Just-in-Time (JIT) manufacturing, also known as the Toyota Production System (TPS), is a methodology aimed primarily at reducing times within the production system as well as response times from suppliers and to customers. Its origin and development was mainly in Japan, largely in the 1960s and 1970s and particularly at Toyota. JIT manufacturing tries to smooth the flow of material to arrive just as it is needed, minimizing inventory costs." },
      { page: 2, text: "Lean Manufacturing is a production method aimed at reducing times within the production system as well as response times from suppliers and to customers. It is closely related to another concept called total quality management. Lean principles focus on minimizing waste (muda) without sacrificing productivity. Waste is defined as any activity that does not add value from the customer's perspective. Lean emphasizes continuous improvement (kaizen) and respect for people." },
      { page: 2, text: "Six Sigma is a set of techniques and tools for process improvement. It was introduced by American engineer Bill Smith while working at Motorola in 1986. Six Sigma seeks to improve the quality of the output of a process by identifying and removing the causes of defects and minimizing variability in manufacturing and business processes. It uses a set of quality management methods, mainly empirical, statistical methods, and creates a special infrastructure of people within the organization." },
      { page: 3, text: "Quality Control (QC) is a process by which entities review the quality of all factors involved in production. ISO 9000 defines quality control as A part of quality management focused on fulfilling quality requirements. This approach places an emphasis on three aspects: elements such as controls, job management, defined and well managed processes, performance and integrity criteria, and identification of records." },
      { page: 3, text: "Operations Management is an area of management concerned with designing and controlling the process of production and redesigning business operations in the production of goods or services. It involves the responsibility of ensuring that business operations are efficient in terms of using as few resources as needed and effective in terms of meeting customer requirements. Operations managers are involved in coordinating and developing new processes while evaluating current structures." },
    ];

    const { data: insertedChunks } = await supabase.from("chunks").insert(
      chunks.map((c) => ({
        document_id: docId,
        page_number: c.page,
        content: c.text,
        processed_status: "completed",
      }))
    ).select("id");

    const chunkIds = insertedChunks?.map(c => c.id) || [];

    // ── CONCEPTS (fully generated — needs_generation_level: 5) ──
    const conceptDefs = [
      { name: "Supply Chain Management", topic: "Operations", desc: "Active management of activities to maximize customer value and coordinate logistics.", chunkIndices: [0], page: 1 },
      { name: "Just-in-Time (JIT)", topic: "Operations", desc: "Methodology to reduce times and smooth material flow to arrive precisely when needed.", chunkIndices: [1], page: 1 },
      { name: "Lean Manufacturing", topic: "Operations", desc: "Production method focused on minimizing waste (muda) while respecting people.", chunkIndices: [2], page: 2 },
      { name: "Six Sigma", topic: "Operations", desc: "Empirical techniques for process improvement and minimizing manufacturing variability.", chunkIndices: [3, 4], page: 2 },
      { name: "Operations Management", topic: "Operations", desc: "Designing and controlling production processes to efficiently meet customer requirements.", chunkIndices: [5], page: 3 },
    ];

    const conceptIds: string[] = [];
    for (const def of conceptDefs) {
      const id = crypto.randomUUID();
      conceptIds.push(id);
      await supabase.from("concepts").insert({
        id,
        document_id: docId,
        name: def.name,
        topic: def.topic,
        description: def.desc,
        bloom_mastery: 1,
        needs_generation_level: 5, // Skip all generation
        source_chunk_ids: JSON.stringify(def.chunkIndices.map(i => chunkIds[i]).filter(Boolean)),
      });
    }

    // ── FLASHCARDS (80 total: 5 concepts × 4 bloom levels × 4 questions) ──
    const flashcards = buildDemoFlashcards(docId, conceptIds, conceptDefs, chunks.map(c => c.text));
    // Insert in batches to stay under payload limits
    for (let i = 0; i < flashcards.length; i += 20) {
      await supabase.from("flashcards").insert(flashcards.slice(i, i + 20));
    }

    // Pre-seed Capital
    await supabase.from("player_resources").insert({
      id: crypto.randomUUID(),
      player_id: "default_player",
      resource_type: "capital",
      amount: 100,
    });

    console.log(`Demo Database seeded: ${flashcards.length} flashcards across ${conceptIds.length} concepts.`);
  } catch (err) {
    console.error("Error seeding demo database:", err);
  }
}

// ─────────────────────────────────────────────────────────────
// Pre-authored flashcards for the demo
// ─────────────────────────────────────────────────────────────

interface ConceptDef {
  name: string;
  topic: string;
  desc: string;
  chunkIndices: number[];
  page: number;
}

interface CardTemplate {
  question: string;
  explanation: string;
  bloom_level: number;
}

function buildDemoFlashcards(
  docId: string,
  conceptIds: string[],
  conceptDefs: ConceptDef[],
  chunkTexts: string[],
) {
  const allCards: {
    id: string;
    document_id: string;
    concept_id: string;
    page_number: number;
    source_snippet: string;
    question: string;
    explanation: string;
    bloom_level: number;
    difficulty: number;
  }[] = [];

  const cardsByConceptIndex: Record<number, CardTemplate[]> = {
    // ── 0: Supply Chain Management ──
    0: [
      // Bloom Level 1 — Remember
      { bloom_level: 1, question: "What is Supply Chain Management, and what is its primary goal?", explanation: "SCM is the active management of supply chain activities — from sourcing to delivery — with the goal of maximizing customer value and achieving sustainable competitive advantage." },
      { bloom_level: 1, question: "Name at least four activities that fall under the supply chain umbrella.", explanation: "Key supply chain activities include product development, sourcing, production, logistics, and the information systems that coordinate them." },
      { bloom_level: 1, question: "What does it mean for a supply chain to be both effective and efficient?", explanation: "Effectiveness means meeting customer needs and delivering value; efficiency means doing so with minimal waste of time, cost, and resources." },
      { bloom_level: 1, question: "Why are information systems considered a critical part of supply chain management?", explanation: "Information systems coordinate activities across the chain — sharing demand forecasts, inventory levels, and logistics data so that each participant can act on accurate, timely information." },
      // Bloom Level 2 — Understand
      { bloom_level: 2, question: "In your own words, explain why managing the supply chain as a whole matters more than optimizing each step individually.", explanation: "Optimizing individual steps can create bottlenecks or excess inventory elsewhere. Managing the whole chain ensures smooth flow, balanced costs, and better customer outcomes." },
      { bloom_level: 2, question: "How does supply chain management create competitive advantage for a company?", explanation: "By coordinating sourcing, production, and logistics efficiently, a company can deliver faster, cheaper, or higher-quality products than competitors — making the chain itself a strategic asset." },
      { bloom_level: 2, question: "What is the relationship between customer value and supply chain decisions?", explanation: "Every supply chain decision — supplier selection, production speed, shipping method — ultimately affects what the customer receives and at what cost, so customer value is the north star for SCM." },
      { bloom_level: 2, question: "Explain why coordination between supply chain partners is essential.", explanation: "Without coordination, partners may overproduce, understock, or ship at the wrong times. Shared information and aligned incentives keep the chain running smoothly." },
      // Bloom Level 3 — Apply
      { bloom_level: 3, question: "A retailer notices frequent stockouts despite having a reliable manufacturer. What supply chain improvements could address this?", explanation: "The retailer could improve demand forecasting, implement real-time inventory tracking, shorten lead times, or establish safety stock policies — all SCM coordination improvements." },
      { bloom_level: 3, question: "A company wants to expand internationally. How would supply chain management considerations shape that decision?", explanation: "They'd need to evaluate new suppliers, longer logistics routes, customs/regulatory requirements, local distribution partners, and information systems that work across borders." },
      { bloom_level: 3, question: "Imagine a smartphone company facing component shortages. How could better SCM prevent this situation?", explanation: "Better SCM would include diversifying suppliers, maintaining buffer inventory for critical components, sharing demand forecasts with suppliers, and having contingency logistics plans." },
      { bloom_level: 3, question: "A food delivery startup is scaling rapidly. What supply chain challenges should they anticipate?", explanation: "They should plan for cold-chain logistics, perishable inventory management, last-mile delivery optimization, supplier quality consistency, and demand variability across locations." },
      // Bloom Level 4 — Analyze
      { bloom_level: 4, question: "Compare the supply chain priorities of a luxury fashion brand versus a fast-food chain. How do their strategies differ and why?", explanation: "Luxury brands prioritize exclusivity, quality control, and brand-aligned sourcing; fast-food chains prioritize speed, cost efficiency, and supply consistency. Different customer value propositions drive different chain designs." },
      { bloom_level: 4, question: "What are the trade-offs between a lean supply chain and a resilient supply chain?", explanation: "Lean chains minimize inventory and cost but are vulnerable to disruptions; resilient chains carry buffers and multiple suppliers but at higher cost. The right balance depends on industry risk and customer expectations." },
      { bloom_level: 4, question: "How has e-commerce changed the traditional supply chain model, and what new challenges has it introduced?", explanation: "E-commerce shifted from bulk shipping to warehouses to individual parcel delivery, requiring faster fulfillment, last-mile logistics, reverse logistics for returns, and real-time inventory visibility." },
      { bloom_level: 4, question: "Analyze how a disruption at a single supplier can cascade through an entire supply chain. What structural factors make chains more or less vulnerable?", explanation: "Single-source dependencies, long lead times, and lack of inventory buffers amplify cascading effects. Chains with diversified suppliers, shorter links, and shared visibility are more resilient." },
    ],

    // ── 1: Just-in-Time (JIT) ──
    1: [
      // Bloom Level 1 — Remember
      { bloom_level: 1, question: "What is the Just-in-Time manufacturing methodology?", explanation: "JIT is a production methodology that aims to reduce waste by having materials arrive exactly when needed in the production process, minimizing inventory holding costs." },
      { bloom_level: 1, question: "Which company is most closely associated with the development of JIT manufacturing?", explanation: "Toyota is most closely associated with JIT. The methodology is also known as the Toyota Production System (TPS), developed primarily in Japan during the 1960s and 1970s." },
      { bloom_level: 1, question: "What is the primary type of waste that JIT aims to eliminate?", explanation: "JIT primarily targets excess inventory as waste — materials sitting idle represent tied-up capital, storage costs, and potential obsolescence." },
      { bloom_level: 1, question: "What does it mean for materials to arrive 'just in time' in a production context?", explanation: "It means materials are delivered to the production line precisely when they are needed — not earlier (creating inventory) and not later (causing delays)." },
      // Bloom Level 2 — Understand
      { bloom_level: 2, question: "Why does holding excess inventory actually increase costs rather than providing security?", explanation: "Excess inventory ties up working capital, requires storage space, risks obsolescence or spoilage, and can mask underlying production problems that need fixing." },
      { bloom_level: 2, question: "Explain how JIT depends on strong relationships with suppliers.", explanation: "JIT requires suppliers to deliver small, frequent batches on precise schedules. This demands trust, communication, proximity, and reliability — making supplier relationships critical." },
      { bloom_level: 2, question: "How does JIT manufacturing reduce response times to customers?", explanation: "By eliminating inventory backlogs and streamlining production flow, products move through the system faster, reducing the time from order to delivery." },
      { bloom_level: 2, question: "What happens in a JIT system when a quality defect is discovered?", explanation: "In JIT, defects are caught quickly because there is little buffer inventory to hide problems. Production stops to fix the root cause immediately, preventing defective products from accumulating." },
      // Bloom Level 3 — Apply
      { bloom_level: 3, question: "A bakery wants to adopt JIT principles. What would that look like in practice for their daily operations?", explanation: "The bakery would order ingredients based on daily demand forecasts, bake in smaller batches throughout the day rather than all at once, and minimize raw material and finished goods sitting unused." },
      { bloom_level: 3, question: "A car manufacturer switching to JIT discovers their paint supplier is 500 miles away. What problem does this create and how might they solve it?", explanation: "Distance makes frequent small deliveries expensive and unreliable. Solutions include finding a local supplier, having the supplier set up a nearby warehouse, or using a milk-run delivery route." },
      { bloom_level: 3, question: "How would a hospital apply JIT principles to manage medical supply inventory?", explanation: "The hospital would track usage in real-time, set up automated reordering at minimum thresholds, negotiate frequent deliveries with suppliers, and reduce stockroom size — while keeping critical emergency buffers." },
      { bloom_level: 3, question: "A furniture company using JIT receives a sudden 300% spike in orders. What challenges will they face?", explanation: "JIT's minimal buffers mean they can't absorb demand spikes easily. They'd face material shortages, production delays, and supplier strain — highlighting JIT's vulnerability to demand volatility." },
      // Bloom Level 4 — Analyze
      { bloom_level: 4, question: "Compare JIT manufacturing with traditional batch-and-queue production. What are the key trade-offs?", explanation: "JIT reduces inventory and waste but requires reliable suppliers and stable demand. Batch production provides buffers against disruption but ties up capital and can mask quality issues." },
      { bloom_level: 4, question: "The COVID-19 pandemic exposed vulnerabilities in JIT supply chains globally. Analyze why JIT was particularly affected.", explanation: "JIT's minimal inventory buffers meant companies had no safety stock when suppliers shut down or shipping was disrupted. The interdependence and lack of redundancy amplified the impact across industries." },
      { bloom_level: 4, question: "Why might a company in a volatile market choose NOT to implement JIT, even if it would reduce costs during normal operations?", explanation: "Volatile markets have unpredictable demand and supply disruptions. JIT's minimal buffers become a liability when disruptions are frequent, making the cost savings not worth the risk of production stoppages." },
      { bloom_level: 4, question: "Analyze the cultural factors at Toyota that made JIT successful. Could any company replicate this?", explanation: "Toyota's culture of continuous improvement, employee empowerment to stop the line, long-term supplier partnerships, and disciplined process adherence were essential. Without similar cultural foundations, JIT implementations often fail." },
    ],

    // ── 2: Lean Manufacturing ──
    2: [
      // Bloom Level 1 — Remember
      { bloom_level: 1, question: "What is the Japanese term for waste in Lean Manufacturing?", explanation: "The Japanese term is 'muda.' Lean defines waste as any activity that consumes resources but does not add value from the customer's perspective." },
      { bloom_level: 1, question: "What are the two core principles that Lean Manufacturing emphasizes?", explanation: "Lean emphasizes continuous improvement (kaizen) and respect for people as its two foundational principles." },
      { bloom_level: 1, question: "How does Lean Manufacturing define waste?", explanation: "Waste is any activity that does not add value from the customer's perspective — including overproduction, waiting, unnecessary transport, excess inventory, unnecessary motion, defects, and over-processing." },
      { bloom_level: 1, question: "What is kaizen, and why is it central to Lean thinking?", explanation: "Kaizen means continuous improvement — the idea that every process can always be made better through small, incremental changes driven by the people who do the work." },
      // Bloom Level 2 — Understand
      { bloom_level: 2, question: "Explain why 'respect for people' is a core Lean principle, not just a nice motto.", explanation: "Workers closest to the process have the best insights into waste and improvement opportunities. Respecting their knowledge and empowering them to make changes is how kaizen actually happens." },
      { bloom_level: 2, question: "Why is overproduction considered one of the worst forms of waste in Lean?", explanation: "Overproduction creates excess inventory, ties up capital, consumes storage space, and can lead to other wastes like transportation and defects — it triggers a chain reaction of waste." },
      { bloom_level: 2, question: "How does Lean's concept of value differ from what a company might internally consider valuable?", explanation: "Lean defines value strictly from the customer's perspective — what they're willing to pay for. Internal activities that feel productive (like generating reports or reworking products) may still be waste if the customer doesn't benefit." },
      { bloom_level: 2, question: "Explain the connection between Lean Manufacturing and Total Quality Management.", explanation: "Both focus on continuous improvement and eliminating waste/defects. TQM emphasizes organization-wide quality culture, while Lean specifically targets waste elimination in production — they are complementary approaches." },
      // Bloom Level 3 — Apply
      { bloom_level: 3, question: "A coffee shop has long wait times during morning rush. How would you apply Lean principles to improve this?", explanation: "Map the value stream to find bottlenecks, eliminate non-value steps (e.g., walking to distant supplies), pre-stage popular ingredients, cross-train staff, and implement a pull system based on actual orders." },
      { bloom_level: 3, question: "An office processes insurance claims with a 2-week turnaround. Apply Lean thinking to reduce this.", explanation: "Map the claim flow to identify waiting time between steps, eliminate redundant approvals, batch similar claims together, create standardized work for common claim types, and measure cycle time per step." },
      { bloom_level: 3, question: "A software team is applying Lean to their development process. What kinds of waste might they identify?", explanation: "Software waste includes: partially done work, extra features nobody uses, handoffs between teams, waiting for approvals, task switching, defects/bugs, and unnecessary documentation." },
      { bloom_level: 3, question: "A factory floor manager notices workers walking long distances between stations. What Lean approach addresses this?", explanation: "This is the waste of unnecessary motion. The Lean approach would redesign the floor layout to minimize movement, arrange tools and materials at the point of use, and create U-shaped work cells." },
      // Bloom Level 4 — Analyze
      { bloom_level: 4, question: "Compare Lean Manufacturing with Six Sigma. Where do they overlap, and where do their approaches diverge?", explanation: "Both target waste and improvement, but Lean focuses on flow and eliminating non-value activities, while Six Sigma focuses on reducing process variation through statistical analysis. They converge in Lean Six Sigma." },
      { bloom_level: 4, question: "Analyze why a company might fail at implementing Lean even if they use all the right tools.", explanation: "Lean tools without the cultural shift — respect for people, management commitment, empowering workers — produce superficial improvements. Sustainable Lean requires a fundamental change in organizational mindset." },
      { bloom_level: 4, question: "How might applying Lean principles in healthcare differ from applying them in manufacturing?", explanation: "Healthcare involves life-critical processes, highly variable patient needs, and professional autonomy. Lean must adapt — standardizing where safe, eliminating wait times and handoff errors, while preserving clinical judgment." },
      { bloom_level: 4, question: "Critically evaluate: Can the pursuit of eliminating all waste actually become harmful? When might some 'waste' be valuable?", explanation: "Some slack/buffer enables innovation, handles variability, and prevents burnout. Eliminating all inventory risks stockouts; eliminating all idle time prevents creative thinking. Balance is key — not all non-value activity is truly wasteful." },
    ],

    // ── 3: Six Sigma ──
    3: [
      // Bloom Level 1 — Remember
      { bloom_level: 1, question: "Who introduced Six Sigma, and at which company was it developed?", explanation: "Six Sigma was introduced by American engineer Bill Smith while working at Motorola in 1986." },
      { bloom_level: 1, question: "What is the core objective of Six Sigma?", explanation: "Six Sigma seeks to improve process quality by identifying and removing the causes of defects and minimizing variability in manufacturing and business processes." },
      { bloom_level: 1, question: "What types of methods does Six Sigma primarily rely on?", explanation: "Six Sigma primarily uses empirical and statistical methods — data-driven analysis to measure process performance, identify root causes, and verify improvements." },
      { bloom_level: 1, question: "What does the term 'Six Sigma' refer to statistically?", explanation: "Statistically, Six Sigma refers to a process that produces no more than 3.4 defects per million opportunities — representing near-perfect quality through extremely low variation." },
      // Bloom Level 2 — Understand
      { bloom_level: 2, question: "Why does Six Sigma focus on reducing variability rather than just fixing individual defects?", explanation: "Individual defect fixes are reactive. Reducing variability addresses the root cause — a stable, predictable process produces consistent quality, preventing defects from occurring in the first place." },
      { bloom_level: 2, question: "Explain why Six Sigma creates a 'special infrastructure of people' within an organization.", explanation: "Six Sigma uses trained specialists (Green Belts, Black Belts, Master Black Belts) to lead improvement projects. This infrastructure ensures statistical rigor and sustained focus on quality improvement." },
      { bloom_level: 2, question: "How does data-driven decision making in Six Sigma differ from gut-feel management?", explanation: "Six Sigma requires measuring actual process performance, analyzing data statistically, and validating improvements with evidence — replacing assumptions and intuition with facts and proof." },
      { bloom_level: 2, question: "Why is understanding process variation important for quality management?", explanation: "All processes have natural variation. Understanding whether variation is normal (common cause) or abnormal (special cause) determines the right intervention — you don't fix what isn't broken." },
      // Bloom Level 3 — Apply
      { bloom_level: 3, question: "A call center has inconsistent customer satisfaction scores. How would you apply Six Sigma to improve them?", explanation: "Define the problem and target metric, Measure current call handling data, Analyze root causes of dissatisfaction (wait times, resolution rates, agent training), Improve the key drivers, and Control with ongoing monitoring." },
      { bloom_level: 3, question: "A pharmaceutical company has a 2% defect rate in pill production. How would Six Sigma approach this?", explanation: "Measure the current defect rate and process parameters, use statistical tools to identify which variables (temperature, mixing time, ingredient ratios) correlate with defects, then adjust and verify the process produces fewer defects." },
      { bloom_level: 3, question: "An e-commerce company has high order error rates. Describe how DMAIC could structure their improvement effort.", explanation: "Define: specify 'order accuracy' as the target. Measure: track error types and rates. Analyze: identify root causes (picking errors, system bugs, labeling). Improve: implement fixes. Control: set up dashboards and audits." },
      { bloom_level: 3, question: "A restaurant chain wants consistent food quality across 50 locations. How could Six Sigma help?", explanation: "Measure taste/quality scores and process variables across locations, identify which steps have the most variation (ingredient sourcing, cooking times, portion sizes), standardize those steps, and monitor compliance." },
      // Bloom Level 4 — Analyze
      { bloom_level: 4, question: "Compare Six Sigma with traditional quality inspection. Why is prevention better than detection?", explanation: "Inspection catches defects after they're made — costly rework or scrap. Six Sigma prevents defects by fixing the process itself. Prevention reduces cost, improves throughput, and builds quality in rather than inspecting it in." },
      { bloom_level: 4, question: "Analyze the limitations of Six Sigma. In what situations might it be the wrong approach?", explanation: "Six Sigma excels for stable, repeatable processes but struggles with creative, exploratory work (R&D, startups). Its overhead and rigor can be excessive for simple problems, and it requires sufficient data to be effective." },
      { bloom_level: 4, question: "How do the roles of Green Belt, Black Belt, and Master Black Belt create both strengths and potential problems?", explanation: "The belt system ensures trained specialists lead projects, but can create an elite class that excludes frontline workers. Success depends on belts collaborating with — not dictating to — the people doing the work." },
      { bloom_level: 4, question: "Evaluate whether Six Sigma's statistical rigor is always necessary for quality improvement, or if simpler approaches sometimes suffice.", explanation: "For complex, high-stakes processes (manufacturing, pharma), statistical rigor is essential. For simpler problems, basic root cause analysis or Lean tools may be faster and sufficient. The key is matching the method to the problem complexity." },
    ],

    // ── 4: Operations Management ──
    4: [
      // Bloom Level 1 — Remember
      { bloom_level: 1, question: "What is Operations Management primarily concerned with?", explanation: "Operations Management is concerned with designing and controlling the process of production and redesigning business operations in the production of goods or services." },
      { bloom_level: 1, question: "What are the two key measures operations managers try to balance?", explanation: "Operations managers balance efficiency (using as few resources as needed) and effectiveness (meeting customer requirements). Both are necessary for successful operations." },
      { bloom_level: 1, question: "What kinds of responsibilities do operations managers typically have?", explanation: "Operations managers coordinate and develop new processes, evaluate current organizational structures, and ensure that production meets both efficiency and customer satisfaction goals." },
      { bloom_level: 1, question: "Does Operations Management apply only to manufacturing, or also to services?", explanation: "Operations Management applies to both manufacturing and services. Any organization that produces goods or delivers services has operations that need to be designed, managed, and improved." },
      // Bloom Level 2 — Understand
      { bloom_level: 2, question: "Explain the difference between efficiency and effectiveness in operations, using an example.", explanation: "A factory producing 1000 units cheaply (efficient) but with 30% defect rate isn't effective. Effectiveness means the output meets customer needs. The best operations are both — low cost AND high quality." },
      { bloom_level: 2, question: "Why is operations management considered a strategic function, not just a back-office role?", explanation: "Operations determines what a company can actually deliver — speed, quality, cost, flexibility. These capabilities directly shape competitive position, making operations decisions strategic, not just tactical." },
      { bloom_level: 2, question: "How does process design influence both cost and customer experience?", explanation: "Well-designed processes reduce waste, errors, and delays (lowering cost) while delivering consistent, timely results (improving customer experience). Poor process design does the opposite on both fronts." },
      { bloom_level: 2, question: "Why must operations managers constantly evaluate and redesign processes?", explanation: "Markets, technology, and customer expectations change. A process that was optimal last year may be inefficient today. Continuous evaluation ensures operations stay competitive and responsive." },
      // Bloom Level 3 — Apply
      { bloom_level: 3, question: "A growing online retailer is shipping orders 5 days late on average. As an operations manager, how would you approach this?", explanation: "Map the order-to-ship process, identify where delays occur (picking, packing, carrier handoff), measure each step's cycle time, eliminate bottlenecks, and potentially restructure warehouse layout or staffing." },
      { bloom_level: 3, question: "A university wants to reduce the time it takes to process student financial aid applications. Apply operations management thinking.", explanation: "Analyze the current workflow, identify handoff delays between departments, standardize document requirements, automate repetitive checks, create parallel processing where possible, and set service-level targets." },
      { bloom_level: 3, question: "A restaurant is opening a second location. What operations management decisions need to be made before opening day?", explanation: "Layout and kitchen design, supplier agreements, staffing and training plans, inventory management systems, quality control standards, capacity planning for peak hours, and standard operating procedures." },
      { bloom_level: 3, question: "A tech company's customer support team is overwhelmed. How would you redesign their operations?", explanation: "Analyze ticket types and volumes, create self-service options for common issues, implement tiered support levels, set up routing rules, measure resolution times, and staff based on demand patterns." },
      // Bloom Level 4 — Analyze
      { bloom_level: 4, question: "Compare operations management challenges in a hospital versus a factory. What is fundamentally different?", explanation: "Hospitals deal with unpredictable demand (emergencies), life-critical outcomes, highly skilled autonomous workers, and emotional customers. Factories have more predictable demand, standardizable processes, and measurable output. Both need efficiency, but hospitals must prioritize safety and flexibility." },
      { bloom_level: 4, question: "Analyze the tension between standardization and flexibility in operations. When should you favor each?", explanation: "Standardization reduces errors and costs for predictable, high-volume work. Flexibility is needed for custom products, variable demand, or creative services. Most operations need a blend — standardize the routine, flex for exceptions." },
      { bloom_level: 4, question: "How does the shift from product-based to service-based economies change operations management?", explanation: "Services are intangible, perishable, produced and consumed simultaneously, and highly variable. This requires different approaches: capacity management replaces inventory, customer experience becomes the product, and quality is harder to measure." },
      { bloom_level: 4, question: "Evaluate the claim that 'technology can solve most operations problems.' What does technology miss?", explanation: "Technology improves speed, data visibility, and automation, but can't fix poorly designed processes, bad management decisions, or cultural resistance. Technology amplifies what's already there — good or bad. Process design and people management remain essential." },
    ],
  };

  for (let ci = 0; ci < conceptIds.length; ci++) {
    const templates = cardsByConceptIndex[ci] || [];
    const def = conceptDefs[ci];
    for (const tmpl of templates) {
      allCards.push({
        id: crypto.randomUUID(),
        document_id: docId,
        concept_id: conceptIds[ci],
        page_number: def.page,
        source_snippet: (chunkTexts[def.chunkIndices[0]] || "").substring(0, 500),
        question: tmpl.question,
        explanation: tmpl.explanation,
        bloom_level: tmpl.bloom_level,
        difficulty: 1,
      });
    }
  }

  return allCards;
}
