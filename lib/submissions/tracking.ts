import { createHash } from "node:crypto";

function readableJournalCode(name: string, shortName: string | null) {
  const source = (shortName ?? name).replace(/[^a-z0-9]/gi, "").toUpperCase();
  return (source || "FOSS").slice(0, 5).padEnd(4, "X");
}

export function createTrackingNumber(input: {
  journalId: string;
  journalName: string;
  journalShortName: string | null;
  year: number;
  sequence: number;
}) {
  const code = readableJournalCode(input.journalName, input.journalShortName);
  const journalMark = createHash("sha256")
    .update(input.journalId)
    .digest("hex")
    .slice(0, 4)
    .toUpperCase();

  return `${code}-${journalMark}-${input.year}-${String(input.sequence).padStart(5, "0")}`;
}
