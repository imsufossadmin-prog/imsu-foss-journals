"use client";

import { useState, useTransition } from "react";
import type {
  Announcement,
  AnnouncementCategory,
} from "@/lib/editorial/announcements-store";
import {
  createAnnouncementAction,
  deleteAnnouncementAction,
  toggleAnnouncementActiveAction,
  updateAnnouncementAction,
} from "@/app/admin/announcements/actions";
import { formatShortDate } from "@/lib/formatting/dates";

const CATEGORIES: Array<{ value: AnnouncementCategory; label: string }> = [
  { value: "CALL_FOR_PAPERS", label: "Call for Papers" },
  { value: "SPECIAL_ISSUE", label: "Special Issue Announcement" },
  { value: "EDITORIAL_UPDATE", label: "Editorial Notice / Update" },
  { value: "GENERAL", label: "General Announcement" },
];

export function AnnouncementsManager({
  initialAnnouncements,
}: {
  initialAnnouncements: Announcement[];
}) {
  const [announcements, setAnnouncements] =
    useState<Announcement[]>(initialAnnouncements);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Announcement | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [isPending, startTransition] = useTransition();

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await createAnnouncementAction({}, formData);
      if (res.success && res.announcement) {
        setAnnouncements((prev) => [res.announcement!, ...prev]);
        setShowCreateModal(false);
        setFeedback({
          type: "success",
          message: "Announcement published successfully.",
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Failed to create announcement.",
        });
      }
    });
  };

  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingItem) return;
    const formData = new FormData(e.currentTarget);
    formData.set("announcementId", editingItem.id);

    startTransition(async () => {
      const res = await updateAnnouncementAction({}, formData);
      if (res.success) {
        setAnnouncements((prev) =>
          prev.map((a) =>
            a.id === editingItem.id
              ? {
                  ...a,
                  title: formData.get("title")?.toString() || a.title,
                  category: (formData.get("category")?.toString() ||
                    a.category) as AnnouncementCategory,
                  targetJournal:
                    formData.get("targetJournal")?.toString() ||
                    a.targetJournal,
                  content: formData.get("content")?.toString() || a.content,
                  expiresAt: formData.get("expiresAt")?.toString() || undefined,
                  isActive:
                    formData.get("isActive") === "true" ||
                    formData.get("isActive") === "on",
                }
              : a,
          ),
        );
        setEditingItem(null);
        setFeedback({
          type: "success",
          message: "Announcement updated successfully.",
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Failed to update announcement.",
        });
      }
    });
  };

  const handleToggleActive = (announcementId: string) => {
    const formData = new FormData();
    formData.set("announcementId", announcementId);

    startTransition(async () => {
      const res = await toggleAnnouncementActiveAction({}, formData);
      if (res.success) {
        setAnnouncements((prev) =>
          prev.map((a) =>
            a.id === announcementId ? { ...a, isActive: !a.isActive } : a,
          ),
        );
        setFeedback({
          type: "success",
          message: "Announcement visibility status toggled.",
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Failed to update visibility.",
        });
      }
    });
  };

  const handleDelete = (announcementId: string) => {
    if (
      !confirm("Are you sure you want to permanently delete this announcement?")
    ) {
      return;
    }

    const formData = new FormData();
    formData.set("announcementId", announcementId);

    startTransition(async () => {
      const res = await deleteAnnouncementAction({}, formData);
      if (res.success) {
        setAnnouncements((prev) => prev.filter((a) => a.id !== announcementId));
        setFeedback({
          type: "success",
          message: "Announcement deleted.",
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Failed to delete announcement.",
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-xs font-semibold text-[color:var(--color-accent)] uppercase">
            Public Communication
          </p>
          <h1 className="mt-1 font-serif text-3xl font-semibold text-[color:var(--color-foreground)]">
            Announcements &amp; Call for Papers
          </h1>
          <p className="mt-0.5 text-xs text-[color:var(--color-muted)]">
            Publish calls for papers, special issue deadlines, and operational
            notices displayed on the public announcements feed.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/announcements"
            target="_blank"
            rel="noopener noreferrer"
            className="button-secondary text-xs"
          >
            Public Feed ↗
          </a>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="button-primary text-xs"
          >
            + Create Announcement
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

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-12 text-center">
            <p className="font-serif text-lg font-semibold text-[color:var(--color-foreground)]">
              No Announcements Found
            </p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-[color:var(--color-muted)]">
              Click &quot;+ Create Announcement&quot; to publish your first call
              for papers or editorial bulletin.
            </p>
          </div>
        ) : (
          announcements.map((item) => (
            <div
              key={item.id}
              className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 transition hover:border-[color:var(--color-accent)]/40"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                        item.category === "CALL_FOR_PAPERS"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : item.category === "SPECIAL_ISSUE"
                            ? "bg-amber-500/15 text-amber-300"
                            : "bg-blue-500/15 text-blue-400"
                      }`}
                    >
                      {item.category.replace(/_/g, " ")}
                    </span>
                    <span>·</span>
                    <span className="rounded bg-[color:var(--color-surface-raised)] px-2 py-0.5 font-mono text-[10px] text-[color:var(--color-subtle)] uppercase">
                      Target: {item.targetJournal.toUpperCase()}
                    </span>
                    <span>·</span>
                    <span
                      className={`font-mono text-[10px] font-semibold uppercase ${
                        item.isActive
                          ? "text-emerald-400"
                          : "text-[color:var(--color-subtle)]"
                      }`}
                    >
                      {item.isActive
                        ? "● Active / Published"
                        : "○ Draft / Hidden"}
                    </span>
                  </div>

                  <h2 className="mt-2 font-serif text-lg font-semibold text-[color:var(--color-foreground)]">
                    {item.title}
                  </h2>
                </div>

                <div
                  suppressHydrationWarning
                  className="text-right font-mono text-[11px] text-[color:var(--color-subtle)]"
                >
                  Published {formatShortDate(item.publishedAt)}
                </div>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-[color:var(--color-muted)]">
                {item.content}
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--color-border)] pt-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(item.id)}
                    className="button-secondary px-2.5 py-1 text-xs"
                  >
                    {item.isActive ? "Unpublish" : "Publish"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingItem(item)}
                    className="button-secondary px-2.5 py-1 text-xs"
                  >
                    Edit
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="text-xs font-semibold text-red-400 opacity-80 hover:opacity-100"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-2xl">
            <h3 className="font-serif text-xl font-semibold text-[color:var(--color-foreground)]">
              Create New Announcement
            </h3>
            <p className="text-xs text-[color:var(--color-muted)]">
              Publish news, calls for papers, and updates for authors.
            </p>

            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[color:var(--color-foreground)]">
                  Announcement Title *
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  placeholder="e.g. Call for Papers: 2026 Volume 11 Issues"
                  className="app-field mt-1 w-full text-xs"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-[color:var(--color-foreground)]">
                    Category *
                  </label>
                  <select
                    name="category"
                    defaultValue="CALL_FOR_PAPERS"
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
                    Target Journal *
                  </label>
                  <select
                    name="targetJournal"
                    defaultValue="ALL"
                    className="app-field mt-1 w-full text-xs"
                  >
                    <option value="ALL">All Faculty Journals</option>
                    <option value="njcp">NJCP (Psychology)</option>
                    <option value="ajsbs">AJSBS</option>
                    <option value="njsr">NJSR</option>
                    <option value="gjcsr">GJCSR</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[color:var(--color-foreground)]">
                  Announcement Body / Description *
                </label>
                <textarea
                  name="content"
                  required
                  rows={4}
                  placeholder="Provide complete announcement details, submission deadlines, themes, formatting instructions..."
                  className="app-field mt-1 w-full text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="create-isActive"
                  name="isActive"
                  defaultChecked
                  className="size-4 rounded border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-accent)]"
                />
                <label
                  htmlFor="create-isActive"
                  className="text-xs font-medium text-[color:var(--color-foreground)]"
                >
                  Publish immediately to public feed
                </label>
              </div>

              <div className="flex justify-end gap-3 border-t border-[color:var(--color-border)] pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="button-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="button-primary text-xs"
                >
                  {isPending ? "Publishing…" : "Publish Announcement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Edit Modal */}
      {editingItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-2xl">
            <h3 className="font-serif text-xl font-semibold text-[color:var(--color-foreground)]">
              Edit Announcement
            </h3>
            <p className="text-xs text-[color:var(--color-muted)]">
              Updating announcement details.
            </p>

            <form onSubmit={handleEdit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[color:var(--color-foreground)]">
                  Announcement Title *
                </label>
                <input
                  type="text"
                  name="title"
                  defaultValue={editingItem.title}
                  required
                  className="app-field mt-1 w-full text-xs"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-[color:var(--color-foreground)]">
                    Category *
                  </label>
                  <select
                    name="category"
                    defaultValue={editingItem.category}
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
                    Target Journal *
                  </label>
                  <select
                    name="targetJournal"
                    defaultValue={editingItem.targetJournal}
                    className="app-field mt-1 w-full text-xs"
                  >
                    <option value="ALL">All Faculty Journals</option>
                    <option value="njcp">NJCP (Psychology)</option>
                    <option value="ajsbs">AJSBS</option>
                    <option value="njsr">NJSR</option>
                    <option value="gjcsr">GJCSR</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[color:var(--color-foreground)]">
                  Announcement Body / Description *
                </label>
                <textarea
                  name="content"
                  defaultValue={editingItem.content}
                  required
                  rows={4}
                  className="app-field mt-1 w-full text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-isActive"
                  name="isActive"
                  defaultChecked={editingItem.isActive}
                  className="size-4 rounded border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-accent)]"
                />
                <label
                  htmlFor="edit-isActive"
                  className="text-xs font-medium text-[color:var(--color-foreground)]"
                >
                  Active / Published publicly
                </label>
              </div>

              <div className="flex justify-end gap-3 border-t border-[color:var(--color-border)] pt-3">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="button-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="button-primary text-xs"
                >
                  {isPending ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
