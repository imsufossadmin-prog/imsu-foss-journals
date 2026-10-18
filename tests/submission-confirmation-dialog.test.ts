import assert from "node:assert/strict";
import test from "node:test";
import { formatJournalConfirmationInfo } from "@/components/submissions/submission-confirmation-dialog";

test("formatJournalConfirmationInfo produces exact sentence format for journals with separate abbreviations", () => {
  const info = formatJournalConfirmationInfo(
    "Global Journal of Social and Behavioural Research",
    "GJSBR",
  );

  assert.strictEqual(
    info.fullName,
    "Global Journal of Social and Behavioural Research",
  );
  assert.strictEqual(info.abbreviation, "GJSBR");
  assert.strictEqual(
    info.formattedSentence,
    "Your manuscript will be submitted to Global Journal of Social and Behavioural Research (GJSBR). Is this the journal you intended to select?",
  );
});

test("formatJournalConfirmationInfo safely strips redundant trailing abbreviation from journal name", () => {
  const info = formatJournalConfirmationInfo(
    "African Journal of Social and Behavioural Sciences (AJSBS)",
    "AJSBS",
  );

  assert.strictEqual(
    info.fullName,
    "African Journal of Social and Behavioural Sciences",
  );
  assert.strictEqual(info.abbreviation, "AJSBS");
  assert.strictEqual(
    info.formattedSentence,
    "Your manuscript will be submitted to African Journal of Social and Behavioural Sciences (AJSBS). Is this the journal you intended to select?",
  );
});

test("formatJournalConfirmationInfo extracts abbreviation from name if shortName is not provided", () => {
  const info = formatJournalConfirmationInfo(
    "Nigerian Journal of Contemporary Psychology (NJCP)",
    null,
  );

  assert.strictEqual(
    info.fullName,
    "Nigerian Journal of Contemporary Psychology",
  );
  assert.strictEqual(info.abbreviation, "NJCP");
  assert.strictEqual(
    info.formattedSentence,
    "Your manuscript will be submitted to Nigerian Journal of Contemporary Psychology (NJCP). Is this the journal you intended to select?",
  );
});

test("formatJournalConfirmationInfo handles journal names with no abbreviation cleanly", () => {
  const info = formatJournalConfirmationInfo(
    "Faculty of Social Sciences Journal",
    null,
  );

  assert.strictEqual(info.fullName, "Faculty of Social Sciences Journal");
  assert.strictEqual(info.abbreviation, "");
  assert.strictEqual(
    info.formattedSentence,
    "Your manuscript will be submitted to Faculty of Social Sciences Journal. Is this the journal you intended to select?",
  );
});

test("formatJournalConfirmationInfo handles whitespace and trimming robustly", () => {
  const info = formatJournalConfirmationInfo(
    "  Economics Journal Operations   ",
    " ECO  ",
  );

  assert.strictEqual(info.fullName, "Economics Journal Operations");
  assert.strictEqual(info.abbreviation, "ECO");
  assert.strictEqual(
    info.formattedSentence,
    "Your manuscript will be submitted to Economics Journal Operations (ECO). Is this the journal you intended to select?",
  );
});

test("Journal selection synchronization: info updates dynamically when selected journal changes", () => {
  const mockJournals = [
    {
      id: "j-1",
      slug: "ajsbs",
      name: "African Journal of Social and Behavioural Sciences (AJSBS)",
      shortName: "AJSBS",
    },
    {
      id: "j-2",
      slug: "psychology",
      name: "Nigerian Journal of Contemporary Psychology (NJCP)",
      shortName: "NJCP",
    },
    {
      id: "j-3",
      slug: "political-science",
      name: "Political Science Journal Operations",
      shortName: "POL",
    },
  ];

  // Initial selection: Psychology
  let selected = mockJournals.find((j) => j.slug === "psychology")!;
  let dialogInfo = formatJournalConfirmationInfo(
    selected.name,
    selected.shortName,
  );
  assert.strictEqual(
    dialogInfo.formattedSentence,
    "Your manuscript will be submitted to Nigerian Journal of Contemporary Psychology (NJCP). Is this the journal you intended to select?",
  );

  // Author realizes this is the wrong journal, clicks Go Back, and selects Political Science
  selected = mockJournals.find((j) => j.slug === "political-science")!;
  dialogInfo = formatJournalConfirmationInfo(selected.name, selected.shortName);
  assert.strictEqual(
    dialogInfo.formattedSentence,
    "Your manuscript will be submitted to Political Science Journal Operations (POL). Is this the journal you intended to select?",
  );

  // Author switches to AJSBS
  selected = mockJournals.find((j) => j.slug === "ajsbs")!;
  dialogInfo = formatJournalConfirmationInfo(selected.name, selected.shortName);
  assert.strictEqual(
    dialogInfo.formattedSentence,
    "Your manuscript will be submitted to African Journal of Social and Behavioural Sciences (AJSBS). Is this the journal you intended to select?",
  );
});
