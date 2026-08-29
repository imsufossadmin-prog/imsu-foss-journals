import "server-only";

import { prisma } from "@/lib/db/prisma";

export type InternalChatMessageDTO = {
  id: string;
  body: string | null;
  createdAt: string;
  sender: {
    id: string;
    displayName: string;
    roleLabel: string;
  } | null;
  attachments: Array<{
    id: string;
    originalFileName: string;
    sizeBytes: number;
    mimeType: string;
  }>;
};

export async function checkInternalChatAccess(
  userId: string,
  journalId: string,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      isActive: true,
      globalRoles: { select: { role: true } },
      journalRoles: { select: { journalId: true, role: true } },
    },
  });

  if (!user || !user.isActive) return false;
  if (user.globalRoles.some((r) => r.role === "SUPER_ADMIN")) return true;
  return user.journalRoles.some(
    (r) =>
      r.journalId === journalId &&
      (r.role === "JOURNAL_ADMIN" || r.role === "EDITOR"),
  );
}

export async function getInternalChatJournal(journalSlug: string) {
  return prisma.journal.findFirst({
    where: { slug: journalSlug, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      shortName: true,
    },
  });
}

export async function listInternalChatMessages(
  journalId: string,
): Promise<InternalChatMessageDTO[]> {
  const messages = await prisma.internalChatMessage.findMany({
    where: { journalId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: {
      sender: {
        select: {
          id: true,
          displayName: true,
          globalRoles: { select: { role: true } },
          journalRoles: {
            where: { journalId },
            select: { role: true },
          },
        },
      },
      attachments: {
        include: {
          storedFile: {
            select: {
              id: true,
              originalFileName: true,
              sizeBytes: true,
              mimeType: true,
            },
          },
        },
      },
    },
  });

  return messages.map((m) => {
    let roleLabel = "Staff";
    if (m.sender) {
      if (m.sender.globalRoles.some((r) => r.role === "SUPER_ADMIN")) {
        roleLabel = "Super Admin";
      } else if (
        m.sender.journalRoles.some((r) => r.role === "JOURNAL_ADMIN")
      ) {
        roleLabel = "Journal Admin";
      } else if (m.sender.journalRoles.some((r) => r.role === "EDITOR")) {
        roleLabel = "Editor";
      }
    }

    return {
      id: m.id,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      sender: m.sender
        ? {
            id: m.sender.id,
            displayName: m.sender.displayName,
            roleLabel,
          }
        : null,
      attachments: m.attachments.map((a) => ({
        id: a.id,
        originalFileName: a.storedFile.originalFileName,
        sizeBytes: Number(a.storedFile.sizeBytes),
        mimeType: a.storedFile.mimeType,
      })),
    };
  });
}

export async function sendInternalChatMessage(input: {
  journalId: string;
  senderId: string;
  body?: string | null;
  attachments?: Array<{
    bucket: string;
    objectPath: string;
    originalFileName: string;
    mimeType: string;
    sizeBytes: number;
  }>;
}) {
  const hasAccess = await checkInternalChatAccess(
    input.senderId,
    input.journalId,
  );
  if (!hasAccess) {
    throw new Error("Unauthorized to post in internal chat.");
  }

  const text = (input.body ?? "").trim();
  const atts = input.attachments ?? [];
  if (!text && atts.length === 0) {
    throw new Error("Message or attachment is required.");
  }

  return prisma.$transaction(async (tx) => {
    const message = await tx.internalChatMessage.create({
      data: {
        journalId: input.journalId,
        senderId: input.senderId,
        body: text || (atts.length > 0 ? "Attachment" : null),
      },
      select: { id: true },
    });

    for (const att of atts) {
      const stored = await tx.storedFile.create({
        data: {
          bucket: att.bucket,
          objectPath: att.objectPath,
          originalFileName: att.originalFileName,
          mimeType: att.mimeType,
          sizeBytes: BigInt(att.sizeBytes),
          uploaderId: input.senderId,
        },
        select: { id: true },
      });

      await tx.internalChatAttachment.create({
        data: {
          messageId: message.id,
          storedFileId: stored.id,
        },
      });
    }

    return message;
  });
}
