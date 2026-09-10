"use client";

import { useState, useTransition } from "react";
import {
  type EditorialBoardMember,
  type EditorialMemberCategory,
  type JournalMetadata,
} from "@/lib/editorial/editorial-board-data";
import {
  addEditorialBoardMemberAction,
  deleteEditorialBoardMemberAction,
  resetEditorialBoardAction,
  toggleJournalMetadataVisibilityAction,
  updateEditorialBoardMemberAction,
  updateJournalMetadataAction,
} from "@/app/admin/editorial-board/actions";

const CATEGORIES: Array<{ value: EditorialMemberCategory; label: string }> = [
  { value: "CHIEF_EDITOR", label: "Chief Editor" },
  { value: "DEPUTY_EDITOR", label: "Deputy Editor" },
  { value: "MANAGING_EDITOR", label: "Managing Editor" },
  { value: "ASSOCIATE_EDITOR", label: "Associate Editor" },
  { value: "BOARD_MEMBER", label: "Editorial Board Member" },
  { value: "CONSULTING_EDITOR", label: "Consulting Editor" },
  { value: "ADVISORY_BOARD", label: "Advisory Board / Council" },
];

export function EditorialBoardManager({
  journals: initialJournals,
  initialBoards,
}: {
  journals: JournalMetadata[];
  initialBoards: Record<string, EditorialBoardMember[]>;
}) {
  const [journals, setJournals] = useState<JournalMetadata[]>(initialJournals);
  const [activeSlug, setActiveSlug] = useState<string>(
    journals[0]?.slug ?? "njcp",
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(false);
  const [editingMember, setEditingMember] =
    useState<EditorialBoardMember | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [addPending, startAddTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();
  const [resetPending, startResetTransition] = useTransition();
  const [metaPending, startMetaTransition] = useTransition();
  const [togglePending, startToggleTransition] = useTransition();

  const currentJournal =
    journals.find((j) => j.slug === activeSlug) || journals[0];
  const members = initialBoards[activeSlug] || [];

  const [showMetadataChecked, setShowMetadataChecked] = useState<boolean>(
    currentJournal?.showMetadataOnHomepage === true,
  );

  // Sync controlled toggle state when active journal tab changes
  const handleTabChange = (slug: string) => {
    setActiveSlug(slug);
    setFeedback(null);
    const targetJournal = journals.find((j) => j.slug === slug);
    setShowMetadataChecked(targetJournal?.showMetadataOnHomepage === true);
  };

  const handleToggleVisibility = (newChecked: boolean) => {
    // 1. Immediate optimistic UI update
    setShowMetadataChecked(newChecked);
    setJournals((prev) =>
      prev.map((j) =>
        j.slug === activeSlug
          ? { ...j, showMetadataOnHomepage: newChecked }
          : j,
      ),
    );

    // 2. Instant background server action
    startToggleTransition(async () => {
      const res = await toggleJournalMetadataVisibilityAction({
        journalSlug: activeSlug,
        isVisible: newChecked,
      });
      if (res.success) {
        setFeedback({
          type: "success",
          message: newChecked
            ? `Metadata bar turned ON on public page (${currentJournal.shortName})`
            : `Metadata bar turned OFF on public page (${currentJournal.shortName})`,
        });
      } else {
        // Rollback on error
        setShowMetadataChecked(!newChecked);
        setJournals((prev) =>
          prev.map((j) =>
            j.slug === activeSlug
              ? { ...j, showMetadataOnHomepage: !newChecked }
              : j,
          ),
        );
        setFeedback({
          type: "error",
          message: res.error || "Failed to update visibility toggle.",
        });
      }
    });
  };

  const handleMetadataSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("journalSlug", activeSlug);
    formData.set(
      "showMetadataOnHomepage",
      showMetadataChecked ? "true" : "false",
    );

    startMetaTransition(async () => {
      const res = await updateJournalMetadataAction({}, formData);
      if (res.success) {
        setJournals((prev) =>
          prev.map((j) =>
            j.slug === activeSlug
              ? {
                  ...j,
                  issnPrint:
                    formData.get("issnPrint")?.toString().trim() || undefined,
                  issnOnline:
                    formData.get("issnOnline")?.toString().trim() || undefined,
                  frequency:
                    formData.get("frequency")?.toString().trim() || j.frequency,
                  referencingStyle:
                    formData.get("referencingStyle")?.toString().trim() ||
                    j.referencingStyle,
                  showMetadataOnHomepage: showMetadataChecked === true,
                }
              : j,
          ),
        );
        setFeedback({
          type: "success",
          message: `Metadata details for ${currentJournal.shortName} updated.`,
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Failed to update journal metadata.",
        });
      }
    });
  };

  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("journalSlug", activeSlug);

    startAddTransition(async () => {
      const res = await addEditorialBoardMemberAction({}, formData);
      if (res.success) {
        setShowAddModal(false);
        setFeedback({
          type: "success",
          message: "Editorial board member added successfully.",
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Failed to add member.",
        });
      }
    });
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingMember) return;
    const formData = new FormData(e.currentTarget);
    formData.set("journalSlug", activeSlug);
    formData.set("memberId", editingMember.id);

    startAddTransition(async () => {
      const res = await updateEditorialBoardMemberAction({}, formData);
      if (res.success) {
        setEditingMember(null);
        setFeedback({
          type: "success",
          message: "Editorial board member updated successfully.",
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Failed to update member.",
        });
      }
    });
  };

  const handleDelete = (memberId: string) => {
    if (
      !confirm("Are you sure you want to remove this editorial board member?")
    ) {
      return;
    }
    const formData = new FormData();
    formData.set("journalSlug", activeSlug);
    formData.set("memberId", memberId);

    startDeleteTransition(async () => {
      const res = await deleteEditorialBoardMemberAction({}, formData);
      if (res.success) {
        setFeedback({
          type: "success",
          message: "Member removed from editorial board.",
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Failed to remove member.",
        });
      }
    });
  };

  const handleReset = () => {
    if (
      !confirm(
        `Reset ${currentJournal.shortName} editorial board to standard institutional defaults?`,
      )
    ) {
      return;
    }
    const formData = new FormData();
    formData.set("journalSlug", activeSlug);

    startResetTransition(async () => {
      const res = await resetEditorialBoardAction({}, formData);
      if (res.success) {
        setFeedback({
          type: "success",
          message: "Editorial board reset to defaults.",
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Failed to reset board.",
        });
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-xs font-semibold text-[color:var(--color-accent)] uppercase">
            Governance Management
          </p>
          <h1 className="mt-1 font-serif text-3xl font-semibold text-[color:var(--color-foreground)]">
            Editorial Boards & Councils
          </h1>
          <p className="mt-1 text-xs text-[color:var(--color-muted)]">
            Manage chief editors, associate editors, board members, and
            consulting scholars across all 4 journals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            disabled={resetPending}
            className="button-secondary text-xs disabled:opacity-50"
          >
            {resetPending ? "Resetting…" : "Reset to Defaults"}
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="button-primary text-xs"
          >
            + Add Board Member
          </button>
        </div>
      </div>

      {feedback ? (
        <div
          className={`flex items-center justify-between rounded-[var(--radius-md)] p-3 text-xs font-semibold ${
            feedback.type === "success"
              ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
              : "border border-red-500/30 bg-red-500/15 text-red-400"
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-[10px] uppercase underline opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Journal Tabs */}
      {journals.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto border-b border-[color:var(--color-border)] pb-3">
          {journals.map((j) => (
            <button
              key={j.slug}
              type="button"
              onClick={() => handleTabChange(j.slug)}
              className={`rounded-full px-3.5 py-1 text-xs font-semibold whitespace-nowrap transition ${
                activeSlug === j.slug
                  ? "bg-[color:var(--color-accent)] text-black"
                  : "border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
              }`}
            >
              {j.shortName} ({j.title})
            </button>
          ))}
        </div>
      ) : null}

      {/* ── SECTION 1 (TOP): Editorial Board Members Directory ── */}
      <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 sm:p-5">
        <div className="flex flex-col gap-2 border-b border-[color:var(--color-border)] pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-lg font-semibold text-[color:var(--color-foreground)]">
              {currentJournal.title} ({currentJournal.shortName})
            </h2>
            <p className="font-mono text-xs text-[color:var(--color-accent)]">
              {members.length} Active Editorial Officers &amp; Scholars
            </p>
          </div>
          <a
            href={`/journals/${currentJournal.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-[color:var(--color-accent)] hover:underline"
          >
            View Public Page →
          </a>
        </div>

        {/* Member list */}
        <div className="mt-4 space-y-2.5">
          {members.length === 0 ? (
            <p className="py-8 text-center text-xs text-[color:var(--color-muted)]">
              No editorial board members found. Click &quot;+ Add Board
              Member&quot; or &quot;Reset to Defaults&quot;.
            </p>
          ) : (
            members.map((m) => (
              <div
                key={m.id}
                className="flex flex-col justify-between gap-3 rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-3 transition sm:flex-row sm:items-center"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-[color:var(--color-surface-strong)] px-2 py-0.5 font-mono text-[10px] font-bold text-[color:var(--color-accent)] uppercase">
                      {m.role}
                    </span>
                    <span className="font-mono text-[10px] text-[color:var(--color-subtle)]">
                      ({m.category})
                    </span>
                  </div>
                  <h3 className="mt-1 font-serif text-sm font-semibold text-[color:var(--color-foreground)]">
                    {m.name}
                  </h3>
                  <p className="text-[11px] text-[color:var(--color-muted)]">
                    {m.affiliation}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => setEditingMember(m)}
                    className="button-secondary px-2.5 py-1 text-xs"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(m.id)}
                    disabled={deletePending}
                    className="rounded-[var(--radius-sm)] border border-red-500/30 px-2.5 py-1 text-xs font-semibold text-red-400 transition hover:bg-red-500/10"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── SECTION 2 (BOTTOM): Collapsible Publication Metadata & Visibility Settings ── */}
      <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
        <button
          type="button"
          onClick={() => setIsMetadataExpanded((prev) => !prev)}
          className="flex w-full items-center justify-between p-4 text-left transition hover:bg-[color:var(--color-surface-raised)]"
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-sm text-[color:var(--color-accent)]">
              ⚙️
            </span>
            <span className="font-serif text-base font-semibold text-[color:var(--color-foreground)]">
              Publication Metadata &amp; Visibility Settings (
              {currentJournal.shortName})
            </span>
            <span
              className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${
                currentJournal.showMetadataOnHomepage
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-zinc-500/15 text-[color:var(--color-subtle)]"
              }`}
            >
              Public Bar: {currentJournal.showMetadataOnHomepage ? "ON" : "OFF"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-xs text-[color:var(--color-muted)]">
            <span>{isMetadataExpanded ? "Collapse" : "Click to expand"}</span>
            <span className="text-xs">{isMetadataExpanded ? "▲" : "▼"}</span>
          </div>
        </button>

        {isMetadataExpanded ? (
          <div className="border-t border-[color:var(--color-border)] p-4 sm:p-5">
            <p className="text-xs text-[color:var(--color-muted)]">
              Configure ISSN identifiers, publication frequency, referencing
              style, and toggle the public metadata bar displayed under the
              title on{" "}
              <code className="text-[color:var(--color-accent)]">
                /journals/{currentJournal.slug}
              </code>
              .
            </p>

            <form
              key={currentJournal.slug}
              onSubmit={handleMetadataSubmit}
              className="mt-4 space-y-4"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-[color:var(--color-foreground)]">
                    Print ISSN
                  </label>
                  <input
                    type="text"
                    name="issnPrint"
                    defaultValue={currentJournal.issnPrint ?? ""}
                    placeholder="e.g. 2736-0814 (leave blank if none)"
                    className="app-field mt-1 w-full text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[color:var(--color-foreground)]">
                    Online eISSN
                  </label>
                  <input
                    type="text"
                    name="issnOnline"
                    defaultValue={currentJournal.issnOnline ?? ""}
                    placeholder="e.g. 2736-0822 (leave blank if none)"
                    className="app-field mt-1 w-full text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[color:var(--color-foreground)]">
                    Publication Frequency
                  </label>
                  <input
                    type="text"
                    name="frequency"
                    defaultValue={currentJournal.frequency ?? "Bi-Annual"}
                    placeholder="e.g. Bi-Annual (June & December)"
                    className="app-field mt-1 w-full text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[color:var(--color-foreground)]">
                    Citation &amp; Referencing Standard
                  </label>
                  <input
                    type="text"
                    name="referencingStyle"
                    defaultValue={
                      currentJournal.referencingStyle ?? "APA 7th Edition"
                    }
                    placeholder="e.g. APA 7th Edition"
                    className="app-field mt-1 w-full text-xs"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold text-[color:var(--color-foreground)]">
                    Display Metadata Bar on Public Journal Homepage
                  </p>
                  <p className="text-[11px] text-[color:var(--color-muted)]">
                    When enabled, the ISSN, Frequency, and Standard bar will be
                    rendered on{" "}
                    <code className="text-[color:var(--color-accent)]">
                      /journals/{currentJournal.slug}
                    </code>
                    .
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    name="showMetadataOnHomepage"
                    checked={showMetadataChecked}
                    disabled={togglePending}
                    onChange={(e) => handleToggleVisibility(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-[color:var(--color-surface-strong)] peer-checked:bg-[color:var(--color-accent)] peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                </label>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={metaPending}
                  className="button-primary text-xs"
                >
                  {metaPending
                    ? "Saving Metadata Details…"
                    : "Save Metadata Details"}
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </div>

      {/* Add Modal */}
      {showAddModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-2xl">
            <h3 className="font-serif text-xl font-semibold text-[color:var(--color-foreground)]">
              Add Member to {currentJournal.shortName}
            </h3>
            <p className="text-xs text-[color:var(--color-muted)]">
              Provide the scholar&apos;s full academic name, role, and
              institutional affiliation.
            </p>

            <form onSubmit={handleAddSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[color:var(--color-foreground)]">
                  Full Academic Name
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Prof Nkwam C. Uwaoma"
                  className="app-field mt-1 w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[color:var(--color-foreground)]">
                  Role / Designation
                </label>
                <input
                  type="text"
                  name="role"
                  required
                  placeholder="e.g. Chief Editor, Associate Editor, Consulting Editor"
                  className="app-field mt-1 w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[color:var(--color-foreground)]">
                  Board Category
                </label>
                <select
                  name="category"
                  defaultValue="BOARD_MEMBER"
                  className="app-field mt-1 w-full text-xs"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[color:var(--color-foreground)]">
                  Institutional Affiliation
                </label>
                <input
                  type="text"
                  name="affiliation"
                  defaultValue="Department of Psychology, Imo State University, Owerri, Nigeria"
                  className="app-field mt-1 w-full text-xs"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-[color:var(--color-border)] pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="button-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addPending}
                  className="button-primary text-xs"
                >
                  {addPending ? "Adding…" : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Edit Modal */}
      {editingMember ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-2xl">
            <h3 className="font-serif text-xl font-semibold text-[color:var(--color-foreground)]">
              Edit Editorial Member
            </h3>
            <p className="text-xs text-[color:var(--color-muted)]">
              Updating entry for {currentJournal.shortName}.
            </p>

            <form onSubmit={handleEditSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[color:var(--color-foreground)]">
                  Full Academic Name
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingMember.name}
                  required
                  className="app-field mt-1 w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[color:var(--color-foreground)]">
                  Role / Designation
                </label>
                <input
                  type="text"
                  name="role"
                  defaultValue={editingMember.role}
                  required
                  className="app-field mt-1 w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[color:var(--color-foreground)]">
                  Board Category
                </label>
                <select
                  name="category"
                  defaultValue={editingMember.category}
                  className="app-field mt-1 w-full text-xs"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[color:var(--color-foreground)]">
                  Institutional Affiliation
                </label>
                <input
                  type="text"
                  name="affiliation"
                  defaultValue={editingMember.affiliation}
                  className="app-field mt-1 w-full text-xs"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-[color:var(--color-border)] pt-3">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="button-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addPending}
                  className="button-primary text-xs"
                >
                  {addPending ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
