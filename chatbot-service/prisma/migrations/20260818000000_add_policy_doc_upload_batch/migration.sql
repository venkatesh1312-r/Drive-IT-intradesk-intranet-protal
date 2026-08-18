-- Adds a per-request batch id to POLICY_DOC so "Recent Uploads" can show
-- every file from the last upload (5, 10, whatever) instead of a fixed
-- number of rows. Existing rows are left NULL (treated as their own
-- single-file batch by the app).
ALTER TABLE "POLICY_DOC" ADD COLUMN "upload_batch" VARCHAR(36);

CREATE INDEX "POLICY_DOC_upload_batch_idx" ON "POLICY_DOC"("upload_batch");
