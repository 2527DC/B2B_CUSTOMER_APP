import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, ScrollView, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, FileImage, AlertTriangle } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/theme';
import OnboardingScaffold from '@/components/OnboardingScaffold';

interface PickedAsset {
  uri: string;
  fileName: string;
  mimeType: string;
}

// Final step of the post-OTP registration wizard. Document upload is mandatory — store
// owners must upload their shop photo and/or business license to complete registration.
export default function DocumentsScreen() {
  const { user, uploadDocument, submitOnboardingStep } = useAuth();
  const [shopImage, setShopImage] = useState<PickedAsset | null>(null);
  const [document, setDocument] = useState<PickedAsset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const pickImage = async (onPicked: (asset: PickedAsset) => void) => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow photo library access to continue.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      onPicked({
        uri: asset.uri,
        fileName: asset.fileName || `photo-${Date.now()}.jpg`,
        mimeType: asset.mimeType || 'image/jpeg',
      });
    } catch (err) {
      Alert.alert('Error', 'Could not open the photo library. Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (!shopImage && !document && !user?.shop_image_url && !user?.document_url) {
      setError('Please upload at least your Shop Photo or Business Proof document to complete registration.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      let shopImageUrl: string | undefined;
      let documentUrl: string | undefined;

      if (shopImage) {
        shopImageUrl = await uploadDocument(shopImage.uri, shopImage.fileName, shopImage.mimeType);
      }
      if (document) {
        documentUrl = await uploadDocument(document.uri, document.fileName, document.mimeType);
      }

      await submitOnboardingStep({
        step: 'documents',
        shopImageUrl,
        documentUrl,
        skip: false,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to submit your documents. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <OnboardingScaffold
      step={3}
      totalSteps={3}
      title="Upload Business Documents *"
      subtitle="Upload your shop photo or business KYC proof (GST, Trade License, FSSAI) to complete registration."
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {user?.rejection_reason && (
          <View style={styles.rejectionBanner}>
            <AlertTriangle size={16} color={Colors.danger} />
            <Text style={styles.rejectionText}>
              Your last submission was rejected: {user.rejection_reason}. Please review and resubmit.
            </Text>
          </View>
        )}

        <UploadTile
          icon={<Camera size={22} color={Colors.primary} />}
          label="Shop Front Photo *"
          hint="Clear photo showing shop signboard or premises"
          asset={shopImage}
          onPress={() => pickImage(setShopImage)}
        />

        <UploadTile
          icon={<FileImage size={22} color={Colors.primary} />}
          label="Business / KYC Document *"
          hint="GST certificate, trade license, or business ID proof"
          asset={document}
          onPress={() => pickImage(setDocument)}
        />

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity onPress={handleSubmit} disabled={submitting} activeOpacity={0.9} style={styles.submitButton}>
          {submitting ? (
            <ActivityIndicator color={Colors.textWhite} />
          ) : (
            <Text style={styles.submitText}>
              Submit Documents &amp; Complete Registration
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </OnboardingScaffold>
  );
}

function UploadTile({
  icon,
  label,
  hint,
  asset,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  asset: PickedAsset | null;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.tile}>
      {asset ? (
        <Image source={{ uri: asset.uri }} style={styles.tileImage} resizeMode="cover" />
      ) : (
        <View style={styles.tilePlaceholder}>{icon}</View>
      )}
      <View style={styles.tileTextWrap}>
        <Text style={styles.tileLabel}>{label}</Text>
        <Text style={styles.tileHint}>{asset ? 'Tap to change' : hint}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40, gap: 14 },
  rejectionBanner: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.danger,
    borderRadius: 12,
    padding: 12,
    alignItems: 'flex-start',
  },
  rejectionText: { flex: 1, fontSize: 13, color: Colors.danger, lineHeight: 18 },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 12,
    gap: 14,
  },
  tileImage: { width: 56, height: 56, borderRadius: 12 },
  tilePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: Colors.primary10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTextWrap: { flex: 1 },
  tileLabel: { fontSize: 15, fontWeight: '700', color: Colors.text },
  tileHint: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
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
  skipButton: {
    backgroundColor: Colors.borderLight,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
