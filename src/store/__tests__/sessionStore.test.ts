jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest').default,
);

import { useSessionStore } from '../sessionStore';

describe('sessionStore', () => {
  beforeEach(() => {
    useSessionStore.getState().resetAllData();
  });

  it('completes onboarding and sets user profile', () => {
    expect(useSessionStore.getState().user).toBeNull();

    useSessionStore.getState().completeOnboarding({
      name: 'Nguyễn Quang Trung',
      gender: 'male',
      birthYear: 1995,
    });

    const user = useSessionStore.getState().user;
    expect(user).not.toBeNull();
    expect(user?.name).toBe('Nguyễn Quang Trung');
    expect(user?.gender).toBe('male');
    expect(user?.birthYear).toBe(1995);
  });

  it('updates profile correctly', () => {
    useSessionStore.getState().completeOnboarding({
      name: 'Trung',
      gender: 'male',
    });

    useSessionStore.getState().updateProfile({
      name: 'Trung Nguyễn',
      birthYear: 1996,
    });

    const user = useSessionStore.getState().user;
    expect(user?.name).toBe('Trung Nguyễn');
    expect(user?.birthYear).toBe(1996);
  });

  it('sets selected branch and search query', () => {
    expect(useSessionStore.getState().selectedBranch).toBe('all');
    useSessionStore.getState().setSelectedBranch('noi');
    expect(useSessionStore.getState().selectedBranch).toBe('noi');

    useSessionStore.getState().setSearchQuery('Bác Cả');
    expect(useSessionStore.getState().searchQuery).toBe('Bác Cả');
  });

  it('sets hasHydrated flag', () => {
    useSessionStore.getState().setHasHydrated(false);
    expect(useSessionStore.getState().hasHydrated).toBe(false);
    useSessionStore.getState().setHasHydrated(true);
    expect(useSessionStore.getState().hasHydrated).toBe(true);
  });
});
