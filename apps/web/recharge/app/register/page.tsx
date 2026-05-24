"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { normalizePhoneNumber, validatePhoneNumber } from "@/lib/phone";

const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", 
  "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", 
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", 
  "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", 
  "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", 
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", 
  "Uttarakhand", "West Bengal"
];

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [state, setState] = useState("");
  const [aadharNumber, setAadharNumber] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [businessType, setBusinessType] = useState("");

  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!validatePhoneNumber(normalizedPhone)) {
      alert("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register-retailer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phoneNumber: normalizedPhone,
          password,
          address,
          pincode,
          state,
          aadharNumber,
          panNumber,
          gstNumber,
          businessType,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Registration failed.");
        return;
      }

      const signIn = await authClient.signIn.phoneNumber({
        phoneNumber: normalizedPhone,
        password,
      });

      if (signIn.error) {
        alert(
          signIn.error.message ||
            "Account created but sign-in failed. Try logging in.",
        );
        router.push("/login");
        return;
      }

      router.push("/pending-approval");
      router.refresh();
    } catch {
      alert("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40 backdrop-blur-sm py-12">
      <Card className="w-full max-w-2xl shadow-xl border-t-4 border-t-primary transition-all duration-300">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-bold tracking-tight">Retailer Application</CardTitle>
          <CardDescription>
            Complete your KYC profile to request access to the Recharge platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                required 
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
              <Label htmlFor="state">State</Label>
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
              Submit KYC & Register
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 pb-6">
          <div className="text-sm text-center text-muted-foreground mt-2">
            Already have an account?{" "}
            <Link href="/login" className="font-medium underline underline-offset-4 hover:text-primary transition-colors">
              Sign in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
