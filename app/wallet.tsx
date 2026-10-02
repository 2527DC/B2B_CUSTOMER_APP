import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import {
  ArrowLeft,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  CheckCircle2,
  Clock,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react-native';
import apiClient from '@/config/api';
import { URLs } from '@/config/urls';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

interface WalletTransactionItem {
  id: number;
  type: string; // 'CREDIT_TOPUP' | 'CREDIT_REFUND' | 'DEBIT_ORDER' | 'DEBIT_ADJUSTMENT' | 'CREDIT_ADJUSTMENT'
  amount: number;
  balance_after: number;
  reference_type?: string | null;
  reference_id?: number | null;
  rvp_request_id?: number | null;
  note?: string | null;
  created_at: string;
}

export default function WalletScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<WalletTransactionItem[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'CREDIT' | 'DEBIT'>('ALL');

  const fetchWallet = useCallback(async () => {
    try {
      let res;
      try {
        res = await apiClient.get(URLs.WALLET);
      } catch (e: any) {
        if (e?.response?.status === 404) {
          res = await apiClient.get(URLs.WALLET_HISTORY);
        } else {
          throw e;
        }
      }

      if (res?.data) {
        if (res.data.wallet && res.data.wallet.balance !== undefined) {
          setBalance(Number(res.data.wallet.balance));
        } else if (res.data.balance !== undefined) {
          setBalance(Number(res.data.balance));
        } else if (res.data.wallet_running_balance !== undefined) {
          setBalance(Number(res.data.wallet_running_balance));
        }

        const txList =
          res.data.transactions ||
          res.data.wallet_history ||
          res.data.history ||
          res.data.recentTransactions ||
          res.data.data;

        if (Array.isArray(txList)) {
          setTransactions(txList);
        }
      }
    } catch (err) {
      console.error('Fetch wallet error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchWallet();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, fetchWallet]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWallet();
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    const isCredit = tx.type.startsWith('CREDIT');
    if (filter === 'CREDIT') return isCredit;
    if (filter === 'DEBIT') return !isCredit;
    return true;
  });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Digital Wallet</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        {/* Balance Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroWalletIcon}>
              <Wallet size={24} color="#ffffff" strokeWidth={2.2} />
            </View>
            <View style={styles.secureBadge}>
              <ShieldCheck size={14} color="#34d399" />
              <Text style={styles.secureBadgeText}>100% Safe & Instant</Text>
            </View>
          </View>

          <Text style={styles.heroLabel}>Available Balance</Text>
          <Text style={styles.heroAmount}>
            ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>

          <View style={styles.heroFooter}>
            <Text style={styles.heroFooterText}>
              Used automatically for instant refunds, returns, and order checkouts.
            </Text>
          </View>
        </View>

        {/* Transactions Section */}
        <View style={styles.transactionsHeader}>
          <Text style={styles.sectionTitle}>Transaction History</Text>
          <View style={styles.filterRow}>
            {(['ALL', 'CREDIT', 'DEBIT'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.filterChip, filter === tab && styles.filterChipActive]}
                onPress={() => setFilter(tab)}
              >
                <Text
                  style={[styles.filterChipText, filter === tab && styles.filterChipTextActive]}
                >
                  {tab === 'ALL' ? 'All' : tab === 'CREDIT' ? 'Credits (+)' : 'Debits (-)'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading transactions...</Text>
          </View>
        ) : filteredTransactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBg}>
              <RotateCcw size={32} color="#94a3b8" />
            </View>
            <Text style={styles.emptyTitle}>No transactions yet</Text>
            <Text style={styles.emptySubtitle}>
              When you receive refunds or make payments from your wallet, they will appear here.
            </Text>
          </View>
        ) : (
          <View style={styles.transactionList}>
            {filteredTransactions.map((tx) => {
              const isCredit = tx.type.startsWith('CREDIT');
              const isRefund = tx.type === 'CREDIT_REFUND';

              return (
                <View key={tx.id} style={styles.transactionItem}>
                  <View
                    style={[
                      styles.txIconContainer,
                      isCredit ? styles.txIconCredit : styles.txIconDebit,
                    ]}
                  >
                    {isCredit ? (
                      isRefund ? (
                        <RotateCcw size={18} color="#059669" strokeWidth={2.5} />
                      ) : (
                        <ArrowDownLeft size={18} color="#059669" strokeWidth={2.5} />
                      )
                    ) : (
                      <ArrowUpRight size={18} color="#dc2626" strokeWidth={2.5} />
                    )}
                  </View>

                  <View style={styles.txContent}>
                    <Text style={styles.txTitle}>
                      {isRefund
                        ? 'Return Refund Credited'
                        : tx.type === 'CREDIT_TOPUP'
                        ? 'Wallet Top-up'
                        : tx.type === 'DEBIT_ORDER'
                        ? 'Order Payment'
                        : tx.type === 'CREDIT_ADJUSTMENT'
                        ? 'Credit Adjustment'
                        : 'Debit Adjustment'}
                    </Text>
                    {!!tx.note && <Text style={styles.txNote}>{tx.note}</Text>}
                    <Text style={styles.txDate}>{formatDate(tx.created_at)}</Text>
                  </View>

                  <View style={styles.txAmountCol}>
                    <Text
                      style={[
                        styles.txAmountText,
                        isCredit ? styles.txAmountCredit : styles.txAmountDebit,
                      ]}
                    >
                      {isCredit ? '+' : '-'}₹{Number(tx.amount).toFixed(2)}
                    </Text>
                    <Text style={styles.txBalanceAfter}>
                      Bal: ₹{Number(tx.balance_after).toFixed(2)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 54,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#0f172a', // Dark premium slate card
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroWalletIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  secureBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#34d399',
  },
  heroLabel: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroAmount: {
    fontSize: 34,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 4,
    marginBottom: 16,
  },
  heroFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 12,
  },
  heroFooterText: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 16,
  },
  transactionsHeader: {
    gap: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
  },
  emptyContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyIconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  transactionList: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  txIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIconCredit: {
    backgroundColor: '#ecfdf5',
  },
  txIconDebit: {
    backgroundColor: '#fef2f2',
  },
  txContent: {
    flex: 1,
    gap: 2,
  },
  txTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  txNote: {
    fontSize: 12,
    color: '#64748b',
  },
  txDate: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  txAmountCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  txAmountText: {
    fontSize: 15,
    fontWeight: '800',
  },
  txAmountCredit: {
    color: '#059669',
  },
  txAmountDebit: {
    color: '#dc2626',
  },
  txBalanceAfter: {
    fontSize: 11,
    color: '#94a3b8',
  },
});
