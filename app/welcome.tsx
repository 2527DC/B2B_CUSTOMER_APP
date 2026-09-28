import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShoppingBag, Sparkles, ShieldCheck, ArrowRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

interface Slide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<any>;
  colors: [string, string, ...string[]];
}

const slides: Slide[] = [
  {
    id: '1',
    title: 'B2B Wholesale Deals',
    subtitle: 'Direct Bulk Supplies',
    description: 'Procure wholesale groceries, grains, FMCG, and staples at best wholesale tier prices for your retail business.',
    icon: Sparkles,
    colors: [Colors.primaryDark, Colors.primary],
  },
  {
    id: '2',
    title: 'Verified Brand Partners',
    subtitle: '100% Genuine Quality Products',
    description: 'We partner directly with authorized distributors and manufacturers to deliver consistent, certified grade products.',
    icon: ShoppingBag,
    colors: [Colors.primary, '#629352'],
  },
  {
    id: '3',
    title: 'Fast & Secure Delivery',
    subtitle: 'Reliable Fleet Logistics',
    description: 'Experience seamless ordering with doorstep warehouse dispatch, COD payment support, and live driver tracking.',
    icon: ShieldCheck,
    colors: ['#2e5927', Colors.primary],
  },
];

export default function WelcomeScreen() {
  const { completeOnboarding } = useAuth();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / width);
    setActiveIndex(index);
  };

  const handleNext = () => {
    if (activeIndex < slides.length - 1) {
      const nextIndex = activeIndex + 1;
      scrollViewRef.current?.scrollTo({
        x: nextIndex * width,
        animated: true,
      });
      setActiveIndex(nextIndex);
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header Row */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoBadge}>
            <Image
              source={require('@/assets/images/logo.jpeg')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.appName}>Dhatri<Text style={styles.accentText}>Mart</Text></Text>
        </View>

        {activeIndex < slides.length - 1 && (
          <TouchableOpacity onPress={handleSkip} activeOpacity={0.7} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Main Slides Content */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        style={styles.scrollView}
      >
        {slides.map((slide) => {
          const IconComponent = slide.icon;
          return (
            <View key={slide.id} style={styles.slideContainer}>
              <View style={styles.imageSection}>
                <LinearGradient
                  colors={slide.colors}
                  style={styles.gradientSphere}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <IconComponent size={64} color="#ffffff" strokeWidth={1.5} />
                </LinearGradient>
              </View>

              <View style={styles.textSection}>
                <Text style={styles.subtitleText}>{slide.subtitle}</Text>
                <Text style={styles.titleText}>{slide.title}</Text>
                <Text style={styles.descriptionText}>{slide.description}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Bottom Floating Control Bar */}
      <View style={styles.footer}>
        {/* Pagination Indicators */}
        <View style={styles.indicators}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.indicator,
                activeIndex === i && styles.indicatorActive,
              ]}
            />
          ))}
        </View>

        {/* Action Button */}
        <TouchableOpacity
          onPress={handleNext}
          activeOpacity={0.8}
          style={styles.actionButton}
        >
          <LinearGradient
            colors={[Colors.primaryDark, Colors.primary]}
            style={styles.btnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.actionBtnText}>
              {activeIndex === slides.length - 1 ? 'Get Started' : 'Continue'}
            </Text>
            <ArrowRight size={20} color="#ffffff" strokeWidth={2.5} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    height: 60,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e4e7e9',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  accentText: {
    color: Colors.primary,
  },
  skipButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  scrollView: {
    flex: 1,
  },
  slideContainer: {
    width: width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  imageSection: {
    height: height * 0.35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientSphere: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  textSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  subtitleText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  titleText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 40,
    gap: 30,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#cbd5e1',
  },
  indicatorActive: {
    width: 24,
    backgroundColor: Colors.primary,
  },
  actionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
