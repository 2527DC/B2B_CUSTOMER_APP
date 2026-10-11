import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';
import { BadgeCheck, CircleAlert, Clock, Leaf, Pencil, Warehouse } from 'lucide-react-native';
import { Colors, getComponentTheme } from '@/constants/theme';
import type { User } from '@/context/AuthContext';
import { URLs } from '@/config/urls';

const badge = getComponentTheme(Colors).badge;
const WHITE_08 = `${Colors.textWhite}14`;
const WHITE_12 = `${Colors.textWhite}1f`;
const WHITE_20 = `${Colors.textWhite}33`;
const WHITE_35 = `${Colors.textWhite}59`;
const WHITE_80 = `${Colors.textWhite}cc`;

const AVATAR = 96;

function initialsOf(text: string) {
  const parts = text.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'D';
  const first = parts[0][0] ?? '';
  const second = parts.length > 1 ? parts[1][0] ?? '' : parts[0][1] ?? '';
  return (first + second).toUpperCase();
}

/** Small white seal on the avatar's lower edge, Instagram style. */
function VerificationSeal({ status }: { status?: User['approval_status'] }) {
  const pending = status === 'PENDING';
  const rejected = status === 'REJECTED';
  const label = pending ? 'Verification pending' : rejected ? 'Verification rejected' : 'Verified store';
  return (
    <View style={styles.seal} accessible accessibilityLabel={label}>
      {pending ? (
        <Clock size={20} color={badge.warningText} strokeWidth={2.6} />
      ) : rejected ? (
        <CircleAlert size={20} color={badge.dangerText} strokeWidth={2.6} />
      ) : (
        // Solid green badge with a white tick, like a platform verified mark
        <BadgeCheck size={28} color={Colors.textWhite} fill={Colors.primary} strokeWidth={2} />
      )}
    </View>
  );
}

/** Green band with a curved lower edge, drawn in SVG so the curve stays smooth at any width. */
function CurvedBackdrop() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Defs>
          <SvgLinearGradient id="profileBand" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={Colors.primaryDark} />
            <Stop offset="1" stopColor={Colors.primary} />
          </SvgLinearGradient>
        </Defs>
        <Path d="M0 0 H100 V84 C72 100 28 100 0 84 Z" fill="url(#profileBand)" />
      </Svg>

      {/* Soft decorative shapes, kept inside the green area */}
      <View style={[styles.blob, styles.blobTopRight]} />
      <View style={[styles.blob, styles.blobLeft]} />
      <View style={styles.leafMark}>
        <Leaf size={120} color={WHITE_08} strokeWidth={1.4} />
      </View>
    </View>
  );
}

interface ProfileHeaderProps {
  user: User | null;
  topInset: number;
  onEdit: () => void;
}

/** Identity header: circular store avatar with verification seal, name, contact and hub. */
export default function ProfileHeader({ user, topInset, onEdit }: ProfileHeaderProps) {
  const displayName = user?.store_name || user?.name || 'Your store';
  const ownerLine = [user?.store_name ? user?.name : null, user?.phone ? `+91 ${user.phone}` : null]
    .filter(Boolean)
    .join('  ·  ');
  const photo = user?.shop_image_url ? URLs.assetUrl(user.shop_image_url) : null;
  const hubName = user?.warehouse?.name;
  const status = user?.approval_status;
  const statusNote = status === 'PENDING' ? 'Verification pending' : status === 'REJECTED' ? 'Verification rejected' : null;

  return (
    <View style={[styles.band, { paddingTop: topInset + 8 }]}>
      <CurvedBackdrop />

      <View style={styles.topRow}>
        <Text style={styles.screenTitle}>Profile</Text>
        <TouchableOpacity
          onPress={onEdit}
          style={styles.editButton}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Edit store profile"
        >
          <Pencil size={14} color={Colors.textWhite} strokeWidth={2.4} />
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.identity}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatarRing}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.avatarImage} accessibilityIgnoresInvertColors />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>{initialsOf(displayName)}</Text>
              </View>
            )}
          </View>
          <VerificationSeal status={status} />
        </View>

        <Text style={styles.storeName} numberOfLines={2}>
          {displayName}
        </Text>
        {ownerLine ? (
          <Text style={styles.ownerLine} numberOfLines={1}>
            {ownerLine}
          </Text>
        ) : null}

        <View style={styles.pillRow}>
          {statusNote ? (
            <View style={styles.pill}>
              <Text style={styles.pillText}>{statusNote}</Text>
            </View>
          ) : null}
          {hubName ? (
            <View style={styles.pill}>
              <Warehouse size={13} color={Colors.textWhite} strokeWidth={2.4} />
              <Text style={styles.pillText} numberOfLines={1}>
                {hubName}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    paddingHorizontal: 20,
    paddingBottom: 72,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: WHITE_08,
  },
  blobTopRight: { width: 220, height: 220, top: -90, right: -70 },
  blobLeft: { width: 140, height: 140, top: 90, left: -80 },
  leafMark: { position: 'absolute', right: 14, top: 120, transform: [{ rotate: '-18deg' }] },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  screenTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textWhite,
    letterSpacing: -0.2,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: WHITE_20,
    borderWidth: 1,
    borderColor: WHITE_20,
  },
  editText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textWhite,
  },

  identity: {
    alignItems: 'center',
    marginTop: 8,
  },
  avatarWrap: {
    width: AVATAR,
    height: AVATAR,
  },
  avatarRing: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    padding: 4,
    backgroundColor: WHITE_35,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: AVATAR / 2,
    backgroundColor: Colors.surface,
  },
  avatarFallback: {
    flex: 1,
    borderRadius: AVATAR / 2,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  seal: {
    position: 'absolute',
    right: -2,
    bottom: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },

  storeName: {
    marginTop: 14,
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textWhite,
    letterSpacing: -0.4,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  ownerLine: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '500',
    color: WHITE_80,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: WHITE_12,
    borderWidth: 1,
    borderColor: WHITE_20,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textWhite,
    flexShrink: 1,
  },
});
