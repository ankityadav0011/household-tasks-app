import React, { useState } from 'react';
import { View } from 'react-native';
import Screen from '../components/Screen';
import BrandHeader from '../components/BrandHeader';
import TextField from '../components/TextField';
import Button from '../components/Button';
import Banner from '../components/Banner';
import useForm from '../hooks/useForm';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  normalizeMobile,
  validateAddress,
  validateBusinessName,
  validateMobile,
  validateName,
} from '../utils/validation';

const validators = {
  name: validateName,
  mobile: validateMobile,
  address: validateAddress,
  businessName: validateBusinessName,
};

// Shown once, right after the first successful login (the server tracks whether a profile exists).
export default function ProfileScreen() {
  const { updateOnboarding, logout } = useAuth();
  const form = useForm({ name: '', mobile: '', address: '', businessName: '' }, validators);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  const submit = async () => {
    setFormError(null);
    if (!form.validateAll()) return;
    setLoading(true);
    try {
      await api.saveProfile({
        name: form.values.name.trim(),
        mobile: normalizeMobile(form.values.mobile),
        address: form.values.address.trim(),
        businessName: form.values.businessName.trim(),
      });
      updateOnboarding({ profileCompleted: true }); // navigator moves to task selection
    } catch (err) {
      const shown = err.code === 'VALIDATION_ERROR' && form.applyServerErrors(err.details);
      if (!shown) setFormError(err.message);
      setLoading(false);
    }
  };

  return (
    <Screen>
      <BrandHeader title="Tell us about you" subtitle="This helps your Lifestyle Manager get things done for you." />
      <Banner message={formError} />

      <TextField
        label="Name"
        value={form.values.name}
        onChangeText={form.setValue('name')}
        onBlur={form.touch('name')}
        error={form.errorFor('name')}
        placeholder="Your full name"
        autoCapitalize="words"
        autoComplete="name"
        returnKeyType="next"
      />
      <TextField
        label="Mobile number"
        prefix="+91"
        value={form.values.mobile}
        onChangeText={form.setValue('mobile')}
        onBlur={form.touch('mobile')}
        error={form.errorFor('mobile')}
        placeholder="10-digit mobile number"
        keyboardType="phone-pad"
        maxLength={16}
        autoComplete="tel"
        returnKeyType="next"
      />
      <TextField
        label="Address"
        value={form.values.address}
        onChangeText={form.setValue('address')}
        onBlur={form.touch('address')}
        error={form.errorFor('address')}
        placeholder="House / flat, street, area, city, PIN"
        multiline
        autoComplete="street-address"
      />
      <TextField
        label="Business name (optional)"
        value={form.values.businessName}
        onChangeText={form.setValue('businessName')}
        onBlur={form.touch('businessName')}
        error={form.errorFor('businessName')}
        hint="Leave blank if this is for your household"
        placeholder="Your business, if any"
        autoCapitalize="words"
        returnKeyType="done"
      />

      <Button title="Save and continue" onPress={submit} loading={loading} />
      <View style={{ marginTop: 12 }}>
        <Button title="Log out" variant="link" onPress={logout} />
      </View>
    </Screen>
  );
}
