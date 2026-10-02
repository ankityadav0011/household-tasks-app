import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import BrandHeader from '../components/BrandHeader';
import TextField from '../components/TextField';
import Button from '../components/Button';
import Banner from '../components/Banner';
import ServerSettingsModal from '../components/ServerSettingsModal';
import { getBaseUrl } from '../api/client';
import useForm from '../hooks/useForm';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import { validateEmail, validateRequired } from '../utils/validation';

const validators = {
  email: validateEmail,
  password: validateRequired('Password'),
};

export default function LoginScreen({ navigation, route }) {
  const { login } = useAuth();
  const prefillEmail = (route.params && route.params.email) || '';
  const justVerified = Boolean(route.params && route.params.verified);
  const form = useForm({ email: prefillEmail, password: '' }, validators);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [settingsVisible, setSettingsVisible] = useState(false);

  const submit = async () => {
    setFormError(null);
    if (!form.validateAll()) return;
    setLoading(true);
    try {
      await login(form.values.email.trim().toLowerCase(), form.values.password);
      // On success the navigator switches screens automatically.
    } catch (err) {
      if (err.code === 'EMAIL_NOT_VERIFIED') {
        // Unverified users are sent back to verification.
        navigation.navigate('VerifyEmail', {
          email: form.values.email.trim().toLowerCase(),
          resendAvailableInSeconds: (err.details && err.details.resendAvailableInSeconds) || 0,
        });
      } else {
        setFormError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <BrandHeader title="Welcome back" subtitle="Log in to continue with PadosiPro." />
      {justVerified ? <Banner type="success" message="Email verified. Please log in to continue." /> : null}
      <Banner message={formError} />

      <TextField
        label="Email"
        value={form.values.email}
        onChangeText={form.setValue('email')}
        onBlur={form.touch('email')}
        error={form.errorFor('email')}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        returnKeyType="next"
      />
      <TextField
        label="Password"
        value={form.values.password}
        onChangeText={form.setValue('password')}
        onBlur={form.touch('password')}
        error={form.errorFor('password')}
        placeholder="Your password"
        secureToggle
        autoCapitalize="none"
        returnKeyType="done"
        onSubmitEditing={submit}
      />

      <Button title="Log in" onPress={submit} loading={loading} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>New to PadosiPro?</Text>
        <Button title="Create an account" variant="link" onPress={() => navigation.navigate('Register')} />
      </View>

      <View style={styles.server}>
        <Text style={styles.serverText}>Server: {getBaseUrl()}</Text>
        <Button title="Server settings" variant="link" onPress={() => setSettingsVisible(true)} />
      </View>
      <ServerSettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { alignItems: 'center', marginTop: 20 },
  footerText: { color: colors.muted, fontSize: 15 },
  server: { alignItems: 'center', marginTop: 'auto', paddingTop: 24 },
  serverText: { color: colors.muted, fontSize: 12 },
});
