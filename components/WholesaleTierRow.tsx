import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Colors } from '@/constants/theme';

type Tier = {
  min_qty: number;
  max_qty: number;
  price_per_bag: number;
};

type Props = {
  tier: Tier;
};

const WholesaleTierRow: React.FC<Props> = ({ tier }) => {
  const rangeText = `${tier.min_qty}-${tier.max_qty} bags`;
  const priceText = `₹${tier.price_per_bag.toLocaleString()} / bag`;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: Colors.primary10 },
      ]}
    >
      <View style={styles.textContainer}>
        <Text style={styles.rangeText}>{rangeText}</Text>
        <Text style={styles.priceText}>{priceText}</Text>
      </View>
      <ChevronRight size={20} color={Colors.textSecondary} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  textContainer: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-between',
    marginRight: 8,
  },
  rangeText: {
    fontSize: 16,
    color: '#475569',
  },
  priceText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '700',
  },
});

export default WholesaleTierRow;
