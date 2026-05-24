"use client"

import { useState } from "react"
import { CommissionRule } from "@/generated/prisma/client"
import { updateCommission, createCommission, deleteCommission } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Pencil, Trash2, Plus } from "lucide-react"

export function CommissionClient({ initialRules }: { initialRules: CommissionRule[] }) {
  const [rules, setRules] = useState<CommissionRule[]>(initialRules)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<CommissionRule | null>(null)
  
  // Create form state
  const [newOperator, setNewOperator] = useState("")
  const [newProviderMargin, setNewProviderMargin] = useState("0")
  const [newAdminMargin, setNewAdminMargin] = useState("0")
  const [newDistributorMargin, setNewDistributorMargin] = useState("0")
  const [newRetailerMargin, setNewRetailerMargin] = useState("0")

  // Edit form state
  const [editProviderMargin, setEditProviderMargin] = useState("0")
  const [editAdminMargin, setEditAdminMargin] = useState("0")
  const [editDistributorMargin, setEditDistributorMargin] = useState("0")
  const [editRetailerMargin, setEditRetailerMargin] = useState("0")

  const handleCreate = async () => {
    try {
      await createCommission({
        operator: newOperator,
        providerMargin: parseFloat(newProviderMargin) || 0,
        adminMargin: parseFloat(newAdminMargin) || 0,
        distributorMargin: parseFloat(newDistributorMargin) || 0,
        retailerMargin: parseFloat(newRetailerMargin) || 0,
      })
      toast.success("Commission rule created successfully")
      setIsCreateOpen(false)
      // Note: In a real app we might want to refresh the page or use optimistic updates, 
      // but revalidatePath in the server action will handle refetching on the next render
      // For now we'll just reload to see the changes immediately.
      window.location.reload()
    } catch (e) {
      toast.error("Failed to create rule. Make sure the operator name is unique.")
    }
  }

  const openEdit = (rule: CommissionRule) => {
    setEditingRule(rule)
    setEditProviderMargin(rule.providerMargin.toString())
    setEditAdminMargin(rule.adminMargin.toString())
    setEditDistributorMargin(rule.distributorMargin.toString())
    setEditRetailerMargin(rule.retailerMargin.toString())
  }

  const handleUpdate = async () => {
    if (!editingRule) return
    try {
      await updateCommission(editingRule.id, {
        providerMargin: parseFloat(editProviderMargin) || 0,
        adminMargin: parseFloat(editAdminMargin) || 0,
        distributorMargin: parseFloat(editDistributorMargin) || 0,
        retailerMargin: parseFloat(editRetailerMargin) || 0,
      })
      toast.success("Commission rule updated successfully")
      setEditingRule(null)
      window.location.reload()
    } catch (e) {
      toast.error("Failed to update rule")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this rule?")) return
    try {
      await deleteCommission(id)
      toast.success("Rule deleted")
      window.location.reload()
    } catch (e) {
      toast.error("Failed to delete rule")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Operator
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Commission Rule</DialogTitle>
              <DialogDescription>
                Set the margins for a new operator. Percentages represent the cut of the transaction.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="operator">Operator Name</Label>
                <Input
                  id="operator"
                  value={newOperator}
                  onChange={(e) => setNewOperator(e.target.value)}
                  placeholder="e.g. Airtel Prepaid"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="provider">Provider Margin (%)</Label>
                  <Input
                    id="provider"
                    type="number"
                    step="0.01"
                    value={newProviderMargin}
                    onChange={(e) => setNewProviderMargin(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="admin">Admin Margin (%)</Label>
                  <Input
                    id="admin"
                    type="number"
                    step="0.01"
                    value={newAdminMargin}
                    onChange={(e) => setNewAdminMargin(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="distributor">Distributor Margin (%)</Label>
                  <Input
                    id="distributor"
                    type="number"
                    step="0.01"
                    value={newDistributorMargin}
                    onChange={(e) => setNewDistributorMargin(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="retailer">Retailer Margin (%)</Label>
                  <Input
                    id="retailer"
                    type="number"
                    step="0.01"
                    value={newRetailerMargin}
                    onChange={(e) => setNewRetailerMargin(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate}>Save Rule</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configured Operators</CardTitle>
          <CardDescription>
            List of all operator commission distributions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Operator</TableHead>
                <TableHead className="text-right">Provider API (%)</TableHead>
                <TableHead className="text-right">Admin (%)</TableHead>
                <TableHead className="text-right">Distributor (%)</TableHead>
                <TableHead className="text-right">Retailer (%)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                    No commission rules defined yet.
                  </TableCell>
                </TableRow>
              ) : (
                rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.operator}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{rule.providerMargin.toFixed(2)}%</TableCell>
                    <TableCell className="text-right font-semibold">{rule.adminMargin.toFixed(2)}%</TableCell>
                    <TableCell className="text-right font-medium">{rule.distributorMargin.toFixed(2)}%</TableCell>
                    <TableCell className="text-right font-medium">{rule.retailerMargin.toFixed(2)}%</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="icon" onClick={() => openEdit(rule)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="text-destructive" onClick={() => handleDelete(rule.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editingRule} onOpenChange={(open) => !open && setEditingRule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Rule: {editingRule?.operator}</DialogTitle>
            <DialogDescription>
              Update the commission margins for this operator.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-provider">Provider Margin (%)</Label>
                <Input
                  id="edit-provider"
                  type="number"
                  step="0.01"
                  value={editProviderMargin}
                  onChange={(e) => setEditProviderMargin(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-admin">Admin Margin (%)</Label>
                <Input
                  id="edit-admin"
                  type="number"
                  step="0.01"
                  value={editAdminMargin}
                  onChange={(e) => setEditAdminMargin(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-distributor">Distributor Margin (%)</Label>
                <Input
                  id="edit-distributor"
                  type="number"
                  step="0.01"
                  value={editDistributorMargin}
                  onChange={(e) => setEditDistributorMargin(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-retailer">Retailer Margin (%)</Label>
                <Input
                  id="edit-retailer"
                  type="number"
                  step="0.01"
                  value={editRetailerMargin}
                  onChange={(e) => setEditRetailerMargin(e.target.value)}
                />
              </div>
            </div>
            {/* Display a small warning if total doesn't match provider */}
            {parseFloat(editProviderMargin) !== (parseFloat(editAdminMargin) + parseFloat(editDistributorMargin) + parseFloat(editRetailerMargin)) && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Warning: The sum of Admin, Distributor, and Retailer margins does not equal the Provider margin.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRule(null)}>Cancel</Button>
            <Button onClick={handleUpdate}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
