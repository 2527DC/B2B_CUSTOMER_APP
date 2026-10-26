import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { goBack } from '@/lib/navigation';
import {
  ArrowLeft,
  Search,
  MapPin,
  Crosshair,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Store,
  X,
} from 'lucide-react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import apiClient from '@/config/api';
import { URLs } from '@/config/urls';
import { Colors } from '@/constants/theme';

interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  lat?: number;
  lng?: number;
}

interface CurrentDropLocation {
  hasLocation?: boolean;
  activeLocation: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    lat: number;
    lng: number;
    landmark: string | null;
  } | null;
  pendingLocation: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    lat: number | null;
    lng: number | null;
    landmark: string | null;
    requestedAt: string | null;
  } | null;
  status: 'APPROVED' | 'PENDING_APPROVAL' | 'REJECTED' | 'NONE';
  rejectionReason: string | null;
}

const DEFAULT_REGION: Region = {
  latitude: 12.9716,
  longitude: 77.5946,
  latitudeDelta: 0.008,
  longitudeDelta: 0.008,
};

export default function DropLocationPickerScreen() {
  const mapRef = useRef<MapView>(null);

  // Search & Predictions
  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);

  // Map Region & Geo
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [isLocating, setIsLocating] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  // Address Details Form
  const [detectedAddress, setDetectedAddress] = useState('');
  const [detectedCity, setDetectedCity] = useState('Bangalore');
  const [detectedState, setDetectedState] = useState('Karnataka');
  const [detectedPincode, setDetectedPincode] = useState('');
  const [shopNumber, setShopNumber] = useState('');
  const [landmark, setLandmark] = useState('');

  // Status & Existing Location
  const [currentLocationInfo, setCurrentLocationInfo] = useState<CurrentDropLocation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Ref flag to suppress reverse geocode overwrite immediately after selecting a prediction
  const isSelectingPlaceRef = useRef(false);

  // 1. Fetch current customer location on mount
  useEffect(() => {
    const fetchCurrentLocation = async () => {
      try {
        const res = await apiClient.get(URLs.CUSTOMER_DROP_LOCATION_CURRENT);
        if (res.data?.success) {
          const info: CurrentDropLocation = res.data;
          setCurrentLocationInfo(info);

          if (info.activeLocation?.lat && info.activeLocation?.lng) {
            const initialRegion = {
              latitude: info.activeLocation.lat,
              longitude: info.activeLocation.lng,
              latitudeDelta: 0.006,
              longitudeDelta: 0.006,
            };
            setRegion(initialRegion);
            mapRef.current?.animateToRegion(initialRegion, 600);
            setDetectedAddress(info.activeLocation.address);
            setDetectedCity(info.activeLocation.city);
            setDetectedState(info.activeLocation.state);
            setDetectedPincode(info.activeLocation.pincode);
            setLandmark(info.activeLocation.landmark || '');
          }
        }
      } catch (err) {
        console.warn('Could not fetch existing customer drop location:', err);
      }
    };

    fetchCurrentLocation();
  }, []);

  // 2. Debounced Autocomplete Search
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setPredictions([]);
      setShowPredictions(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await apiClient.get(URLs.LOCATION_SEARCH_AUTOCOMPLETE, {
          params: { query: searchQuery.trim() },
        });
        if (res.data?.success) {
          setPredictions(res.data.predictions || []);
          setShowPredictions(true);
        }
      } catch (err) {
        console.error('Location autocomplete search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 3. Reverse Geocode when map region stabilizes
  const reverseGeocodeCoordinates = async (lat: number, lng: number) => {
    setIsReverseGeocoding(true);
    try {
      const res = await apiClient.get(URLs.LOCATION_REVERSE_GEOCODE, {
        params: { lat, lng },
      });
      if (res.data?.success) {
        setDetectedAddress(res.data.address || '');
        setDetectedCity(res.data.city || 'Bangalore');
        setDetectedState(res.data.state || 'Karnataka');
        setDetectedPincode(res.data.pincode || '');
      }
    } catch (err) {
      console.warn('Reverse geocoding error:', err);
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  // 4. Handle prediction selection
  const handleSelectPrediction = async (prediction: PlacePrediction) => {
    Keyboard.dismiss();
    setShowPredictions(false);
    setSearchQuery(prediction.mainText);
    isSelectingPlaceRef.current = true;

    // Set immediate friendly address preview from the chosen prediction
    setDetectedAddress(prediction.description || prediction.mainText);

    if (prediction.lat && prediction.lng) {
      const newRegion: Region = {
        latitude: prediction.lat,
        longitude: prediction.lng,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 800);
      reverseGeocodeCoordinates(prediction.lat, prediction.lng);
    } else {
      // Query search autocomplete or place details
      try {
        const res = await apiClient.get(URLs.LOCATION_SEARCH_AUTOCOMPLETE, {
          params: { query: prediction.description },
        });
        const top = res.data?.predictions?.[0];
        if (top?.lat && top?.lng) {
          const newRegion: Region = {
            latitude: top.lat,
            longitude: top.lng,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          };
          setRegion(newRegion);
          mapRef.current?.animateToRegion(newRegion, 800);
          reverseGeocodeCoordinates(top.lat, top.lng);
        }
      } catch (e) {
        console.error('Error centering selected place:', e);
      }
    }

    setTimeout(() => {
      isSelectingPlaceRef.current = false;
    }, 1200);
  };

  // 5. GPS "Locate Me" button
  const handleLocateMe = async () => {
    Keyboard.dismiss();
    setShowPredictions(false);
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to detect your GPS position.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newRegion: Region = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };

      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 800);
      reverseGeocodeCoordinates(position.coords.latitude, position.coords.longitude);
    } catch (err) {
      console.error('Locate me error:', err);
      Alert.alert('Location Error', 'Unable to retrieve your current location.');
    } finally {
      setIsLocating(false);
    }
  };

  // 6. Map region change complete (Zepto draggable center pin)
  const onRegionChangeComplete = (newRegion: Region) => {
    setRegion(newRegion);
    if (!isSelectingPlaceRef.current) {
      reverseGeocodeCoordinates(newRegion.latitude, newRegion.longitude);
    }
  };

  // 7. Submit Drop Location Change
  const handleSubmitLocation = async () => {
    if (!detectedAddress) {
      Alert.alert('Address Required', 'Please pinpoint a location on the map.');
      return;
    }

    const fullStreetAddress = shopNumber.trim()
      ? `${shopNumber.trim()}, ${detectedAddress}`
      : detectedAddress;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await apiClient.post(URLs.CUSTOMER_DROP_LOCATION_REQUEST_CHANGE, {
        address: fullStreetAddress,
        city: detectedCity,
        state: detectedState,
        pincode: detectedPincode,
        landmark: landmark.trim() || undefined,
        lat: region.latitude,
        lng: region.longitude,
      });

      if (res.data?.success) {
        const isInitial = res.data.isInitialSetup;
        Alert.alert(
          isInitial ? 'Drop Location Configured' : 'Change Submitted for Approval',
          isInitial
            ? 'Your official store drop location has been set successfully.'
            : 'Your proposed drop location change has been submitted to Dhatri Operations. Your current address will remain active until approved by an administrator.',
          [
            {
              text: 'OK',
              onPress: () => goBack(),
            },
          ]
        );
      } else {
        throw new Error(res.data?.error || 'Failed to submit location change.');
      }
    } catch (err: any) {
      console.error('Submit drop location error:', err);
      const msg = err.response?.data?.error || err.message || 'Failed to update drop location.';
      setErrorMsg(msg);
      Alert.alert('Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Search Bar & Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => goBack()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color="#1f2937" />
          </TouchableOpacity>

          <View style={styles.searchBarContainer}>
            <Search size={18} color="#9ca3af" style={styles.searchIcon} />
            <TextInput
              placeholder="Search market yard, APMC, street..."
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                if (text.trim().length >= 2) {
                  setShowPredictions(true);
                }
              }}
              onFocus={() => {
                if (predictions.length > 0) {
                  setShowPredictions(true);
                }
              }}
              style={styles.searchInput}
              placeholderTextColor="#9ca3af"
              returnKeyType="search"
            />
            {isSearching ? (
              <ActivityIndicator size="small" color="#16a34a" style={styles.searchLoader} />
            ) : searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setPredictions([]);
                  setShowPredictions(false);
                }}
                style={styles.clearSearchBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={16} color="#9ca3af" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Autocomplete Predictions Dropdown: Placed directly below the search bar */}
        {showPredictions && predictions.length > 0 && (
          <View style={styles.predictionsDropdown}>
            <ScrollView
              style={styles.predictionsScroll}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
            >
              {predictions.map((p) => (
                <TouchableOpacity
                  key={p.placeId}
                  style={styles.predictionItem}
                  onPress={() => handleSelectPrediction(p)}
                  activeOpacity={0.7}
                >
                  <View style={styles.pinIconWrapper}>
                    <MapPin size={18} color="#16a34a" />
                  </View>
                  <View style={styles.predictionTextContainer}>
                    <Text style={styles.predictionMainText} numberOfLines={1}>
                      {p.mainText}
                    </Text>
                    <Text style={styles.predictionSecondaryText} numberOfLines={2}>
                      {p.secondaryText}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Interactive Map View */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          onRegionChangeComplete={onRegionChangeComplete}
          showsUserLocation={true}
          showsCompass={true}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        />

        {/* Zepto Fixed Center Pin Overlay */}
        <View style={styles.centerPinContainer} pointerEvents="none">
          <View style={styles.pinBubble}>
            <Text style={styles.pinBubbleText}>Order Will Be Delivered Here</Text>
          </View>
          <MapPin size={42} color="#16a34a" fill="#22c55e" />
          <View style={styles.pinShadow} />
        </View>

        {/* Floating "Locate Me" Button */}
        <TouchableOpacity
          style={styles.locateMeButton}
          onPress={handleLocateMe}
          disabled={isLocating}
          activeOpacity={0.85}
        >
          {isLocating ? (
            <ActivityIndicator size="small" color="#16a34a" />
          ) : (
            <Crosshair size={22} color="#16a34a" />
          )}
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet Details Form */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.bottomSheet}
      >
        <ScrollView
          style={styles.sheetContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Active vs Pending Approval Banner */}
          {currentLocationInfo?.status === 'PENDING_APPROVAL' && (
            <View style={styles.pendingBanner}>
              <Clock size={18} color="#d97706" style={{ marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingBannerTitle}>
                  Modification Pending Admin Approval
                </Text>
                <Text style={styles.pendingBannerSubtitle}>
                  Current deliveries continue to your approved address. Once verified by Dhatri operations, new orders route here.
                </Text>
              </View>
            </View>
          )}

          {/* Detected Address Display */}
          <View style={styles.addressPreviewCard}>
            <View style={styles.addressHeaderRow}>
              <Store size={18} color="#16a34a" />
              <Text style={styles.addressHeaderTitle}>Detected Store Location</Text>
              {isReverseGeocoding && (
                <ActivityIndicator size="small" color="#16a34a" style={{ marginLeft: 8 }} />
              )}
            </View>

            <Text style={styles.detectedAddressText} numberOfLines={2}>
              {detectedAddress || 'Drag the map pin to point your store dock...'}
            </Text>

            <Text style={styles.detectedMetaText}>
              {detectedCity}, {detectedState} {detectedPincode ? `- ${detectedPincode}` : ''}
            </Text>
          </View>

          {/* Additional Inputs for Dock/Landmark */}
          <View style={styles.inputRow}>
            <View style={styles.inputCol}>
              <Text style={styles.inputLabel}>Shop / Gala / Gate No.</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Shop #14, Gate B"
                value={shopNumber}
                onChangeText={setShopNumber}
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.inputCol}>
              <Text style={styles.inputLabel}>Nearest Landmark</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Near Weigh Bridge"
                value={landmark}
                onChangeText={setLandmark}
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          {/* Enforced Single Drop Location Notice */}
          <View style={styles.policyNotice}>
            <ShieldCheck size={16} color="#059669" style={{ marginTop: 2 }} />
            <Text style={styles.policyNoticeText}>
              1 Official Drop Location per B2B Account. Changing coordinates updates delivery routes for commercial heavy trucks and enters verification queue.
            </Text>
          </View>

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

          {/* Confirm Button */}
          <TouchableOpacity
            style={[styles.confirmButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleSubmitLocation}
            disabled={isSubmitting || !detectedAddress}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.confirmButtonText}>
                {currentLocationInfo?.hasLocation
                  ? 'Request Drop Location Change'
                  : 'Confirm Official Drop Location'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    zIndex: 100,
    elevation: 20,
    position: 'relative',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 6,
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
    paddingVertical: 0,
  },
  searchLoader: {
    marginLeft: 6,
  },
  clearSearchBtn: {
    padding: 4,
    marginLeft: 4,
  },
  predictionsDropdown: {
    position: 'absolute',
    top: 60, // Exactly below the header search bar (top row 44 + padding)
    left: 16,
    right: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 30,
    zIndex: 9999,
    maxHeight: 280,
    overflow: 'hidden',
  },
  predictionsScroll: {
    maxHeight: 280,
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#ffffff',
  },
  pinIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  predictionTextContainer: {
    flex: 1,
  },
  predictionMainText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  predictionSecondaryText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
    lineHeight: 16,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  centerPinContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -21 }, { translateY: -46 }],
    alignItems: 'center',
  },
  pinBubble: {
    backgroundColor: '#111827',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginBottom: 4,
  },
  pinBubbleText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  pinShadow: {
    width: 10,
    height: 5,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 5,
    marginTop: 2,
  },
  locateMeButton: {
    position: 'absolute',
    right: 16,
    bottom: 20,
    backgroundColor: '#ffffff',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  bottomSheet: {
    maxHeight: 330,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  sheetContent: {
    padding: 20,
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  pendingBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400e',
  },
  pendingBannerSubtitle: {
    fontSize: 11,
    color: '#b45309',
    marginTop: 2,
    lineHeight: 15,
  },
  addressPreviewCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  addressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  addressHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16a34a',
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detectedAddressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 20,
  },
  detectedMetaText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  inputCol: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#111827',
  },
  policyNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ecfdf5',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    gap: 8,
  },
  policyNoticeText: {
    flex: 1,
    fontSize: 11,
    color: '#065f46',
    lineHeight: 15,
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    marginBottom: 10,
    textAlign: 'center',
  },
  confirmButton: {
    backgroundColor: '#16a34a',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
