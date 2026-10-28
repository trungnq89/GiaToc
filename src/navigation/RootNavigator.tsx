import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { MainTabNavigator } from './MainTabNavigator';
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';
import { PersonDetailScreen } from '../screens/relations/PersonDetailScreen';
import { PersonFormScreen } from '../screens/relations/PersonFormScreen';
import { EventFormScreen } from '../screens/events/EventFormScreen';
import { TreeExportScreen } from '../screens/export/TreeExportScreen';
import { useSessionStore } from '../store/sessionStore';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const hasHydrated = useSessionStore(s => s.hasHydrated);
  const user = useSessionStore(s => s.user);

  // Gate render until Zustand storage has hydrated from AsyncStorage
  if (!hasHydrated) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={MainTabNavigator} />
          <Stack.Screen name="PersonDetail" component={PersonDetailScreen} />
          <Stack.Screen
            name="PersonForm"
            component={PersonFormScreen}
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen
            name="EventForm"
            component={EventFormScreen}
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen
            name="TreeExport"
            component={TreeExportScreen}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
