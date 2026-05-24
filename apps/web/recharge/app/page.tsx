import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Shield, Store } from "lucide-react"
import Link from "next/link"
import { auth, prisma } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

export default async function Page() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  // If user is authenticated, redirect to appropriate dashboard
  if (session) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (user?.role === "ADMIN") {
      redirect("/admin")
    } else {
      redirect("/retailer")
    }
  }

  // Show welcome page for non-authenticated users
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-4xl font-bold tracking-tight">Welcome</h1>
          <p className="text-lg text-muted-foreground">
            Choose your portal to continue
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="group transition-all duration-200 hover:shadow-lg">
            <CardHeader className="text-center">
              <Shield className="mx-auto mb-2 h-12 w-12 text-primary" />
              <CardTitle className="text-2xl">Admin</CardTitle>
              <CardDescription>
                Manage system operations, users, and funding
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin">
                <Button className="w-full" size="lg">
                  Enter Admin Portal
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="group transition-all duration-200 hover:shadow-lg">
            <CardHeader className="text-center">
              <Store className="mx-auto mb-2 h-12 w-12 text-primary" />
              <CardTitle className="text-2xl">Retailer</CardTitle>
              <CardDescription>
                Process recharges and manage your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/retailer">
                <Button className="w-full" size="lg">
                  Enter Retailer Portal
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
