import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import BrandHeader from '../components/BrandHeader';
import TextField from '../components/TextField';
import Button from '../components/Button';
import Banner from '../components/Banner';
import { api } from '../api/client';
import { colors } from '../theme';

export default function VerifyEmailScreen({ navigation, route }) {
  const { email, resendAvailableInSeconds = 0 } = route.params;
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(resendAvailableInSeconds);

  // Countdown until the "Resend code" button becomes active.
  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const verify = async () => {
    setError(null);
    setInfo(null);
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setVerifying(true);
    try {
      await api.verifyOtp(email, code);
      navigation.navigate('Login', { email, verified: true });
    } catch (err) {
      setError(err.message);
      // Expired, used-up or missing codes cannot be fixed by retyping: point to "Resend".
      if (['OTP_EXPIRED', 'OTP_ATTEMPTS_EXCEEDED', 'OTP_NOT_FOUND'].includes(err.code)) setCode('');
      if (err.code === 'ALREADY_VERIFIED') navigation.navigate('Login', { email });
    } finally {
      setVerifying(false);
    }
  };

  const resend = async () => {
    setError(null);
    setInfo(null);
    setResending(true);
    try {
      const res = await api.resendOtp(email);
      setSecondsLeft(res.resendAvailableInSeconds);
      setCode('');
      setInfo('A new code has been sent to your email.');
    } catch (err) {
      if (err.code === 'OTP_RESEND_COOLDOWN' && err.details) setSecondsLeft(err.details.retryAfterSeconds);
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <Screen>
      <BrandHeader title="Verify your email" subtitle={`We sent a 6-digit code to ${email}. It is valid for 10 minutes.`} />
      <Banner message={error} />
      <Banner message={info} type="success" />

      <TextField
        label="Verification code"
        value={code}
        onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
        placeholder="123456"
        keyboardType="number-pad"
        maxLength={6}
        autoComplete="one-time-code"
        returnKeyType="done"
        onSubmitEditing={verify}
      />

      <Button title="Verify email" onPress={verify} loading={verifying} disabled={code.length !== 6} />

      <View style={styles.resend}>
        {secondsLeft > 0 ? (
          <Text style={styles.muted}>Resend code in {secondsLeft}s</Text>
        ) : (
          <Button title="Resend code" variant="link" onPress={resend} loading={resending} />
        )}
        <Button title="Back to log in" variant="link" onPress={() => navigation.navigate('Login')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  resend: { alignItems: 'center', marginTop: 20 },
  muted: { color: colors.muted, fontSize: 15, marginVertical: 10 },
});
