import "server-only";

import type { Prisma, SubmissionStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export const editorialInboxStatuses: SubmissionStatus[] = [
  "SUBMITTED",
  "SCREENING",
  "CORRECTION_REQUESTED",
  "AWAITING_REVIEWERS",
  "UNDER_REVIEW",
  "REVIEWS_RECEIVED",
  "REVISION_REQUESTED",
  "REVISED",
  "ACCEPTED",
  "REJECTED",
];

export async function listEditorialSubmissions(input: {
  journalId: string;
  query?: string;
  status?: SubmissionStatus;
}) {
  const query = input.query?.trim();
  return prisma.submission.findMany({
    where: {
      journalId: input.journalId,
      status: input.status ?? { in: editorialInboxStatuses },
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: "insensitive" as const } },
              {
                trackingNumber: {
                  contains: query,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
    },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    select: {
      id: true,
      trackingNumber: true,
      title: true,
      status: true,
      submittedAt: true,
      updatedAt: true,
      _count: { select: { manuscriptVersions: true, reviewRounds: true } },
      reviewRounds: {
        orderBy: { roundNumber: "desc" },
        take: 1,
        select: {
          roundNumber: true,
          assignments: {
            where: { status: { notIn: ["CANCELLED", "DECLINED"] } },
            select: { status: true },
          },
        },
      },
    },
  });
}

export async function getEditorialSubmission(
  journalId: string,
  submissionId: string,
) {
  return prisma.submission.findFirst({
    where: { id: submissionId, journalId },
    select: {
      id: true,
      journalId: true,
      trackingNumber: true,
      title: true,
      abstract: true,
      keywords: true,
      status: true,
      submittedAt: true,
      createdAt: true,
      updatedAt: true,
      owner: { select: { displayName: true, institution: true } },
      authors: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          position: true,
          fullName: true,
          email: true,
          affiliation: true,
          orcid: true,
          isCorrespondingAuthor: true,
        },
      },
      files: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          type: true,
          storedFile: {
            select: { originalFileName: true, mimeType: true, sizeBytes: true },
          },
        },
      },
      manuscriptVersions: {
        orderBy: { versionNumber: "desc" },
        select: {
          id: true,
          versionNumber: true,
          kind: true,
          authorNote: true,
          submittedAt: true,
          manuscriptStoredFile: {
            select: { originalFileName: true, sizeBytes: true },
          },
          responseStoredFile: {
            select: { originalFileName: true, sizeBytes: true },
          },
        },
      },
      reviewRounds: {
        orderBy: { roundNumber: "desc" },
        select: {
          id: true,
          roundNumber: true,
          status: true,
          openedAt: true,
          closedAt: true,
          submissionVersion: { select: { id: true, versionNumber: true } },
          assignments: {
            orderBy: { assignedAt: "asc" },
            select: {
              id: true,
              status: true,
              assignedAt: true,
              dueAt: true,
              completedAt: true,
              editor: { select: { id: true, displayName: true } },
              review: {
                select: {
                  status: true,
                  originality: true,
                  methodology: true,
                  clarity: true,
                  relevance: true,
                  recommendation: true,
                  commentsToAuthor: true,
                  confidentialComments: true,
                  submittedAt: true,
                },
              },
            },
          },
          decisions: {
            select: {
              id: true,
              type: true,
              reason: true,
              authorMessage: true,
              revisionDueAt: true,
              decidedAt: true,
              decidedBy: { select: { displayName: true } },
            },
          },
        },
      },
      events: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          message: true,
          authorVisible: true,
          createdAt: true,
          actor: { select: { displayName: true } },
        },
      },
    },
  });
}

export async function listAssignableEditors(journalId: string) {
  return prisma.user.findMany({
    where: {
      isActive: true,
      journalRoles: { some: { journalId, role: "EDITOR" } },
    },
    orderBy: { displayName: "asc" },
    select: { id: true, displayName: true, institution: true },
  });
}

export async function listEditorAssignments(
  journalId: string,
  editorId: string,
) {
  return prisma.reviewAssignment.findMany({
    where: {
      editorId,
      status: { notIn: ["CANCELLED", "DECLINED"] },
      reviewRound: { submission: { journalId } },
    },
    orderBy: { assignedAt: "desc" },
    select: {
      id: true,
      status: true,
      assignedAt: true,
      dueAt: true,
      completedAt: true,
      reviewRound: {
        select: {
          roundNumber: true,
          submission: {
            select: {
              id: true,
              trackingNumber: true,
              title: true,
              status: true,
            },
          },
        },
      },
    },
  });
}

export async function getBlindedAssignment(input: {
  journalId: string;
  editorId: string;
  assignmentId: string;
}) {
  return prisma.reviewAssignment.findFirst({
    where: {
      id: input.assignmentId,
      editorId: input.editorId,
      status: { notIn: ["CANCELLED", "DECLINED"] },
      reviewRound: { submission: { journalId: input.journalId } },
    },
    select: {
      id: true,
      status: true,
      assignedAt: true,
      dueAt: true,
      completedAt: true,
      reviewRound: {
        select: {
          id: true,
          roundNumber: true,
          status: true,
          submissionVersion: {
            select: { id: true, versionNumber: true, kind: true },
          },
          submission: {
            select: {
              id: true,
              trackingNumber: true,
              title: true,
              abstract: true,
              keywords: true,
              journal: { select: { id: true, name: true, shortName: true } },
            },
          },
        },
      },
      review: {
        select: {
          status: true,
          originality: true,
          methodology: true,
          clarity: true,
          relevance: true,
          recommendation: true,
          commentsToAuthor: true,
          confidentialComments: true,
          submittedAt: true,
          version: true,
        },
      },
    },
  });
}

export async function getAuthorEditorialHistory(
  ownerId: string,
  submissionId: string,
) {
  return prisma.submission.findFirst({
    where: { id: submissionId, ownerId },
    select: {
      status: true,
      manuscriptVersions: {
        orderBy: { versionNumber: "desc" },
        select: {
          id: true,
          versionNumber: true,
          kind: true,
          authorNote: true,
          submittedAt: true,
          manuscriptStoredFile: {
            select: { originalFileName: true, sizeBytes: true },
          },
          responseStoredFile: {
            select: { originalFileName: true, sizeBytes: true },
          },
        },
      },
      editorialDecisions: {
        orderBy: { decidedAt: "desc" },
        select: {
          id: true,
          type: true,
          authorMessage: true,
          revisionDueAt: true,
          decidedAt: true,
          reviewRound: {
            select: {
              roundNumber: true,
              assignments: {
                where: { review: { status: "SUBMITTED" } },
                orderBy: { completedAt: "asc" },
                select: {
                  review: {
                    select: {
                      commentsToAuthor: true,
                      recommendation: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      events: {
        where: { authorVisible: true },
        orderBy: { createdAt: "desc" },
        select: { id: true, type: true, message: true, createdAt: true },
      },
    },
  });
}

export type EditorialSubmission = NonNullable<
  Awaited<ReturnType<typeof getEditorialSubmission>>
>;
export type BlindedAssignment = NonNullable<
  Awaited<ReturnType<typeof getBlindedAssignment>>
>;

export function submissionStatusFromQuery(value: string | undefined) {
  return editorialInboxStatuses.includes(value as SubmissionStatus)
    ? (value as SubmissionStatus)
    : undefined;
}

export type EditorialSubmissionWhere = Prisma.SubmissionWhereInput;
