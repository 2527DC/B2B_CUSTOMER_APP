import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { ChevronRight, ArrowRight, PackageOpen } from 'lucide-react-native';
import type { Product } from '@/types/catalog';
import { Colors } from '@/constants/theme';
import { ProductCard } from '@/components/ProductCard';

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

export const getCategoryPhotoFallback = (name?: string): string => {
  const lower = (name || '').toLowerCase();
  if (lower.includes('flour') || lower.includes('atta') || lower.includes('maida') || lower.includes('wheat') || lower.includes('besan') || lower.includes('sooji') || lower.includes('rava')) return DEFAULT_CATEGORY_FALLBACKS.flour;
  if (lower.includes('sugar') || lower.includes('jaggery') || lower.includes('sweet')) return DEFAULT_CATEGORY_FALLBACKS.sugar;
  if (lower.includes('dal') || lower.includes('pulse') || lower.includes('lentil') || lower.includes('gram') || lower.includes('chana') || lower.includes('urad') || lower.includes('toor') || lower.includes('moong') || lower.includes('masoor')) return DEFAULT_CATEGORY_FALLBACKS.dal;
  if (lower.includes('rice') || lower.includes('paddy') || lower.includes('basmati') || lower.includes('brown') || lower.includes('boild') || lower.includes('boiled') || lower.includes('masoori') || lower.includes('kolam')) return DEFAULT_CATEGORY_FALLBACKS.rice;
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

/**
 * Category Card Image with automatic fallback and cover fit
 */
export function CategoryThumbImage({ uri, name, style }: { uri?: string; name: string; style?: any }) {
  const [loadFailed, setLoadFailed] = useState(false);
  const fallback = getCategoryPhotoFallback(name);
  const isBrokenLocalUpload = typeof uri === 'string' && uri.includes('/uploads/');
  const activeUri = !loadFailed && uri && uri.trim().length > 0 && !isBrokenLocalUpload ? uri : fallback;

  return (
    <Image
      key={activeUri}
      source={{ uri: activeUri }}
      style={[styles.defaultThumbImage, style]}
      resizeMode="cover"
      onError={() => setLoadFailed(true)}
    />
  );
}

export interface SubcategoryShelfItem {
  id: string;
  name: string;
  image: string;
  parentId: string;
  parentName: string;
  products: Product[];
}

export interface ParentCategoryItem {
  id: string;
  name: string;
  image: string;
  subcategories: SubcategoryShelfItem[];
  // If the parent itself has direct products not classified in child categories
  parentProducts?: Product[];
}

interface CategoryShelvesProps {
  parentCategories: ParentCategoryItem[];
  selectedCategoryId: string;
  onSelectParentCategory: (parentId: string) => void;
  onOpenSubcategoryDetail?: (subcat: SubcategoryShelfItem) => void;
  onViewAllParentProducts?: (parent: ParentCategoryItem) => void;
}

export function CategoryShelves({
  parentCategories,
  selectedCategoryId,
  onSelectParentCategory,
  onOpenSubcategoryDetail,
  onViewAllParentProducts,
}: CategoryShelvesProps) {
  if (!parentCategories || parentCategories.length === 0) {
    return null;
  }

  const activeCategory =
    parentCategories.find((c) => String(c.id) === String(selectedCategoryId)) ||
    parentCategories[0];

  return (
    <View style={styles.container}>
      {/* ── ROW 1: Complete Single Horizontal Row for Parent Categories Only ── */}
      <View style={styles.parentRowContainer}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.headerTitleWrap}>
            <View style={styles.accentBar} />
            <Text style={styles.sectionHeading}>Shop By Category</Text>
          </View>
          <Text style={styles.categoryCountBadge}>{parentCategories.length} Categories</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.parentScrollList}
        >
          {parentCategories.map((cat) => {
            const isSelected = String(cat.id) === String(activeCategory.id);
            return (
              <TouchableOpacity
                key={`parent-cat-${cat.id}`}
                style={[styles.parentTabItem, isSelected && styles.parentTabItemSelected]}
                activeOpacity={0.82}
                onPress={() => onSelectParentCategory(String(cat.id))}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${cat.name} category`}
              >
                <View
                  style={[
                    styles.parentImageContainer,
                    isSelected && styles.parentImageContainerSelected,
                  ]}
                >
                  <CategoryThumbImage
                    uri={cat.image}
                    name={cat.name}
                    style={styles.parentCardImage}
                  />
                  {isSelected && <View style={styles.activeCheckPill} />}
                </View>
                <Text
                  style={[styles.parentLabel, isSelected && styles.parentLabelSelected]}
                  numberOfLines={2}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── BELOW SECTION: Subcategories & Horizontally Swipeable Product Shelves ── */}
      <View style={styles.shelvesContainer}>
        {/* Active Parent Category Summary Bar */}
        <View style={styles.activeCategoryBar}>
          <View style={styles.activeCatLeft}>
            <Text style={styles.activeCatTitle}>{activeCategory.name}</Text>
            <Text style={styles.activeCatSubtitle}>
              {activeCategory.subcategories.length > 0
                ? `${activeCategory.subcategories.length} subcategories available`
                : 'Browse all products'}
            </Text>
          </View>
          {onViewAllParentProducts && (
            <TouchableOpacity
              style={styles.viewAllParentBtn}
              activeOpacity={0.75}
              onPress={() => onViewAllParentProducts(activeCategory)}
            >
              <Text style={styles.viewAllParentText}>View All</Text>
              <ArrowRight size={13} color={Colors.primary} strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </View>

        {/* If category has subcategories: list each subcategory with its horizontal product shelf */}
        {activeCategory.subcategories.length > 0 ? (
          <View style={styles.subcatListStack}>
            {activeCategory.subcategories.map((subcat) => {
              const hasProducts = Array.isArray(subcat.products) && subcat.products.length > 0;
              return (
                <View key={`shelf-${subcat.id}`} style={styles.subcatShelfBlock}>
                  {/* Subcategory Header: Small Image + Name + Item count + Arrow */}
                  <TouchableOpacity
                    style={styles.subcatHeaderBar}
                    activeOpacity={0.78}
                    onPress={() => onOpenSubcategoryDetail?.(subcat)}
                  >
                    <View style={styles.subcatHeaderLeft}>
                      <View style={styles.subcatMiniThumbWrap}>
                        <CategoryThumbImage
                          uri={subcat.image}
                          name={subcat.name}
                          style={styles.subcatMiniThumb}
                        />
                      </View>
                      <View style={styles.subcatTitleBox}>
                        <Text style={styles.subcatTitleText} numberOfLines={1}>
                          {subcat.name}
                        </Text>
                        <Text style={styles.subcatCountMeta}>
                          {hasProducts ? `${subcat.products.length} products` : 'Explore'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.subcatViewMoreRow}>
                      <Text style={styles.subcatViewMoreText}>See all</Text>
                      <ChevronRight size={14} color={Colors.primary} strokeWidth={2.4} />
                    </View>
                  </TouchableOpacity>

                  {/* Horizontal Product Shelf for this Subcategory */}
                  {hasProducts ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.horizontalProductsTrack}
                    >
                      {subcat.products.map((prod) => (
                        <View key={`shelf-prod-${subcat.id}-${prod.id}`} style={styles.shelfCardWrapper}>
                          <ProductCard product={prod} viewMode="vertical" />
                        </View>
                      ))}
                    </ScrollView>
                  ) : (
                    <View style={styles.shelfEmptyWrap}>
                      <PackageOpen size={20} color={Colors.textMuted} />
                      <Text style={styles.shelfEmptyText}>
                        No products currently in {subcat.name}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : activeCategory.parentProducts && activeCategory.parentProducts.length > 0 ? (
          /* Parent category has no subcategories, show its direct products horizontally */
          <View style={styles.subcatShelfBlock}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalProductsTrack}
            >
              {activeCategory.parentProducts.map((prod) => (
                <View key={`direct-prod-${activeCategory.id}-${prod.id}`} style={styles.shelfCardWrapper}>
                  <ProductCard product={prod} viewMode="vertical" />
                </View>
              ))}
            </ScrollView>
          </View>
        ) : (
          <View style={styles.emptyParentBlock}>
            <PackageOpen size={36} color={Colors.textMuted} />
            <Text style={styles.emptyParentTitle}>No Subcategories Found</Text>
            <Text style={styles.emptyParentSubtitle}>
              Check back soon for new arrivals in {activeCategory.name}.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 16,
  },
  defaultThumbImage: {
    width: '100%',
    height: '100%',
  },

  /* ── Parent Categories Single Horizontal Row ── */
  parentRowContainer: {
    backgroundColor: Colors.surface,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accentBar: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  categoryCountBadge: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.textSecondary,
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  parentScrollList: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 16,
    alignItems: 'flex-start',
  },
  parentTabItem: {
    width: 82,
    alignItems: 'center',
  },
  parentTabItemSelected: {
    transform: [{ scale: 1.02 }],
  },
  parentImageContainer: {
    width: 74,
    height: 74,
    borderRadius: 20,
    backgroundColor: '#F0F4F1',
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  parentImageContainerSelected: {
    borderColor: Colors.primary,
    borderWidth: 2.5,
    backgroundColor: Colors.primary10,
    shadowColor: Colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  parentCardImage: {
    width: '100%',
    height: '100%',
  },
  activeCheckPill: {
    position: 'absolute',
    bottom: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    borderWidth: 1.5,
    borderColor: Colors.surface,
  },
  parentLabel: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 15,
  },
  parentLabelSelected: {
    color: Colors.primary,
    fontWeight: '800',
  },

  /* ── Subcategories & Product Shelves ── */
  shelvesContainer: {
    marginTop: 10,
  },
  activeCategoryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 6,
  },
  activeCatLeft: {
    flex: 1,
  },
  activeCatTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.2,
  },
  activeCatSubtitle: {
    fontSize: 11.5,
    fontWeight: '500',
    color: Colors.textMuted,
    marginTop: 1,
  },
  viewAllParentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: Colors.primary10,
    borderRadius: 12,
  },
  viewAllParentText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },

  /* Subcategory Shelf Blocks */
  subcatListStack: {
    gap: 12,
  },
  subcatShelfBlock: {
    backgroundColor: Colors.surface,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  subcatHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  subcatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  subcatMiniThumbWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F0F4F1',
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subcatMiniThumb: {
    width: '100%',
    height: '100%',
  },
  subcatTitleBox: {
    flex: 1,
  },
  subcatTitleText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.2,
  },
  subcatCountMeta: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textMuted,
    marginTop: 1,
  },
  subcatViewMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: 8,
  },
  subcatViewMoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },

  /* Horizontal Product Track */
  horizontalProductsTrack: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  shelfCardWrapper: {
    width: 154,
  },
  shelfEmptyWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.background,
    marginHorizontal: 16,
    borderRadius: 10,
  },
  shelfEmptyText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  emptyParentBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyParentTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  emptyParentSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
