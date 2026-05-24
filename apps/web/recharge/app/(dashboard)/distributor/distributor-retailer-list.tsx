"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"

type RetailerData = {
  id: string
  name: string
  email: string
  balance: number
  isSuspended: boolean
  isApproved: boolean
  isRejected: boolean
  createdAt: Date
  _count: { transactions: number }
}

export function DistributorRetailerList({
  initialData,
}: {
  initialData: RetailerData[]
}) {
  const [query, setQuery] = useState("")
  const router = useRouter()

  const filteredData = initialData.filter(
    (r) =>
      r.name.toLowerCase().includes(query.toLowerCase()) ||
      r.email.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center space-x-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search your retailers..."
            className="pl-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Retailer Info</TableHead>
              <TableHead>Wallet Balance</TableHead>
              <TableHead>Tx Volume</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  No assigned retailers.
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((retailer) => (
                <TableRow
                  key={retailer.id}
                  className={`cursor-pointer hover:bg-muted/50 transition-colors ${retailer.isSuspended ? "bg-muted/40" : ""}`}
                  onClick={() => router.push(`/distributor/retailers/${retailer.id}`)}
                >
                  <TableCell>
                    <div className="font-semibold text-foreground">
                      {retailer.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {retailer.email}
                    </div>
                  </TableCell>
                  <TableCell className="text-lg font-bold">
                    ₹ {retailer.balance.toLocaleString()}
                  </TableCell>
                  <TableCell className="font-medium text-muted-foreground">
                    {retailer._count.transactions} total
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      {retailer.isSuspended ? (
                        <div className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold bg-zinc-100 text-zinc-800">
                           Suspended
                        </div>
                      ) : retailer.isRejected ? (
                        <div className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold bg-red-100 text-red-800">
                           Rejected
                        </div>
                      ) : !retailer.isApproved ? (
                        <div className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold bg-amber-100 text-amber-800">
                           Pending KYC
                        </div>
                      ) : (
                        <div className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800">
                           Active
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                     <Button
                       variant="ghost"
                       size="sm"
                       onClick={(e) => {
                         e.stopPropagation()
                         router.push(`/distributor/retailers/${retailer.id}`)
                       }}
                     >
                       View Details <ChevronRight className="ml-1 h-4 w-4" />
                     </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
