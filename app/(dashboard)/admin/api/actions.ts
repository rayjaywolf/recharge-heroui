"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import type { Provider } from "@/generated/prisma/client";
import { auth, prisma } from "@/lib/auth";
import {
  BACKUP_NONE,
  normalizeOperatorKey,
  RECHARGE_PROVIDER_IDS,
  type BackupSlot,
  type RechargeProviderId,
} from "@/lib/operator-provider";

async function checkAdminAuth() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) throw new Error("Unauthorized");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (user?.role !== "ADMIN") throw new Error("Forbidden");
}

function assertProvider(provider: string): RechargeProviderId {
  if (!RECHARGE_PROVIDER_IDS.includes(provider as RechargeProviderId)) {
    throw new Error("Invalid provider");
  }
  return provider as RechargeProviderId;
}

function parseBackupValue(backup: string): Provider | null {
  return backup === BACKUP_NONE ? null : (assertProvider(backup) as Provider);
}

export async function updateOperatorProvider(
  operator: string,
  provider: string
) {
  await checkAdminAuth();
  const key = normalizeOperatorKey(operator);
  const providerId = assertProvider(provider);

  await prisma.operatorProviderConfig.upsert({
    where: { operator: key },
    create: { operator: key, provider: providerId as Provider },
    update: { provider: providerId as Provider },
  });

  revalidatePath("/admin/api");
}

export async function updateOperatorBackupProvider(
  operator: string,
  backup: string,
  slot: BackupSlot
) {
  await checkAdminAuth();
  const key = normalizeOperatorKey(operator);
  const backupValue = parseBackupValue(backup);
  const data =
    slot === 1
      ? { backupProvider: backupValue }
      : { backupProvider2: backupValue };

  const existing = await prisma.operatorProviderConfig.findUnique({
    where: { operator: key },
  });

  if (existing) {
    await prisma.operatorProviderConfig.update({
      where: { operator: key },
      data,
    });
  } else {
    await prisma.operatorProviderConfig.create({
      data: {
        operator: key,
        provider: "REALROBO",
        ...data,
      },
    });
  }

  revalidatePath("/admin/api");
}

export async function deleteOperatorProvider(operator: string) {
  await checkAdminAuth();
  const key = normalizeOperatorKey(operator);

  await prisma.operatorProviderConfig.delete({
    where: { operator: key },
  });

  revalidatePath("/admin/api");
}
