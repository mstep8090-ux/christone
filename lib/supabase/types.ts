export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      checkins: {
        Row: {
          couple_id: string;
          created_at: string;
          id: string;
          mood: string;
          note: string | null;
          user_id: string;
        };
        Insert: {
          couple_id: string;
          created_at?: string;
          id?: string;
          mood: string;
          note?: string | null;
          user_id: string;
        };
        Update: {
          couple_id?: string;
          created_at?: string;
          id?: string;
          mood?: string;
          note?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "checkins_couple_id_fkey";
            columns: ["couple_id"];
            isOneToOne: false;
            referencedRelation: "couples";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checkins_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      badges: {
        Row: {
          description: string;
          icon: string;
          id: string;
          title: string;
        };
        Insert: {
          description: string;
          icon: string;
          id: string;
          title: string;
        };
        Update: {
          description?: string;
          icon?: string;
          id?: string;
          title?: string;
        };
        Relationships: [];
      };
      couple_badges: {
        Row: {
          awarded_at: string;
          badge_id: string;
          couple_id: string;
          id: string;
        };
        Insert: {
          awarded_at?: string;
          badge_id: string;
          couple_id: string;
          id?: string;
        };
        Update: {
          awarded_at?: string;
          badge_id?: string;
          couple_id?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "couple_badges_badge_id_fkey";
            columns: ["badge_id"];
            isOneToOne: false;
            referencedRelation: "badges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "couple_badges_couple_id_fkey";
            columns: ["couple_id"];
            isOneToOne: false;
            referencedRelation: "couples";
            referencedColumns: ["id"];
          }
        ];
      };
      games: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          title: string;
          type: "thisorthat" | "wyr" | "truth" | "dare" | "quiz" | "draw" | "photo" | "trivia";
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          title: string;
          type: "thisorthat" | "wyr" | "truth" | "dare" | "quiz" | "draw" | "photo" | "trivia";
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          title?: string;
          type?: "thisorthat" | "wyr" | "truth" | "dare" | "quiz" | "draw" | "photo" | "trivia";
        };
        Relationships: [];
      };
      game_plays: {
        Row: {
          couple_id: string;
          created_at: string;
          data: Json;
          game_id: string;
          id: string;
        };
        Insert: {
          couple_id: string;
          created_at?: string;
          data?: Json;
          game_id: string;
          id?: string;
        };
        Update: {
          couple_id?: string;
          created_at?: string;
          data?: Json;
          game_id?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "game_plays_couple_id_fkey";
            columns: ["couple_id"];
            isOneToOne: false;
            referencedRelation: "couples";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "game_plays_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          }
        ];
      };
      daily_questions: {
        Row: {
          couple_id: string;
          created_at: string;
          date: string;
          id: string;
          prompt_id: string;
        };
        Insert: {
          couple_id: string;
          created_at?: string;
          date: string;
          id?: string;
          prompt_id: string;
        };
        Update: {
          couple_id?: string;
          created_at?: string;
          date?: string;
          id?: string;
          prompt_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_questions_couple_id_fkey";
            columns: ["couple_id"];
            isOneToOne: false;
            referencedRelation: "couples";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_questions_prompt_id_fkey";
            columns: ["prompt_id"];
            isOneToOne: false;
            referencedRelation: "talk_prompts";
            referencedColumns: ["id"];
          }
        ];
      };
      couples: {
        Row: {
          couple_name: string | null;
          created_at: string;
          id: string;
          invite_code: string;
          is_married_confirmed: boolean | null;
          partner_a: string;
          partner_b: string | null;
          status: string;
          vision: string | null;
        };
        Insert: {
          couple_name?: string | null;
          created_at?: string;
          id?: string;
          invite_code: string;
          is_married_confirmed?: boolean | null;
          partner_a: string;
          partner_b?: string | null;
          status?: string;
          vision?: string | null;
        };
        Update: {
          couple_name?: string | null;
          created_at?: string;
          id?: string;
          invite_code?: string;
          is_married_confirmed?: boolean | null;
          partner_a?: string;
          partner_b?: string | null;
          status?: string;
          vision?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "couples_partner_a_fkey";
            columns: ["partner_a"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "couples_partner_b_fkey";
            columns: ["partner_b"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      moments: {
        Row: {
          author_id: string;
          content: string;
          couple_id: string;
          created_at: string;
          id: string;
          type: string;
        };
        Insert: {
          author_id: string;
          content: string;
          couple_id: string;
          created_at?: string;
          id?: string;
          type: string;
        };
        Update: {
          author_id?: string;
          content?: string;
          couple_id?: string;
          created_at?: string;
          id?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "moments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "moments_couple_id_fkey";
            columns: ["couple_id"];
            isOneToOne: false;
            referencedRelation: "couples";
            referencedColumns: ["id"];
          }
        ];
      };
      notifications: {
        Row: {
          couple_id: string;
          created_at: string;
          id: string;
          read: boolean;
          title: string;
          type: "daily_talk" | "prayer" | "streak_at_risk" | "nudge";
          user_id: string;
        };
        Insert: {
          couple_id: string;
          created_at?: string;
          id?: string;
          read?: boolean;
          title: string;
          type: "daily_talk" | "prayer" | "streak_at_risk" | "nudge";
          user_id: string;
        };
        Update: {
          couple_id?: string;
          created_at?: string;
          id?: string;
          read?: boolean;
          title?: string;
          type?: "daily_talk" | "prayer" | "streak_at_risk" | "nudge";
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_couple_id_fkey";
            columns: ["couple_id"];
            isOneToOne: false;
            referencedRelation: "couples";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string | null;
          email: string | null;
          id: string;
          is_married_confirmed: boolean | null;
          partner_code: string | null;
          role: string | null;
          stage: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          email?: string | null;
          id: string;
          is_married_confirmed?: boolean | null;
          partner_code?: string | null;
          role?: string | null;
          stage?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          email?: string | null;
          id?: string;
          is_married_confirmed?: boolean | null;
          partner_code?: string | null;
          role?: string | null;
          stage?: string | null;
        };
        Relationships: [];
      };
      prayer_points: {
        Row: {
          couple_id: string;
          created_at: string;
          id: string;
          is_answered: boolean;
          text: string;
        };
        Insert: {
          couple_id: string;
          created_at?: string;
          id?: string;
          is_answered?: boolean;
          text: string;
        };
        Update: {
          couple_id?: string;
          created_at?: string;
          id?: string;
          is_answered?: boolean;
          text?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prayer_points_couple_id_fkey";
            columns: ["couple_id"];
            isOneToOne: false;
            referencedRelation: "couples";
            referencedColumns: ["id"];
          }
        ];
      };
      streaks: {
        Row: {
          count: number;
          couple_id: string;
          created_at: string;
          current_streak: number;
          id: string;
          last_activity: string;
          last_prayed_at: string;
          longest_streak: number;
          updated_at: string;
        };
        Insert: {
          count?: number;
          couple_id: string;
          created_at?: string;
          current_streak?: number;
          id?: string;
          last_activity?: string;
          last_prayed_at?: string;
          longest_streak?: number;
          updated_at?: string;
        };
        Update: {
          count?: number;
          couple_id?: string;
          created_at?: string;
          current_streak?: number;
          id?: string;
          last_activity?: string;
          last_prayed_at?: string;
          longest_streak?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "streaks_couple_id_fkey";
            columns: ["couple_id"];
            isOneToOne: true;
            referencedRelation: "couples";
            referencedColumns: ["id"];
          }
        ];
      };
      gratitudes: {
        Row: {
          content: string;
          couple_id: string;
          created_at: string;
          date: string;
          id: string;
          user_id: string;
        };
        Insert: {
          content: string;
          couple_id: string;
          created_at?: string;
          date: string;
          id?: string;
          user_id: string;
        };
        Update: {
          content?: string;
          couple_id?: string;
          created_at?: string;
          date?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gratitudes_couple_id_fkey";
            columns: ["couple_id"];
            isOneToOne: false;
            referencedRelation: "couples";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gratitudes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      talk_answers: {
        Row: {
          answer: string;
          couple_id: string;
          created_at: string;
          id: string;
          prompt_id: string;
          user_id: string;
        };
        Insert: {
          answer: string;
          couple_id: string;
          created_at?: string;
          id?: string;
          prompt_id: string;
          user_id: string;
        };
        Update: {
          answer?: string;
          couple_id?: string;
          created_at?: string;
          id?: string;
          prompt_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "talk_answers_couple_id_fkey";
            columns: ["couple_id"];
            isOneToOne: false;
            referencedRelation: "couples";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "talk_answers_prompt_id_fkey";
            columns: ["prompt_id"];
            isOneToOne: false;
            referencedRelation: "talk_prompts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "talk_answers_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      talk_decks: {
        Row: {
          category: string;
          created_at: string;
          description: string | null;
          icon_name: string;
          id: string;
          is_intimacy: boolean | null;
          stage: string;
          title: string;
        };
        Insert: {
          category: string;
          created_at?: string;
          description?: string | null;
          icon_name: string;
          id?: string;
          is_intimacy?: boolean | null;
          stage?: string;
          title: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          description?: string | null;
          icon_name?: string;
          id?: string;
          is_intimacy?: boolean | null;
          stage?: string;
          title?: string;
        };
        Relationships: [];
      };
      talk_prompts: {
        Row: {
          created_at: string;
          deck_id: string;
          id: string;
          order_index: number;
          prompt_text: string;
        };
        Insert: {
          created_at?: string;
          deck_id: string;
          id?: string;
          order_index: number;
          prompt_text: string;
        };
        Update: {
          created_at?: string;
          deck_id?: string;
          id?: string;
          order_index?: number;
          prompt_text?: string;
        };
        Relationships: [
          {
            foreignKeyName: "talk_prompts_deck_id_fkey";
            columns: ["deck_id"];
            isOneToOne: false;
            referencedRelation: "talk_decks";
            referencedColumns: ["id"];
          }
        ];
      };
      weekly_reviews: {
        Row: {
          answers: Json;
          couple_id: string;
          created_at: string;
          id: string;
          user_id: string | null;
          week_start: string;
        };
        Insert: {
          answers?: Json;
          couple_id: string;
          created_at?: string;
          id?: string;
          user_id?: string | null;
          week_start: string;
        };
        Update: {
          answers?: Json;
          couple_id?: string;
          created_at?: string;
          id?: string;
          user_id?: string | null;
          week_start?: string;
        };
        Relationships: [
          {
            foreignKeyName: "weekly_reviews_couple_id_fkey";
            columns: ["couple_id"];
            isOneToOne: false;
            referencedRelation: "couples";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "weekly_reviews_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      subscriptions: {
        Row: {
          couple_id: string;
          created_at: string;
          expires_at: string | null;
          paystack_customer_id: string | null;
          paystack_reference: string | null;
          paystack_subscription_code: string | null;
          plan_type: "monthly" | "yearly";
          status: "free" | "premium";
          stripe_customer_id: string | null;
          updated_at: string;
        };
        Insert: {
          couple_id: string;
          created_at?: string;
          expires_at?: string | null;
          paystack_customer_id?: string | null;
          paystack_reference?: string | null;
          paystack_subscription_code?: string | null;
          plan_type?: "monthly" | "yearly";
          status?: "free" | "premium";
          stripe_customer_id?: string | null;
          updated_at?: string;
        };
        Update: {
          couple_id?: string;
          created_at?: string;
          expires_at?: string | null;
          paystack_customer_id?: string | null;
          paystack_reference?: string | null;
          paystack_subscription_code?: string | null;
          plan_type?: "monthly" | "yearly";
          status?: "free" | "premium";
          stripe_customer_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_couple_id_fkey";
            columns: ["couple_id"];
            isOneToOne: true;
            referencedRelation: "couples";
            referencedColumns: ["id"];
          }
        ];
      };
      feedback: {
        Row: {
          couple_id: string | null;
          created_at: string;
          id: string;
          message: string;
          user_id: string | null;
        };
        Insert: {
          couple_id?: string | null;
          created_at?: string;
          id?: string;
          message: string;
          user_id?: string | null;
        };
        Update: {
          couple_id?: string | null;
          created_at?: string;
          id?: string;
          message?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "feedback_couple_id_fkey";
            columns: ["couple_id"];
            isOneToOne: false;
            referencedRelation: "couples";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feedback_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      events: {
        Row: {
          couple_id: string | null;
          created_at: string;
          event_type: string;
          id: string;
          metadata: Json;
        };
        Insert: {
          couple_id?: string | null;
          created_at?: string;
          event_type: string;
          id?: string;
          metadata?: Json;
        };
        Update: {
          couple_id?: string | null;
          created_at?: string;
          event_type?: string;
          id?: string;
          metadata?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "events_couple_id_fkey";
            columns: ["couple_id"];
            isOneToOne: false;
            referencedRelation: "couples";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;
