import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Smartphone, Shirt, Dumbbell, Home, Sparkles, BookOpen, Gamepad2, Utensils, type LucideIcon } from 'lucide-react-native';
import { Category } from '@/lib/supabase';
import { Colors } from '@/constants/theme';

interface CategorySidebarProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

const iconMap: Record<string, LucideIcon> = {
  'Smartphone': Smartphone,
  'Shirt': Shirt,
  'Dumbbell': Dumbbell,
  'Home': Home,
  'Sparkles': Sparkles,
  'BookOpen': BookOpen,
  'Gamepad2': Gamepad2,
  'Utensils': Utensils,
};

export function CategorySidebar({ categories, selectedCategory, onSelectCategory }: CategorySidebarProps) {
  const allCategory: Category = {
    id: 'all',
    name: 'All',
    icon: 'All',
    created_at: '',
  };

  const displayCategories = [allCategory, ...categories];

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
        indicatorStyle="black"
      >
        {displayCategories.map((category) => {
          const IconComponent = category.id === 'all' ? Home : iconMap[category.icon] || Home;
          const isSelected = selectedCategory === category.id || (category.id === 'all' && selectedCategory === null);

          return (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryItem,
                isSelected && styles.categoryItemSelected,
              ]}
              onPress={() => onSelectCategory(category.id === 'all' ? null : category.id)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.iconContainer,
                isSelected && styles.iconContainerSelected,
                { overflow: 'hidden' }
              ]}>
                {category.id !== 'all' && (category as any).image_url ? (
                  <Image
                    source={{ uri: (category as any).image_url }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                ) : (
                  <IconComponent
                    size={22}
                    color={isSelected ? '#ffffff' : Colors.textSecondary}
                    strokeWidth={2.5}
                  />
                )}
              </View>
              <Text style={[
                styles.categoryName,
                isSelected && styles.categoryNameSelected,
              ]} numberOfLines={2}>
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
    width: 85,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    height: '100%',
  },
  scrollContent: {
    paddingVertical: 12,
  },
  categoryItem: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
    marginBottom: 4,
    marginHorizontal: 6,
    borderRadius: 12,
  },
  categoryItemSelected: {
    backgroundColor: Colors.primary10,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  iconContainerSelected: {
    backgroundColor: Colors.primary,
  },
  categoryName: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 14,
  },
  categoryNameSelected: {
    color: Colors.primaryDark,
    fontWeight: '700',
  },
});
