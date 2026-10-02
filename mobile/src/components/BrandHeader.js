import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export default function BrandHeader({ title, subtitle }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>P</Text>
      </View>
      <Text style={styles.brand}>PadosiPro</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 24, marginTop: 8 },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  badgeText: { color: '#6FCBAA', fontSize: 24, fontWeight: '800' },
  brand: { fontSize: 14, fontWeight: '700', color: colors.primary, marginBottom: 12, letterSpacing: 0.5 },
  title: { fontSize: 26, fontWeight: '800', color: colors.primaryDark },
  subtitle: { fontSize: 15, color: colors.muted, marginTop: 6, lineHeight: 22 },
});
