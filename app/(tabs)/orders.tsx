import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Package, RotateCcw, Truck, CheckCircle, Clock, MapPin } from 'lucide-react-native';

type OrderStatus = 'processing' | 'shipped' | 'delivered' | 'returned';
type TabType = 'orders' | 'returns';

interface Order {
  id: string;
  productName: string;
  productImage: string;
  price: number;
  quantity: number;
  status: OrderStatus;
  date: string;
  trackingNumber?: string;
}

const sampleOrders: Order[] = [
  {
    id: '1',
    productName: 'iPhone 15 Pro',
    productImage: 'https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg?auto=compress&cs=tinysrgb&w=200',
    price: 999.99,
    quantity: 1,
    status: 'delivered',
    date: '2024-01-15',
    trackingNumber: 'TRK123456',
  },
  {
    id: '2',
    productName: 'Nike Air Max',
    productImage: 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=200',
    price: 179.99,
    quantity: 2,
    status: 'shipped',
    date: '2024-01-18',
    trackingNumber: 'TRK789012',
  },
  {
    id: '3',
    productName: 'Sony WH-1000XM5',
    productImage: 'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&w=200',
    price: 349.99,
    quantity: 1,
    status: 'processing',
    date: '2024-01-20',
  },
];

const sampleReturns: Order[] = [
  {
    id: '4',
    productName: 'Adidas Ultraboost',
    productImage: 'https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=200',
    price: 189.99,
    quantity: 1,
    status: 'returned',
    date: '2024-01-10',
  },
];

export default function OrdersScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('orders');

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'processing':
        return <Clock size={16} color="#f59e0b" strokeWidth={2.5} />;
      case 'shipped':
        return <Truck size={16} color="#3b82f6" strokeWidth={2.5} />;
      case 'delivered':
        return <CheckCircle size={16} color="#10b981" strokeWidth={2.5} />;
      case 'returned':
        return <RotateCcw size={16} color="#8b5cf6" strokeWidth={2.5} />;
      default:
        return <Package size={16} color="#64748b" strokeWidth={2.5} />;
    }
  };

  const getStatusText = (status: OrderStatus) => {
    switch (status) {
      case 'processing':
        return 'Processing';
      case 'shipped':
        return 'Shipped';
      case 'delivered':
        return 'Delivered';
      case 'returned':
        return 'Returned';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'processing':
        return { bg: '#fef3c7', text: '#b45309' };
      case 'shipped':
        return { bg: '#dbeafe', text: '#1e40af' };
      case 'delivered':
        return { bg: '#d1fae5', text: '#065f46' };
      case 'returned':
        return { bg: '#ede9fe', text: '#5b21b6' };
      default:
        return { bg: '#f1f5f9', text: '#475569' };
    }
  };

  const displayOrders = activeTab === 'orders' ? sampleOrders : sampleReturns;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Orders</Text>
        <Text style={styles.subtitle}>Track your orders and returns</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'orders' && styles.tabActive]}
          onPress={() => setActiveTab('orders')}
        >
          <Package
            size={18}
            color={activeTab === 'orders' ? '#2563eb' : '#64748b'}
            strokeWidth={2}
          />
          <Text style={[styles.tabText, activeTab === 'orders' && styles.tabTextActive]}>
            My Orders
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'returns' && styles.tabActive]}
          onPress={() => setActiveTab('returns')}
        >
          <RotateCcw
            size={18}
            color={activeTab === 'returns' ? '#2563eb' : '#64748b'}
            strokeWidth={2}
          />
          <Text style={[styles.tabText, activeTab === 'returns' && styles.tabTextActive]}>
            Returns
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      >
        {displayOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              {activeTab === 'orders' ? (
                <Package size={40} color="#94a3b8" strokeWidth={1.5} />
              ) : (
                <RotateCcw size={40} color="#94a3b8" strokeWidth={1.5} />
              )}
            </View>
            <Text style={styles.emptyTitle}>
              {activeTab === 'orders' ? 'No orders yet' : 'No returns yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'orders'
                ? 'Start shopping to see your orders here'
                : 'Your return requests will appear here'}
            </Text>
          </View>
        ) : (
          displayOrders.map((order) => {
            const statusColors = getStatusColor(order.status);
            return (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderId}>Order #{order.id}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                    {getStatusIcon(order.status)}
                    <Text style={[styles.statusText, { color: statusColors.text }]}>
                      {getStatusText(order.status)}
                    </Text>
                  </View>
                </View>
                <View style={styles.orderContent}>
                  <Image source={{ uri: order.productImage }} style={styles.productImage} />
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {order.productName}
                    </Text>
                    <Text style={styles.orderDate}>{order.date}</Text>
                    <Text style={styles.quantity}>Qty: {order.quantity}</Text>
                    <Text style={styles.price}>${order.price.toFixed(2)}</Text>
                  </View>
                </View>
                {order.trackingNumber && (
                  <View style={styles.trackingContainer}>
                    <MapPin size={14} color="#64748b" strokeWidth={2} />
                    <Text style={styles.trackingText}>Tracking: {order.trackingNumber}</Text>
                  </View>
                )}
                <View style={styles.orderActions}>
                  <TouchableOpacity style={styles.actionButton}>
                    <Text style={styles.actionButtonText}>View Details</Text>
                  </TouchableOpacity>
                  {order.status === 'delivered' && (
                    <TouchableOpacity style={styles.actionButtonSecondary}>
                      <Text style={styles.actionButtonSecondaryText}>Return Item</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  tabActive: {
    backgroundColor: '#eff6ff',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  orderId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderContent: {
    flexDirection: 'row',
    padding: 16,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
  },
  productInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  quantity: {
    fontSize: 12,
    color: '#64748b',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563eb',
  },
  trackingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 6,
  },
  trackingText: {
    fontSize: 12,
    color: '#64748b',
  },
  orderActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  actionButtonSecondary: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionButtonSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
});
