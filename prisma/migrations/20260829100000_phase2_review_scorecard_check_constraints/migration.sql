-- Drop legacy 1-5 review constraints and legacy submission requirement
ALTER TABLE "Review"
  DROP CONSTRAINT IF EXISTS "Review_originality_range",
  DROP CONSTRAINT IF EXISTS "Review_methodology_range",
  DROP CONSTRAINT IF EXISTS "Review_clarity_range",
  DROP CONSTRAINT IF EXISTS "Review_relevance_range",
  DROP CONSTRAINT IF EXISTS "Review_submitted_complete";

-- Add Phase 2 1-10 check constraints for all 8 criteria (allowing NULL when unselected/optional)
ALTER TABLE "Review"
  ADD CONSTRAINT "Review_titleAbstract_range" CHECK ("titleAbstract" IS NULL OR ("titleAbstract" BETWEEN 1 AND 10)),
  ADD CONSTRAINT "Review_introductionThesis_range" CHECK ("introductionThesis" IS NULL OR ("introductionThesis" BETWEEN 1 AND 10)),
  ADD CONSTRAINT "Review_literatureReview_range" CHECK ("literatureReview" IS NULL OR ("literatureReview" BETWEEN 1 AND 10)),
  ADD CONSTRAINT "Review_methodology_range" CHECK ("methodology" IS NULL OR ("methodology" BETWEEN 1 AND 10)),
  ADD CONSTRAINT "Review_resultsDiscussion_range" CHECK ("resultsDiscussion" IS NULL OR ("resultsDiscussion" BETWEEN 1 AND 10)),
  ADD CONSTRAINT "Review_conclusion_range" CHECK ("conclusion" IS NULL OR ("conclusion" BETWEEN 1 AND 10)),
  ADD CONSTRAINT "Review_languageStyle_range" CHECK ("languageStyle" IS NULL OR ("languageStyle" BETWEEN 1 AND 10)),
  ADD CONSTRAINT "Review_apaAdherence_range" CHECK ("apaAdherence" IS NULL OR ("apaAdherence" BETWEEN 1 AND 10));
