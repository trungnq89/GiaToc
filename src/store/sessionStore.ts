import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { UserProfile, Gender, FamilyBranch } from '../types';

interface SessionState {
  user: UserProfile | null;
  hasHydrated: boolean;
  selectedBranch: FamilyBranch | 'all';
  searchQuery: string;

  // Actions
  completeOnboarding: (profile: {
    name: string;
    gender: Gender;
    birthYear?: number;
    avatarUri?: string;
  }) => void;
  updateProfile: (patch: Partial<Omit<UserProfile, 'id' | 'createdAt'>>) => void;
  setHasHydrated: (value: boolean) => void;
  setSelectedBranch: (branch: FamilyBranch | 'all') => void;
  setSearchQuery: (query: string) => void;
  resetAllData: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      user: null,
      hasHydrated: false,
      selectedBranch: 'all',
      searchQuery: '',

      completeOnboarding: profile => {
        const now = Date.now();
        const user: UserProfile = {
          id: 'me',
          name: profile.name.trim(),
          gender: profile.gender,
          birthYear: profile.birthYear,
          avatarUri: profile.avatarUri,
          createdAt: now,
          updatedAt: now,
        };
        set({ user });
      },

      updateProfile: patch => {
        const current = get().user;
        if (!current) return;
        set({
          user: {
            ...current,
            ...patch,
            updatedAt: Date.now(),
          },
        });
      },

      setHasHydrated: value => set({ hasHydrated: value }),
      setSelectedBranch: branch => set({ selectedBranch: branch }),
      setSearchQuery: query => set({ searchQuery: query }),
      resetAllData: () => set({ user: null, selectedBranch: 'all', searchQuery: '' }),
    }),
    {
      name: 'giatoc-session',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        user: state.user,
        selectedBranch: state.selectedBranch,
      }),
      onRehydrateStorage: () => state => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
