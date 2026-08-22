import "dotenv/config";

import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

import {
  findActiveEditorAssignment,
  findOwnedSubmission,
} from "../lib/auth/access-queries";
import { hasJournalRole } from "../lib/auth/permissions";
import {
  createArticleObjectPath,
  createSubmissionObjectPath,
  storageBuckets,
} from "../lib/storage/paths";

type Identity = {
  email: string;
  password: string;
};

type Identities = Record<
  "superAdmin" | "journalAdmin" | "editor" | "author" | "otherAuthor",
  Identity
>;

const required = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
};

const databaseUrl = required("DATABASE_URL");
const supabaseUrl = required("NEXT_PUBLIC_SUPABASE_URL");
const publishableKey = required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const secretKey = required("SUPABASE_SECRET_KEY");
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});
const admin = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function browserlessClient() {
  return createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function retry<T>(operation: () => Promise<T>) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < 5) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
      }
    }
  }

  throw lastError;
}

async function signIn(identity: Identity) {
  const client = browserlessClient();
  const { data, error } = await retry(() =>
    client.auth.signInWithPassword(identity),
  );
  assert.ifError(error);
  assert(data.user, `Could not authenticate ${identity.email}.`);
  return { client, user: data.user, session: data.session };
}

async function canDownload(
  client: ReturnType<typeof browserlessClient>,
  bucket: string,
  path: string,
) {
  const { data, error } = await client.storage.from(bucket).download(path);
  return Boolean(data) && !error;
}

async function main() {
  console.log("Live foundation validation started.");
  const identitiesFile = required("LIVE_VALIDATION_IDENTITIES_FILE");
  const identities = JSON.parse(
    await readFile(identitiesFile, "utf8"),
  ) as Identities;
  const sessions = {
    superAdmin: await signIn(identities.superAdmin),
    journalAdmin: await signIn(identities.journalAdmin),
    editor: await signIn(identities.editor),
    author: await signIn(identities.author),
    otherAuthor: await signIn(identities.otherAuthor),
  };
  console.log("Live authentication clients established.");
  await prisma.user.updateMany({
    where: { id: { in: Object.values(sessions).map(({ user }) => user.id) } },
    data: { isActive: true },
  });

  const journalA = await prisma.journal.findUniqueOrThrow({
    where: { slug: "psychology" },
  });
  const journalB = await prisma.journal.findUniqueOrThrow({
    where: { slug: "imsu-foss-development-journal" },
  });

  const appUsers = await prisma.user.findMany({
    where: { id: { in: Object.values(sessions).map(({ user }) => user.id) } },
    include: { globalRoles: true, journalRoles: true },
  });
  const byId = new Map(appUsers.map((user) => [user.id, user]));
  const journalAdmin = byId.get(sessions.journalAdmin.user.id);
  const editor = byId.get(sessions.editor.user.id);
  assert(journalAdmin && editor);
  assert.equal(
    hasJournalRole(journalAdmin, journalA.id, "JOURNAL_ADMIN"),
    true,
  );
  assert.equal(
    hasJournalRole(journalAdmin, journalB.id, "JOURNAL_ADMIN"),
    false,
  );
  assert.equal(hasJournalRole(editor, journalA.id, "EDITOR"), true);
  assert.equal(hasJournalRole(editor, journalB.id, "EDITOR"), false);

  const submissionA = await prisma.submission.upsert({
    where: { trackingNumber: "P1B-JOURNAL-A-001" },
    update: {
      journalId: journalA.id,
      ownerId: sessions.author.user.id,
      title: "Phase 1B ownership and review validation",
    },
    create: {
      journalId: journalA.id,
      ownerId: sessions.author.user.id,
      trackingNumber: "P1B-JOURNAL-A-001",
      title: "Phase 1B ownership and review validation",
    },
  });
  const submissionB = await prisma.submission.upsert({
    where: { trackingNumber: "P1B-JOURNAL-B-001" },
    update: {
      journalId: journalB.id,
      ownerId: sessions.otherAuthor.user.id,
      title: "Phase 1B cross-journal validation",
    },
    create: {
      journalId: journalB.id,
      ownerId: sessions.otherAuthor.user.id,
      trackingNumber: "P1B-JOURNAL-B-001",
      title: "Phase 1B cross-journal validation",
    },
  });
  console.log("Live ownership fixtures established.");

  await prisma.submissionAuthor.deleteMany({
    where: { submissionId: submissionA.id },
  });
  await prisma.submissionAuthor.createMany({
    data: [
      {
        submissionId: submissionA.id,
        fullName: "Academic Author One",
        email: "academic-author-one@example.test",
        affiliation: "Imo State University",
        position: 1,
        isCorrespondingAuthor: true,
      },
      {
        submissionId: submissionA.id,
        fullName: "Academic Author Two",
        affiliation: "Independent Researcher",
        position: 2,
      },
    ],
  });

  assert(
    await findOwnedSubmission(prisma, sessions.author.user.id, submissionA.id),
  );
  assert.equal(
    await findOwnedSubmission(
      prisma,
      sessions.otherAuthor.user.id,
      submissionA.id,
    ),
    null,
  );
  assert.equal(
    await prisma.submissionAuthor.count({
      where: { submissionId: submissionA.id },
    }),
    2,
  );

  const previousSubmissionFiles = await prisma.submissionFile.findMany({
    where: { submissionId: { in: [submissionA.id, submissionB.id] } },
    select: {
      id: true,
      storedFileId: true,
      storedFile: { select: { bucket: true, objectPath: true } },
    },
  });
  for (const bucket of [
    ...new Set(
      previousSubmissionFiles.map(({ storedFile }) => storedFile.bucket),
    ),
  ]) {
    const { error } = await admin.storage
      .from(bucket)
      .remove(
        previousSubmissionFiles
          .filter(({ storedFile }) => storedFile.bucket === bucket)
          .map(({ storedFile }) => storedFile.objectPath),
      );
    assert.ifError(error);
  }
  await prisma.$transaction([
    prisma.reviewRound.deleteMany({
      where: { submissionId: { in: [submissionA.id, submissionB.id] } },
    }),
    prisma.submissionEvent.deleteMany({
      where: { submissionId: { in: [submissionA.id, submissionB.id] } },
    }),
    prisma.submissionVersion.deleteMany({
      where: { submissionId: { in: [submissionA.id, submissionB.id] } },
    }),
    prisma.submissionFile.deleteMany({
      where: { id: { in: previousSubmissionFiles.map(({ id }) => id) } },
    }),
    prisma.storedFile.deleteMany({
      where: {
        id: {
          in: previousSubmissionFiles.map(({ storedFileId }) => storedFileId),
        },
      },
    }),
  ]);

  const manuscriptPath = createSubmissionObjectPath({
    journalId: journalA.id,
    submissionId: submissionA.id,
    originalFileName: "anonymous-manuscript.pdf",
  });
  const coverPath = createSubmissionObjectPath({
    journalId: journalA.id,
    submissionId: submissionA.id,
    originalFileName: "cover-letter.pdf",
  });
  const otherJournalPath = createSubmissionObjectPath({
    journalId: journalB.id,
    submissionId: submissionB.id,
    originalFileName: "anonymous-manuscript.pdf",
  });
  const privateBucket = storageBuckets.privateAcademicFiles;
  for (const [label, client, path, body] of [
    [
      "owner manuscript",
      sessions.author.client,
      manuscriptPath,
      "anonymous manuscript",
    ],
    [
      "owner cover letter",
      sessions.author.client,
      coverPath,
      "identity-bearing cover letter",
    ],
    [
      "other-journal manuscript",
      sessions.otherAuthor.client,
      otherJournalPath,
      "other journal manuscript",
    ],
  ] as const) {
    const { error } = await client.storage
      .from(privateBucket)
      .upload(path, Buffer.from(body), { contentType: "application/pdf" });
    if (error) {
      throw new Error(`Private ${label} upload was denied: ${error.message}`);
    }
  }

  const storedFiles = await Promise.all(
    [
      {
        submissionId: submissionA.id,
        uploaderId: sessions.author.user.id,
        objectPath: manuscriptPath,
        originalFileName: "anonymous-manuscript.pdf",
        type: "MANUSCRIPT" as const,
      },
      {
        submissionId: submissionA.id,
        uploaderId: sessions.author.user.id,
        objectPath: coverPath,
        originalFileName: "cover-letter.pdf",
        type: "COVER_LETTER" as const,
      },
      {
        submissionId: submissionB.id,
        uploaderId: sessions.otherAuthor.user.id,
        objectPath: otherJournalPath,
        originalFileName: "anonymous-manuscript.pdf",
        type: "MANUSCRIPT" as const,
      },
    ].map(async (file) => {
      const stored = await prisma.storedFile.create({
        data: {
          bucket: privateBucket,
          objectPath: file.objectPath,
          originalFileName: file.originalFileName,
          mimeType: "application/pdf",
          sizeBytes: 32,
          uploaderId: file.uploaderId,
        },
      });
      await prisma.submissionFile.create({
        data: {
          submissionId: file.submissionId,
          storedFileId: stored.id,
          type: file.type,
        },
      });
      return stored;
    }),
  );

  const manuscriptA = storedFiles.find(
    ({ objectPath }) => objectPath === manuscriptPath,
  );
  const manuscriptB = storedFiles.find(
    ({ objectPath }) => objectPath === otherJournalPath,
  );
  assert(manuscriptA && manuscriptB);
  const [versionA] = await Promise.all([
    prisma.submissionVersion.create({
      data: {
        submissionId: submissionA.id,
        versionNumber: 1,
        kind: "ORIGINAL",
        manuscriptStoredFileId: manuscriptA.id,
      },
    }),
    prisma.submissionVersion.create({
      data: {
        submissionId: submissionB.id,
        versionNumber: 1,
        kind: "ORIGINAL",
        manuscriptStoredFileId: manuscriptB.id,
      },
    }),
  ]);

  const round1 = await prisma.reviewRound.create({
    data: {
      submissionId: submissionA.id,
      submissionVersionId: versionA.id,
      roundNumber: 1,
      status: "ACTIVE",
    },
  });
  await prisma.reviewRound.create({
    data: {
      submissionId: submissionA.id,
      submissionVersionId: versionA.id,
      roundNumber: 2,
    },
  });
  await prisma.reviewAssignment.create({
    data: {
      reviewRoundId: round1.id,
      editorId: sessions.editor.user.id,
    },
  });
  assert(
    await findActiveEditorAssignment(
      prisma,
      sessions.editor.user.id,
      submissionA.id,
    ),
  );
  assert.equal(
    await findActiveEditorAssignment(
      prisma,
      sessions.journalAdmin.user.id,
      submissionA.id,
    ),
    null,
  );
  assert.equal(
    await findActiveEditorAssignment(
      prisma,
      sessions.editor.user.id,
      submissionB.id,
    ),
    null,
  );
  assert.equal(
    await prisma.reviewRound.count({ where: { submissionId: submissionA.id } }),
    2,
  );
  console.log("Live review fixtures established.");

  const anonymous = browserlessClient();
  const privateAccess = {
    ownerManuscript: await canDownload(
      sessions.author.client,
      privateBucket,
      manuscriptPath,
    ),
    unrelatedAuthor: await canDownload(
      sessions.otherAuthor.client,
      privateBucket,
      manuscriptPath,
    ),
    correctJournalAdmin: await canDownload(
      sessions.journalAdmin.client,
      privateBucket,
      manuscriptPath,
    ),
    wrongJournalAdmin: await canDownload(
      sessions.journalAdmin.client,
      privateBucket,
      otherJournalPath,
    ),
    assignedEditorManuscript: await canDownload(
      sessions.editor.client,
      privateBucket,
      manuscriptPath,
    ),
    assignedEditorCover: await canDownload(
      sessions.editor.client,
      privateBucket,
      coverPath,
    ),
    unassignedEditor: await canDownload(
      sessions.editor.client,
      privateBucket,
      otherJournalPath,
    ),
    superAdmin: await canDownload(
      sessions.superAdmin.client,
      privateBucket,
      manuscriptPath,
    ),
    anonymous: await canDownload(anonymous, privateBucket, manuscriptPath),
  };
  console.log(`Private storage matrix: ${JSON.stringify(privateAccess)}`);
  assert.deepEqual(privateAccess, {
    ownerManuscript: true,
    unrelatedAuthor: false,
    correctJournalAdmin: true,
    wrongJournalAdmin: false,
    assignedEditorManuscript: true,
    assignedEditorCover: false,
    unassignedEditor: false,
    superAdmin: true,
    anonymous: false,
  });

  const { data: signed, error: signedError } =
    await sessions.author.client.storage
      .from(privateBucket)
      .createSignedUrl(manuscriptPath, 60);
  assert.ifError(signedError);
  assert(signed?.signedUrl);
  const signedResponse = await fetch(signed.signedUrl);
  assert.equal(signedResponse.ok, true);

  const article = await prisma.article.findUniqueOrThrow({
    where: { slug: "sample-academic-article" },
  });
  const previousArticleFiles = await prisma.articleFile.findMany({
    where: { articleId: article.id, type: "PUBLISHED_PDF" },
    select: {
      id: true,
      storedFileId: true,
      storedFile: { select: { bucket: true, objectPath: true } },
    },
  });
  for (const bucket of [
    ...new Set(previousArticleFiles.map(({ storedFile }) => storedFile.bucket)),
  ]) {
    const { error } = await admin.storage
      .from(bucket)
      .remove(
        previousArticleFiles
          .filter(({ storedFile }) => storedFile.bucket === bucket)
          .map(({ storedFile }) => storedFile.objectPath),
      );
    assert.ifError(error);
  }
  await prisma.$transaction([
    prisma.articleFile.deleteMany({
      where: { id: { in: previousArticleFiles.map(({ id }) => id) } },
    }),
    prisma.storedFile.deleteMany({
      where: {
        id: {
          in: previousArticleFiles.map(({ storedFileId }) => storedFileId),
        },
      },
    }),
  ]);
  const publishedPath = createArticleObjectPath({
    journalId: journalA.id,
    articleId: article.id,
    originalFileName: "published-article.pdf",
  });
  const { error: publishedUploadError } =
    await sessions.journalAdmin.client.storage
      .from(storageBuckets.publishedArticleFiles)
      .upload(publishedPath, Buffer.from("published article"), {
        contentType: "application/pdf",
      });
  if (publishedUploadError) {
    throw new Error(
      `Published fixture upload was denied: ${publishedUploadError.message}`,
    );
  }
  const { data: publicUrl } = anonymous.storage
    .from(storageBuckets.publishedArticleFiles)
    .getPublicUrl(publishedPath);
  const publicResponse = await fetch(publicUrl.publicUrl);
  assert.equal(publicResponse.ok, true);

  assert.equal(
    [manuscriptPath, coverPath, otherJournalPath, publishedPath].some((path) =>
      /phase1b|@|academic-author|example\.test/i.test(path),
    ),
    false,
  );

  const refreshClient = browserlessClient();
  const { data: refreshLogin, error: refreshLoginError } =
    await refreshClient.auth.signInWithPassword(identities.author);
  assert.ifError(refreshLoginError);
  assert(refreshLogin.session?.refresh_token);
  const { data: refreshed, error: refreshError } =
    await refreshClient.auth.refreshSession({
      refresh_token: refreshLogin.session.refresh_token,
    });
  assert.ifError(refreshError);
  assert(refreshed.session);

  await prisma.user.update({
    where: { id: sessions.author.user.id },
    data: { isActive: false },
  });
  const inactiveClient = await signIn(identities.author);
  assert.equal(
    await canDownload(inactiveClient.client, privateBucket, manuscriptPath),
    false,
  );
  await prisma.user.update({
    where: { id: sessions.author.user.id },
    data: { isActive: true },
  });

  const publicStored = await prisma.storedFile.create({
    data: {
      bucket: storageBuckets.publishedArticleFiles,
      objectPath: publishedPath,
      originalFileName: "published-article.pdf",
      mimeType: "application/pdf",
      sizeBytes: 17,
      uploaderId: sessions.journalAdmin.user.id,
    },
  });
  await prisma.articleFile.create({
    data: {
      articleId: article.id,
      storedFileId: publicStored.id,
      type: "PUBLISHED_PDF",
    },
  });

  await admin.auth.admin
    .getUserById(sessions.superAdmin.user.id)
    .then(({ error }) => assert.ifError(error));

  console.log(
    JSON.stringify({
      authUsers: 5,
      journalScoping: true,
      submissionOwnership: true,
      academicAuthorCount: 2,
      reviewRounds: 2,
      reviewAssignment: true,
      privateAccess,
      signedPrivateAccess: true,
      publicArticleAccess: true,
      opaquePaths: true,
      tokenRefresh: true,
      deactivationEnforcedByStorage: true,
      fixtureStoredFiles: storedFiles.length + 1,
    }),
  );
}

const keepAlive = setInterval(() => undefined, 1_000);

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    clearInterval(keepAlive);
    await prisma.$disconnect();
  });
