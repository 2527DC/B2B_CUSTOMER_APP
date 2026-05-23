import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Brand } from '@/lib/supabase';

interface BrandSectionProps {
  brands: Brand[];
  selectedBrand: string | null;
  onSelectBrand: (brandId: string | null) => void;
}

export function BrandSection({ brands, selectedBrand, onSelectBrand }: BrandSectionProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Top Brands</Text>
        <TouchableOpacity onPress={() => onSelectBrand(null)}>
          <Text style={styles.seeAll}>View All</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.brandsContainer}
      >
        {brands.map((brand) => (
          <TouchableOpacity
            key={brand.id}
            style={[
              styles.brandItem,
              selectedBrand === brand.id && styles.brandItemSelected,
            ]}
            onPress={() => onSelectBrand(selectedBrand === brand.id ? null : brand.id)}
            activeOpacity={0.7}
          >
            <View style={[
              styles.brandLogoContainer,
              selectedBrand === brand.id && styles.brandLogoContainerSelected,
            ]}>
              <Image
                source={{ uri: brand.logo_url }}
                style={styles.brandLogo}
                resizeMode="contain"
              />
            </View>
            <Text style={[
              styles.brandName,
              selectedBrand === brand.id && styles.brandNameSelected,
            ]} numberOfLines={1}>
              {brand.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  seeAll: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
  },
  brandsContainer: {
    paddingRight: 20,
  },
  brandItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 80,
  },
  brandItemSelected: {
    transform: [{ scale: 1.05 }],
  },
  brandLogoContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  brandLogoContainerSelected: {
    borderColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.3,
  },
  brandLogo: {
    width: 40,
    height: 40,
  },
  brandName: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    textAlign: 'center',
  },
  brandNameSelected: {
    color: '#2563eb',
    fontWeight: '600',
  },
});
