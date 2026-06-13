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
        {brands.map((brand) => {
          const isSelected = selectedBrand === brand.id;
          return (
            <TouchableOpacity
              key={brand.id}
              style={[styles.brandItem, isSelected && styles.brandItemSelected]}
              onPress={() => onSelectBrand(isSelected ? null : brand.id)}
              activeOpacity={0.75}
            >
              {/* Square image card */}
              <View style={[styles.logoCard, isSelected && styles.logoCardSelected]}>
                {brand.logo_url && brand.logo_url.trim() !== '' ? (
                  <Image
                    source={{ uri: brand.logo_url }}
                    style={styles.brandLogo}
                    resizeMode="contain"
                    onError={() => {}}
                  />
                ) : (
                  <View style={[styles.brandLogo, { backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#64748b' }}>
                      {brand.name ? brand.name.substring(0, 2).toUpperCase() : 'B'}
                    </Text>
                  </View>
                )}
              </View>
              {/* Brand name — small, full, centered */}
              <Text
                style={[styles.brandName, isSelected && styles.brandNameSelected]}
                numberOfLines={2}
              >
                {brand.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingLeft: 16,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: -0.4,
  },
  seeAll: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '600',
  },
  brandsContainer: {
    paddingRight: 16,
    gap: 12,
  },
  brandItem: {
    alignItems: 'center',
    width: 100,
  },
  brandItemSelected: {
    transform: [{ scale: 1.04 }],
  },
  logoCard: {
    width: 100,
    height: 100,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  logoCardSelected: {
    borderColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.25,
  },
  brandLogo: {
    width: '100%',
    height: '100%',
  },
  brandName: {
    marginTop: 7,
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 14,
  },
  brandNameSelected: {
    color: '#2563eb',
    fontWeight: '700',
  },
});
