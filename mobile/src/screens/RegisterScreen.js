import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import BrandHeader from '../components/BrandHeader';
import TextField from '../components/TextField';
import Button from '../components/Button';
import Banner from '../components/Banner';
import useForm from '../hooks/useForm';
import { api } from '../api/client';
import { colors } from '../theme';
import { validateConfirm, validateEmail, validatePassword } from '../utils/validation';

const validators = {
  email: validateEmail,
  password: validatePassword,
  confirm: validateConfirm,
};

export default function RegisterScreen({ navigation }) {
  const form = useForm({ email: '', password: '', confirm: '' }, validators);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  const submit = async () => {
    setFormError(null);
    if (!form.validateAll()) return;
    setLoading(true);
    try {
      const email = form.values.email.trim().toLowerCase();
      const res = await api.register({
        email,
        password: form.values.password,
        confirmPassword: form.values.confirm,
      });
      navigation.navigate('VerifyEmail', { email, resendAvailableInSeconds: res.resendAvailableInSeconds });
    } catch (err) {
      const shown = err.code === 'VALIDATION_ERROR' && form.applyServerErrors(err.details, { confirmPassword: 'confirm' });
      if (!shown) setFormError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <BrandHeader title="Create your account" subtitle="Sign up to tell us what your household needs. We'll take it from there." />
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
        hint="At least 8 characters, with a letter and a number"
        placeholder="Create a password"
        secureToggle
        autoCapitalize="none"
        returnKeyType="next"
      />
      <TextField
        label="Confirm password"
        value={form.values.confirm}
        onChangeText={form.setValue('confirm')}
        onBlur={form.touch('confirm')}
        error={form.errorFor('confirm')}
        placeholder="Re-enter your password"
        secureToggle
        autoCapitalize="none"
        returnKeyType="done"
        onSubmitEditing={submit}
      />

      <Button title="Create account" onPress={submit} loading={loading} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account?</Text>
        <Button title="Log in" variant="link" onPress={() => navigation.navigate('Login')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { alignItems: 'center', marginTop: 20 },
  footerText: { color: colors.muted, fontSize: 15 },
});
