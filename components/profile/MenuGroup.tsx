import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { cardShadow } from './ProfileCards';

export interface MenuRow {
  key: string;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  /** Small count or label shown before the chevron. */
  trailing?: string | null;
  onPress: () => void;
}

/** A grouped list card: rows share one surface, separated by hairlines. */
export default function MenuGroup({ rows }: { rows: MenuRow[] }) {
  return (
    <View style={styles.group}>
      {rows.map((row, index) => {
        const Icon = row.icon;
        return (
          <View key={row.key}>
            {index > 0 ? <View style={styles.separator} /> : null}
            <TouchableOpacity
              style={styles.row}
              onPress={row.onPress}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={row.subtitle ? `${row.title}. ${row.subtitle}` : row.title}
            >
              <View style={styles.iconWrap}>
                <Icon size={19} color={Colors.primary} strokeWidth={2.2} />
              </View>
              <View style={styles.text}>
                <Text style={styles.title}>{row.title}</Text>
                {row.subtitle ? (
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {row.subtitle}
                  </Text>
                ) : null}
              </View>
              {row.trailing ? (
                <View style={styles.trailing}>
                  <Text style={styles.trailingText}>{row.trailing}</Text>
                </View>
              ) : null}
              <ChevronRight size={18} color={Colors.textMuted} strokeWidth={2.4} />
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
    ...cardShadow,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
    minHeight: 60,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: 66,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600', color: Colors.text },
  subtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  trailing: {
    minWidth: 24,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  trailingText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
});
