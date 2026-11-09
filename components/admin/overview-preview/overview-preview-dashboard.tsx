"use client";

import { useState } from "react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types & Sample Data for Realistic Operational State
// ---------------------------------------------------------------------------

export type NotificationItem = {
  id: string;
  type: "message" | "submission" | "receipt" | "review" | "reviewer_app";
  title: string;
  description: string;
  timestamp: string;
  unread: boolean;
  journalSlug: string;
  journalName: string;
  actionLabel: string;
  actionHref: string;
  priority: "high" | "normal";
};

const initialNotifications: NotificationItem[] = [
  {
    id: "notif-1",
    type: "receipt",
    title: "Payment Receipt Uploaded",
    description:
      "Dr. Chidi Nwachukwu uploaded bank deposit proof for manuscript intake.",
    timestamp: "12 mins ago",
    unread: true,
    journalSlug: "psychology",
    journalName: "NJCP (Psychology)",
    actionLabel: "Verify Receipt",
    actionHref: "/admin/psychology/requests/req-102",
    priority: "high",
  },
  {
    id: "notif-2",
    type: "submission",
    title: "New Manuscript Submitted",
    description:
      "Title: 'Cognitive Stressors Among Secondary Educators in Imo State'. Awaiting Tracking ID.",
    timestamp: "45 mins ago",
    unread: true,
    journalSlug: "psychology",
    journalName: "NJCP (Psychology)",
    actionLabel: "Assign Tracking ID",
    actionHref: "/admin/psychology/submissions/sub-204",
    priority: "high",
  },
  {
    id: "notif-3",
    type: "message",
    title: "New Author Message",
    description:
      "Dr. Ngozi Eze sent a query regarding formatting guidelines in request REQ-089.",
    timestamp: "2 hours ago",
    unread: true,
    journalSlug: "ajsbs",
    journalName: "AJSBS (Social Sciences)",
    actionLabel: "Reply in Chat",
    actionHref: "/admin/ajsbs/requests/req-089",
    priority: "normal",
  },
  {
    id: "notif-4",
    type: "review",
    title: "Peer Review Completed",
    description:
      "Prof. A. N. Okoro submitted evaluation for NJCP-2026-004 (Recommendation: Minor Revision).",
    timestamp: "4 hours ago",
    unread: false,
    journalSlug: "psychology",
    journalName: "NJCP (Psychology)",
    actionLabel: "View Reviewer Report",
    actionHref: "/admin/psychology/submissions/sub-198",
    priority: "normal",
  },
  {
    id: "notif-5",
    type: "reviewer_app",
    title: "Reviewer Application Received",
    description:
      "Dr. B. C. Umeh applied as peer reviewer specializing in Forensic Criminology.",
    timestamp: "Yesterday",
    unread: false,
    journalSlug: "gjcsr",
    journalName: "GJCSR (Criminology)",
    actionLabel: "Review Application",
    actionHref: "/admin/reviewers",
    priority: "normal",
  },
];

const mockAttentionItems = [
  {
    id: "att-1",
    severity: "urgent",
    category: "Payment Verification",
    title: "Bank deposit receipt requires verification",
    subtitle: "Author: Dr. Chidi Nwachukwu · Request #REQ-102",
    journal: "NJCP",
    timeAgo: "12m ago",
    actionText: "Verify & Enable Submission",
    href: "/admin/psychology/requests/req-102",
  },
  {
    id: "att-2",
    severity: "urgent",
    category: "Tracking ID Assignment",
    title: "Submitted paper awaiting tracking number",
    subtitle:
      "Title: 'Cognitive Stressors Among Secondary Educators in Imo State'",
    journal: "NJCP",
    timeAgo: "45m ago",
    actionText: "Assign Tracking ID",
    href: "/admin/submissions?status=SUBMITTED",
  },
  {
    id: "att-3",
    severity: "medium",
    category: "Editorial Decision",
    title: "2 of 2 Peer Reviews Received",
    subtitle:
      "Manuscript NJCP-2026-002: 'Adolescent Identity Dynamics in Rural Imo'",
    journal: "NJCP",
    timeAgo: "3h ago",
    actionText: "Render Decision",
    href: "/admin/psychology/submissions/sub-198",
  },
  {
    id: "att-4",
    severity: "medium",
    category: "Reviewer Vetting",
    title: "1 Pending Peer Reviewer Application",
    subtitle: "Dr. B. C. Umeh (Criminology & Security Studies)",
    journal: "GJCSR",
    timeAgo: "1d ago",
    actionText: "Assess Application",
    href: "/admin/reviewers",
  },
];

const mockJournals = [
  {
    slug: "psychology",
    name: "Nigerian Journal of Contemporary Psychology",
    shortName: "NJCP",
    department: "Psychology",
    activeSubmissions: 6,
    awaitingTracking: 1,
    underReview: 4,
    readyToPublish: 1,
    activeVolume: "Vol. 4, Issue 1 (2026)",
    status: "Healthy",
  },
  {
    slug: "ajsbs",
    name: "African Journal of Social and Behavioural Sciences",
    shortName: "AJSBS",
    department: "Social Sciences",
    activeSubmissions: 4,
    awaitingTracking: 0,
    underReview: 3,
    readyToPublish: 1,
    activeVolume: "Vol. 14, Issue 2 (2026)",
    status: "Healthy",
  },
  {
    slug: "njsr",
    name: "Nwaebere Journal of Scientific Research",
    shortName: "NJSR",
    department: "Social Sciences",
    activeSubmissions: 2,
    awaitingTracking: 0,
    underReview: 2,
    readyToPublish: 0,
    activeVolume: "Vol. 2, Issue 1 (2026)",
    status: "Healthy",
  },
  {
    slug: "gjcsr",
    name: "Global Journal of Contemporary Social Research",
    shortName: "GJCSR",
    department: "Social Sciences",
    activeSubmissions: 1,
    awaitingTracking: 0,
    underReview: 1,
    readyToPublish: 0,
    activeVolume: "Vol. 1, Issue 1 (2026)",
    status: "Healthy",
  },
];

const mockRecentActivity = [
  {
    id: "act-1",
    actor: "Dr. Chidi Nwachukwu",
    action: "uploaded payment receipt",
    target: "REQ-102 (NJCP)",
    time: "12m ago",
    icon: "receipt",
  },
  {
    id: "act-2",
    actor: "Editorial Secretariat",
    action: "assigned tracking ID",
    target: "NJCP-2026-005 to Dr. Okon's paper",
    time: "1h ago",
    icon: "check",
  },
  {
    id: "act-3",
    actor: "Prof. A. N. Okoro",
    action: "submitted peer review report",
    target: "NJCP-2026-004",
    time: "4h ago",
    icon: "review",
  },
  {
    id: "act-4",
    actor: "Super Admin",
    action: "published article",
    target: "AJSBS Vol. 14 No. 2 #ART-402",
    time: "Yesterday",
    icon: "publish",
  },
  {
    id: "act-5",
    actor: "Dr. B. C. Umeh",
    action: "submitted reviewer application",
    target: "Criminology & Security",
    time: "Yesterday",
    icon: "person",
  },
];

export function OverviewPreviewDashboard() {
  const [isZeroState, setIsZeroState] = useState(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] =
    useState(false);
  const [notificationFilter, setNotificationFilter] = useState<
    "all" | "unread" | "messages"
  >("all");
  const [notifications, setNotifications] =
    useState<NotificationItem[]>(initialNotifications);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const toggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, unread: !item.unread } : item,
      ),
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((item) => ({ ...item, unread: false })),
    );
  };

  const filteredNotifications = notifications.filter((item) => {
    if (notificationFilter === "unread") return item.unread;
    if (notificationFilter === "messages") return item.type === "message";
    return true;
  });

  return (
    <div className="relative mx-auto max-w-7xl space-y-10 pb-16">
      {/* ------------------------------------------------------------------- */}
      {/* PROTOTYPE CONTROL BAR (FOR OWNER EVALUATION) */}
      {/* ------------------------------------------------------------------- */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 backdrop-blur-md">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex size-2.5 animate-pulse rounded-full bg-emerald-400" />
            <div>
              <p className="text-xs font-semibold text-emerald-300">
                FOSS Journals Admin Operating Center — Design Proposal &amp;
                Interactive Preview
              </p>
              <p className="text-[11px] text-[color:var(--color-muted)]">
                Isolated high-fidelity preview showcasing the redesigned
                information architecture, operational morning cockpit, and
                notification drawer.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsZeroState(!isZeroState)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                isZeroState
                  ? "border-emerald-500 bg-emerald-500/20 text-emerald-200"
                  : "border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] text-[color:var(--color-foreground)] hover:border-[color:var(--color-border-strong)]"
              }`}
            >
              {isZeroState
                ? "Switch to: Active Load State"
                : "Switch to: All-Clear Zero State"}
            </button>
            <Link
              href="/admin"
              className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] px-3 py-1.5 text-xs font-semibold text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
            >
              Compare Current Live Admin →
            </Link>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* PAGE HEADER & QUICK ACTION BAR */}
      {/* ------------------------------------------------------------------- */}
      <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-[11px] font-bold tracking-wider text-[color:var(--color-accent)] uppercase">
              Operational Command Center
            </span>
            <span className="text-[color:var(--color-border-strong)]">·</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-400" />4 Faculty
              Journals Online
            </span>
            <span className="text-[color:var(--color-border-strong)]">·</span>
            <span className="text-xs text-[color:var(--color-subtle)]">
              {new Date().toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>

          <h1 className="mt-2.5 font-serif text-3xl font-medium tracking-tight text-[color:var(--color-foreground)] sm:text-4xl lg:text-[2.6rem]">
            {isZeroState
              ? "All editorial queues are clear."
              : "Welcome back, Editorial Directorate."}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[color:var(--color-muted)]">
            {isZeroState
              ? "No pending receipts, manuscripts awaiting tracking IDs, or unreviewed reviewer applications across the Faculty of Social Sciences."
              : "You have 4 urgent action items requiring attention today across Psychology, Behavioural Sciences, and Criminology."}
          </p>
        </div>

        {/* Action Controls & Notification Trigger */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Notification Bell with Badge */}
          <button
            type="button"
            onClick={() =>
              setIsNotificationDrawerOpen(!isNotificationDrawerOpen)
            }
            aria-label="Open notifications center"
            className="relative flex h-10 items-center gap-2 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] px-3.5 text-xs font-semibold text-[color:var(--color-foreground)] transition hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-surface-strong)]"
          >
            <svg
              className="size-4 text-[color:var(--color-foreground)]"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.8"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
              />
            </svg>
            <span>Alerts</span>
            {unreadCount > 0 && !isZeroState ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-black">
                {unreadCount}
              </span>
            ) : null}
          </button>

          <Link
            href="/admin/submissions"
            className="flex h-10 items-center gap-2 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] px-3.5 text-xs font-semibold text-[color:var(--color-foreground)] transition hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]"
          >
            <span>Manuscripts Queue</span>
            <span className="font-mono text-[10px] text-[color:var(--color-subtle)]">
              →
            </span>
          </Link>

          <Link
            href="/admin/articles/new"
            className="flex h-10 items-center gap-2 rounded-xl bg-emerald-500 px-4 text-xs font-bold text-black shadow-sm transition hover:bg-emerald-400"
          >
            <span>+</span> Direct Publish
          </Link>
        </div>
      </header>

      {/* ------------------------------------------------------------------- */}
      {/* SECTION 1: URGENT ACTION CENTER (ATTENTION REQUIRED) */}
      {/* ------------------------------------------------------------------- */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-mono text-xs font-bold tracking-wider text-[color:var(--color-foreground)] uppercase">
              Immediate Attention Items
            </h2>
            <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
              {isZeroState
                ? "0 items"
                : `${mockAttentionItems.length} require action`}
            </span>
          </div>
          {!isZeroState && (
            <span className="text-[11px] text-[color:var(--color-subtle)]">
              Sorted by operational priority
            </span>
          )}
        </div>

        {isZeroState ? (
          <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-8 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
              <svg
                className="size-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m4.5 12.75 6 6 9-13.5"
                />
              </svg>
            </div>
            <h3 className="mt-3 font-serif text-lg font-medium text-[color:var(--color-foreground)]">
              All caught up for today
            </h3>
            <p className="mt-1 text-xs text-[color:var(--color-muted)]">
              No manuscripts are blocked on tracking IDs, payment receipts, or
              pending reviews.
            </p>
          </div>
        ) : (
          <div className="grid gap-3.5 md:grid-cols-2">
            {mockAttentionItems.map((item) => (
              <div
                key={item.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-5 transition hover:border-[color:var(--color-border-strong)] hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                        item.severity === "urgent"
                          ? "border border-rose-500/20 bg-rose-500/10 text-rose-400"
                          : "border border-amber-500/20 bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      {item.category}
                    </span>
                    <div className="flex items-center gap-1.5 text-[11px] text-[color:var(--color-subtle)]">
                      <span className="font-semibold text-[color:var(--color-accent)]">
                        {item.journal}
                      </span>
                      <span>·</span>
                      <span>{item.timeAgo}</span>
                    </div>
                  </div>

                  <h3 className="mt-3 text-sm font-medium text-[color:var(--color-foreground)] transition group-hover:text-[color:var(--color-accent)]">
                    {item.title}
                  </h3>
                  <p className="mt-1 line-clamp-1 text-xs text-[color:var(--color-muted)]">
                    {item.subtitle}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[color:var(--color-border)]/60 pt-3">
                  <span className="text-[11px] font-medium text-[color:var(--color-subtle)]">
                    Direct Action
                  </span>
                  <Link
                    href={item.href}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--color-accent)] hover:underline"
                  >
                    <span>{item.actionText}</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------------- */}
      {/* SECTION 2: EDITORIAL PIPELINE & OPERATIONAL METRICS */}
      {/* ------------------------------------------------------------------- */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-xs font-bold tracking-wider text-[color:var(--color-foreground)] uppercase">
            Platform Editorial Pipeline
          </h2>
          <span className="text-[11px] text-[color:var(--color-subtle)]">
            Total 13 Manuscripts in Active Processing
          </span>
        </div>

        {/* Visual Pipeline Bar */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-4">
            <span className="text-[10px] font-semibold text-[color:var(--color-subtle)] uppercase">
              1. Intake &amp; Receipts
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="font-serif text-3xl font-medium text-[color:var(--color-foreground)]">
                {isZeroState ? 0 : 3}
              </span>
              <span className="text-[11px] font-medium text-amber-400">
                1 receipt
              </span>
            </div>
            <p className="mt-1 text-[11px] text-[color:var(--color-muted)]">
              Author requests &amp; fee verification
            </p>
          </div>

          <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-4">
            <span className="text-[10px] font-semibold text-[color:var(--color-subtle)] uppercase">
              2. Screening &amp; Tracking
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="font-serif text-3xl font-medium text-[color:var(--color-foreground)]">
                {isZeroState ? 0 : 2}
              </span>
              <span className="text-[11px] font-medium text-rose-400">
                1 pending ID
              </span>
            </div>
            <p className="mt-1 text-[11px] text-[color:var(--color-muted)]">
              Desk check &amp; reference assignment
            </p>
          </div>

          <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-4">
            <span className="text-[10px] font-semibold text-[color:var(--color-subtle)] uppercase">
              3. Peer Review
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="font-serif text-3xl font-medium text-[color:var(--color-foreground)]">
                {isZeroState ? 0 : 7}
              </span>
              <span className="text-[11px] font-medium text-emerald-400">
                Active
              </span>
            </div>
            <p className="mt-1 text-[11px] text-[color:var(--color-muted)]">
              Assigned to blind reviewers
            </p>
          </div>

          <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-4">
            <span className="text-[10px] font-semibold text-[color:var(--color-subtle)] uppercase">
              4. Decision &amp; Revision
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="font-serif text-3xl font-medium text-[color:var(--color-foreground)]">
                {isZeroState ? 0 : 3}
              </span>
              <span className="text-[11px] font-medium text-amber-400">
                1 review in
              </span>
            </div>
            <p className="mt-1 text-[11px] text-[color:var(--color-muted)]">
              Acceptance &amp; author revisions
            </p>
          </div>

          <div className="col-span-2 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-4 sm:col-span-4 lg:col-span-1">
            <span className="text-[10px] font-semibold text-[color:var(--color-subtle)] uppercase">
              5. Catalog &amp; Issues
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="font-serif text-3xl font-medium text-[color:var(--color-foreground)]">
                38
              </span>
              <span className="text-[11px] font-medium text-emerald-400">
                Published
              </span>
            </div>
            <p className="mt-1 text-[11px] text-[color:var(--color-muted)]">
              Across 6 completed issues
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------- */}
      {/* SECTION 3: FACULTY JOURNALS OPERATING MATRIX */}
      {/* ------------------------------------------------------------------- */}
      <section className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-mono text-xs font-bold tracking-wider text-[color:var(--color-foreground)] uppercase">
              Faculty Journals Operating Matrix
            </h2>
            <p className="text-xs text-[color:var(--color-muted)]">
              Live status, workload, and direct workspace jump for each
              departmental publication.
            </p>
          </div>
          <Link
            href="/admin/editorial-board"
            className="text-xs font-semibold text-[color:var(--color-accent)] hover:underline"
          >
            Manage Editorial Boards →
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)]">
          <div className="divide-y divide-[color:var(--color-border)]/70">
            {mockJournals.map((journal) => (
              <div
                key={journal.slug}
                className="flex flex-col gap-4 p-5 transition hover:bg-[color:var(--color-surface-strong)]/40 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="max-w-md min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-[color:var(--color-accent-soft)] px-2 py-0.5 font-mono text-[11px] font-bold text-[color:var(--color-accent)]">
                      {journal.shortName}
                    </span>
                    <span className="text-xs text-[color:var(--color-subtle)]">
                      Dept. of {journal.department}
                    </span>
                    <span className="py-0.2 rounded-full bg-emerald-500/10 px-2 text-[10px] font-medium text-emerald-400">
                      Active
                    </span>
                  </div>
                  <h3 className="mt-1.5 font-serif text-base font-medium text-[color:var(--color-foreground)]">
                    {journal.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-[color:var(--color-subtle)]">
                    Active Volume: {journal.activeVolume}
                  </p>
                </div>

                {/* Quantitative Pipeline per Journal */}
                <div className="grid grid-cols-3 gap-6 text-center sm:gap-8">
                  <div>
                    <p className="font-mono text-lg font-semibold text-[color:var(--color-foreground)]">
                      {isZeroState ? 0 : journal.activeSubmissions}
                    </p>
                    <p className="text-[10px] text-[color:var(--color-subtle)] uppercase">
                      Total Active
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-lg font-semibold text-[color:var(--color-foreground)]">
                      {isZeroState ? 0 : journal.underReview}
                    </p>
                    <p className="text-[10px] text-[color:var(--color-subtle)] uppercase">
                      In Review
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-lg font-semibold text-[color:var(--color-foreground)]">
                      {isZeroState ? 0 : journal.readyToPublish}
                    </p>
                    <p className="text-[10px] text-[color:var(--color-subtle)] uppercase">
                      Ready
                    </p>
                  </div>
                </div>

                {/* Operations Links */}
                <div className="flex shrink-0 items-center gap-2.5">
                  <Link
                    href={`/admin/${journal.slug}/chat`}
                    className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
                  >
                    💬 Team Chat
                  </Link>
                  <Link
                    href={`/admin/${journal.slug}`}
                    className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20"
                  >
                    Open Workspace →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------- */}
      {/* SECTION 4: REAL-TIME AUDIT STREAM & QUICK SYSTEM TOOLS */}
      {/* ------------------------------------------------------------------- */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Recent Operational Events */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-xs font-bold tracking-wider text-[color:var(--color-foreground)] uppercase">
              Operational Activity Feed
            </h2>
            <span className="text-[11px] text-[color:var(--color-subtle)]">
              Live platform updates
            </span>
          </div>

          <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-5">
            <div className="divide-y divide-[color:var(--color-border)]/60">
              {mockRecentActivity.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0"
                >
                  <span className="mt-1 flex size-2 shrink-0 rounded-full bg-[color:var(--color-accent)]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[color:var(--color-foreground)]">
                      <span className="font-semibold">{event.actor}</span>{" "}
                      <span className="text-[color:var(--color-muted)]">
                        {event.action}
                      </span>{" "}
                      <span className="font-medium text-[color:var(--color-accent)]">
                        {event.target}
                      </span>
                    </p>
                    <p className="mt-0.5 text-[10px] text-[color:var(--color-subtle)]">
                      {event.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Platform Governance & Staff Directory Shortcut */}
        <section className="space-y-4">
          <h2 className="font-mono text-xs font-bold tracking-wider text-[color:var(--color-foreground)] uppercase">
            Platform Operations
          </h2>

          <div className="space-y-3">
            <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-5">
              <h3 className="font-serif text-sm font-semibold text-[color:var(--color-foreground)]">
                Privileged Staff
              </h3>
              <p className="mt-1 text-xs text-[color:var(--color-muted)]">
                4 Journal Administrators · 11 Departmental Editors across active
                journals.
              </p>
              <div className="mt-4 border-t border-[color:var(--color-border)]/60 pt-3">
                <Link
                  href="/admin/access"
                  className="text-xs font-semibold text-[color:var(--color-accent)] hover:underline"
                >
                  Manage User Permissions →
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-5">
              <h3 className="font-serif text-sm font-semibold text-[color:var(--color-foreground)]">
                Institutional Public Notice
              </h3>
              <p className="mt-1 text-xs text-[color:var(--color-muted)]">
                Broadcast announcements across faculty portals or specific
                journals.
              </p>
              <div className="mt-4 border-t border-[color:var(--color-border)]/60 pt-3">
                <Link
                  href="/admin/announcements"
                  className="text-xs font-semibold text-[color:var(--color-accent)] hover:underline"
                >
                  Manage Announcements →
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* NOTIFICATION DRAWER / SLIDE-OVER (CLIENT MANDATE) */}
      {/* ------------------------------------------------------------------- */}
      {isNotificationDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="flex h-full w-full max-w-md flex-col border-l border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-2xl">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-[color:var(--color-border)] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-xl font-medium text-[color:var(--color-foreground)]">
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-400">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-[color:var(--color-subtle)]">
                  Real-time editorial and communication alerts
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNotificationDrawerOpen(false)}
                className="rounded-lg p-1.5 text-[color:var(--color-subtle)] hover:bg-[color:var(--color-surface-raised)] hover:text-[color:var(--color-foreground)]"
                aria-label="Close notifications drawer"
              >
                ✕
              </button>
            </div>

            {/* Filter Tabs & Quick Action */}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-1 rounded-lg bg-[color:var(--color-surface-raised)] p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setNotificationFilter("all")}
                  className={`rounded-md px-2.5 py-1 font-medium transition ${
                    notificationFilter === "all"
                      ? "bg-emerald-500 font-semibold text-black"
                      : "text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setNotificationFilter("unread")}
                  className={`rounded-md px-2.5 py-1 font-medium transition ${
                    notificationFilter === "unread"
                      ? "bg-emerald-500 font-semibold text-black"
                      : "text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
                  }`}
                >
                  Unread ({unreadCount})
                </button>
                <button
                  type="button"
                  onClick={() => setNotificationFilter("messages")}
                  className={`rounded-md px-2.5 py-1 font-medium transition ${
                    notificationFilter === "messages"
                      ? "bg-emerald-500 font-semibold text-black"
                      : "text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
                  }`}
                >
                  Messages
                </button>
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-xs font-semibold text-[color:var(--color-accent)] hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="mt-5 flex-1 space-y-3 overflow-y-auto pr-1">
              {filteredNotifications.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-sm font-medium text-[color:var(--color-foreground)]">
                    No notifications
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--color-subtle)]">
                    You have caught up with all alerts in this category.
                  </p>
                </div>
              ) : (
                filteredNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`rounded-xl border p-4 transition ${
                      notif.unread
                        ? "border-[color:var(--color-accent)]/40 bg-[color:var(--color-surface-raised)]"
                        : "border-[color:var(--color-border)] bg-[color:var(--color-surface)]/60 opacity-80"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`size-2 rounded-full ${
                            notif.unread ? "bg-emerald-400" : "bg-transparent"
                          }`}
                        />
                        <span className="font-mono text-[10px] font-bold text-[color:var(--color-accent)]">
                          {notif.journalName}
                        </span>
                      </div>
                      <span className="text-[10px] text-[color:var(--color-subtle)]">
                        {notif.timestamp}
                      </span>
                    </div>

                    <h4 className="mt-2 text-xs font-semibold text-[color:var(--color-foreground)]">
                      {notif.title}
                    </h4>
                    <p className="mt-1 text-xs leading-relaxed text-[color:var(--color-muted)]">
                      {notif.description}
                    </p>

                    <div className="mt-3 flex items-center justify-between border-t border-[color:var(--color-border)]/60 pt-2.5">
                      <button
                        type="button"
                        onClick={() => toggleRead(notif.id)}
                        className="text-[11px] text-[color:var(--color-subtle)] hover:text-[color:var(--color-foreground)]"
                      >
                        {notif.unread ? "Mark as read" : "Mark unread"}
                      </button>
                      <Link
                        href={notif.actionHref}
                        className="text-xs font-semibold text-[color:var(--color-accent)] hover:underline"
                        onClick={() => setIsNotificationDrawerOpen(false)}
                      >
                        {notif.actionLabel} →
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Drawer Footer */}
            <div className="mt-4 border-t border-[color:var(--color-border)] pt-4 text-center text-xs text-[color:var(--color-subtle)]">
              Notifications sync across manuscript events, author chats, and
              staff channels.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
