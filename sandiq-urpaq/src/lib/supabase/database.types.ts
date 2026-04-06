export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          phone: string | null
          telegram_id: string | null
          full_name: string
          avatar_url: string | null
          birth_year: number | null
          tribe_zhuz: string | null
          paid_at: string | null
          participant_num: number | null
          created_at: string
        }
        Insert: {
          id: string
          phone?: string | null
          telegram_id?: string | null
          full_name: string
          avatar_url?: string | null
          birth_year?: number | null
          tribe_zhuz?: string | null
          paid_at?: string | null
          participant_num?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          phone?: string | null
          telegram_id?: string | null
          full_name?: string
          avatar_url?: string | null
          birth_year?: number | null
          tribe_zhuz?: string | null
          paid_at?: string | null
          participant_num?: number | null
          created_at?: string
        }
        Relationships: []
      }
      family_trees: {
        Row: {
          id: string
          owner_user_id: string
          name: string
          default_visibility: 'private' | 'family' | 'public'
          invite_code: string
          total_persons: number
          generations_count: number
          created_at: string
        }
        Insert: {
          id?: string
          owner_user_id: string
          name: string
          default_visibility?: 'private' | 'family' | 'public'
          invite_code: string
          total_persons?: number
          generations_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          owner_user_id?: string
          name?: string
          default_visibility?: 'private' | 'family' | 'public'
          invite_code?: string
          total_persons?: number
          generations_count?: number
          created_at?: string
        }
        Relationships: []
      }
      persons: {
        Row: {
          id: string
          user_id: string | null
          family_tree_id: string
          first_name: string
          last_name: string
          birth_year: number | null
          death_year: number | null
          is_alive: boolean
          is_historical: boolean
          generation_num: number
          added_by_user_id: string
          visibility: 'private' | 'family' | 'public'
          bio: string | null
          location: string | null
          zhuz: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          family_tree_id: string
          first_name: string
          last_name: string
          birth_year?: number | null
          death_year?: number | null
          is_alive?: boolean
          is_historical?: boolean
          generation_num: number
          added_by_user_id: string
          visibility?: 'private' | 'family' | 'public'
          bio?: string | null
          location?: string | null
          zhuz?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          family_tree_id?: string
          first_name?: string
          last_name?: string
          birth_year?: number | null
          death_year?: number | null
          is_alive?: boolean
          is_historical?: boolean
          generation_num?: number
          added_by_user_id?: string
          visibility?: 'private' | 'family' | 'public'
          bio?: string | null
          location?: string | null
          zhuz?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      relationships: {
        Row: {
          id: string
          from_person_id: string
          to_person_id: string
          type: 'parent_of' | 'spouse_of' | 'sibling_of' | 'adopted_by'
          status: 'pending' | 'confirmed' | 'disputed'
          confirmed_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          from_person_id: string
          to_person_id: string
          type: 'parent_of' | 'spouse_of' | 'sibling_of' | 'adopted_by'
          status?: 'pending' | 'confirmed' | 'disputed'
          confirmed_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          from_person_id?: string
          to_person_id?: string
          type?: 'parent_of' | 'spouse_of' | 'sibling_of' | 'adopted_by'
          status?: 'pending' | 'confirmed' | 'disputed'
          confirmed_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      memories: {
        Row: {
          id: string
          person_id: string
          added_by_user_id: string
          type: 'audio' | 'photo' | 'video' | 'story' | 'tradition' | 'recipe' | 'document' | 'location'
          file_url: string | null
          text_content: string | null
          transcript: string | null
          language: string
          visibility: 'private' | 'family' | 'public' | 'ai_only'
          is_ai_dataset: boolean
          moderation_status: 'pending' | 'approved' | 'rejected'
          title: string | null
          duration_seconds: number | null
          created_at: string
        }
        Insert: {
          id?: string
          person_id: string
          added_by_user_id: string
          type: 'audio' | 'photo' | 'video' | 'story' | 'tradition' | 'recipe' | 'document' | 'location'
          file_url?: string | null
          text_content?: string | null
          transcript?: string | null
          language?: string
          visibility?: 'private' | 'family' | 'public' | 'ai_only'
          is_ai_dataset?: boolean
          moderation_status?: 'pending' | 'approved' | 'rejected'
          title?: string | null
          duration_seconds?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          person_id?: string
          added_by_user_id?: string
          type?: 'audio' | 'photo' | 'video' | 'story' | 'tradition' | 'recipe' | 'document' | 'location'
          file_url?: string | null
          text_content?: string | null
          transcript?: string | null
          language?: string
          visibility?: 'private' | 'family' | 'public' | 'ai_only'
          is_ai_dataset?: boolean
          moderation_status?: 'pending' | 'approved' | 'rejected'
          title?: string | null
          duration_seconds?: number | null
          created_at?: string
        }
        Relationships: []
      }
      tree_members: {
        Row: {
          id: string
          tree_id: string
          user_id: string
          role: 'owner' | 'admin' | 'editor' | 'viewer'
          linked_person_id: string | null
          invited_by: string
          joined_at: string
        }
        Insert: {
          id?: string
          tree_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'editor' | 'viewer'
          linked_person_id?: string | null
          invited_by: string
          joined_at?: string
        }
        Update: {
          id?: string
          tree_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'editor' | 'viewer'
          linked_person_id?: string | null
          invited_by?: string
          joined_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
