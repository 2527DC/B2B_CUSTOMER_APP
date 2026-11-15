import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import type { Brand } from '@/types/catalog';
import { Colors } from '@/constants/theme';

interface BrandSectionProps {
  brands: Brand[];
  selectedBrand: string | null;
  onSelectBrand: (brandId: string | null) => void;
  onViewAll?: () => void;
}

export function BrandSection({ brands, selectedBrand, onSelectBrand, onViewAll }: BrandSectionProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleBadgeRow}>
          <View style={styles.titleAccentBar} />
          <Text style={styles.title}>Top Brands</Text>
        </View>
        <TouchableOpacity
          style={styles.seeAllButton}
          onPress={onViewAll ? onViewAll : () => onSelectBrand(null)}
          activeOpacity={0.7}
        >
          <Text style={styles.seeAll}>View All</Text>
          <ChevronRight size={14} color={Colors.primary} strokeWidth={2.5} />
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
              activeOpacity={0.82}
            >
              {/* Elevated Logo Card */}
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
              {/* Brand name */}
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
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingRight: 16,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleAccentBar: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.4,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#ecfdf5',
  },
  seeAll: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '700',
  },
  brandsContainer: {
    paddingRight: 16,
    gap: 12,
  },
  brandItem: {
    alignItems: 'center',
    width: 96,
  },
  brandItemSelected: {
    transform: [{ scale: 1.04 }],
  },
  logoCard: {
    width: 96,
    height: 96,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e8edf2',
    padding: 8,
    overflow: 'hidden',
  },
  logoCardSelected: {
    borderColor: Colors.primary,
    borderWidth: 2,
    shadowColor: Colors.primary,
    shadowOpacity: 0.25,
  },
  brandLogo: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  brandName: {
    marginTop: 8,
    fontSize: 12,
    color: '#1e293b',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 15,
  },
  brandNameSelected: {
    color: Colors.primary,
    fontWeight: '800',
  },
});
