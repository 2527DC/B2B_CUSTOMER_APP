import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { List, Grid3X3 } from 'lucide-react-native';
import { Product } from '@/lib/supabase';
import { ProductCard } from './ProductCard';

interface ProductGridProps {
  products: Product[];
  viewMode: 'horizontal' | 'vertical';
  title?: string;
  headerRight?: React.ReactNode;
}

export function ProductGrid({ products, viewMode, title = 'Products', headerRight }: ProductGridProps) {
  if (viewMode === 'horizontal') {
    return (
      <View style={styles.horizontalContainer}>
        {headerRight && (
          <View style={styles.horizontalHeader}>
            <Text style={styles.horizontalTitle}>{title}</Text>
            {headerRight}
          </View>
        )}
        <FlatList
          key="horizontal-list"
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ProductCard product={item} viewMode="horizontal" />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        />
      </View>
    );
  }

  return (
    <View style={styles.verticalContainer}>
      {headerRight && (
        <View style={styles.verticalHeader}>
          <Text style={styles.verticalTitle}>{title}</Text>
          {headerRight}
        </View>
      )}
      <FlatList
        key="vertical-grid"
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ProductCard product={item} viewMode="vertical" />}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.verticalList}
        columnWrapperStyle={styles.row}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  horizontalContainer: {
    flex: 1,
  },
  horizontalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
  },
  horizontalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  horizontalList: {
    paddingBottom: 100,
  },
  verticalContainer: {
    flex: 1,
  },
  verticalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
  },
  verticalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  verticalList: {
    paddingBottom: 100,
    paddingHorizontal: 10,
  },
  row: {
    justifyContent: 'space-between',
  },
});

// View Toggle Component
interface ViewToggleProps {
  viewMode: 'horizontal' | 'vertical';
  onViewModeChange: (mode: 'horizontal' | 'vertical') => void;
}

export function ViewToggle({ viewMode, onViewModeChange }: ViewToggleProps) {
  return (
    <View style={toggleStyles.container}>
      <TouchableOpacity
        style={[
          toggleStyles.button,
          viewMode === 'horizontal' && toggleStyles.buttonActive,
        ]}
        onPress={() => onViewModeChange('horizontal')}
      >
        <List
          size={18}
          color={viewMode === 'horizontal' ? '#2563eb' : '#64748b'}
          strokeWidth={2.5}
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          toggleStyles.button,
          viewMode === 'vertical' && toggleStyles.buttonActive,
        ]}
        onPress={() => onViewModeChange('vertical')}
      >
        <Grid3X3
          size={18}
          color={viewMode === 'vertical' ? '#2563eb' : '#64748b'}
          strokeWidth={2.5}
        />
      </TouchableOpacity>
    </View>
  );
}

const toggleStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 3,
  },
  button: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  buttonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
});
