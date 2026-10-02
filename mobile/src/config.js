import Constants from 'expo-constants';

// While developing with Expo Go, Expo knows your laptop's IP (the same laptop that runs the backend),
// so we read it automatically. In a built APK there is no dev host, so we fall back to 10.0.2.2
// (how the Android emulator reaches the laptop). On a real phone, set the address under
// "Server settings" on the login screen.
function detectDevHost() {
  const hostUri =
    (Constants.expoConfig && Constants.expoConfig.hostUri) ||
    (Constants.expoGoConfig && Constants.expoGoConfig.debuggerHost);
  return hostUri ? hostUri.split(':')[0] : null;
}

const explicitUrl = process.env.EXPO_PUBLIC_API_URL; // optional override (needed for `expo start --tunnel`)
const devHost = detectDevHost();

export const API_URL = (explicitUrl || (devHost ? `http://${devHost}:3000` : 'http://10.0.2.2:3000')).replace(/\/+$/, '');
