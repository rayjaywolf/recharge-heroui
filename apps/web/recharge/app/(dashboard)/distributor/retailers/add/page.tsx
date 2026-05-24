"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"

const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", 
  "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", 
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", 
  "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", 
  "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", 
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", 
  "Uttarakhand", "West Bengal"
];

export default function AddRetailerPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [name, setName] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [password, setPassword] = useState("")
  const [address, setAddress] = useState("")
  const [pincode, setPincode] = useState("")
  const [state, setState] = useState("")
  const [aadharNumber, setAadharNumber] = useState("")
  const [panNumber, setPanNumber] = useState("")
  const [gstNumber, setGstNumber] = useState("")
  const [businessType, setBusinessType] = useState("")

  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/distributor/retailer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phoneNumber,
          password,
          address,
          pincode,
          state,
          aadharNumber,
          panNumber,
          gstNumber,
          businessType,
        }),
      })

      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to create retailer")
      }

      alert("Retailer created successfully! They are currently pending admin verification.")
      router.push("/distributor/retailers")
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto mt-8 pb-12">
      <Button variant="ghost" onClick={() => router.push("/distributor/retailers")} className="-ml-4">
         <ArrowLeft className="mr-2 h-4 w-4" /> Back to Retailers
      </Button>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Onboard Retailer</h1>
        <p className="mt-1 text-muted-foreground">
          Deploy a complete KYC packet to onboard a new retailer automatically mapped to your network.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Retailer Details</CardTitle>
          <CardDescription>Enter the mandatory verification credentials for the new retailer.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {error && (
              <div className="md:col-span-2 p-3 text-sm text-red-500 bg-red-100/50 rounded-md">
                {error}
              </div>
            )}
            
            {/* Core Credentials */}
            <div className="grid gap-2 md:col-span-2">
                <hr className="my-2 border-muted" />
                <h3 className="text-sm font-semibold mb-2">Account Credentials</h3>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="numeric"
                placeholder="10-digit mobile number"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Initial Password</Label>
              <Input
                id="password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {/* KYC Identity */}
            <div className="grid gap-2 md:col-span-2">
                <hr className="my-2 border-muted" />
                <h3 className="text-sm font-semibold mb-2">Identity Details & KYC</h3>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="aadhar">Aadhar Card Number</Label>
              <Input 
                id="aadhar" 
                placeholder="12 Digit Aadhar No"
                required 
                value={aadharNumber}
                onChange={(e) => setAadharNumber(e.target.value)}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="pan">PAN Card Number</Label>
              <Input 
                id="pan" 
                className="uppercase"
                placeholder="ABCDE1234F"
                required 
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="gst">GST Number (Optional)</Label>
              <Input 
                id="gst" 
                className="uppercase"
                placeholder="Optional GSTIN"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="businessType">Retailer Business Type</Label>
              <Select required value={businessType} onValueChange={setBusinessType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Business Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KIRANA">Kirana / Grocery Store</SelectItem>
                  <SelectItem value="MOBILE_SHOP">Mobile Shop / Electronics</SelectItem>
                  <SelectItem value="PHARMACY">Pharmacy / Medical</SelectItem>
                  <SelectItem value="INTERNET_CAFE">Internet / Cyber Cafe</SelectItem>
                  <SelectItem value="OTHER">Other Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            <div className="grid gap-2 md:col-span-2">
                <hr className="my-2 border-muted" />
                <h3 className="text-sm font-semibold mb-2">Business Location</h3>
            </div>

            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="address">Full Address</Label>
              <Textarea 
                id="address" 
                placeholder="Store address, building, street..."
                required 
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="pincode">Pincode</Label>
              <Input 
                id="pincode" 
                placeholder="e.g. 110001"
                required 
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="state">State / UT</Label>
              <Select required value={state} onValueChange={setState}>
                <SelectTrigger>
                  <SelectValue placeholder="Select State / UT" />
                </SelectTrigger>
                <SelectContent>
                  {INDIAN_STATES.map((st) => (
                    <SelectItem key={st} value={st}>
                      {st}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button className="w-full mt-6 md:col-span-2 transition-transform active:scale-[0.98]" type="submit" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Submit KYC & Create Retailer
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
