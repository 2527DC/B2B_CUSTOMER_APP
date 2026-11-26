import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import type { Product } from '@/types/catalog';
import { Colors } from '@/constants/theme';

const DEFAULT_CATEGORY_FALLBACKS: Record<string, string> = {
  flour: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
  sugar: 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=600&auto=format&fit=crop&q=80',
  rice: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80',
  dal: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
  oils: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80',
  spices: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&auto=format&fit=crop&q=80',
  drinks: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80',
  dairy: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80',
  soaps: 'https://images.unsplash.com/photo-1608248597359-32432a537f1e?w=600&auto=format&fit=crop&q=80',
  haircare: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=600&auto=format&fit=crop&q=80',
  personal: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=80',
  grocery: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80',
  snacks: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&auto=format&fit=crop&q=80',
  cleaning: 'https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=600&auto=format&fit=crop&q=80',
  default: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80',
};

const getCategoryPhotoFallback = (name?: string): string => {
  const lower = (name || '').toLowerCase();
  if (lower.includes('flour') || lower.includes('atta') || lower.includes('maida') || lower.includes('wheat') || lower.includes('besan') || lower.includes('sooji') || lower.includes('rava')) return DEFAULT_CATEGORY_FALLBACKS.flour;
  if (lower.includes('sugar') || lower.includes('jaggery') || lower.includes('sweet')) return DEFAULT_CATEGORY_FALLBACKS.sugar;
  if (lower.includes('dal') || lower.includes('pulse') || lower.includes('lentil') || lower.includes('gram') || lower.includes('chana') || lower.includes('urad') || lower.includes('toor') || lower.includes('moong')) return DEFAULT_CATEGORY_FALLBACKS.dal;
  if (lower.includes('rice') || lower.includes('paddy') || lower.includes('basmati') || lower.includes('brown') || lower.includes('boild') || lower.includes('boiled')) return DEFAULT_CATEGORY_FALLBACKS.rice;
  if (lower.includes('oil') || lower.includes('ghee')) return DEFAULT_CATEGORY_FALLBACKS.oils;
  if (lower.includes('spice') || lower.includes('masala') || lower.includes('chilli') || lower.includes('turmeric') || lower.includes('pepper')) return DEFAULT_CATEGORY_FALLBACKS.spices;
  if (lower.includes('juice') || lower.includes('drink') || lower.includes('beverage') || lower.includes('soda')) return DEFAULT_CATEGORY_FALLBACKS.drinks;
  if (lower.includes('dairy') || lower.includes('milk') || lower.includes('butter')) return DEFAULT_CATEGORY_FALLBACKS.dairy;
  if (lower.includes('soap') || lower.includes('hand') || lower.includes('face') || lower.includes('wash')) return DEFAULT_CATEGORY_FALLBACKS.soaps;
  if (lower.includes('hair') || lower.includes('shampoo') || lower.includes('conditioner')) return DEFAULT_CATEGORY_FALLBACKS.haircare;
  if (lower.includes('personal') || lower.includes('skin') || lower.includes('care') || lower.includes('oral') || lower.includes('dental')) return DEFAULT_CATEGORY_FALLBACKS.personal;
  if (lower.includes('snack') || lower.includes('biscuit') || lower.includes('cookie') || lower.includes('namkeen')) return DEFAULT_CATEGORY_FALLBACKS.snacks;
  if (lower.includes('clean') || lower.includes('detergent') || lower.includes('dish')) return DEFAULT_CATEGORY_FALLBACKS.cleaning;
  if (lower.includes('grocery') || lower.includes('staple')) return DEFAULT_CATEGORY_FALLBACKS.grocery;
  return DEFAULT_CATEGORY_FALLBACKS.rice;
};

// Light greyish-green (soft sage) background matching Dhatri's brand aesthetic
const THEME_TINT = '#F0F4F1';

const getTintForCategory = (_name?: string, _index: number = 0): string => {
  return THEME_TINT;
};

/**
 * Format section title like Udaan:
 * "Cereals, Atta & Dals" or "Oil, Sugar & Salt"
 */
function formatSectionTitle(rawName: string): string {
  const parts = (rawName || '').split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return 'Categories';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} & ${parts[1]}`;
  if (parts.length === 3) return `${parts[0]}, ${parts[1]} & ${parts[2]}`;
  // 4+ items: display first 2 and 3rd with &
  return `${parts[0]}, ${parts[1]} & ${parts[2]}`;
}

/**
 * Category Card Image with automatic fallback and contain fit
 */
function CategoryCardImage({ uri, name }: { uri?: string; name: string }) {
  const [loadFailed, setLoadFailed] = useState(false);
  const fallback = getCategoryPhotoFallback(name);
  const isBrokenLocalUpload = typeof uri === 'string' && uri.includes('/uploads/');
  const activeUri = !loadFailed && uri && uri.trim().length > 0 && !isBrokenLocalUpload ? uri : fallback;

  return (
    <Image
      key={activeUri}
      source={{ uri: activeUri }}
      style={styles.cardImage}
      resizeMode="contain"
      onError={() => setLoadFailed(true)}
    />
  );
}

export interface SubcategoryItem {
  id: string;
  name: string;
  image: string;
  categoryId: string;
  categoryName: string;
  productCount?: number;
  products?: Product[];
  isParent?: boolean;
}

export interface CategorySectionItem {
  id: string;
  name: string; // Formatted as "Parent, Subcategory 1, Subcategory 2..."
  subcategories: SubcategoryItem[];
}

interface HomeCategorySectionsProps {
  sections: CategorySectionItem[];
  onSelectSubcategory: (subcategory: SubcategoryItem) => void;
}

export function HomeCategorySections({ sections, onSelectSubcategory }: HomeCategorySectionsProps) {
  if (!sections || sections.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {sections.map((section) => {
        if (!section.subcategories || section.subcategories.length === 0) {
          return null;
        }

        const sectionHeading = formatSectionTitle(section.name);

        return (
          <View key={`sec-${section.id}`} style={styles.sectionCard}>
            {/* Header: Section Title (e.g. "Cereals, Atta & Dals") */}
            <View style={styles.headerRow}>
              <Text style={styles.sectionTitle} numberOfLines={1}>
                {sectionHeading}
              </Text>
              {section.subcategories.length > 3 ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => onSelectSubcategory(section.subcategories[0])}
                  style={styles.viewAllRow}
                >
                  <Text style={styles.viewAllText}>View All</Text>
                  <ChevronRight size={13} color={Colors.primary} strokeWidth={2.5} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Single Horizontal Slidable Row for Categories/Subcategories */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.scrollListContainer}
            >
              {section.subcategories.map((subcat, idx) => {
                const tintBg = getTintForCategory(subcat.name, idx);
                return (
                  <TouchableOpacity
                    key={`sub-${subcat.id}`}
                    style={styles.horizontalItem}
                    activeOpacity={0.82}
                    onPress={() => onSelectSubcategory(subcat)}
                  >
                    {/* Pastel / Warm Rounded Image Container */}
                    <View style={[styles.tileImageContainer, { backgroundColor: tintBg }]}>
                      <CategoryCardImage uri={subcat.image} name={subcat.name} />
                    </View>

                    {/* Subcategory Label */}
                    <Text style={styles.tileLabel} numberOfLines={2}>
                      {subcat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 16,
    gap: 12,
  },
  sectionCard: {
    marginHorizontal: 12,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: '#e8edf2',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: -0.3,
    flex: 1,
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  scrollListContainer: {
    flexDirection: 'row',
    gap: 14,
    paddingRight: 10,
  },
  horizontalItem: {
    width: 140,
    alignItems: 'center',
  },
  tileImageContainer: {
    width: 140,
    aspectRatio: 1.05,
    borderRadius: 16,
    backgroundColor: THEME_TINT,
    borderWidth: 1,
    borderColor: '#e0eae2',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    shadowColor: '#142918',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardImage: {
    width: '90%',
    height: '90%',
  },
  tileLabel: {
    marginTop: 8,
    fontSize: 13.5,
    lineHeight: 17,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
  },
});
