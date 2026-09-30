import React, { useEffect, useId, useState } from 'react';
import {
  TextInput, StyleProp, TextStyle, Alert, InputAccessoryView,
  View, Text, TouchableOpacity, Keyboard, Platform, StyleSheet,
} from 'react-native';
import { Colors } from '@/constants/theme';

interface QtyInputProps {
  value: number;
  onCommit: (qty: number) => void;
  min?: number;
  max?: number;
  editable?: boolean;
  /** Also report each valid typed value immediately (clamping still happens on blur). */
  live?: boolean;
  /** Text shown next to the "Done" button above the iOS number pad, e.g. the line total. */
  keypadLabel?: string;
  style?: StyleProp<TextStyle>;
}

/**
 * Numeric quantity field that sits between − / + buttons.
 * The typed value is applied on "Done" or when the field loses focus,
 * clamped to [min, max]; an empty or invalid entry reverts to the current value.
 * With `live`, valid values are also reported while typing, so a button tapped
 * before the field blurs still sees the typed number.
 * iOS number pads have no return key, so a "Done" bar is attached above the keypad.
 */
export default function QtyInput({
  value, onCommit, min = 1, max, editable = true, live = false, keypadLabel, style,
}: QtyInputProps) {
  const [text, setText] = useState(String(value));
  const accessoryId = `qty-input-${useId()}`;

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = () => {
    const parsed = parseInt(text, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setText(String(value));
      return;
    }

    let qty = parsed;
    if (qty < min) {
      qty = min;
      Alert.alert('Minimum quantity', `Minimum order quantity is ${min}.`);
    } else if (max && qty > max) {
      qty = max;
      Alert.alert('Maximum quantity', `Maximum order quantity is ${max}.`);
    }

    setText(String(qty));
    if (qty !== value) onCommit(qty);
  };

  return (
    <>
      <TextInput
        value={text}
        onChangeText={(t) => {
          const digits = t.replace(/[^0-9]/g, '');
          setText(digits);
          const parsed = parseInt(digits, 10);
          if (live && parsed > 0) onCommit(parsed);
        }}
        onBlur={commit}
        onSubmitEditing={commit}
        keyboardType="number-pad"
        returnKeyType="done"
        selectTextOnFocus
        maxLength={6}
        editable={editable}
        inputAccessoryViewID={Platform.OS === 'ios' ? accessoryId : undefined}
        style={[styles.input, style]}
      />

      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={accessoryId}>
          <View style={styles.accessoryBar}>
            <Text style={styles.accessoryLabel} numberOfLines={1}>
              {keypadLabel ?? 'Enter quantity'}
            </Text>
            <TouchableOpacity onPress={Keyboard.dismiss} style={styles.doneBtn} activeOpacity={0.8}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    minWidth: 44, textAlign: 'center', fontSize: 16, fontWeight: '700',
    color: Colors.text, paddingVertical: 4,
  },
  accessoryBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 8, gap: 12,
  },
  accessoryLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.text },
  doneBtn: {
    backgroundColor: Colors.primary, borderRadius: 8,
    paddingHorizontal: 18, paddingVertical: 8,
  },
  doneText: { color: Colors.textWhite, fontSize: 14, fontWeight: '700' },
});
