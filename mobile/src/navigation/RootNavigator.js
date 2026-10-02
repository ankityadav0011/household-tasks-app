import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import { ErrorView, LoadingView } from '../components/StateViews';
import Button from '../components/Button';
import ServerSettingsModal from '../components/ServerSettingsModal';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import VerifyEmailScreen from '../screens/VerifyEmailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import TaskSelectionScreen from '../screens/TaskSelectionScreen';
import HomeScreen from '../screens/HomeScreen';

const Stack = createNativeStackNavigator();
const screenOptions = { headerShown: false };

export default function RootNavigator() {
  const { status, error, retry, logout, onboarding } = useAuth();
  const [settingsVisible, setSettingsVisible] = useState(false);

  if (status === 'loading') {
    return (
      <SafeAreaView style={styles.safe}>
        <LoadingView message="Starting PadosiPro..." />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView style={styles.safe}>
        <ErrorView message={error} onRetry={retry} />
        <Button title="Change server address" variant="link" onPress={() => setSettingsVisible(true)} />
        <Button title="Log out" variant="link" onPress={logout} />
        <ServerSettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
      </SafeAreaView>
    );
  }

  // Signed out: auth screens.
  if (status === 'signedOut') {
    return (
      <Stack.Navigator key="auth" screenOptions={screenOptions}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
      </Stack.Navigator>
    );
  }

  // Signed in. Which screen we show depends on how far the person got (the server remembers this),
  // so the profile screen appears once, right after the first login, and never again.
  if (!onboarding.profileCompleted) {
    return (
      <Stack.Navigator key="profile" screenOptions={screenOptions}>
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    );
  }

  if (!onboarding.tasksSelected) {
    return (
      <Stack.Navigator key="onboarding-tasks" screenOptions={screenOptions}>
        <Stack.Screen name="OnboardingTasks" component={TaskSelectionScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator key="main" screenOptions={screenOptions}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="EditTasks" component={TaskSelectionScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
});
