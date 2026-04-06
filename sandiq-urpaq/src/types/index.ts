import { Database } from '@/lib/supabase/database.types'

export type User = Database['public']['Tables']['users']['Row']
export type FamilyTree = Database['public']['Tables']['family_trees']['Row']
export type Person = Database['public']['Tables']['persons']['Row']
export type Relationship = Database['public']['Tables']['relationships']['Row']
export type Memory = Database['public']['Tables']['memories']['Row']
export type TreeMember = Database['public']['Tables']['tree_members']['Row']

export type RelationshipType = Relationship['type']
export type MemoryType = Memory['type']
export type Visibility = 'private' | 'family' | 'public'
export type TreeRole = TreeMember['role']

// Extended types with joins
export type PersonWithRelationships = Person & {
  children?: Person[]
  parents?: Person[]
  spouse?: Person | null
  memories_count?: number
}

export type TreeWithMembers = FamilyTree & {
  members?: (TreeMember & { user: User })[]
  persons?: Person[]
}

export type MemoryWithAuthor = Memory & {
  author: User
}
