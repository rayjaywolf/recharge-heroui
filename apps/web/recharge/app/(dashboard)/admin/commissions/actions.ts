"use server"

import { auth, prisma } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

async function checkAdminAuth() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  if (!session?.user) throw new Error("Unauthorized")
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (user?.role !== "ADMIN") throw new Error("Forbidden")
}

export async function updateCommission(id: string, data: { providerMargin: number, adminMargin: number, distributorMargin: number, retailerMargin: number }) {
  await checkAdminAuth()
  await prisma.commissionRule.update({
    where: { id },
    data
  })
  revalidatePath("/admin/commissions")
}

export async function createCommission(data: { operator: string, providerMargin: number, adminMargin: number, distributorMargin: number, retailerMargin: number }) {
  await checkAdminAuth()
  await prisma.commissionRule.create({
    data
  })
  revalidatePath("/admin/commissions")
}

export async function deleteCommission(id: string) {
  await checkAdminAuth()
  await prisma.commissionRule.delete({
    where: { id }
  })
  revalidatePath("/admin/commissions")
}
