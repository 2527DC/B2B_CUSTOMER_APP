import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  StyleProp,
  TextStyle,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Minus, Plus, X, Check, AlertCircle } from 'lucide-react-native';
import { Colors } from '@/constants/theme';

export interface QtyInputProps {
  value: number;
  onCommit: (qty: number) => void;
  min?: number;
  max?: number;
  editable?: boolean;
  /** Also report each valid typed value immediately. */
  live?: boolean;
  /** Text shown e.g. line total / calculation. */
  keypadLabel?: string;
  style?: StyleProp<TextStyle>;
  unitName?: string;
  unitPrice?: number;
  productName?: string;
}

/**
 * Modern, touch-friendly Quantity Input component designed for B2B Wholesale.
 * Displays an inline stepper value that, when tapped, presents a dedicated,
 * elegant Quantity Selector Bottom Sheet Modal with quick bulk increments (+5, +10, +25, etc.),
 * live price calculations, and MOQ boundary enforcement without glitchy InputAccessoryViews.
 */
export default function QtyInput({
  value,
  onCommit,
  min = 1,
  max,
  editable = true,
  live = false,
  keypadLabel,
  style,
  unitName = 'units',
  unitPrice,
  productName,
}: QtyInputProps) {
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const parsedDraft = parseInt(draft, 10);
  const validDraftNum = Number.isFinite(parsedDraft) && parsedDraft > 0 ? parsedDraft : 0;
  const isBelowMin = validDraftNum > 0 && validDraftNum < min;
  const isAboveMax = max !== undefined && max > 0 && validDraftNum > max;

  // Format INR currency
  const formatINR = (amt: number) =>
    `₹${amt.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  // Quick addition chips based on min quantity
  const getQuickChips = () => {
    if (min >= 50) return [min, min * 2, min * 5, min * 10];
    if (min >= 20) return [10, 20, 50, 100];
    if (min >= 5) return [5, 10, 25, 50];
    return [5, 10, 25, 50, 100];
  };

  const handleOpenModal = () => {
    if (!editable) return;
    setDraft(String(value));
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setDraft(String(value));
    setModalVisible(false);
  };

  const handleStep = (delta: number) => {
    const current = validDraftNum || min;
    let next = current + delta;
    if (next < min) next = min;
    if (max !== undefined && max > 0 && next > max) next = max;
    setDraft(String(next));
  };

  const handleAddPreset = (addVal: number) => {
    const current = validDraftNum || min;
    let next = current + addVal;
    if (max !== undefined && max > 0 && next > max) next = max;
    setDraft(String(next));
  };

  const handleCommit = () => {
    let finalQty = validDraftNum;
    if (!finalQty || finalQty < min) {
      finalQty = min;
    } else if (max !== undefined && max > 0 && finalQty > max) {
      finalQty = max;
    }

    setDraft(String(finalQty));
    onCommit(finalQty);
    setModalVisible(false);
  };

  // Live calculation for modal preview
  const previewQty = validDraftNum > 0 ? validDraftNum : min;
  const calculatedTotal = unitPrice !== undefined ? previewQty * unitPrice : undefined;

  return (
    <>
      <TouchableOpacity
        onPress={handleOpenModal}
        disabled={!editable}
        activeOpacity={0.7}
        style={styles.triggerContainer}
        accessibilityLabel={`Quantity ${value}, tap to change`}
        accessibilityRole="button"
      >
        <Text style={[styles.input, style]} numberOfLines={1}>
          {value}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseModal}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.backdrop} onPress={handleCloseModal} />

          <View
            style={[
              styles.sheetContainer,
              { paddingBottom: Math.max(insets.bottom, 20) },
            ]}
          >
            {/* Top Handle Pill */}
            <View style={styles.dragPill} />

            {/* Header */}
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderLeft}>
                <Text style={styles.sheetTitle}>Enter Quantity</Text>
                {productName ? (
                  <Text style={styles.sheetSubtitle} numberOfLines={1}>
                    {productName}
                  </Text>
                ) : (
                  <Text style={styles.sheetSubtitle}>
                    Select how many {unitName} you need
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={handleCloseModal}
                style={styles.closeBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetScroll}
              keyboardShouldPersistTaps="handled"
            >
              {/* Unit Price & Total Preview Box */}
              {(calculatedTotal !== undefined || keypadLabel) && (
                <View style={styles.calcCard}>
                  <View style={styles.calcRow}>
                    <Text style={styles.calcLabel}>Estimated Total</Text>
                    {unitPrice !== undefined && (
                      <Text style={styles.calcUnitPrice}>
                        {formatINR(unitPrice)} / {unitName}
                      </Text>
                    )}
                  </View>
                  <View style={styles.calcAmountRow}>
                    <Text style={styles.calcTotalText}>
                      {calculatedTotal !== undefined ? formatINR(calculatedTotal) : keypadLabel}
                    </Text>
                    {unitPrice !== undefined && (
                      <Text style={styles.calcBreakdown}>
                        {previewQty} × {formatINR(unitPrice)}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {/* Central Stepper & Input */}
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={[
                    styles.stepBtn,
                    (validDraftNum <= min || !validDraftNum) && styles.stepBtnDisabled,
                  ]}
                  onPress={() => handleStep(-1)}
                  disabled={validDraftNum <= min}
                  activeOpacity={0.7}
                >
                  <Minus
                    size={22}
                    color={validDraftNum <= min ? '#94a3b8' : Colors.text}
                    strokeWidth={2.5}
                  />
                </TouchableOpacity>

                <View style={[styles.inputBox, (isBelowMin || isAboveMax) && styles.inputBoxError]}>
                  <TextInput
                    value={draft}
                    onChangeText={(t) => {
                      const digits = t.replace(/[^0-9]/g, '');
                      setDraft(digits);
                      const parsed = parseInt(digits, 10);
                      if (live && parsed > 0 && (!max || parsed <= max)) {
                        onCommit(parsed);
                      }
                    }}
                    onSubmitEditing={handleCommit}
                    keyboardType="number-pad"
                    returnKeyType="done"
                    selectTextOnFocus
                    maxLength={6}
                    autoFocus
                    textAlign="center"
                    style={styles.modalTextInput}
                    placeholder={String(min)}
                    placeholderTextColor="#94a3b8"
                  />
                  <Text style={styles.unitSuffix}>{unitName}</Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.stepBtn,
                    max !== undefined && max > 0 && validDraftNum >= max && styles.stepBtnDisabled,
                  ]}
                  onPress={() => handleStep(1)}
                  disabled={max !== undefined && max > 0 && validDraftNum >= max}
                  activeOpacity={0.7}
                >
                  <Plus
                    size={22}
                    color={max !== undefined && max > 0 && validDraftNum >= max ? '#94a3b8' : Colors.text}
                    strokeWidth={2.5}
                  />
                </TouchableOpacity>
              </View>

              {/* Validation / Guidance Text */}
              <View style={styles.feedbackRow}>
                {isBelowMin ? (
                  <View style={styles.errorNotice}>
                    <AlertCircle size={15} color={Colors.danger} />
                    <Text style={styles.errorText}>
                      Minimum order quantity is {min} {unitName}
                    </Text>
                  </View>
                ) : isAboveMax ? (
                  <View style={styles.errorNotice}>
                    <AlertCircle size={15} color={Colors.danger} />
                    <Text style={styles.errorText}>
                      Maximum order limit is {max} {unitName}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.helperText}>
                    MOQ: {min} {unitName}
                    {max ? ` • Max limit: ${max} ${unitName}` : ''}
                  </Text>
                )}
              </View>

              {/* Quick Bulk Presets */}
              <View style={styles.presetsSection}>
                <Text style={styles.presetsTitle}>Quick Add</Text>
                <View style={styles.chipsRow}>
                  {validDraftNum !== min && (
                    <TouchableOpacity
                      style={styles.chipReset}
                      onPress={() => setDraft(String(min))}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.chipResetText}>MOQ ({min})</Text>
                    </TouchableOpacity>
                  )}
                  {getQuickChips().map((chipVal) => (
                    <TouchableOpacity
                      key={chipVal}
                      style={styles.chip}
                      onPress={() => handleAddPreset(chipVal)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.chipText}>+{chipVal}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={handleCloseModal}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={handleCommit}
                  activeOpacity={0.85}
                >
                  <Check size={18} color={Colors.textWhite} strokeWidth={2.5} />
                  <Text style={styles.confirmBtnText}>
                    Confirm {previewQty} {unitName}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  triggerContainer: {
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  input: {
    minWidth: 40,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    paddingVertical: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  sheetContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  dragPill: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.2,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: {
    paddingBottom: 8,
  },
  calcCard: {
    backgroundColor: Colors.primary10,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.primary20,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  calcLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  calcUnitPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  calcAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  calcTotalText: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  calcBreakdown: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginVertical: 8,
  },
  stepBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  stepBtnDisabled: {
    opacity: 0.35,
    backgroundColor: '#f8fafc',
  },
  inputBox: {
    minWidth: 130,
    height: 56,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  inputBoxError: {
    borderColor: Colors.danger,
    backgroundColor: '#fff1f2',
  },
  modalTextInput: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    minWidth: 60,
    padding: 0,
  },
  unitSuffix: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
    marginLeft: 4,
  },
  feedbackRow: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 22,
    marginTop: 4,
    marginBottom: 12,
  },
  helperText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  errorNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.danger,
  },
  presetsSection: {
    marginBottom: 18,
  },
  presetsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  chipReset: {
    backgroundColor: Colors.primary10,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.primary20,
  },
  chipResetText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textWhite,
  },
});
