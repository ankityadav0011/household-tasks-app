import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius } from '../theme';

export default function TextField({ label, error, hint, prefix, secureToggle = false, style, ...inputProps }) {
  const [hidden, setHidden] = useState(secureToggle);
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrap, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.row, focused && styles.focused, !!error && styles.errorBorder]}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          {...inputProps}
          accessibilityLabel={label}
          secureTextEntry={secureToggle ? hidden : inputProps.secureTextEntry}
          placeholderTextColor={colors.muted}
          style={[styles.input, inputProps.multiline && styles.multiline]}
          onFocus={(e) => {
            setFocused(true);
            if (inputProps.onFocus) inputProps.onFocus(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            if (inputProps.onBlur) inputProps.onBlur(e);
          }}
        />
        {secureToggle ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10}>
            <Text style={styles.toggle}>{hidden ? 'Show' : 'Hide'}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
  },
  focused: { borderColor: colors.primary },
  errorBorder: { borderColor: colors.danger },
  prefix: { fontSize: 16, color: colors.muted, marginRight: 8, fontWeight: '600' },
  input: { flex: 1, minHeight: 48, fontSize: 16, color: colors.text },
  multiline: { minHeight: 90, textAlignVertical: 'top', paddingTop: 12 },
  toggle: { color: colors.primary, fontWeight: '600', marginLeft: 8 },
  error: { color: colors.danger, fontSize: 13, marginTop: 6 },
  hint: { color: colors.muted, fontSize: 13, marginTop: 6 },
});
