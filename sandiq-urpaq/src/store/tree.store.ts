import { create } from 'zustand'
import { FamilyTree, Person, Relationship } from '@/types'

interface TreeState {
  currentTree: FamilyTree | null
  persons: Person[]
  relationships: Relationship[]
  selectedPersonId: string | null
  setTree: (tree: FamilyTree | null) => void
  setPersons: (persons: Person[]) => void
  setRelationships: (rels: Relationship[]) => void
  addPerson: (person: Person) => void
  updatePerson: (id: string, data: Partial<Person>) => void
  setSelectedPerson: (id: string | null) => void
}

export const useTreeStore = create<TreeState>((set) => ({
  currentTree: null,
  persons: [],
  relationships: [],
  selectedPersonId: null,
  setTree: (currentTree) => set({ currentTree }),
  setPersons: (persons) => set({ persons }),
  setRelationships: (relationships) => set({ relationships }),
  addPerson: (person) => set((s) => ({ persons: [...s.persons, person] })),
  updatePerson: (id, data) =>
    set((s) => ({
      persons: s.persons.map((p) => (p.id === id ? { ...p, ...data } : p)),
    })),
  setSelectedPerson: (selectedPersonId) => set({ selectedPersonId }),
}))
