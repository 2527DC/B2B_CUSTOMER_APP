import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Home } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { useBottomSpacing } from '@/hooks/useBottomSpacing';
import { getCategoryPhotoFallback } from '@/components/CategoryShelves';

export interface ParentSidebarItem {
  id: string;
  name: string;
  image?: string;
  icon?: string;
  count?: number;
}

interface CategorySidebarProps {
  categories: ParentSidebarItem[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string) => void;
}

export function CategorySidebar({ categories, selectedCategory, onSelectCategory }: CategorySidebarProps) {
  const { scrollPaddingBottom } = useBottomSpacing();

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom + 20 }]}
      >
        {categories.map((category) => {
          const isSelected = selectedCategory === category.id;
          const fallbackUri = getCategoryPhotoFallback(category.name);
          const activeUri = category.image && category.image.trim().length > 0 && !category.image.includes('/uploads/')
            ? category.image
            : fallbackUri;

          return (
            <TouchableOpacity
              key={`side-cat-${category.id}`}
              style={[
                styles.categoryItem,
                isSelected && styles.categoryItemSelected,
              ]}
              onPress={() => onSelectCategory(category.id)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${category.name} parent category`}
            >
              {isSelected && <View style={styles.activeLeftStrip} />}

              {/* Elevated Pastel Image Container */}
              <View
                style={[
                  styles.imageBox,
                  isSelected && styles.imageBoxSelected,
                ]}
              >
                {activeUri ? (
                  <Image
                    source={{ uri: activeUri }}
                    style={styles.categoryImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Home
                    size={22}
                    color={isSelected ? Colors.primaryDark : Colors.textSecondary}
                    strokeWidth={2.2}
                  />
                )}
              </View>

              <Text
                style={[
                  styles.categoryName,
                  isSelected && styles.categoryNameSelected,
                ]}
                numberOfLines={2}
              >
                {category.name}
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
    width: 90,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    height: '100%',
  },
  scrollContent: {
    paddingVertical: 10,
  },
  categoryItem: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    position: 'relative',
    marginHorizontal: 4,
    borderRadius: 14,
    marginBottom: 4,
  },
  categoryItemSelected: {
    backgroundColor: Colors.primary10,
  },
  activeLeftStrip: {
    position: 'absolute',
    left: -4,
    top: 14,
    bottom: 14,
    width: 4,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: Colors.primary,
  },
  imageBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#F0F4F1',
    borderWidth: 1.5,
    borderColor: '#e2ebe4',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#142918',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  imageBoxSelected: {
    borderColor: Colors.primary,
    borderWidth: 2,
    backgroundColor: '#ffffff',
    shadowColor: Colors.primary,
    shadowOpacity: 0.25,
    elevation: 4,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categoryName: {
    marginTop: 6,
    fontSize: 11.5,
    color: Colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
  },
  categoryNameSelected: {
    color: Colors.primaryDark,
    fontWeight: '800',
  },
});
