import assert from "node:assert/strict";

import { prisma } from "../lib/db/prisma";
import { saveEditorReview } from "../lib/editorial/mutations";
import {
  createReviewAttachmentObjectPath,
  storageBuckets,
} from "../lib/storage/paths";
import { createAdminClient } from "../lib/supabase/admin";

async function runLiveVerification() {
  console.log(
    "=== STARTING LIVE END-TO-END REVIEW SUBMISSION VERIFICATION ===",
  );

  // 1. Find or pick an active journal and assignment
  const journal = await prisma.journal.findUnique({
    where: { slug: "psychology" },
  });
  assert(journal, "Psychology journal not found");

  // Find an editor assigned to psychology
  const editorRole = await prisma.journalRoleAssignment.findFirst({
    where: { journalId: journal.id, role: "EDITOR", user: { isActive: true } },
    include: { user: true },
  });
  assert(editorRole, "No active editor found for psychology");
  const editor = editorRole.user;
  console.log(`Using editor: ${editor.displayName} (${editor.id})`);

  // Find or create an open assignment for this editor
  let assignment = await prisma.reviewAssignment.findFirst({
    where: {
      editorId: editor.id,
      reviewRound: {
        status: { in: ["PLANNED", "ACTIVE"] },
        submission: {
          journalId: journal.id,
          status: {
            in: [
              "AWAITING_REVIEWERS",
              "UNDER_REVIEW",
              "REVIEWS_RECEIVED",
              "REVISED",
            ],
          },
        },
      },
    },
    include: {
      review: { include: { attachments: { include: { storedFile: true } } } },
    },
  });

  if (!assignment) {
    const author = await prisma.user.findFirst({ where: { isActive: true } });
    assert(author, "Author required");

    const file = await prisma.storedFile.create({
      data: {
        bucket: "academic-private",
        objectPath: `fixtures/live-test-${Date.now()}.docx`,
        originalFileName: "manuscript.docx",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        sizeBytes: 10240,
        uploaderId: author.id,
      },
    });

    const createdSub = await prisma.submission.create({
      data: {
        journalId: journal.id,
        ownerId: author.id,
        title: "Live E2E Review Validation Manuscript",
        abstract:
          "Test abstract for verifying review scorecard and attachments.",
        status: "UNDER_REVIEW",
        manuscriptVersions: {
          create: {
            versionNumber: 1,
            kind: "ORIGINAL",
            manuscriptStoredFileId: file.id,
          },
        },
      },
      include: { manuscriptVersions: true },
    });

    await prisma.reviewRound.create({
      data: {
        submissionId: createdSub.id,
        submissionVersionId: createdSub.manuscriptVersions[0].id,
        roundNumber: 1,
        status: "ACTIVE",
        openedAt: new Date(),
        assignments: {
          create: {
            editorId: editor.id,
            status: "ASSIGNED",
          },
        },
      },
    });

    assignment = await prisma.reviewAssignment.findFirstOrThrow({
      where: {
        editorId: editor.id,
        reviewRound: { submissionId: createdSub.id },
      },
      include: {
        review: { include: { attachments: { include: { storedFile: true } } } },
      },
    });
  }

  assert(assignment, "Assignment must exist");
  console.log(`Target Assignment: ${assignment.id}`);

  // Clean up any existing review on this assignment for clean-slate testing
  if (assignment.review) {
    await prisma.reviewAttachment.deleteMany({
      where: { reviewId: assignment.review.id },
    });
    await prisma.review.delete({ where: { id: assignment.review.id } });
    await prisma.reviewAssignment.update({
      where: { id: assignment.id },
      data: { status: "ASSIGNED", completedAt: null, respondedAt: null },
    });
  }

  // --- SCENARIO 1: Save Draft with no scores and no attachments ---
  console.log(
    "\n--- Scenario 1: Save Draft with no scores and no attachments ---",
  );
  await saveEditorReview({
    editorId: editor.id,
    journalId: journal.id,
    assignmentId: assignment.id,
    reviewVersion: 0,
    final: false,
    review: {
      titleAbstract: 0,
      introductionThesis: 0,
      literatureReview: 0,
      methodology: 0,
      resultsDiscussion: 0,
      conclusion: 0,
      languageStyle: 0,
      apaAdherence: 0,
      generalReport: "",
      recommendation: "",
    },
  });

  let savedReview = await prisma.review.findUnique({
    where: { assignmentId: assignment.id },
  });
  assert(savedReview, "Review draft should exist in DB");
  assert.equal(savedReview.status, "DRAFT");
  assert.equal(savedReview.methodology, null);
  console.log("✓ Scenario 1 passed: Draft saved with empty payload.");

  // --- SCENARIO 2: Save Draft with some scores (> 5 to test new 1-10 range) ---
  console.log(
    "\n--- Scenario 2: Save Draft with scores 1-10 (testing methodology = 9) ---",
  );
  await saveEditorReview({
    editorId: editor.id,
    journalId: journal.id,
    assignmentId: assignment.id,
    reviewVersion: savedReview.version,
    final: false,
    review: {
      titleAbstract: 8,
      introductionThesis: 7,
      literatureReview: 6,
      methodology: 9, // Previously failed due to CHECK methodology <= 5
      resultsDiscussion: 10,
      conclusion: 8,
      languageStyle: 7,
      apaAdherence: 9,
      generalReport: "Draft evaluation notes",
      recommendation: "ACCEPT",
    },
  });

  savedReview = await prisma.review.findUnique({
    where: { assignmentId: assignment.id },
  });
  assert(savedReview, "Review draft should exist");
  assert.equal(savedReview.methodology, 9);
  assert.equal(savedReview.resultsDiscussion, 10);
  assert.equal(savedReview.generalReport, "Draft evaluation notes");
  console.log(
    "✓ Scenario 2 passed: Scores 1-10 (methodology=9, results=10) saved successfully.",
  );

  // --- SCENARIO 3: Save Draft with Attachment ---
  console.log("\n--- Scenario 3: Save Draft with Attachment ---");
  const supabase = createAdminClient();
  const bucket = storageBuckets.privateAcademicFiles;
  const testFileBuffer = Buffer.from(
    "%PDF-1.4 simulated pdf review notes for testing",
  );
  const testPath = createReviewAttachmentObjectPath({
    journalId: journal.id,
    assignmentId: assignment.id,
    originalFileName: "reviewer-notes.pdf",
  });

  const uploadRes = await supabase.storage
    .from(bucket)
    .upload(testPath, testFileBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });
  assert(!uploadRes.error, `Upload failed: ${uploadRes.error?.message}`);

  await saveEditorReview({
    editorId: editor.id,
    journalId: journal.id,
    assignmentId: assignment.id,
    reviewVersion: savedReview.version,
    final: false,
    review: {
      titleAbstract: 8,
      introductionThesis: 7,
      literatureReview: 6,
      methodology: 9,
      resultsDiscussion: 10,
      conclusion: 8,
      languageStyle: 7,
      apaAdherence: 9,
      generalReport: "Updated draft notes with pdf attachment",
      recommendation: "ACCEPT",
    },
    attachments: [
      {
        bucket,
        objectPath: testPath,
        originalFileName: "reviewer-notes.pdf",
        mimeType: "application/pdf",
        sizeBytes: testFileBuffer.length,
      },
    ],
  });

  const reviewWithAtt = await prisma.review.findUniqueOrThrow({
    where: { assignmentId: assignment.id },
    include: { attachments: { include: { storedFile: true } } },
  });
  assert.equal(reviewWithAtt.attachments.length, 1);
  assert.equal(
    reviewWithAtt.attachments[0].storedFile.originalFileName,
    "reviewer-notes.pdf",
  );
  console.log(
    "✓ Scenario 3 passed: Attachment record and StoredFile successfully created.",
  );

  // --- SCENARIO 4: Attachment Download Verification ---
  console.log("\n--- Scenario 4: Download Verification ---");
  const downloadRes = await supabase.storage.from(bucket).download(testPath);
  assert(!downloadRes.error, `Download failed: ${downloadRes.error?.message}`);
  const downloadedText = await downloadRes.data.text();
  assert.equal(
    downloadedText,
    "%PDF-1.4 simulated pdf review notes for testing",
  );
  console.log(
    "✓ Scenario 4 passed: Stored attachment is downloadable and matches byte integrity.",
  );

  // --- SCENARIO 5: Submit Review with scores, report, recommendation, and multiple attachments ---
  console.log(
    "\n--- Scenario 5: Submit Final Review (final = true) with multiple attachments ---",
  );
  const testFile3Buffer = Buffer.from(
    "%PDF-1.4 simulated second pdf review notes for testing",
  );
  const testPath3 = createReviewAttachmentObjectPath({
    journalId: journal.id,
    assignmentId: assignment.id,
    originalFileName: "reviewer-notes-final.pdf",
  });
  const uploadRes3 = await supabase.storage
    .from(bucket)
    .upload(testPath3, testFile3Buffer, {
      contentType: "application/pdf",
      upsert: true,
    });
  assert(!uploadRes3.error, `Upload 3 failed: ${uploadRes3.error?.message}`);

  const testFile2Buffer = Buffer.from(
    "PK\x03\x04simulated docx review annotated",
  );
  const testPath2 = createReviewAttachmentObjectPath({
    journalId: journal.id,
    assignmentId: assignment.id,
    originalFileName: "annotated-manuscript.docx",
  });
  const uploadRes2 = await supabase.storage
    .from(bucket)
    .upload(testPath2, testFile2Buffer, {
      contentType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      upsert: true,
    });
  assert(!uploadRes2.error, `Upload 2 failed: ${uploadRes2.error?.message}`);

  await saveEditorReview({
    editorId: editor.id,
    journalId: journal.id,
    assignmentId: assignment.id,
    reviewVersion: savedReview.version,
    final: true,
    review: {
      titleAbstract: 9,
      introductionThesis: 8,
      literatureReview: 9,
      methodology: 10,
      resultsDiscussion: 9,
      conclusion: 9,
      languageStyle: 8,
      apaAdherence: 10,
      generalReport:
        "Comprehensive final review report with strong empirical backing.",
      recommendation: "ACCEPT",
    },
    attachments: [
      {
        bucket,
        objectPath: testPath3,
        originalFileName: "reviewer-notes-final.pdf",
        mimeType: "application/pdf",
        sizeBytes: testFile3Buffer.length,
      },
      {
        bucket,
        objectPath: testPath2,
        originalFileName: "annotated-manuscript.docx",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        sizeBytes: testFile2Buffer.length,
      },
    ],
  });

  const finalReview = await prisma.review.findUnique({
    where: { assignmentId: assignment.id },
    include: {
      attachments: { include: { storedFile: true } },
      assignment: true,
    },
  });
  assert(finalReview, "Final review should exist");
  assert.equal(finalReview.status, "SUBMITTED");
  assert.equal(finalReview.assignment.status, "COMPLETED");
  assert.equal(finalReview.attachments.length, 3); // 1 from draft + 2 new
  console.log(
    "✓ Scenario 5 passed: Final review successfully submitted and assignment status updated to COMPLETED.",
  );

  // Cleanup storage
  await supabase.storage.from(bucket).remove([testPath, testPath2, testPath3]);

  console.log(
    "\n=== ALL 6 LIVE OPERATIONAL SCENARIOS VERIFIED SUCCESSFULLY ===",
  );
}

runLiveVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Verification failed with error:", err);
    process.exit(1);
  });
