-- =============================================================
-- Recallr — Supabase Schema
-- Run this in the Supabase SQL Editor to create all tables
-- =============================================================

CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chunks (
    id SERIAL PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    processed_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS concepts (
    id TEXT PRIMARY KEY,
    document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    topic TEXT NOT NULL DEFAULT 'General',
    description TEXT NOT NULL DEFAULT '',
    bloom_mastery INTEGER NOT NULL DEFAULT 1,
    mastery_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    correct_streak INTEGER NOT NULL DEFAULT 0,
    last_reviewed TIMESTAMPTZ,
    review_count INTEGER NOT NULL DEFAULT 0,
    needs_generation_level INTEGER NOT NULL DEFAULT 1,
    source_chunk_ids TEXT NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flashcards (
    id TEXT PRIMARY KEY,
    document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
    concept_id TEXT REFERENCES concepts(id) ON DELETE SET NULL,
    page_number INTEGER,
    source_snippet TEXT,
    question TEXT NOT NULL,
    explanation TEXT NOT NULL,
    bloom_level INTEGER NOT NULL DEFAULT 1,
    difficulty INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_interactions (
    id SERIAL PRIMARY KEY,
    flashcard_id TEXT NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
    concept_id TEXT REFERENCES concepts(id) ON DELETE SET NULL,
    is_correct BOOLEAN NOT NULL,
    confidence_before INTEGER DEFAULT 50,
    bloom_level INTEGER DEFAULT 1,
    time_taken_ms INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    coins_earned INTEGER DEFAULT 0,
    calibration_accuracy DOUBLE PRECISION DEFAULT 0.0,
    "timestamp" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS player_resources (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    amount INTEGER NOT NULL DEFAULT 0
);

-- =============================================================
-- RPC Functions for atomic increment/decrement operations
-- =============================================================

CREATE OR REPLACE FUNCTION increment_resource_amount(p_resource_type TEXT, p_delta INTEGER)
RETURNS void AS $$
BEGIN
    UPDATE player_resources
    SET amount = amount + p_delta
    WHERE resource_type = p_resource_type;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_concept_after_review(
    p_concept_id TEXT,
    p_bloom_mastery INTEGER,
    p_mastery_score DOUBLE PRECISION,
    p_correct_streak INTEGER
)
RETURNS void AS $$
BEGIN
    UPDATE concepts
    SET bloom_mastery = p_bloom_mastery,
        mastery_score = p_mastery_score,
        correct_streak = p_correct_streak,
        review_count = review_count + 1,
        last_reviewed = NOW()
    WHERE id = p_concept_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_concept_mastery(p_concept_id TEXT, p_delta DOUBLE PRECISION)
RETURNS void AS $$
BEGIN
    UPDATE concepts
    SET mastery_score = mastery_score + p_delta,
        last_reviewed = NOW()
    WHERE id = p_concept_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION escalate_concept_bloom(
    p_concept_id TEXT,
    p_new_mastery INTEGER,
    p_mastery_delta DOUBLE PRECISION
)
RETURNS void AS $$
BEGIN
    UPDATE concepts
    SET bloom_mastery = p_new_mastery,
        needs_generation_level = p_new_mastery,
        mastery_score = mastery_score + p_mastery_delta,
        last_reviewed = NOW()
    WHERE id = p_concept_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================
-- Disable RLS on all tables for simplicity (no auth in this app)
-- =============================================================

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_resources ENABLE ROW LEVEL SECURITY;

-- Allow all operations (no auth required for this demo)
CREATE POLICY "Allow all on documents" ON documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on chunks" ON chunks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on concepts" ON concepts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on flashcards" ON flashcards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on user_interactions" ON user_interactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on player_resources" ON player_resources FOR ALL USING (true) WITH CHECK (true);
