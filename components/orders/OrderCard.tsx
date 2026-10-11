import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Linking, Alert } from 'react-native';
import {
  CheckCircle,
  ChevronRight,
  Clock,
  Package,
  Phone,
  RotateCcw,
  Truck,
  User as UserIcon,
  XCircle,
  type LucideIcon,
} from 'lucide-react-native';
import { Colors, getComponentTheme } from '@/constants/theme';
import { URLs } from '@/config/urls';

const badge = getComponentTheme(Colors).badge;
const PREVIEW_ITEMS = 2;

/** Shape of an order as returned by /order-by-delivery-status (fields used here only). */
export interface OrderCardData {
  id: number;
  order_number: string;
  grand_total: number | string;
  created_at: string;
  status?: string;
  order_status?: number;
  is_rto?: boolean;
  rto_reason?: string | null;
  note?: string | null;
  cancel_reason?: string | null;
  packages?: { id: number; package_code: string; delivery_status: string | number; products: any[] }[];
  items?: any[];
  salesman_name?: string | null;
  salesman_phone?: string | null;
  salesman?: { id: number; name: string; phone?: string; salesman_code?: string } | null;
}

interface StatusMeta {
  label: string;
  icon: LucideIcon;
  bg: string;
  fg: string;
}

function statusOf(order: OrderCardData): StatusMeta {
  const isRto = order.is_rto || order.status === 'RTO_INITIATED' || order.status === 'RTO_COMPLETED';
  if (isRto) {
    return {
      label: order.status === 'RTO_COMPLETED' ? 'Returned to hub' : 'Returning to hub',
      icon: RotateCcw,
      bg: badge.warningBg,
      fg: badge.warningText,
    };
  }
  if (order.status === 'CANCELLED') return { label: 'Cancelled', icon: XCircle, bg: badge.dangerBg, fg: badge.dangerText };

  const raw = order.packages?.[0]?.delivery_status ?? order.order_status ?? 1;
  const s = typeof raw === 'string' ? parseInt(raw, 10) : raw;
  if (s === 6) return { label: 'Returning to hub', icon: RotateCcw, bg: badge.warningBg, fg: badge.warningText };
  if (s === 4) return { label: 'Cancelled', icon: XCircle, bg: badge.dangerBg, fg: badge.dangerText };
  if (s === 2) return { label: 'Confirmed', icon: CheckCircle, bg: badge.primaryBg, fg: badge.primaryText };
  if (s === 3) return { label: 'Out for delivery', icon: Truck, bg: `${Colors.info}1a`, fg: Colors.info };
  if (s >= 5) return { label: 'Delivered', icon: CheckCircle, bg: badge.successBg, fg: badge.successText };
  return { label: 'Pending', icon: Clock, bg: badge.warningBg, fg: badge.warningText };
}

interface LineItem {
  key: string;
  name: string;
  image: string;
  qty: number;
  price: number;
}

function lineItemsOf(order: OrderCardData): LineItem[] {
  if (order.packages && order.packages.length > 0) {
    return order.packages.flatMap((pkg) =>
      (pkg.products || []).map((item: any, i: number) => {
        const prod = item.seller_product_sku?.product;
        return {
          key: `${pkg.id}-${item.id ?? i}`,
          name: prod?.product_name ?? prod?.product?.product_name ?? item.product_title ?? 'Product item',
          image: prod?.thum_img ?? prod?.product?.thumbnail_image_source ?? item.thumbnail ?? '',
          qty: Number(item.qty) || 0,
          price: Number(item.price) || 0,
        };
      }),
    );
  }
  return (order.items || []).map((item: any, i: number) => ({
    key: String(item.id ?? i),
    name: item.product_title || item.seller_product_sku?.product?.product_name || 'Product item',
    image: item.thumbnail || item.seller_product_sku?.product?.thum_img || '',
    qty: Number(item.qty) || 0,
    price: Number(item.price ?? item.unit_price) || 0,
  }));
}

const inr = (value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function callNumber(phone: string, who: string) {
  Linking.openURL(`tel:${phone}`).catch(() => Alert.alert('Unable to call', `Please call ${who} from your phone dialler.`));
}

interface OrderCardProps {
  order: OrderCardData;
  onPress: () => void;
}

/** One order in the list: status first, a compact item preview, total, and a direct line to the salesman. */
export default function OrderCard({ order, onPress }: OrderCardProps) {
  const status = statusOf(order);
  const StatusIcon = status.icon;
  const items = lineItemsOf(order);
  const preview = items.slice(0, PREVIEW_ITEMS);
  const remaining = items.length - preview.length;
  const total = parseFloat(String(order.grand_total)) || 0;

  const salesmanName = order.salesman?.name || order.salesman_name || null;
  const salesmanPhone = order.salesman?.phone || order.salesman_phone || null;
  const isRto = order.is_rto || order.status === 'RTO_INITIATED' || order.status === 'RTO_COMPLETED';
  const rtoReason = order.rto_reason || order.cancel_reason || order.note;

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.92} onPress={onPress} accessibilityRole="button">
      {/* Header: status first, then order identity */}
      <View style={styles.header}>
        <View style={[styles.statusIcon, { backgroundColor: status.bg }]}>
          <StatusIcon size={18} color={status.fg} strokeWidth={2.4} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.statusLabel, { color: status.fg }]}>{status.label}</Text>
          <Text style={styles.orderMeta} numberOfLines={1}>
            #{order.order_number}  ·  {formatDate(order.created_at)}
          </Text>
        </View>
        <ChevronRight size={18} color={Colors.textMuted} strokeWidth={2.4} />
      </View>

      {isRto && rtoReason ? (
        <View style={[styles.notice, { backgroundColor: badge.warningBg }]}>
          <Text style={[styles.noticeText, { color: badge.warningText }]} numberOfLines={2}>
            {rtoReason}
          </Text>
        </View>
      ) : null}

      {/* Item preview */}
      <View style={styles.items}>
        {preview.map((item) => (
          <View key={item.key} style={styles.itemRow}>
            <Image
              source={item.image ? { uri: URLs.assetUrl(item.image) } : require('@/assets/images/icon.png')}
              style={styles.itemImage}
            />
            <View style={styles.itemText}>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.itemQty}>
                {item.qty} × {inr(item.price)}
              </Text>
            </View>
          </View>
        ))}
        {preview.length === 0 ? (
          <View style={styles.itemRow}>
            <View style={[styles.itemImage, styles.itemPlaceholder]}>
              <Package size={18} color={Colors.textMuted} strokeWidth={2} />
            </View>
            <Text style={styles.itemQty}>Item details are in the order</Text>
          </View>
        ) : null}
        {remaining > 0 ? <Text style={styles.moreItems}>+{remaining} more item{remaining > 1 ? 's' : ''}</Text> : null}
      </View>

      {/* Total */}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>
          {items.length} item{items.length === 1 ? '' : 's'}
        </Text>
        <Text style={styles.totalValue}>{inr(total)}</Text>
      </View>

      {/* Salesman strip with direct call */}
      {salesmanName ? (
        <View style={styles.salesman}>
          <View style={styles.salesmanAvatar}>
            <UserIcon size={16} color={Colors.primary} strokeWidth={2.4} />
          </View>
          <View style={styles.salesmanText}>
            <Text style={styles.salesmanName} numberOfLines={1}>
              {salesmanName}
            </Text>
            <Text style={styles.salesmanRole}>Your sales representative</Text>
          </View>
          {salesmanPhone ? (
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => callNumber(salesmanPhone, salesmanName)}
              activeOpacity={0.85}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Call ${salesmanName}`}
            >
              <Phone size={15} color={Colors.textWhite} strokeWidth={2.6} />
              <Text style={styles.callText}>Call</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 16 },
  statusIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  statusLabel: { fontSize: 15, fontWeight: '800' },
  orderMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  notice: { marginHorizontal: 16, marginTop: 12, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  noticeText: { fontSize: 12, fontWeight: '600', lineHeight: 17 },

  items: { paddingHorizontal: 16, paddingTop: 14, gap: 10 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  itemPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  itemText: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  itemQty: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  moreItems: { fontSize: 12, fontWeight: '700', color: Colors.primary, marginLeft: 60 },

  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 14,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  totalLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  totalValue: { fontSize: 17, fontWeight: '800', color: Colors.text, letterSpacing: -0.3 },

  salesman: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.primary10,
  },
  salesmanAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  salesmanText: { flex: 1 },
  salesmanName: { fontSize: 13, fontWeight: '700', color: Colors.text },
  salesmanRole: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.primary,
  },
  callText: { fontSize: 13, fontWeight: '700', color: Colors.textWhite },
});
