import { prisma } from "../lib/db/prisma";

async function resetAssignment() {
  const assignmentId = "cmte4av8o0000qnv1x1karff5";
  const assignment = await prisma.reviewAssignment.findUnique({
    where: { id: assignmentId },
    include: { review: { include: { attachments: true } }, reviewRound: true },
  });

  if (assignment) {
    if (assignment.review) {
      await prisma.reviewAttachment.deleteMany({
        where: { reviewId: assignment.review.id },
      });
      await prisma.review.delete({
        where: { id: assignment.review.id },
      });
    }

    await prisma.reviewAssignment.update({
      where: { id: assignmentId },
      data: {
        status: "ASSIGNED",
        completedAt: null,
        respondedAt: null,
      },
    });

    if (assignment.reviewRound?.submissionId) {
      await prisma.submission.update({
        where: { id: assignment.reviewRound.submissionId },
        data: { status: "UNDER_REVIEW" },
      });
    }

    console.log(
      `✓ Assignment ${assignmentId} successfully freed up and reset to ASSIGNED.`,
    );
  } else {
    console.log("Assignment not found.");
  }
}

resetAssignment()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
