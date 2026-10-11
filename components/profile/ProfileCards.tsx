import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  ChevronRight,
  FileText,
  Heart,
  MapPin,
  MessageCircle,
  Phone,
  RotateCcw,
  ShoppingBag,
  User as UserIcon,
  Wallet,
  Warehouse,
} from 'lucide-react-native';
import { Colors, getComponentTheme } from '@/constants/theme';

const badge = getComponentTheme(Colors).badge;

export const cardShadow = {
  shadowColor: Colors.text,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.06,
  shadowRadius: 12,
  elevation: 3,
} as const;

const inr = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ─────────────────────────── Section title ─────────────────────────── */

export function SectionTitle({ children, action }: { children: string; action?: React.ReactNode }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {action}
    </View>
  );
}

/* ─────────────────────────── Wallet ─────────────────────────── */

export function WalletCard({ balance, loading, onPress }: { balance: number | null; loading: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.card, styles.walletCard]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Dhatri wallet balance ${balance === null ? 'loading' : `rupees ${inr.format(balance)}`}. Open wallet history`}
    >
      <View style={styles.walletIcon}>
        <Wallet size={22} color={Colors.primary} strokeWidth={2.2} />
      </View>
      <View style={styles.flex1}>
        <Text style={styles.walletLabel}>Dhatri Wallet</Text>
        {loading && balance === null ? (
          <View style={styles.walletSkeleton} />
        ) : (
          <Text style={styles.walletAmount}>₹{inr.format(balance ?? 0)}</Text>
        )}
        <Text style={styles.walletHint} numberOfLines={1}>
          Refunds are credited here
        </Text>
      </View>
      <View style={styles.walletAction}>
        <Text style={styles.walletActionText}>History</Text>
        <ChevronRight size={14} color={Colors.primary} strokeWidth={2.6} />
      </View>
    </TouchableOpacity>
  );
}

/* ─────────────────────────── Stats ─────────────────────────── */

interface StatTile {
  key: string;
  label: string;
  value: number | null;
  icon: 'orders' | 'wishlist' | 'returns';
  chip?: string | null;
  onPress: () => void;
}

const STAT_ICONS = { orders: ShoppingBag, wishlist: Heart, returns: RotateCcw } as const;

export function StatTiles({ tiles }: { tiles: StatTile[] }) {
  return (
    <View style={styles.statRow}>
      {tiles.map((tile) => {
        const Icon = STAT_ICONS[tile.icon];
        return (
          <TouchableOpacity
            key={tile.key}
            style={[styles.card, styles.statTile]}
            onPress={tile.onPress}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`${tile.label}: ${tile.value ?? 'loading'}`}
          >
            <View style={styles.statIcon}>
              <Icon size={18} color={Colors.primary} strokeWidth={2.2} />
            </View>
            {tile.value === null ? (
              <View style={styles.statSkeleton} />
            ) : (
              <Text style={styles.statValue}>{tile.value}</Text>
            )}
            <Text style={styles.statLabel}>{tile.label}</Text>
            {tile.chip ? (
              <View style={styles.statChip}>
                <Text style={styles.statChipText}>{tile.chip}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* ─────────────────────────── Drop location ─────────────────────────── */

export type DropLocationStatus = 'APPROVED' | 'PENDING_APPROVAL' | 'REJECTED' | 'NONE';

export interface DropLocationSummary {
  status: DropLocationStatus;
  address: string | null;
  pendingAddress: string | null;
  rejectionReason: string | null;
}

const LOCATION_STATUS: Record<DropLocationStatus, { label: string; bg: string; fg: string }> = {
  APPROVED: { label: 'Approved', bg: badge.successBg, fg: badge.successText },
  PENDING_APPROVAL: { label: 'Change under review', bg: badge.warningBg, fg: badge.warningText },
  REJECTED: { label: 'Change rejected', bg: badge.dangerBg, fg: badge.dangerText },
  NONE: { label: 'Not set', bg: badge.warningBg, fg: badge.warningText },
};

export function DropLocationCard({
  location,
  loading,
  onPress,
}: {
  location: DropLocationSummary | null;
  loading: boolean;
  onPress: () => void;
}) {
  const status = location?.status ?? 'NONE';
  const meta = LOCATION_STATUS[status];
  const hasAddress = Boolean(location?.address);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85} accessibilityRole="button">
      <View style={styles.locationTop}>
        <View style={styles.locationIcon}>
          <MapPin size={20} color={Colors.primary} strokeWidth={2.2} />
        </View>
        <View style={styles.flex1}>
          <View style={styles.locationTitleRow}>
            <Text style={styles.cardTitle}>Store drop point</Text>
            {!loading ? (
              <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
                <Text style={[styles.statusPillText, { color: meta.fg }]}>{meta.label}</Text>
              </View>
            ) : null}
          </View>
          {loading ? (
            <>
              <View style={[styles.lineSkeleton, { width: '90%' }]} />
              <View style={[styles.lineSkeleton, { width: '60%' }]} />
            </>
          ) : hasAddress ? (
            <Text style={styles.locationAddress} numberOfLines={2}>
              {location?.address}
            </Text>
          ) : (
            <Text style={styles.locationAddressMuted}>
              Pin the exact spot where our driver should unload your order.
            </Text>
          )}
        </View>
      </View>

      {!loading && status === 'PENDING_APPROVAL' && location?.pendingAddress ? (
        <View style={[styles.note, { backgroundColor: badge.warningBg }]}>
          <Text style={[styles.noteText, { color: badge.warningText }]} numberOfLines={2}>
            Requested: {location.pendingAddress}
          </Text>
        </View>
      ) : null}
      {!loading && status === 'REJECTED' && location?.rejectionReason ? (
        <View style={[styles.note, { backgroundColor: badge.dangerBg }]}>
          <Text style={[styles.noteText, { color: badge.dangerText }]} numberOfLines={2}>
            {location.rejectionReason}
          </Text>
        </View>
      ) : null}

      <View style={styles.cardFooter}>
        <Text style={styles.cardFooterText}>{hasAddress ? 'Change drop point on map' : 'Set drop point on map'}</Text>
        <ChevronRight size={16} color={Colors.primary} strokeWidth={2.6} />
      </View>
    </TouchableOpacity>
  );
}

/* ─────────────────────────── Sales representative ─────────────────────────── */

export interface SalesRep {
  name: string;
  phone: string | null;
  code: string | null;
}

export function SalesRepCard({ rep, onCall, onWhatsApp }: { rep: SalesRep; onCall: () => void; onWhatsApp: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.repRow}>
        <View style={styles.repAvatar}>
          <UserIcon size={20} color={Colors.primary} strokeWidth={2.2} />
        </View>
        <View style={styles.flex1}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {rep.name}
          </Text>
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            Sales representative{rep.code ? `  ·  ${rep.code}` : ''}
          </Text>
        </View>
      </View>
      <Text style={styles.repHint}>Quotes, credit, returns or anything about your account.</Text>
      {rep.phone ? (
        <View style={styles.repActions}>
          <TouchableOpacity style={[styles.repButton, styles.repButtonPrimary]} onPress={onCall} activeOpacity={0.85}>
            <Phone size={16} color={Colors.textWhite} strokeWidth={2.4} />
            <Text style={styles.repButtonPrimaryText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.repButton, styles.repButtonSecondary]} onPress={onWhatsApp} activeOpacity={0.85}>
            <MessageCircle size={16} color={Colors.primary} strokeWidth={2.4} />
            <Text style={styles.repButtonSecondaryText}>WhatsApp</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

/* ─────────────────────────── Business details ─────────────────────────── */

export function BusinessDetailsCard({
  gstNumber,
  hubName,
  onEdit,
}: {
  gstNumber: string | null | undefined;
  hubName: string | null | undefined;
  onEdit: () => void;
}) {
  return (
    <View style={[styles.card, styles.cardFlush]}>
      <TouchableOpacity style={styles.detailRow} onPress={onEdit} activeOpacity={0.7} accessibilityRole="button">
        <FileText size={18} color={Colors.textSecondary} strokeWidth={2.2} />
        <Text style={styles.detailLabel}>GSTIN</Text>
        {gstNumber ? (
          <Text style={styles.detailValue} numberOfLines={1}>
            {gstNumber}
          </Text>
        ) : (
          <Text style={styles.detailAction}>Add GSTIN</Text>
        )}
      </TouchableOpacity>
      <View style={styles.divider} />
      <View style={styles.detailRow}>
        <Warehouse size={18} color={Colors.textSecondary} strokeWidth={2.2} />
        <Text style={styles.detailLabel}>Fulfilment hub</Text>
        <Text style={hubName ? styles.detailValue : styles.detailMuted} numberOfLines={1}>
          {hubName || 'Assigned after approval'}
        </Text>
      </View>
    </View>
  );
}

/* ─────────────────────────── Styles ─────────────────────────── */

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...cardShadow,
  },
  cardFlush: { paddingVertical: 4 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  cardSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  walletCard: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 18 },
  walletIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primary10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletLabel: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  walletAmount: { fontSize: 26, fontWeight: '800', color: Colors.text, letterSpacing: -0.6, marginTop: 2 },
  walletSkeleton: { width: 110, height: 26, borderRadius: 8, backgroundColor: Colors.borderLight, marginTop: 4 },
  walletHint: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  walletAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.primary10,
  },
  walletActionText: { fontSize: 12, fontWeight: '700', color: Colors.primary },

  statRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  statTile: { flex: 1, paddingVertical: 14, paddingHorizontal: 12 },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.primary10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '800', color: Colors.text, marginTop: 10, letterSpacing: -0.4 },
  statSkeleton: { width: 28, height: 22, borderRadius: 6, backgroundColor: Colors.borderLight, marginTop: 12 },
  statLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginTop: 2 },
  statChip: {
    position: 'absolute',
    top: 12,
    right: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: Colors.primary,
  },
  statChipText: { fontSize: 10, fontWeight: '800', color: Colors.textWhite },

  locationTop: { flexDirection: 'row', gap: 12 },
  locationIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.primary10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  locationAddress: { fontSize: 13, lineHeight: 19, color: Colors.text, marginTop: 4 },
  locationAddressMuted: { fontSize: 13, lineHeight: 19, color: Colors.textSecondary, marginTop: 4 },
  lineSkeleton: { height: 12, borderRadius: 6, backgroundColor: Colors.borderLight, marginTop: 8 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  note: { marginTop: 12, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  noteText: { fontSize: 12, fontWeight: '600', lineHeight: 17 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  cardFooterText: { fontSize: 13, fontWeight: '700', color: Colors.primary },

  repRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  repAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repHint: { fontSize: 12, color: Colors.textSecondary, marginTop: 10, lineHeight: 17 },
  repActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  repButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 12,
  },
  repButtonPrimary: { backgroundColor: Colors.primary },
  repButtonPrimaryText: { fontSize: 14, fontWeight: '700', color: Colors.textWhite },
  repButtonSecondary: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  repButtonSecondaryText: { fontSize: 14, fontWeight: '700', color: Colors.primary },

  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 0, paddingVertical: 14 },
  detailLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.text },
  detailValue: { maxWidth: '55%', fontSize: 13, fontWeight: '700', color: Colors.text, letterSpacing: 0.3 },
  detailMuted: { maxWidth: '55%', fontSize: 13, color: Colors.textMuted },
  detailAction: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  divider: { height: 1, backgroundColor: Colors.borderLight },
});
