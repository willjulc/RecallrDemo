import { supabase } from "./supabase";
import crypto from "crypto";

/**
 * Seed the database with demo data if it's empty.
 * Called from API routes that need data to exist.
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

    const chunks = [
      { page: 1, text: "Supply Chain Management (SCM) is the active management of supply chain activities to maximize customer value and achieve a sustainable competitive advantage. It represents a conscious effort by the supply chain firms to develop and run supply chains in the most effective and efficient ways possible. Supply chain activities cover everything from product development, sourcing, production, and logistics, as well as the information systems needed to coordinate these activities." },
      { page: 1, text: "Just-in-Time (JIT) manufacturing, also known as the Toyota Production System (TPS), is a methodology aimed primarily at reducing times within the production system as well as response times from suppliers and to customers. Its origin and development was mainly in Japan, largely in the 1960s and 1970s and particularly at Toyota. JIT manufacturing tries to smooth the flow of material to arrive just as it is needed, minimizing inventory costs." },
      { page: 2, text: "Lean Manufacturing is a production method aimed at reducing times within the production system as well as response times from suppliers and to customers. It is closely related to another concept called total quality management. Lean principles focus on minimizing waste (muda) without sacrificing productivity. Waste is defined as any activity that does not add value from the customer's perspective. Lean emphasizes continuous improvement (kaizen) and respect for people." },
      { page: 2, text: "Six Sigma is a set of techniques and tools for process improvement. It was introduced by American engineer Bill Smith while working at Motorola in 1986. Six Sigma seeks to improve the quality of the output of a process by identifying and removing the causes of defects and minimizing variability in manufacturing and business processes. It uses a set of quality management methods, mainly empirical, statistical methods, and creates a special infrastructure of people within the organization." },
      { page: 3, text: "Quality Control (QC) is a process by which entities review the quality of all factors involved in production. ISO 9000 defines quality control as A part of quality management focused on fulfilling quality requirements. This approach places an emphasis on three aspects: elements such as controls, job management, defined and well managed processes, performance and integrity criteria, and identification of records." },
      { page: 3, text: "Operations Management is an area of management concerned with designing and controlling the process of production and redesigning business operations in the production of goods or services. It involves the responsibility of ensuring that business operations are efficient in terms of using as few resources as needed and effective in terms of meeting customer requirements. Operations managers are involved in coordinating and developing new processes while evaluating current structures." },
    ];

    const concepts = [
      { name: "Supply Chain Management", desc: "Active management of activities to maximize customer value and coordinate logistics." },
      { name: "Just-in-Time (JIT)", desc: "Methodology to reduce times and smooth material flow to arrive precisely when needed." },
      { name: "Lean Manufacturing", desc: "Production method focused on minimizing waste (muda) while respecting people." },
      { name: "Six Sigma", desc: "Empirical techniques for process improvement and minimizing manufacturing variability." },
      { name: "Operations Management", desc: "Designing and controlling production processes to efficiently meet customer requirements." },
    ];

    await supabase.from("chunks").insert(
      chunks.map((c) => ({
        document_id: docId,
        page_number: c.page,
        content: c.text,
      }))
    );

    await supabase.from("concepts").insert(
      concepts.map((c) => ({
        id: crypto.randomUUID(),
        document_id: docId,
        name: c.name,
        topic: "Operations",
        description: c.desc,
        bloom_mastery: 1,
      }))
    );

    // Pre-seed Capital to 100 so the UI isn't completely at 0
    await supabase.from("player_resources").insert({
      id: crypto.randomUUID(),
      player_id: "default_player",
      resource_type: "capital",
      amount: 100,
    });

    console.log("Demo Database successfully seeded.");
  } catch (err) {
    console.error("Error seeding demo database:", err);
  }
}
