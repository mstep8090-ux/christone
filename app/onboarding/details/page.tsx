"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function generateCode(length = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function OnboardingDetailsPage() {
  const router = useRouter();

  const [displayName, setDisplayName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName || !email || !password) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Sign up user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: displayName.trim(),
          },
        },
      });

      if (authError) throw authError;

      const user = authData.user;
      if (!user) {
        throw new Error("Unable to create user account. Please try again.");
      }

      // 2. Retrieve role & stage from localStorage
      const role = (localStorage.getItem("role") || "lady") as "lady" | "guy";
      const stage = (localStorage.getItem("stage") || "courting") as
        | "courting"
        | "engaged"
        | "married";

      // 3. Generate 6 uppercase characters partner code
      const partnerCode = generateCode(6);

      // 4. Create profile
      const { error: profileError } = await supabase.from("profiles").insert({
        id: user.id,
        email: user.email || email.trim(),
        display_name: displayName.trim(),
        role,
        stage,
        partner_code: partnerCode,
        is_married_confirmed: stage === "married",
      });

      if (profileError) {
        console.error("Profile insert error:", profileError);
      }

      // 5. Create couple row
      const { error: coupleError } = await supabase.from("couples").insert({
        partner_a: user.id,
        invite_code: partnerCode,
        status: "pending",
      });

      if (coupleError) {
        console.error("Couples insert error:", coupleError);
      }

      // Store in localStorage for reference
      if (typeof window !== "undefined") {
        localStorage.setItem("partner_code", partnerCode);
        localStorage.setItem("user_id", user.id);
        localStorage.setItem("display_name", displayName.trim());
      }

      // 6. Redirect to /invite
      router.push("/invite");
    } catch (err: any) {
      console.error("Signup error:", err);
      setErrorMsg(err.message || "Failed to create account. Please check details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-canvas text-ink flex flex-col justify-between">
      {/* Background blob */}
      <div
        className="pointer-events-none absolute -top-20 -left-20 z-0 h-[400px] w-[400px] opacity-60 blur-[80px]"
        style={{
          backgroundImage: "url('/blob.svg')",
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Main Form Container */}
      <main className="relative z-10 mx-auto w-full max-w-[480px] p-6 flex-1 flex flex-col">
        {/* Top Progress */}
        <div className="flex items-center justify-between pt-4 pb-8">
          <span className="text-xs font-semibold text-inkSoft tracking-widest uppercase">
            3/3
          </span>
          <div className="flex items-center space-x-1.5">
            <span className="h-1.5 w-6 rounded-full bg-primary" />
            <span className="h-1.5 w-6 rounded-full bg-primary" />
            <span className="h-1.5 w-6 rounded-full bg-primary" />
          </div>
        </div>

        {/* Headline */}
        <div className="mb-8">
          <h1 className="font-heading text-[24px] text-ink font-normal leading-tight">
            Final Step
          </h1>
          <p className="mt-1 font-body text-[14px] text-inkSoft">
            Create your account to connect.
          </p>
        </div>

        {/* Signup Form */}
        <form onSubmit={handleSignUp} className="flex flex-col space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-inkSoft">First Name</label>
            <Input
              type="text"
              placeholder="Your first name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="h-[56px]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-inkSoft">Email</label>
            <Input
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-[56px]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-inkSoft">Password</label>
            <Input
              type="password"
              placeholder="Create password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="h-[56px]"
            />
          </div>

          {errorMsg && (
            <div className="rounded-[16px] border border-deep/20 bg-blush/20 p-3 text-xs text-deep">
              {errorMsg}
            </div>
          )}

          <div className="pt-6">
            <Button
              type="submit"
              variant="primary"
              disabled={loading || !displayName || !email || !password}
              className="w-full h-14 rounded-full text-base font-medium"
            >
              {loading ? "Creating Space..." : "Create Our Space"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
