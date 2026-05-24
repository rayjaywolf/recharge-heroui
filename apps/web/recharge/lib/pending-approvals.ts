import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/auth";

export const pendingApprovalsWhere: Prisma.UserWhereInput = {
  isApproved: false,
  isRejected: false,
  role: { not: "ADMIN" },
};

export function getPendingApprovalsCount() {
  return prisma.user.count({ where: pendingApprovalsWhere });
}
