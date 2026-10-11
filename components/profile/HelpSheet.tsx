import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { MessageCircle, Phone, ShieldCheck, ShoppingBag, X, ChevronRight, type LucideIcon } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import type { SalesRep } from './ProfileCards';

interface HelpSheetProps {
  visible: boolean;
  bottomInset: number;
  rep: SalesRep | null;
  onClose: () => void;
  onCallRep: () => void;
  onWhatsAppRep: () => void;
  onOpenOrders: () => void;
  onOpenPrivacy: () => void;
}

function SheetRow({ icon: Icon, title, subtitle, onPress }: { icon: LucideIcon; title: string; subtitle: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7} accessibilityRole="button">
      <View style={styles.rowIcon}>
        <Icon size={19} color={Colors.primary} strokeWidth={2.2} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <ChevronRight size={18} color={Colors.textMuted} strokeWidth={2.4} />
    </TouchableOpacity>
  );
}

/** Bottom sheet listing the real ways a store can get help today. */
export default function HelpSheet({
  visible,
  bottomInset,
  rep,
  onClose,
  onCallRep,
  onWhatsAppRep,
  onOpenOrders,
  onOpenPrivacy,
}: HelpSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close help" />
      <View style={[styles.sheet, { paddingBottom: Math.max(bottomInset, 16) + 8 }]}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>Help & support</Text>
          <TouchableOpacity onPress={onClose} style={styles.close} accessibilityLabel="Close" accessibilityRole="button">
            <X size={18} color={Colors.textSecondary} strokeWidth={2.4} />
          </TouchableOpacity>
        </View>

        {rep?.phone ? (
          <>
            <SheetRow icon={Phone} title={`Call ${rep.name}`} subtitle="Your sales representative" onPress={onCallRep} />
            <SheetRow icon={MessageCircle} title="Message on WhatsApp" subtitle="Quotes, credit and returns" onPress={onWhatsAppRep} />
          </>
        ) : (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              Your Dhatri sales representative appears here once one is assigned to your store.
            </Text>
          </View>
        )}
        <SheetRow icon={ShoppingBag} title="Problem with an order" subtitle="Open the order to cancel, return or call the driver" onPress={onOpenOrders} />
        <SheetRow icon={ShieldCheck} title="Privacy policy" subtitle="How we use your store data" onPress={onOpenPrivacy} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: `${Colors.text}66` },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 8, paddingHorizontal: 4 },
  title: { fontSize: 18, fontWeight: '800', color: Colors.text },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 4 },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  rowSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  notice: { backgroundColor: Colors.background, borderRadius: 12, padding: 12, marginVertical: 6 },
  noticeText: { fontSize: 13, lineHeight: 18, color: Colors.textSecondary },
});
