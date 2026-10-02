import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import Screen from './Screen';
import TextField from './TextField';
import Button from './Button';
import Banner from './Banner';
import { DEFAULT_BASE_URL, getBaseUrl, setBaseUrl } from '../api/client';
import * as storage from '../storage';
import { colors } from '../theme';

const isValidUrl = (url) => /^https?:\/\/[^\s/:]+(:\d{1,5})?$/i.test(url);

// Lets the person (or a reviewer) point the app at the machine running the backend.
export default function ServerSettingsModal({ visible, onClose }) {
  const [value, setValue] = useState(getBaseUrl());
  const [status, setStatus] = useState(null); // { type, message }
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (visible) {
      setValue(getBaseUrl());
      setStatus(null);
    }
  }, [visible]);

  const cleaned = () => value.trim().replace(/\/+$/, '');

  const checkFormat = () => {
    if (isValidUrl(cleaned())) return true;
    setStatus({ type: 'error', message: 'Enter an address like http://192.168.1.4:3000' });
    return false;
  };

  const test = async () => {
    if (!checkFormat()) return;
    setTesting(true);
    setStatus(null);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(`${cleaned()}/health`, { signal: controller.signal });
      const data = await res.json();
      if (res.ok && data.status === 'ok') {
        setStatus({ type: 'success', message: 'Connected. The server is reachable.' });
      } else {
        setStatus({ type: 'error', message: 'Something answered, but it does not look like the backend.' });
      }
    } catch (err) {
      setStatus({
        type: 'error',
        message: 'Cannot reach that address. Check the IP, that the backend is running, and that both devices are on the same Wi-Fi.',
      });
    } finally {
      clearTimeout(timer);
      setTesting(false);
    }
  };

  const save = async () => {
    if (!checkFormat()) return;
    setBaseUrl(cleaned());
    await storage.setServerUrl(cleaned());
    onClose();
  };

  const reset = async () => {
    setBaseUrl(DEFAULT_BASE_URL);
    await storage.clearServerUrl();
    setValue(DEFAULT_BASE_URL);
    setStatus({ type: 'info', message: 'Reset to the default address.' });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <Screen>
        <Text style={styles.title}>Server address</Text>
        <Text style={styles.subtitle}>
          Enter the address of the computer running the backend, for example http://192.168.1.4:3000. On an Android emulator
          use http://10.0.2.2:3000.
        </Text>
        <Banner message={status && status.message} type={status ? status.type : 'info'} />
        <TextField
          label="Server address"
          value={value}
          onChangeText={setValue}
          placeholder="http://192.168.1.4:3000"
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Button title="Test connection" variant="secondary" onPress={test} loading={testing} />
        <View style={styles.gap} />
        <Button title="Save" onPress={save} disabled={testing} />
        <Button title="Reset to default" variant="link" onPress={reset} />
        <Button title="Close" variant="link" onPress={onClose} />
      </Screen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '800', color: colors.primaryDark, marginTop: 8 },
  subtitle: { fontSize: 15, color: colors.muted, lineHeight: 22, marginTop: 8, marginBottom: 20 },
  gap: { height: 12 },
});
