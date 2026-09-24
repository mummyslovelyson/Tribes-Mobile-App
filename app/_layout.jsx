import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { COLORS } from '../src/constants/theme';
import Logo from '../src/components/Logo';
import { getMobileConfig } from '../src/api/mobile';
import MaintenanceScreen from '../src/components/MaintenanceScreen';

// Prevent native splash screen from hiding prematurely while bundling
SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutNav() {
  const { loading } = useAuth();
  const [mobileConfig, setMobileConfig] = useState(null);

  const checkRemoteConfig = useCallback(async () => {
    try {
      const cfg = await getMobileConfig();
      setMobileConfig(cfg);
    } catch {
      // Continue normally on network fail
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchRemote = async () => {
      if (isMounted) {
        await checkRemoteConfig();
      }
    };
    fetchRemote();
    return () => {
      isMounted = false;
    };
  }, [checkRemoteConfig]);

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loading]);

  if (loading) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar style="light" backgroundColor={COLORS.background} />
        <Logo size="xl" showText={true} subtitle="LIVING THE MOMENT" />
        <ActivityIndicator
          size="small"
          color={COLORS.primary}
          style={styles.spinner}
        />
      </View>
    );
  }

  // If Admin has enabled remote maintenance mode for the mobile app
  if (mobileConfig?.maintenance?.enabled) {
    return (
      <>
        <StatusBar style="light" backgroundColor={COLORS.background} />
        <MaintenanceScreen
          maintenance={mobileConfig.maintenance}
          onRetry={checkRemoteConfig}
        />
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" backgroundColor={COLORS.background} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="event/[id]"
            options={{
              title: 'Event Details',
              headerBackTitle: 'Back',
              headerStyle: { backgroundColor: COLORS.background },
              headerTintColor: COLORS.text,
            }}
          />
          <Stack.Screen
            name="saved"
            options={{
              title: 'Saved Events',
              headerBackTitle: 'Back',
              headerStyle: { backgroundColor: COLORS.background },
              headerTintColor: COLORS.text,
            }}
          />
          <Stack.Screen
            name="orders"
            options={{
              title: 'Order History',
              headerBackTitle: 'Back',
              headerStyle: { backgroundColor: COLORS.background },
              headerTintColor: COLORS.text,
            }}
          />
          <Stack.Screen
            name="admin/index"
            options={{
              title: 'Admin Control Center',
              headerBackTitle: 'Back',
              headerStyle: { backgroundColor: COLORS.background },
              headerTintColor: COLORS.text,
            }}
          />
          <Stack.Screen
            name="check-in"
            options={{
              title: 'Gate Check-In',
              headerBackTitle: 'Back',
              headerStyle: { backgroundColor: COLORS.background },
              headerTintColor: COLORS.text,
            }}
          />
          <Stack.Screen
            name="organizer/index"
            options={{
              title: 'Organizer Hub',
              headerBackTitle: 'Back',
              headerStyle: { backgroundColor: COLORS.background },
              headerTintColor: COLORS.text,
            }}
          />
          <Stack.Screen
            name="organizer/create-event"
            options={{
              title: 'Create Event',
              headerBackTitle: 'Back',
              headerStyle: { backgroundColor: COLORS.background },
              headerTintColor: COLORS.text,
            }}
          />
          <Stack.Screen
            name="organizer/wallet"
            options={{
              title: 'Organizer Wallet',
              headerBackTitle: 'Back',
              headerStyle: { backgroundColor: COLORS.background },
              headerTintColor: COLORS.text,
            }}
          />
          <Stack.Screen
            name="meetups/[eventId]"
            options={{
              title: 'Meetups & Cliqs',
              headerBackTitle: 'Back',
              headerStyle: { backgroundColor: COLORS.background },
              headerTintColor: COLORS.text,
            }}
          />
          <Stack.Screen
            name="notifications"
            options={{
              title: 'Notifications',
              headerBackTitle: 'Back',
              headerStyle: { backgroundColor: COLORS.background },
              headerTintColor: COLORS.text,
            }}
          />
          <Stack.Screen
            name="(auth)/login"
            options={{
              title: 'Sign In',
              headerBackTitle: 'Back',
              headerStyle: { backgroundColor: COLORS.background },
              headerTintColor: COLORS.text,
            }}
          />
          <Stack.Screen
            name="(auth)/register"
            options={{
              title: 'Create Account',
              headerBackTitle: 'Back',
              headerStyle: { backgroundColor: COLORS.background },
              headerTintColor: COLORS.text,
            }}
          />
          <Stack.Screen
            name="(auth)/verify-otp"
            options={{
              title: 'Verify Code',
              headerBackTitle: 'Back',
              headerStyle: { backgroundColor: COLORS.background },
              headerTintColor: COLORS.text,
            }}
          />
          <Stack.Screen
            name="(auth)/forgot-password"
            options={{
              title: 'Reset Password',
              headerBackTitle: 'Back',
              headerStyle: { backgroundColor: COLORS.background },
              headerTintColor: COLORS.text,
            }}
          />
        </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  spinner: {
    marginTop: 28,
  },
});
