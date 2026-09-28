import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { Palette, Check, X, RotateCcw } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

interface ThemeSelectorModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ThemeSelectorModal({ visible, onClose }: ThemeSelectorModalProps) {
  const {
    theme,
    primaryColor,
    activePresetKey,
    availablePresets,
    setThemeColor,
    setThemePreset,
    resetTheme,
  } = useTheme();

  const [customHex, setCustomHex] = useState(primaryColor);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleApplyCustom = async () => {
    const trimmed = customHex.trim();
    const hexPattern = /^#?([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/;
    if (!hexPattern.test(trimmed)) {
      setErrorMsg('Please enter a valid 3 or 6 digit hex color (e.g. #4f7942)');
      return;
    }
    setErrorMsg(null);
    const formatted = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
    await setThemeColor(formatted);
  };

  const handleSelectPreset = async (key: string) => {
    setErrorMsg(null);
    await setThemePreset(key);
    setCustomHex(availablePresets[key].primary);
  };

  const handleReset = async () => {
    setErrorMsg(null);
    await resetTheme();
    setCustomHex(availablePresets.dhatri.primary);
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.headerIcon, { backgroundColor: theme.primary10 }]}>
                <Palette size={20} color={theme.primary} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Theme Color Selection</Text>
                <Text style={styles.headerSubtitle}>Customize the app's visual identity</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            {/* Current Active Preview */}
            <View style={styles.previewBox}>
              <Text style={styles.previewLabel}>Current Brand Primary</Text>
              <View style={styles.previewRow}>
                <View style={[styles.colorSwatch, { backgroundColor: theme.primary }]} />
                <View style={styles.previewDetails}>
                  <Text style={styles.previewHex}>{primaryColor.toUpperCase()}</Text>
                  <Text style={styles.previewName}>
                    {activePresetKey !== 'custom'
                      ? availablePresets[activePresetKey]?.name || 'Preset'
                      : 'Custom Color'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Presets List */}
            <Text style={styles.sectionHeading}>Official Presets</Text>
            <View style={styles.presetGrid}>
              {Object.entries(availablePresets).map(([key, preset]) => {
                const isSelected = activePresetKey === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.presetItem,
                      isSelected && { borderColor: theme.primary, backgroundColor: theme.primary10 },
                    ]}
                    onPress={() => handleSelectPreset(key)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.presetDot, { backgroundColor: preset.primary }]} />
                    <Text
                      style={[
                        styles.presetName,
                        isSelected && { color: theme.primary, fontWeight: '700' },
                      ]}
                    >
                      {preset.name}
                    </Text>
                    {isSelected && <Check size={16} color={theme.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Color Input */}
            <Text style={styles.sectionHeading}>Custom Hex Color</Text>
            <View style={styles.customInputRow}>
              <View style={[styles.colorPreviewDot, { backgroundColor: customHex.startsWith('#') && customHex.length >= 4 ? customHex : theme.primary }]} />
              <TextInput
                style={styles.customInput}
                value={customHex}
                onChangeText={(val) => {
                  setCustomHex(val);
                  setErrorMsg(null);
                }}
                placeholder="#4f7942"
                placeholderTextColor="#94a3b8"
                autoCapitalize="characters"
                maxLength={7}
              />
              <TouchableOpacity
                style={[styles.applyBtn, { backgroundColor: theme.primary }]}
                onPress={handleApplyCustom}
                activeOpacity={0.8}
              >
                <Text style={styles.applyBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>
            {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

            {/* Reset Button */}
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.7}>
              <RotateCcw size={16} color="#64748b" style={{ marginRight: 6 }} />
              <Text style={styles.resetBtnText}>Reset to Official Dhatri Mart (#4f7942)</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Footer Done */}
          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: theme.primary }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    paddingBottom: 12,
  },
  previewBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  previewDetails: {
    flex: 1,
  },
  previewHex: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  previewName: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10,
    marginTop: 4,
  },
  presetGrid: {
    gap: 8,
    marginBottom: 16,
  },
  presetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  presetDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 12,
  },
  presetName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#1e293b',
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  colorPreviewDot: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  customInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  applyBtn: {
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 11,
    marginBottom: 8,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  resetBtnText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  doneBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  doneBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
