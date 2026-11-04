# Christone Couples

> **A private space for two.**
> Built for kingdom couples (18+ Dating, Engaged, Married). Minimalist, calm, Christ-honoring SaaS.

---

## 🕊️ Features Overview

- **Paired Space (`/space`)**: A shared private sanctum between two partners. Synchronized feeds, partner check-ins, prayer streaks, and milestones.
- **Daily Talk & Conversation Decks (`/talks`)**: 8 curated decks (120+ prompts) across Courting, Vision, Finances, Conflict, and Married Intimacy. Private-until-both-submit answering mechanism.
- **Creative Games (`/games`)**: Real-time Drawing Battle on synchronized 1:1 canvas, Photo Challenge with side-by-side reveals, and couple question trivia.
- **Daily Prayer & Gratitude (`/pray`)**: Synchronized 2-minute prayer countdown, shared interactive prayer checklist, and private daily gratitude notes.
- **Retention & Streaks**: Automatic streak tracking across all touchpoints, with 6 unlockable milestone badges (`First Talk`, `7-Day Streak`, `Intercessors`, `Gist Masters`, `Deep Talkers`, `Vision Setters`).
- **In-App Notification Banners**: Contextual prompts (daily talk reminder, 48h partner nudge, streak preservation).
- **Weekly Sunday Check-In**: 5-minute review every Sunday covering celebrations, challenges, honoring God, improvements, and prayer.
- **Monetization & Paywall (`/pricing`)**: Powered by Paystack. Free tier includes 20 talk answers and 1 game/day. One subscription ($7.99/mo or $49/year) covers both partners automatically.
- **Settings & Security (`/settings`, `/privacy`, `/terms`)**: Marriage confirmation gate, relationship stage switching, covenant vision editor, soft-delete space separation with danger confirmation, and in-app feedback.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS with custom design system tokens (`Instrument Serif`, `Satoshi`, rose `#FF5A7E`, blush `#FFC2CE`, ink `#1A1A1E`, canvas `#FFFBFC`)
- **Animation**: Framer Motion
- **Database & Auth**: Supabase (PostgreSQL, Row-Level Security, Realtime channels, Storage)
- **Payments**: Paystack API & Webhooks
- **Icons**: Lucide Icons (1.5px line weight)

---

## 🔑 Environment Variables

Create a `.env.local` file in the project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-public-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key-for-webhooks>

# Paystack Configuration
PAYSTACK_SECRET_KEY=your_paystack_secret_key_here
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=your_paystack_public_key_here
PAYSTACK_CURRENCY=USD

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Local Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser (preferably mobile emulation at 375px–480px width).

### 3. Production Build & QA Verification

```bash
npm run build
npm run start
```

---

## 🗄️ Supabase Schema SQL Dump

Execute the following SQL in your Supabase SQL Editor to provision all 20 tables, Row Level Security (RLS) policies, Realtime publications, and initial seed data:

```sql
-- ==========================================================
-- 1. PROFILES TABLE
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  role TEXT DEFAULT 'partner',
  stage TEXT DEFAULT 'dating',
  avatar_url TEXT,
  partner_code VARCHAR UNIQUE,
  is_married_confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and edit their own profile"
  ON public.profiles FOR ALL
  USING (auth.uid() = id);

CREATE POLICY "Partners can read profiles"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- ==========================================================
-- 2. COUPLES TABLE
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.couples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_a UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  partner_b UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  couple_name TEXT,
  invite_code VARCHAR UNIQUE,
  status TEXT DEFAULT 'paired', -- 'paired', 'separated', 'pending'
  stage TEXT DEFAULT 'dating', -- 'courting', 'engaged', 'married'
  vision TEXT,
  is_married_confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couples read and update for partners"
  ON public.couples FOR ALL
  USING (auth.uid() = partner_a OR auth.uid() = partner_b);

-- ==========================================================
-- 3. MOMENTS TABLE (Shared Feed)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.moments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL, -- 'checkin', 'talk', 'game', 'prayer', 'review'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.moments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couples can access moments"
  ON public.moments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.couples
    WHERE id = moments.couple_id
    AND (partner_a = auth.uid() OR partner_b = auth.uid())
  ));

-- ==========================================================
-- 4. CHECKINS TABLE
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  mood TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Checkin couple access"
  ON public.checkins FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.couples
    WHERE id = checkins.couple_id
    AND (partner_a = auth.uid() OR partner_b = auth.uid())
  ));

-- ==========================================================
-- 5. TALK DECKS & TALK PROMPTS
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.talk_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  stage TEXT DEFAULT 'dating',
  description TEXT,
  icon_name TEXT,
  is_intimacy BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.talk_decks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read talk decks" ON public.talk_decks FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.talk_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID REFERENCES public.talk_decks(id) ON DELETE CASCADE,
  prompt_text TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.talk_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read talk prompts" ON public.talk_prompts FOR SELECT USING (true);

-- ==========================================================
-- 6. TALK ANSWERS (Private Until Both Submit)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.talk_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID REFERENCES public.talk_prompts(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.talk_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Answers visible to couple"
  ON public.talk_answers FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.couples
    WHERE id = talk_answers.couple_id
    AND (partner_a = auth.uid() OR partner_b = auth.uid())
  ));

-- ==========================================================
-- 7. DAILY QUESTIONS
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.daily_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE,
  prompt_id UUID REFERENCES public.talk_prompts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.daily_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Daily questions couple access" ON public.daily_questions FOR ALL USING (true);

-- ==========================================================
-- 8. GAMES & GAME PLAYS
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Games readable" ON public.games FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.game_plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE,
  game_id UUID REFERENCES public.games(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.game_plays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Game plays couple access"
  ON public.game_plays FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.couples
    WHERE id = game_plays.couple_id
    AND (partner_a = auth.uid() OR partner_b = auth.uid())
  ));

-- ==========================================================
-- 9. PRAYER POINTS & GRATITUDES
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.prayer_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_answered BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.prayer_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Prayer points couple access"
  ON public.prayer_points FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.couples
    WHERE id = prayer_points.couple_id
    AND (partner_a = auth.uid() OR partner_b = auth.uid())
  ));

CREATE TABLE IF NOT EXISTS public.gratitudes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.gratitudes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gratitude couple access"
  ON public.gratitudes FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.couples
    WHERE id = gratitudes.couple_id
    AND (partner_a = auth.uid() OR partner_b = auth.uid())
  ));

-- ==========================================================
-- 10. STREAKS
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.streaks (
  id UUID DEFAULT gen_random_uuid(),
  couple_id UUID PRIMARY KEY REFERENCES public.couples(id) ON DELETE CASCADE,
  count INTEGER DEFAULT 1 NOT NULL,
  current_streak INTEGER DEFAULT 1,
  longest_streak INTEGER DEFAULT 1,
  last_activity DATE DEFAULT CURRENT_DATE NOT NULL,
  last_prayed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Streaks couple access"
  ON public.streaks FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.couples
    WHERE id = streaks.couple_id
    AND (partner_a = auth.uid() OR partner_b = auth.uid())
  ));

-- ==========================================================
-- 11. BADGES & COUPLE BADGES
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.badges (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL
);
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read badges" ON public.badges FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.couple_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE,
  badge_id TEXT REFERENCES public.badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(couple_id, badge_id)
);
ALTER TABLE public.couple_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couple badges access"
  ON public.couple_badges FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.couples
    WHERE id = couple_badges.couple_id
    AND (partner_a = auth.uid() OR partner_b = auth.uid())
  ));

-- ==========================================================
-- 12. NOTIFICATIONS & WEEKLY REVIEWS
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notifications access"
  ON public.notifications FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.couples
    WHERE id = notifications.couple_id
    AND (partner_a = auth.uid() OR partner_b = auth.uid())
  ));

CREATE TABLE IF NOT EXISTS public.weekly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  answers JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(couple_id, week_start)
);
ALTER TABLE public.weekly_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Weekly reviews couple access"
  ON public.weekly_reviews FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.couples
    WHERE id = weekly_reviews.couple_id
    AND (partner_a = auth.uid() OR partner_b = auth.uid())
  ));

-- ==========================================================
-- 13. SUBSCRIPTIONS (Paystack Monetization)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  couple_id UUID PRIMARY KEY REFERENCES public.couples(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'free', -- 'free' | 'premium'
  paystack_customer_id TEXT,
  paystack_reference TEXT,
  paystack_subscription_code TEXT,
  stripe_customer_id TEXT,
  plan_type TEXT DEFAULT 'monthly',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couple subscriptions access"
  ON public.subscriptions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.couples
    WHERE id = subscriptions.couple_id
    AND (partner_a = auth.uid() OR partner_b = auth.uid())
  ));

-- ==========================================================
-- 14. FEEDBACK & ANALYTICS EVENTS
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES public.couples(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users submit feedback"
  ON public.feedback FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES public.couples(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users log events"
  ON public.events FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ==========================================================
-- 15. ENABLE SUPABASE REALTIME REPLICATION
-- ==========================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.moments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.streaks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.talk_answers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_plays;
ALTER PUBLICATION supabase_realtime ADD TABLE public.prayer_points;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;

-- ==========================================================
-- 16. SEED DATA (Badges & Decks)
-- ==========================================================
INSERT INTO public.badges (id, title, description, icon) VALUES
  ('first_talk', 'First Talk', 'Completed your first deep conversation prompt', 'Sparkles'),
  ('streak_7', '7-Day Streak', 'Consecutively showed up for your partner for 7 days', 'Flame'),
  ('intercessors', 'Intercessors', 'Agreed and prayed together 7 times', 'HeartHandshake'),
  ('gist_masters', 'Gist Masters', 'Played 20 playful couple games together', 'Smile'),
  ('deep_talkers', 'Deep Talkers', 'Answered 50 vulnerability talk prompts', 'MessageCircle'),
  ('vision_setters', 'Vision Setters', 'Crafted your shared kingdom why', 'Crown')
ON CONFLICT (id) DO NOTHING;
```

---

## 🎨 Design System & Covenant Safety Rules

- **Colors**:
  - Canvas: `#FFFBFC`
  - Card: `#FFFFFF`
  - Primary Rose: `#FF5A7E`
  - Blush: `#FFC2CE`
  - Deep: `#E84367`
  - Ink: `#1A1A1E`
  - Ink Soft: `#6B5B5F`
  - Border: `#F5E6E8`
  - Success: `#DDF2E6`
- **Typography**: Headings: `Instrument Serif`, Body/UI: `Satoshi`
- **Border Radii**: Cards `24px`, Pills `999px`, Inputs `16px`
- **Shadow**: `0 8px 32px rgba(255,90,126,0.08)`
- **Safety Policy**:
  - Non-graphic, consent-focused, Christ-honoring, skippable, 18+ only.
  - Married intimacy decks locked behind voluntary confirmation gate.
