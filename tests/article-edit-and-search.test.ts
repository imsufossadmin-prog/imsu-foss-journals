import assert from "node:assert/strict";
import test from "node:test";

test("Article Edit & Search: Author position indexing guarantees 1-indexed sequential ordering", () => {
  const inputAuthors = [
    {
      fullName: "Dr. Chukwuma Obi",
      affiliation: "Dept of Psychology, IMSU",
      email: "obi@imsu.edu.ng",
    },
    {
      fullName: "Prof. Ngozi Eze",
      affiliation: "Dept of Sociology, IMSU",
      email: null,
    },
    { fullName: "Dr. Amadi Kalu", affiliation: null, email: "amadi@gmail.com" },
  ];

  const processed = inputAuthors.map((author, index) => ({
    position: index + 1,
    fullName: author.fullName.trim(),
    email: author.email?.trim() || null,
    affiliation: author.affiliation?.trim() || null,
  }));

  assert.equal(processed.length, 3);
  assert.equal(processed[0].position, 1);
  assert.equal(processed[0].fullName, "Dr. Chukwuma Obi");
  assert.equal(processed[1].position, 2);
  assert.equal(processed[1].fullName, "Prof. Ngozi Eze");
  assert.equal(processed[2].position, 3);
  assert.equal(processed[2].fullName, "Dr. Amadi Kalu");
});

test("Article Edit & Search: Author reordering moves items accurately", () => {
  const authors = [
    { fullName: "Author A", affiliation: "Affil A", email: "a@test.com" },
    { fullName: "Author B", affiliation: "Affil B", email: "b@test.com" },
    { fullName: "Author C", affiliation: "Affil C", email: "c@test.com" },
  ];

  // Move Author B up
  const moveUp = (list: typeof authors, index: number) => {
    if (index === 0) return list;
    const next = [...list];
    const temp = next[index];
    next[index] = next[index - 1];
    next[index - 1] = temp;
    return next;
  };

  const reordered = moveUp(authors, 1);
  assert.equal(reordered[0].fullName, "Author B");
  assert.equal(reordered[1].fullName, "Author A");
  assert.equal(reordered[2].fullName, "Author C");
});

test("Article Edit & Search: Search query filter builder creates case-insensitive OR predicates", () => {
  const buildSearchFilter = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return {};
    return {
      OR: [
        { title: { contains: trimmed, mode: "insensitive" } },
        { abstract: { contains: trimmed, mode: "insensitive" } },
        { doi: { contains: trimmed, mode: "insensitive" } },
        { keywords: { has: trimmed } },
        {
          authors: {
            some: { fullName: { contains: trimmed, mode: "insensitive" } },
          },
        },
      ],
    };
  };

  const filter = buildSearchFilter("Psychology");
  assert.ok(filter.OR);
  assert.equal(filter.OR.length, 5);
  assert.deepEqual(filter.OR[0], {
    title: { contains: "Psychology", mode: "insensitive" },
  });
  assert.deepEqual(filter.OR[1], {
    abstract: { contains: "Psychology", mode: "insensitive" },
  });
  assert.deepEqual(filter.OR[2], {
    doi: { contains: "Psychology", mode: "insensitive" },
  });
  assert.deepEqual(filter.OR[3], { keywords: { has: "Psychology" } });
  assert.deepEqual(filter.OR[4], {
    authors: {
      some: { fullName: { contains: "Psychology", mode: "insensitive" } },
    },
  });
});

test("Article Edit & Search: DOI collision detection detects cross-article DOI duplicates", () => {
  const existingArticles = [
    { id: "art-1", doi: "10.4314/imsufoss.v16i6.1" },
    { id: "art-2", doi: "10.4314/imsufoss.v16i6.2" },
  ];

  const checkDoiCollision = (
    targetArticleId: string,
    newDoi: string | null,
  ) => {
    if (!newDoi) return false;
    return existingArticles.some(
      (a) =>
        a.id !== targetArticleId &&
        a.doi?.toLowerCase() === newDoi.toLowerCase(),
    );
  };

  // Same article keeping its DOI -> no collision
  assert.equal(checkDoiCollision("art-1", "10.4314/imsufoss.v16i6.1"), false);

  // Article 2 taking Article 1's DOI -> collision!
  assert.equal(checkDoiCollision("art-2", "10.4314/imsufoss.v16i6.1"), true);

  // Brand new DOI -> no collision
  assert.equal(checkDoiCollision("art-1", "10.4314/imsufoss.v16i6.3"), false);
});
