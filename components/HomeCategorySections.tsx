import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Package } from 'lucide-react-native';
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
  default: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80',
};

const getCategoryPhotoFallback = (name?: string): string => {
  const lower = (name || '').toLowerCase();
  if (lower.includes('flour') || lower.includes('atta') || lower.includes('maida') || lower.includes('wheat') || lower.includes('besan') || lower.includes('sooji') || lower.includes('rava')) return DEFAULT_CATEGORY_FALLBACKS.flour;
  if (lower.includes('sugar') || lower.includes('jaggery') || lower.includes('sweet')) return DEFAULT_CATEGORY_FALLBACKS.sugar;
  if (lower.includes('dal') || lower.includes('pulse') || lower.includes('lentil') || lower.includes('gram') || lower.includes('chana') || lower.includes('urad') || lower.includes('toor') || lower.includes('moong')) return DEFAULT_CATEGORY_FALLBACKS.dal;
  if (lower.includes('rice') || lower.includes('paddy') || lower.includes('basmati')) return DEFAULT_CATEGORY_FALLBACKS.rice;
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
  return DEFAULT_CATEGORY_FALLBACKS.default;
};

/**
 * Robust Category Card Image with automatic error fallback
 */
function CategoryCardImage({ uri, name }: { uri?: string; name: string }) {
  const [loadFailed, setLoadFailed] = useState(false);
  const fallback = getCategoryPhotoFallback(name);
  const activeUri = !loadFailed && uri && uri.trim().length > 0 ? uri : fallback;

  return (
    <Image
      source={{ uri: activeUri }}
      style={styles.cardImage}
      resizeMode="cover"
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

        return (
          <View key={`sec-${section.id}`} style={styles.sectionContainer}>
            {/* Category Section Header: ONLY Text (No Icons), separated by commas, truncated with ... */}
            <View style={styles.headerRow}>
              <Text
                style={styles.sectionTitle}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {section.name}
              </Text>
            </View>

            {/* Horizontal Cards: Parent and its Subcategories together in one row */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cardsScrollContent}
            >
              {section.subcategories.map((subcat) => (
                <TouchableOpacity
                  key={`sub-${subcat.id}`}
                  style={styles.card}
                  activeOpacity={0.82}
                  onPress={() => onSelectSubcategory(subcat)}
                >
                  {/* Category Image */}
                  <View style={styles.imageContainer}>
                    <CategoryCardImage uri={subcat.image} name={subcat.name} />
                  </View>

                  {/* Category / Subcategory Label */}
                  <View style={styles.labelContainer}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {subcat.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
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
    marginBottom: 36,
  },
  sectionContainer: {
    marginBottom: 26,
  },
  headerRow: {
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  cardsScrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    width: 168,
    height: 184,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  imageContainer: {
    width: '100%',
    height: 120,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'center',
    lineHeight: 18,
  },
});
