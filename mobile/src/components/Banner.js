import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';

const VARIANTS = {
  error: { bg: colors.dangerBg, fg: colors.danger },
  success: { bg: colors.successBg, fg: colors.success },
  info: { bg: colors.infoBg, fg: colors.primaryDark },
};

export default function Banner({ message, type = 'error' }) {
  if (!message) return null;
  const v = VARIANTS[type];
  return (
    <View style={[styles.box, { backgroundColor: v.bg }]} accessibilityLiveRegion="polite">
      <Text style={[styles.text, { color: v.fg }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.md, padding: 12, marginBottom: 16 },
  text: { fontSize: 14, lineHeight: 20 },
});
