import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const isProtected =
    pathname.startsWith("/space") ||
    pathname.startsWith("/talks") ||
    pathname.startsWith("/games") ||
    pathname.startsWith("/pray");

  if (!isProtected) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. No session -> redirect /onboarding
  if (!user) {
    const redirectUrl = new URL("/onboarding", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // 2. Check if user has paired couple
  const { data: couple } = await supabase
    .from("couples")
    .select("id, status")
    .or(`partner_a.eq.${user.id},partner_b.eq.${user.id}`)
    .maybeSingle();

  // If user has no paired couple or status pending -> redirect /invite
  if (!couple || couple.status !== "paired") {
    const inviteUrl = new URL("/invite", request.url);
    return NextResponse.redirect(inviteUrl);
  }

  // 3. Monetization Free Limits:
  // 20 talk_answers total per couple, 1 game per day.
  const isTalkDeck = pathname.startsWith("/talks/") && pathname !== "/talks";
  const isGames = pathname === "/games" || pathname.startsWith("/games/");
  const paywallParam = request.nextUrl.searchParams.get("paywall");

  if ((isTalkDeck || isGames) && !paywallParam) {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("status, expires_at")
      .eq("couple_id", couple.id)
      .maybeSingle();

    const isExpired = sub?.expires_at ? new Date(sub.expires_at) < new Date() : false;
    const isPremium = sub?.status === "premium" && !isExpired;

    if (!isPremium) {
      if (isTalkDeck) {
        // Free limit: 20 talk_answers total per couple
        const { count: talkCount } = await supabase
          .from("talk_answers")
          .select("id", { count: "exact", head: true })
          .eq("couple_id", couple.id);

        if ((talkCount || 0) >= 20) {
          const redirectUrl = new URL(request.url);
          redirectUrl.searchParams.set("paywall", "talk_limit");
          return NextResponse.redirect(redirectUrl);
        }
      }

      if (isGames) {
        // Free limit: 1 game per day per couple
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const { count: gamesToday } = await supabase
          .from("game_plays")
          .select("id", { count: "exact", head: true })
          .eq("couple_id", couple.id)
          .gte("created_at", startOfDay.toISOString());

        if ((gamesToday || 0) >= 1) {
          const redirectUrl = new URL(request.url);
          redirectUrl.searchParams.set("paywall", "game_limit");
          return NextResponse.redirect(redirectUrl);
        }
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/space/:path*",
    "/talks/:path*",
    "/games/:path*",
    "/pray/:path*",
  ],
};
