import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  User as UserIcon,
  Mail,
  Phone,
  Store,
  FileText,
  CheckCircle2,
  Camera,
  Eye,
  RefreshCw,
  X,
  FileCheck,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/theme';
import { URLs } from '@/config/urls';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateProfile, uploadDocument } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [storeName, setStoreName] = useState(user?.store_name || '');
  const [gstNumber, setGstNumber] = useState(user?.gst_number || '');

  // Document states
  const [shopImageUrl, setShopImageUrl] = useState(user?.shop_image_url || '');
  const [documentUrl, setDocumentUrl] = useState(user?.document_url || '');
  const [uploadingShopImg, setUploadingShopImg] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Full-screen document preview modal
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  const resolveMediaUrl = (path?: string | null) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${URLs.PUBLIC_URL}${path}`;
  };

  const pickAndUpload = async (type: 'shop' | 'doc') => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow photo library access to upload documents.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });

      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];

      if (type === 'shop') setUploadingShopImg(true);
      else setUploadingDoc(true);

      const fileName = asset.fileName || `${type}-${Date.now()}.jpg`;
      const mimeType = asset.mimeType || 'image/jpeg';
      const uploadedUrl = await uploadDocument(asset.uri, fileName, mimeType);

      if (type === 'shop') {
        setShopImageUrl(uploadedUrl);
      } else {
        setDocumentUrl(uploadedUrl);
      }
      Alert.alert('Uploaded', 'File selected. Tap "Save Changes" below to apply.');
    } catch (err: any) {
      console.error('Pick and upload error:', err);
      Alert.alert('Upload Failed', err?.message || 'Could not upload document.');
    } finally {
      if (type === 'shop') setUploadingShopImg(false);
      else setUploadingDoc(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter your name.');
      return;
    }

    try {
      setSaving(true);
      await updateProfile({
        name: name.trim(),
        email: email.trim() || undefined,
        store_name: storeName.trim() || undefined,
        gst_number: gstNumber.trim() || undefined,
        shop_image_url: shopImageUrl || undefined,
        document_url: documentUrl || undefined,
      });

      Alert.alert('Success', 'Profile and documents updated successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      console.error('Update profile error:', e);
      Alert.alert('Error', e?.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile & Documents</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar Header */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarCircle}>
              <UserIcon size={46} color="#ffffff" strokeWidth={2} />
            </View>
            <Text style={styles.phoneLabel}>Registered Mobile Number</Text>
            <View style={styles.phoneChip}>
              <Phone size={14} color="#64748b" />
              <Text style={styles.phoneText}>+91 {user?.phone || 'XXXXXXXXXX'}</Text>
            </View>
          </View>

          {/* Form Fields */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Personal & Business Details</Text>

            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <View style={styles.inputContainer}>
                <UserIcon size={18} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor="#94a3b8"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputContainer}>
                <Mail size={18} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="name@business.com"
                  placeholderTextColor="#94a3b8"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Store Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Store / Business Name</Text>
              <View style={styles.inputContainer}>
                <Store size={18} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter shop or business name"
                  placeholderTextColor="#94a3b8"
                  value={storeName}
                  onChangeText={setStoreName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* GST Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>GST Number (Optional)</Text>
              <View style={styles.inputContainer}>
                <FileText size={18} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="29AAAAA0000A1Z5"
                  placeholderTextColor="#94a3b8"
                  value={gstNumber}
                  onChangeText={(t) => setGstNumber(t.toUpperCase())}
                  autoCapitalize="characters"
                  maxLength={15}
                />
              </View>
            </View>
          </View>

          {/* Business Documents Section */}
          <View style={styles.card}>
            <View style={styles.docHeaderRow}>
              <FileCheck size={18} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Business & Shop Documents</Text>
            </View>
            <Text style={styles.docSubtitle}>
              View or upload your shop storefront photo and license/GST proof.
            </Text>

            {/* Shop Photo */}
            <View style={styles.docItem}>
              <Text style={styles.docItemLabel}>Shop Front Photo</Text>
              {shopImageUrl ? (
                <View style={styles.docPreviewCard}>
                  <Image
                    source={{ uri: resolveMediaUrl(shopImageUrl) }}
                    style={styles.docThumb}
                    resizeMode="cover"
                  />
                  <View style={styles.docInfo}>
                    <Text style={styles.docStatusText}>✓ Shop Photo Uploaded</Text>
                    <View style={styles.docBtnRow}>
                      <TouchableOpacity
                        style={styles.actionPill}
                        onPress={() => setPreviewUri(resolveMediaUrl(shopImageUrl))}
                        activeOpacity={0.7}
                      >
                        <Eye size={14} color="#0284c7" />
                        <Text style={[styles.actionPillText, { color: '#0284c7' }]}>View</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionPill}
                        onPress={() => pickAndUpload('shop')}
                        disabled={uploadingShopImg}
                        activeOpacity={0.7}
                      >
                        {uploadingShopImg ? (
                          <ActivityIndicator size="small" color={Colors.primary} />
                        ) : (
                          <>
                            <RefreshCw size={14} color={Colors.primary} />
                            <Text style={[styles.actionPillText, { color: Colors.primary }]}>Change</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.uploadBox}
                  onPress={() => pickAndUpload('shop')}
                  disabled={uploadingShopImg}
                  activeOpacity={0.7}
                >
                  {uploadingShopImg ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <>
                      <Camera size={22} color={Colors.primary} />
                      <Text style={styles.uploadBoxText}>Upload Shop Front Photo</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Business Proof / Document */}
            <View style={styles.docItem}>
              <Text style={styles.docItemLabel}>Trade License / Business Proof</Text>
              {documentUrl ? (
                <View style={styles.docPreviewCard}>
                  <Image
                    source={{ uri: resolveMediaUrl(documentUrl) }}
                    style={styles.docThumb}
                    resizeMode="cover"
                  />
                  <View style={styles.docInfo}>
                    <Text style={styles.docStatusText}>✓ Document Uploaded</Text>
                    <View style={styles.docBtnRow}>
                      <TouchableOpacity
                        style={styles.actionPill}
                        onPress={() => setPreviewUri(resolveMediaUrl(documentUrl))}
                        activeOpacity={0.7}
                      >
                        <Eye size={14} color="#0284c7" />
                        <Text style={[styles.actionPillText, { color: '#0284c7' }]}>View</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionPill}
                        onPress={() => pickAndUpload('doc')}
                        disabled={uploadingDoc}
                        activeOpacity={0.7}
                      >
                        {uploadingDoc ? (
                          <ActivityIndicator size="small" color={Colors.primary} />
                        ) : (
                          <>
                            <RefreshCw size={14} color={Colors.primary} />
                            <Text style={[styles.actionPillText, { color: Colors.primary }]}>Change</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.uploadBox}
                  onPress={() => pickAndUpload('doc')}
                  disabled={uploadingDoc}
                  activeOpacity={0.7}
                >
                  {uploadingDoc ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <>
                      <FileText size={22} color={Colors.primary} />
                      <Text style={styles.uploadBoxText}>Upload Business License / Proof</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Floating Save Button */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <View style={styles.saveBtnContent}>
                <CheckCircle2 size={18} color="#ffffff" strokeWidth={2.5} />
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Full-screen Image Preview Modal */}
      <Modal
        visible={!!previewUri}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewUri(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalCloseBtn}
            onPress={() => setPreviewUri(null)}
            activeOpacity={0.7}
          >
            <X size={24} color="#ffffff" />
          </TouchableOpacity>
          {previewUri && (
            <Image
              source={{ uri: previewUri }}
              style={styles.modalFullImg}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: 16,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  phoneLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 12,
  },
  phoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 4,
  },
  phoneText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginTop: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
  },
  docHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  docSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
    lineHeight: 18,
  },
  docItem: {
    marginBottom: 16,
  },
  docItemLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  docPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  docThumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
  },
  docInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  docStatusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 8,
  },
  docBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  uploadBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
  },
  uploadBoxText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },
  bottomBar: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  saveBtn: {
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalFullImg: {
    width: '92%',
    height: '80%',
  },
});
