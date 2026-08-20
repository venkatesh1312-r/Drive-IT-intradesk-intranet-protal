-- Adds page_number to CHUNKED_POLICY_DOC so the bot can cite (and deep-link
-- to) the exact PDF page a chunk came from, instead of a model-guessed
-- section reference. Existing rows are left NULL and will simply not get
-- a page link until the source PDF is re-uploaded.
ALTER TABLE "CHUNKED_POLICY_DOC" ADD COLUMN "page_number" INTEGER;

-- Abbreviation -> full term map, auto-populated at upload time by scanning
-- each PDF for patterns like "Casual Leave (CL)". Lets the bot resolve
-- shortcuts like "CL"/"EL" that are defined in whatever policy PDF was
-- uploaded, without any hardcoded list.
CREATE TABLE "POLICY_ABBREVIATION" (
    "id" SERIAL PRIMARY KEY,
    "abbr" VARCHAR(20) NOT NULL,
    "full_term" VARCHAR(200) NOT NULL,
    "pd_id" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "POLICY_ABBREVIATION_abbr_full_term_key" UNIQUE ("abbr", "full_term")
);

CREATE INDEX "idx_policy_abbr_abbr" ON "POLICY_ABBREVIATION"("abbr");
