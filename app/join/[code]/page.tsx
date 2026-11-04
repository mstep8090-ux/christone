"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Heart, AlertCircle, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/utils";

// Floating delicate confetti particle
function ConfettiParticles() {
  const particles = Array.from({ length: 30 });
  const colors = ["#FF5A7E", "#FFC2CE", "#E84367", "#DDF2E6", "#FFFFFF"];

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {particles.map((_, i) => {
        const left = Math.random() * 100;
        const color = colors[i % colors.length];
        const size = Math.random() * 8 + 6;
        const duration = Math.random() * 2.5 + 2.5;
        const delay = Math.random() * 0.8;

        return (
          <motion.div
            key={i}
            initial={{
              y: -20,
              x: `${left}vw`,
              opacity: 1,
              rotate: 0,
              scale: 0.8,
            }}
            animate={{
              y: "105vh",
              rotate: 360 * (Math.random() > 0.5 ? 1 : -1),
              opacity: [1, 1, 0.8, 0],
              scale: 1,
            }}
            transition={{
              duration,
              delay,
              ease: "easeOut",
              repeat: 1,
            }}
            style={{
              position: "absolute",
              width: size,
              height: size * (Math.random() > 0.4 ? 1.6 : 1),
              backgroundColor: color,
              borderRadius: Math.random() > 0.5 ? "999px" : "3px",
              boxShadow: "0 2px 8px rgba(255,90,126,0.15)",
            }}
          />
        );
      })}
    </div>
  );
}

export default function JoinCodePage() {
  const params = useParams();
  const router = useRouter();
  const code = (params?.code as string)?.toUpperCase() || "";

  // State
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Couple & Inviter Details
  const [coupleData, setCoupleData] = React.useState<any>(null);
  const [inviterProfile, setInviterProfile] = React.useState<any>(null);

  // Mini onboarding state for non-logged-in users
  const [authMode, setAuthMode] = React.useState<"signup" | "login">("signup");
  const [role, setRole] = React.useState<"lady" | "guy">("lady");
  const [stage, setStage] = React.useState<"courting" | "engaged" | "married">("courting");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  // Paired success state
  const [isPairedSuccess, setIsPairedSuccess] = React.useState(false);

  // Check auth and load couple by invite_code
  React.useEffect(() => {
    async function init() {
      setLoading(true);
      setErrorMsg(null);

      try {
        // 1. Get current logged in user session
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user || null;
        setCurrentUser(user);

        if (!code) {
          setErrorMsg("Invite code is missing.");
          setLoading(false);
          return;
        }

        // 2. Fetch couple by code
        const { data: couple, error: coupleErr } = await supabase
          .from("couples")
          .select("*")
          .eq("invite_code", code)
          .maybeSingle();

        if (coupleErr || !couple) {
          setErrorMsg("Invite code not found. Please verify the link.");
          setLoading(false);
          return;
        }

        // 3. Validation: Code expiration (7 days)
        const createdAt = new Date(couple.created_at).getTime();
        const now = Date.now();
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        if (now - createdAt > sevenDaysMs) {
          setErrorMsg("This invite code has expired.");
          setLoading(false);
          return;
        }

        // 4. Validation: Already paired
        if (couple.status === "paired" && couple.partner_b) {
          if (user && (user.id === couple.partner_a || user.id === couple.partner_b)) {
            // Already member
            setIsPairedSuccess(true);
            setLoading(false);
            return;
          } else {
            setErrorMsg("This space is already paired with another partner.");
            setLoading(false);
            return;
          }
        }

        // 5. Validation for logged in user
        if (user) {
          // Cannot join own code
          if (user.id === couple.partner_a) {
            setErrorMsg("You cannot join your own invite code.");
            setLoading(false);
            return;
          }

          // Check if already in another paired couple
          const { data: existingPair } = await supabase
            .from("couples")
            .select("id")
            .or(`partner_a.eq.${user.id},partner_b.eq.${user.id}`)
            .eq("status", "paired")
            .maybeSingle();

          if (existingPair) {
            setErrorMsg("You are already part of a couple space.");
            setLoading(false);
            return;
          }
        }

        setCoupleData(couple);

        // 6. Fetch inviter's profile
        const { data: inviter } = await supabase
          .from("profiles")
          .select("id, display_name, role, stage, avatar_url")
          .eq("id", couple.partner_a)
          .maybeSingle();

        if (inviter) {
          setInviterProfile(inviter);
        }
      } catch (err: any) {
        console.error("Init join error:", err);
        setErrorMsg(err.message || "Failed to load invite details.");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [code]);

  // Join handler for already logged in user
  const handleJoinLogged = async () => {
    if (!currentUser || !coupleData) return;
    setActionLoading(true);
    setErrorMsg(null);

    try {
      // Update couples table: set partner_b = currentUser.id, status = 'paired'
      const { error: updateErr } = await supabase
        .from("couples")
        .update({
          partner_b: currentUser.id,
          status: "paired",
        })
        .eq("id", coupleData.id);

      if (updateErr) throw updateErr;

      setIsPairedSuccess(true);
    } catch (err: any) {
      console.error("Join error:", err);
      setErrorMsg(err.message || "Failed to join space. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  // Mini onboarding + auto-pair handler for new user
  const handleSignupAndJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !coupleData) return;

    setActionLoading(true);
    setErrorMsg(null);

    try {
      // 1. Sign up new user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: name.trim(),
            role,
            stage,
          },
        },
      });

      if (authError) throw authError;

      const newUser = authData.user;
      if (!newUser) {
        throw new Error("Unable to create account. Please check details.");
      }

      // 2. Create profile
      const { error: profileErr } = await supabase.from("profiles").insert({
        id: newUser.id,
        email: newUser.email || email.trim(),
        display_name: name.trim(),
        role,
        stage,
        partner_code: code,
        is_married_confirmed: stage === "married",
      });

      if (profileErr) {
        console.error("Profile insert error:", profileErr);
      }

      // 3. Auto-pair: update couple row
      const { error: pairErr } = await supabase
        .from("couples")
        .update({
          partner_b: newUser.id,
          status: "paired",
        })
        .eq("id", coupleData.id);

      if (pairErr) {
        console.error("Auto pair error:", pairErr);
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("user_id", newUser.id);
        localStorage.setItem("display_name", name.trim());
        localStorage.setItem("partner_code", code);
      }

      setCurrentUser(newUser);
      setIsPairedSuccess(true);
    } catch (err: any) {
      console.error("Signup & join error:", err);
      setErrorMsg(err.message || "Signup failed. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  // Sign in + auto-pair handler for existing user
  const handleLoginAndJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !coupleData) return;

    setActionLoading(true);
    setErrorMsg(null);

    try {
      // 1. Sign in existing user
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) throw authError;

      const user = authData?.user;
      if (!user) {
        throw new Error("Unable to sign in. Please check details.");
      }

      // 2. Prevent joining own code
      if (user.id === coupleData.partner_a) {
        throw new Error("You cannot join your own invite code.");
      }

      // 3. Auto-pair: update couple row
      const { error: pairErr } = await supabase
        .from("couples")
        .update({
          partner_b: user.id,
          status: "paired",
        })
        .eq("id", coupleData.id);

      if (pairErr) {
        console.error("Auto pair error:", pairErr);
      }

      // 4. Fetch profile to get display name
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();

      if (myProfile?.display_name) {
        setName(myProfile.display_name);
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("user_id", user.id);
        localStorage.setItem("partner_code", code);
      }

      setCurrentUser(user);
      setIsPairedSuccess(true);
    } catch (err: any) {
      console.error("Login & join error:", err);
      let message = err.message || "Failed to sign in and join space.";
      if (message.toLowerCase().includes("invalid login credentials")) {
        message = "Incorrect email or password. Please try again.";
      }
      setErrorMsg(message);
    } finally {
      setActionLoading(false);
    }
  };

  const inviterName = inviterProfile?.display_name || "Your partner";

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-canvas text-ink py-12 px-6 flex flex-col items-center justify-center">
      {/* Background blob */}
      <div
        className="pointer-events-none absolute -top-24 -left-24 z-0 h-[450px] w-[450px] opacity-60 blur-[80px]"
        style={{
          backgroundImage: "url('/blob.svg')",
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Confetti Animation when paired */}
      {isPairedSuccess && <ConfettiParticles />}

      <main className="relative z-10 w-full max-w-[480px]">
        {/* Loading Spinner */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-inkSoft">Opening invitation...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && errorMsg && !isPairedSuccess && (
          <Card className="p-8 text-center rounded-[24px]">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blush/30 text-deep">
              <AlertCircle size={24} strokeWidth={1.5} />
            </div>
            <h1 className="font-heading text-2xl text-ink mb-2">
              Invitation Issue
            </h1>
            <p className="text-sm text-inkSoft mb-6">{errorMsg}</p>
            <Link href="/">
              <Button variant="primary">Return Home</Button>
            </Link>
          </Card>
        )}

        {/* SUCCESS: YOU ARE NOW PAIRED */}
        {!loading && isPairedSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Card className="p-8 text-center rounded-[24px] shadow-[0_8px_32px_rgba(255,90,126,0.12)]">
              {/* Overlapping Avatars */}
              <div className="flex justify-center items-center -space-x-4 mb-6">
                <div className="w-16 h-16 rounded-full border-2 border-white bg-blush/60 flex items-center justify-center text-ink font-heading text-xl shadow-sm">
                  {inviterName.charAt(0).toUpperCase()}
                </div>
                <div className="w-16 h-16 rounded-full border-2 border-white bg-primary text-white flex items-center justify-center font-heading text-xl shadow-sm">
                  {name ? name.charAt(0).toUpperCase() : "♥"}
                </div>
              </div>

              <Pill className="mb-3">Connected Space</Pill>
              <h1 className="font-heading text-3xl text-ink mb-2">
                You are now paired
              </h1>
              <p className="text-sm text-inkSoft mb-8">
                Your private space for two is unlocked.
              </p>

              <Link href="/space" className="block w-full">
                <Button variant="primary" className="w-full h-14 rounded-full text-base font-medium">
                  Enter Our Space
                </Button>
              </Link>
            </Card>
          </motion.div>
        )}

        {/* LOGGED IN USER VIEW */}
        {!loading && !errorMsg && !isPairedSuccess && currentUser && (
          <Card className="p-8 text-center rounded-[24px]">
            {/* Overlapping Avatars */}
            <div className="flex justify-center items-center -space-x-4 mb-6">
              <div className="w-16 h-16 rounded-full border-2 border-white bg-blush/60 flex items-center justify-center text-ink font-heading text-2xl shadow-sm">
                {inviterName.charAt(0).toUpperCase()}
              </div>
              <div className="w-16 h-16 rounded-full border-2 border-white bg-primary text-white flex items-center justify-center font-heading text-2xl shadow-sm">
                {currentUser.email ? currentUser.email.charAt(0).toUpperCase() : "♥"}
              </div>
            </div>

            <h1 className="font-heading text-2xl text-ink leading-snug mb-3">
              {inviterName} invited you to your private space
            </h1>
            <p className="text-sm text-inkSoft mb-8">
              Join to unlock talk decks, daily prayers, and couple games.
            </p>

            <Button
              type="button"
              variant="primary"
              disabled={actionLoading}
              onClick={handleJoinLogged}
              className="w-full h-14 rounded-full text-base font-medium"
            >
              {actionLoading ? "Joining..." : "Join Their Space"}
            </Button>
          </Card>
        )}

        {/* NOT LOGGED IN USER: MINI ONBOARDING OR SIGN IN */}
        {!loading && !errorMsg && !isPairedSuccess && !currentUser && (
          <Card className="p-6 sm:p-8 rounded-[24px]">
            {/* Overlapping Avatars Header */}
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-16 h-16 rounded-full border-2 border-white bg-blush/60 flex items-center justify-center text-ink font-heading text-2xl shadow-sm mb-3">
                {inviterName.charAt(0).toUpperCase()}
              </div>
              <h1 className="font-heading text-[22px] text-ink leading-tight mb-1">
                {inviterName} invited you to your private space
              </h1>
              <p className="text-xs text-inkSoft">
                {authMode === "signup"
                  ? "Create your own account to join and link your space."
                  : "Sign in with your account to join and link your space."}
              </p>
            </div>

            {/* Auth Mode Toggle */}
            <div className="flex p-1 bg-canvas rounded-full border border-border mb-5">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("signup");
                  setErrorMsg(null);
                }}
                className={cn(
                  "flex-1 py-2 text-xs font-semibold rounded-full transition-all",
                  authMode === "signup"
                    ? "bg-primary text-white shadow-xs"
                    : "text-inkSoft hover:text-ink"
                )}
              >
                Create Account
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setErrorMsg(null);
                }}
                className={cn(
                  "flex-1 py-2 text-xs font-semibold rounded-full transition-all",
                  authMode === "login"
                    ? "bg-primary text-white shadow-xs"
                    : "text-inkSoft hover:text-ink"
                )}
              >
                Already Have Account
              </button>
            </div>

            {authMode === "signup" ? (
              <form onSubmit={handleSignupAndJoin} className="space-y-4">
                {/* Role Selection */}
                <div>
                  <label className="text-xs font-medium text-inkSoft block mb-1.5">
                    I am...
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole("lady")}
                      className={cn(
                        "py-2.5 rounded-full text-xs font-medium border transition-all",
                        role === "lady"
                          ? "border-primary bg-primary text-white"
                          : "border-border bg-white text-ink hover:border-blush"
                      )}
                    >
                      Lady
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("guy")}
                      className={cn(
                        "py-2.5 rounded-full text-xs font-medium border transition-all",
                        role === "guy"
                          ? "border-primary bg-primary text-white"
                          : "border-border bg-white text-ink hover:border-blush"
                      )}
                    >
                      Guy
                    </button>
                  </div>
                </div>

                {/* Stage Selection */}
                <div>
                  <label className="text-xs font-medium text-inkSoft block mb-1.5">
                    Our Season
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["courting", "engaged", "married"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStage(s)}
                        className={cn(
                          "py-2 rounded-full text-[11px] font-medium capitalize border transition-all",
                          stage === s
                            ? "border-primary bg-primary text-white"
                            : "border-border bg-white text-ink hover:border-blush"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="text-xs font-medium text-inkSoft">First Name</label>
                  <Input
                    type="text"
                    placeholder="Your first name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-12 mt-1"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="text-xs font-medium text-inkSoft">Email</label>
                  <Input
                    type="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 mt-1"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="text-xs font-medium text-inkSoft">Password</label>
                  <Input
                    type="password"
                    placeholder="Create password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-12 mt-1"
                  />
                </div>

                {errorMsg && (
                  <div className="rounded-[16px] border border-deep/20 bg-blush/20 p-2.5 text-xs text-deep text-center">
                    {errorMsg}
                  </div>
                )}

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={actionLoading || !name || !email || !password}
                    className="w-full h-14 rounded-full text-base font-medium shadow-[0_8px_32px_rgba(255,90,126,0.18)]"
                  >
                    {actionLoading ? "Creating Account & Joining..." : "Create Account & Join Space"}
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleLoginAndJoin} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="text-xs font-medium text-inkSoft">Email</label>
                  <Input
                    type="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 mt-1"
                    autoComplete="email"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="text-xs font-medium text-inkSoft">Password</label>
                  <Input
                    type="password"
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 mt-1"
                    autoComplete="current-password"
                  />
                </div>

                {errorMsg && (
                  <div className="rounded-[16px] border border-deep/20 bg-blush/20 p-2.5 text-xs text-deep text-center">
                    {errorMsg}
                  </div>
                )}

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={actionLoading || !email || !password}
                    className="w-full h-14 rounded-full text-base font-medium shadow-[0_8px_32px_rgba(255,90,126,0.18)]"
                  >
                    {actionLoading ? "Signing In & Joining..." : "Sign In & Join Space"}
                  </Button>
                </div>
              </form>
            )}
          </Card>
        )}
      </main>
    </div>
  );
}
