import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  KeyboardTypeOptions,
} from 'react-native';
import { Store, User as UserIcon, Mail, FileText } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/theme';
import OnboardingScaffold from '@/components/OnboardingScaffold';

// Step 2 of the post-OTP registration wizard: the customer's name, store name, email and GST
// number (GST always optional, regardless of whether document verification is required).
export default function DetailsScreen() {
  const { user, submitOnboardingStep } = useAuth();
  // The backend defaults a brand-new customer's name to "Customer 1234" — don't prefill that.
  const prefillName = user?.name && !/^Customer \d{4}$/.test(user.name) ? user.name : '';

  const [storeName, setStoreName] = useState(user?.store_name || '');
  const [name, setName] = useState(prefillName);
  const [email, setEmail] = useState(user?.email || '');
  const [gstNumber, setGstNumber] = useState(user?.gst_number || '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await submitOnboardingStep({
        step: 'details',
        name: name.trim(),
        storeName: storeName.trim() || undefined,
        email: email.trim() || undefined,
        gstNumber: gstNumber.trim() || undefined,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to save your details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingScaffold
      step={2}
      totalSteps={3}
      title="Tell Us About Your Store"
      subtitle="This helps us personalize pricing and delivery for your business."
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <Field
            icon={<UserIcon size={18} color={Colors.textMuted} />}
            label="Your Name *"
            value={name}
            onChangeText={(t: string) => {
              setName(t);
              if (error) setError(null);
            }}
            placeholder="e.g. Ramesh Kumar"
          />
          <Field
            icon={<Store size={18} color={Colors.textMuted} />}
            label="Store / Business Name"
            value={storeName}
            onChangeText={setStoreName}
            placeholder="e.g. Sri Lakshmi Provision Store"
          />
          <Field
            icon={<Mail size={18} color={Colors.textMuted} />}
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
          />
          <Field
            icon={<FileText size={18} color={Colors.textMuted} />}
            label="GST Number (Optional)"
            value={gstNumber}
            onChangeText={(t: string) => setGstNumber(t.toUpperCase())}
            placeholder="29AAAAA0000A1Z5"
            autoCapitalize="characters"
          />

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity onPress={handleSubmit} disabled={saving} activeOpacity={0.9} style={styles.submitButton}>
            {saving ? <ActivityIndicator color={Colors.textWhite} /> : <Text style={styles.submitText}>Continue</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </OnboardingScaffold>
  );
}

interface FieldProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

function Field({ icon, label, value, onChangeText, placeholder, keyboardType, autoCapitalize }: FieldProps) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldInputRow}>
        {icon}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          style={styles.fieldInput}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingBottom: 40, gap: 16 },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: Colors.text },
  fieldInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    gap: 10,
  },
  fieldInput: { flex: 1, fontSize: 15, color: Colors.text },
  errorText: { fontSize: 13, color: Colors.danger },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  submitText: { color: Colors.textWhite, fontSize: 16, fontWeight: '700' },
});
