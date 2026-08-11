-- Requires the pgvector extension (run once per database, needs superuser
-- the first time): CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS vector;

-- POLICY_DOC
CREATE TABLE "POLICY_DOC" (
    "pd_id"     SERIAL PRIMARY KEY,
    "file_name" TEXT,
    "full_text" TEXT,
    "uploadat"  TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP
);

-- CHUNKED_POLICY_DOC (embedding is 768-dim: nomic-embed-text)
CREATE TABLE "CHUNKED_POLICY_DOC" (
    "cpd_id"      SERIAL PRIMARY KEY,
    "pd_id"       INTEGER REFERENCES "POLICY_DOC"("pd_id") ON DELETE CASCADE,
    "chunk_index" INTEGER,
    "chunk_text"  TEXT,
    "embedding"   vector(768)
);

CREATE INDEX "chunked_policy_embedding_idx" ON "CHUNKED_POLICY_DOC" USING hnsw ("embedding" vector_cosine_ops);

-- chat_sessions
CREATE TABLE "chat_sessions" (
    "id"         TEXT PRIMARY KEY,
    "title"      TEXT NOT NULL,
    "messages"   JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "emp_id"     INTEGER
);

CREATE INDEX "idx_chat_sessions_emp_id" ON "chat_sessions"("emp_id");
CREATE INDEX "idx_chat_sessions_updated" ON "chat_sessions"("updated_at" DESC);

-- question_logs
CREATE TABLE "question_logs" (
    "id"         SERIAL PRIMARY KEY,
    "question"   TEXT NOT NULL,
    "topic"      VARCHAR(50) DEFAULT 'OTHER',
    "session_id" VARCHAR(255),
    "asked_at"   TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP
);
