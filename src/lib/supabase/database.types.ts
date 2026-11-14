export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      clubs: {
        Row: {
          api_football_id: number | null
          budget: number | null
          city: string | null
          external_id: number
          founded: number | null
          id: string
          league_id: string
          name: Json
          primary_color: string | null
          reputation: number
          secondary_color: string | null
          short_name: Json | null
          stadium_capacity: number | null
          stadium_name: Json | null
          team_rating: number
        }
        Insert: {
          api_football_id?: number | null
          budget?: number | null
          city?: string | null
          external_id: number
          founded?: number | null
          id?: string
          league_id: string
          name: Json
          primary_color?: string | null
          reputation?: number
          secondary_color?: string | null
          short_name?: Json | null
          stadium_capacity?: number | null
          stadium_name?: Json | null
          team_rating?: number
        }
        Update: {
          api_football_id?: number | null
          budget?: number | null
          city?: string | null
          external_id?: number
          founded?: number | null
          id?: string
          league_id?: string
          name?: Json
          primary_color?: string | null
          reputation?: number
          secondary_color?: string | null
          short_name?: Json | null
          stadium_capacity?: number | null
          stadium_name?: Json | null
          team_rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "clubs_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string
          flag_code: string | null
          name: Json
        }
        Insert: {
          code: string
          flag_code?: string | null
          name: Json
        }
        Update: {
          code?: string
          flag_code?: string | null
          name?: Json
        }
        Relationships: []
      }
      data_snapshots: {
        Row: {
          id: string
          imported_at: string
          is_current: boolean
          season: string
          source: string
        }
        Insert: {
          id?: string
          imported_at?: string
          is_current?: boolean
          season: string
          source: string
        }
        Update: {
          id?: string
          imported_at?: string
          is_current?: boolean
          season?: string
          source?: string
        }
        Relationships: []
      }
      leagues: {
        Row: {
          country_code: string
          external_id: string | null
          id: string
          is_playable: boolean
          key: string
          name: Json
          num_teams: number
          strength: number
          tier: number
        }
        Insert: {
          country_code: string
          external_id?: string | null
          id?: string
          is_playable?: boolean
          key: string
          name: Json
          num_teams: number
          strength: number
          tier?: number
        }
        Update: {
          country_code?: string
          external_id?: string | null
          id?: string
          is_playable?: boolean
          key?: string
          name?: Json
          num_teams?: number
          strength?: number
          tier?: number
        }
        Relationships: [
          {
            foreignKeyName: "leagues_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      players: {
        Row: {
          age: number | null
          attributes: Json | null
          birth_date: string | null
          club_id: string | null
          contract_until: string | null
          external_id: number
          foot: string | null
          height_cm: number | null
          id: string
          name: Json
          nationality: string | null
          position: string
          potential: number | null
          rating_source: string
          rating_world: number
          ratings_locked: boolean
          second_nationality: string | null
          shirt_number: number | null
          updated_at: string
          value: number | null
          wage: number | null
        }
        Insert: {
          age?: number | null
          attributes?: Json | null
          birth_date?: string | null
          club_id?: string | null
          contract_until?: string | null
          external_id: number
          foot?: string | null
          height_cm?: number | null
          id?: string
          name: Json
          nationality?: string | null
          position: string
          potential?: number | null
          rating_source?: string
          rating_world?: number
          ratings_locked?: boolean
          second_nationality?: string | null
          shirt_number?: number | null
          updated_at?: string
          value?: number | null
          wage?: number | null
        }
        Update: {
          age?: number | null
          attributes?: Json | null
          birth_date?: string | null
          club_id?: string | null
          contract_until?: string | null
          external_id?: number
          foot?: string | null
          height_cm?: number | null
          id?: string
          name?: Json
          nationality?: string | null
          position?: string
          potential?: number | null
          rating_source?: string
          rating_world?: number
          ratings_locked?: boolean
          second_nationality?: string | null
          shirt_number?: number | null
          updated_at?: string
          value?: number | null
          wage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "players_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_nationality_fkey"
            columns: ["nationality"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "players_second_nationality_fkey"
            columns: ["second_nationality"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          daily_streak: number
          display_name: string | null
          favourite_club_id: string | null
          id: string
          last_daily_date: string | null
          level: number
          preferred_locale: string
          role: string
          updated_at: string
          username: string
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          daily_streak?: number
          display_name?: string | null
          favourite_club_id?: string | null
          id: string
          last_daily_date?: string | null
          level?: number
          preferred_locale?: string
          role?: string
          updated_at?: string
          username: string
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          daily_streak?: number
          display_name?: string | null
          favourite_club_id?: string | null
          id?: string
          last_daily_date?: string | null
          level?: number
          preferred_locale?: string
          role?: string
          updated_at?: string
          username?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "profiles_favourite_club_id_fkey"
            columns: ["favourite_club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      rating_changes: {
        Row: {
          changed_by: string | null
          created_at: string
          id: number
          new_position: string
          new_potential: number | null
          new_rating: number
          note: string | null
          old_position: string
          old_potential: number | null
          old_rating: number
          player_id: string
          reverted_at: string | null
          was_locked: boolean
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: never
          new_position: string
          new_potential?: number | null
          new_rating: number
          note?: string | null
          old_position: string
          old_potential?: number | null
          old_rating: number
          player_id: string
          reverted_at?: string | null
          was_locked: boolean
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: never
          new_position?: string
          new_potential?: number | null
          new_rating?: number
          note?: string | null
          old_position?: string
          old_potential?: number | null
          old_rating?: number
          player_id?: string
          reverted_at?: string | null
          was_locked?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "rating_changes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rating_changes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      player_ratings: {
        Row: {
          age: number | null
          attributes: Json | null
          birth_date: string | null
          club_id: string | null
          contract_until: string | null
          external_id: number | null
          foot: string | null
          height_cm: number | null
          id: string | null
          league_id: string | null
          name: Json | null
          nationality: string | null
          position: string | null
          potential: number | null
          rating_league: number | null
          rating_source: string | null
          rating_world: number | null
          ratings_locked: boolean | null
          second_nationality: string | null
          shirt_number: number | null
          updated_at: string | null
          value: number | null
          wage: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clubs_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_nationality_fkey"
            columns: ["nationality"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "players_second_nationality_fkey"
            columns: ["second_nationality"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
    }
    Functions: {
      admin_revert_change: { Args: { p_change: number }; Returns: undefined }
      admin_update_player: {
        Args: {
          p_note?: string
          p_player: string
          p_position: string
          p_potential: number
          p_rating: number
        }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      recompute_team_ratings: { Args: { p_club?: string }; Returns: undefined }
      shift_attributes: { Args: { attrs: Json; delta: number }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
