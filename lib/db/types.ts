// Database types, written to match `supabase gen types typescript` output.
// Regenerate with `pnpm db:types` once a local Supabase is running.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          default_city: string | null;
          default_latitude: number | null;
          default_longitude: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          default_city?: string | null;
          default_latitude?: number | null;
          default_longitude?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          default_city?: string | null;
          default_latitude?: number | null;
          default_longitude?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      occasions: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          position?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      garments: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          category: Database["public"]["Enums"]["garment_category"];
          colors: string[];
          seasons: Database["public"]["Enums"]["season"][];
          warmth: number;
          rain_ok: boolean;
          photo_path: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          category: Database["public"]["Enums"]["garment_category"];
          colors: string[];
          seasons?: Database["public"]["Enums"]["season"][];
          warmth: number;
          rain_ok?: boolean;
          photo_path: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          category?: Database["public"]["Enums"]["garment_category"];
          colors?: string[];
          seasons?: Database["public"]["Enums"]["season"][];
          warmth?: number;
          rain_ok?: boolean;
          photo_path?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      garment_occasions: {
        Row: {
          garment_id: string;
          occasion_id: string;
          user_id: string;
        };
        Insert: {
          garment_id: string;
          occasion_id: string;
          user_id?: string;
        };
        Update: {
          garment_id?: string;
          occasion_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "garment_occasions_garment_id_user_id_fkey";
            columns: ["garment_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "garments";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "garment_occasions_occasion_id_user_id_fkey";
            columns: ["occasion_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "occasions";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      garment_exclusions: {
        Row: {
          id: string;
          user_id: string;
          garment_a_id: string;
          garment_b_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          garment_a_id: string;
          garment_b_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          garment_a_id?: string;
          garment_b_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "garment_exclusions_garment_a_id_user_id_fkey";
            columns: ["garment_a_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "garments";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "garment_exclusions_garment_b_id_user_id_fkey";
            columns: ["garment_b_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "garments";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      color_exclusions: {
        Row: {
          id: string;
          user_id: string;
          color_a: string;
          color_b: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          color_a: string;
          color_b: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          color_a?: string;
          color_b?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      invitations: {
        Row: {
          email: string;
          invited_by: string | null;
          created_at: string;
          accepted_at: string | null;
        };
        Insert: {
          email: string;
          invited_by?: string | null;
          created_at?: string;
          accepted_at?: string | null;
        };
        Update: {
          email?: string;
          invited_by?: string | null;
          created_at?: string;
          accepted_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      delete_occasion: {
        Args: { p_id: string; p_replacement_id?: string | null };
        Returns: undefined;
      };
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      palette_colors: {
        Args: Record<PropertyKey, never>;
        Returns: string[];
      };
      save_garment: {
        Args: {
          p_id: string | null;
          p_name: string;
          p_category: Database["public"]["Enums"]["garment_category"];
          p_colors: string[];
          p_seasons: Database["public"]["Enums"]["season"][];
          p_warmth: number;
          p_rain_ok: boolean;
          p_photo_path: string;
          p_occasion_ids: string[];
        };
        Returns: string;
      };
    };
    Enums: {
      garment_category: "top" | "bottom" | "shoes";
      season: "spring" | "summer" | "autumn" | "winter";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];
