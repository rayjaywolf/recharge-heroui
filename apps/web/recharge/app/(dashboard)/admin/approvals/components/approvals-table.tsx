"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle } from "lucide-react"
import { useRouter } from "next/navigation"

import { toast } from "sonner"
import { getDisplayEmail, getDisplayPhone } from "@/lib/phone"

type PendingUser = {
  id: string
  name: string
  email: string
  phoneNumber: string | null
  role: string
  whatsappNumber: string | null
  aadharNumber: string | null
  panNumber: string | null
  gstNumber: string | null
  businessType: string | null
  address: string | null
  pincode: string | null
  state: string | null
  createdAt: string | Date
}

export function ApprovalsTable({ initialData }: { initialData: PendingUser[] }) {
  const [data, setData] = useState(initialData)
  const router = useRouter()

  const handleApprove = async (userId: string) => {
    try {
      const res = await fetch("/api/admin/users/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) throw new Error("Approval failed")
      
      const resJson = await res.json()
      
      setData((prev) => prev.filter((u) => u.id !== userId))
      toast.success(resJson.message || "User approved successfully!")
      router.refresh()
    } catch (e) {
      toast.error("Error approving user")
    }
  }

  const handleReject = async (userId: string) => {
    try {
      const res = await fetch("/api/admin/users/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) throw new Error("Rejection failed")
      
      const resJson = await res.json()
      
      setData((prev) => prev.filter((u) => u.id !== userId))
      toast.success(resJson.message || "User rejected.")
      router.refresh()
    } catch (e) {
      toast.error("Error rejecting user")
    }
  }

  const formatBusinessType = (type: string | null) => {
      if (!type) return "N/A"
      // MOBILE_SHOP -> Mobile Shop
      return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
  }

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Applicant</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Business/Location</TableHead>
            <TableHead>KYC Records</TableHead>
            <TableHead>Role Default</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                No pending approvals.
              </TableCell>
            </TableRow>
          ) : (
            data.map((user) => {
              const phone = getDisplayPhone(user)
              const displayEmail = getDisplayEmail(user.email)

              return (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="font-semibold text-foreground">{user.name}</div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {phone ?? "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {displayEmail ?? "—"}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{formatBusinessType(user.businessType)}</div>
                  <div className="text-sm text-muted-foreground line-clamp-1">{user.address}</div>
                  <div className="text-xs text-muted-foreground">{user.pincode} · {user.state}</div>
                </TableCell>
                <TableCell>
                   <div className="text-xs font-mono">PAN: {user.panNumber}</div>
                   <div className="text-xs font-mono">AADHAR: {user.aadharNumber}</div>
                   <div className="text-xs font-mono">GST: {user.gstNumber || "N/A"}</div>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold">
                    {user.role}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="default" size="sm" onClick={() => handleApprove(user.id)}>
                      <CheckCircle2 className="mr-1 h-4 w-4" /> Approve
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleReject(user.id)}>
                      <XCircle className="mr-1 h-4 w-4" /> Reject
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )})
          )}
        </TableBody>
      </Table>
    </div>
  )
}
