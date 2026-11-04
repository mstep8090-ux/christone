"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Heart, Lock, Mail, AlertCircle, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) throw authError;

      const user = authData?.user;
      if (!user) {
        throw new Error("Unable to authenticate. Please check your credentials.");
      }

      // 2. Query couples for this user, prioritizing any paired space
      const { data: allCouples, error: coupleError } = await supabase
        .from("couples")
        .select("id, status, partner_a, partner_b, invite_code")
        .or(`partner_a.eq.${user.id},partner_b.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (coupleError) {
        console.error("Couple query error:", coupleError);
      }

      const pairedCouple = allCouples?.find(
        (c) => c.status === "paired" || Boolean(c.partner_b)
      );

      if (pairedCouple) {
        if (typeof window !== "undefined") {
          localStorage.setItem("user_id", user.id);
          if (pairedCouple.invite_code) {
            localStorage.setItem("partner_code", pairedCouple.invite_code);
          }
        }
        // Space is paired! Go directly to dashboard
        router.push("/space");
        return;
      }

      // If not yet paired, check if there is a pending couple where user is partner_a
      const pendingCouple = allCouples?.find(
        (c) => c.status === "pending" && c.partner_a === user.id
      );

      if (pendingCouple) {
        if (typeof window !== "undefined") {
          localStorage.setItem("user_id", user.id);
          if (pendingCouple.invite_code) {
            localStorage.setItem("partner_code", pendingCouple.invite_code);
          }
        }
        // Pending partner join -> go to invite screen
        router.push("/invite");
        return;
      }

      // No couple space yet -> guide to onboarding
      router.push("/onboarding");
    } catch (err: any) {
      console.error("Sign in error:", err);
      let message = err.message || "Failed to sign in. Please check your credentials.";
      if (message.toLowerCase().includes("invalid login credentials")) {
        message = "Incorrect email or password. Please try again.";
      }
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-canvas text-ink py-12 px-6 flex flex-col justify-between font-body">
      {/* Background blur blob */}
      <div
        className="pointer-events-none absolute -top-24 -right-24 z-0 h-[450px] w-[450px] opacity-60 blur-[80px]"
        style={{
          backgroundImage: "url('/blob.svg')",
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Main Centered Column max-w-[480px] */}
      <main className="relative z-10 mx-auto w-full max-w-[480px] flex-1 flex flex-col justify-center">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-xs font-medium text-inkSoft hover:text-ink transition-colors"
          >
            <ArrowLeft size={16} strokeWidth={1.5} />
            <span>Home</span>
          </Link>
        </div>

        <Card className="p-7 sm:p-8 rounded-[24px] bg-white border border-border shadow-[0_8px_32px_rgba(255,90,126,0.08)] space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-blush/40 flex items-center justify-center text-primary mb-3">
              <Heart size={22} strokeWidth={1.5} className="fill-primary/20" />
            </div>
            <h1 className="font-heading text-3xl text-ink font-normal leading-tight">
              Welcome Back Home
            </h1>
            <p className="text-xs text-inkSoft">
              Sign in to enter your private space for two.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink block">Email Address</label>
              <Input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 text-base font-body"
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-ink block">Password</label>
              </div>
              <Input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 text-base font-body"
                autoComplete="current-password"
              />
            </div>

            {errorMsg && (
              <div className="rounded-[16px] border border-border bg-[#FFF5F7] p-3 text-xs text-deep flex items-start space-x-2">
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              disabled={loading || !email.trim() || !password}
              className="w-full h-12 rounded-full text-sm font-medium mt-2 shadow-[0_8px_32px_rgba(255,90,126,0.18)] active:scale-[0.98] transition-all"
            >
              {loading ? "Signing in..." : "Sign In to Space"}
            </Button>
          </form>

          {/* Secondary Actions */}
          <div className="pt-2 border-t border-border/70 space-y-3 text-center text-xs">
            <p className="text-inkSoft">
              Don&apos;t have a shared space yet?{" "}
              <Link href="/onboarding" className="text-primary font-semibold hover:underline">
                Create Our Space
              </Link>
            </p>

            <p className="text-inkSoft">
              Partner sent you an invite code?{" "}
              <Link href="/join" className="text-ink font-semibold hover:underline">
                Join with Code
              </Link>
            </p>
          </div>
        </Card>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-6 text-xs text-inkSoft">
        <p>Private, encrypted, and Christ-honoring space.</p>
      </footer>
    </div>
  );
}
