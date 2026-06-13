import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShoppingBag, Sparkles, ShieldCheck, ArrowRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';

const { width, height } = Dimensions.get('window');

interface Slide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<any>;
  colors: string[];
}

const slides: Slide[] = [
  {
    id: '1',
    title: 'Discover Trends',
    subtitle: 'Premium & Curated E-Commerce',
    description: 'Explore our hand-picked collection of premium brands and exclusive trends tailored to your aesthetic.',
    icon: Sparkles,
    colors: ['#2563eb', '#1d4ed8'],
  },
  {
    id: '2',
    title: 'Top Brand Partners',
    subtitle: '100% Authentic Products Only',
    description: 'We partner directly with international brands to guarantee genuine products and pristine service quality.',
    icon: ShoppingBag,
    colors: ['#10b981', '#047857'],
  },
  {
    id: '3',
    title: 'Secure & Fast',
    subtitle: 'Express Delivery Worldwide',
    description: 'Experience seamless shopping with safe, encrypted transactions and supercharged express delivery.',
    icon: ShieldCheck,
    colors: ['#f59e0b', '#b45309'],
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
            <Text style={styles.logoText}>S</Text>
          </View>
          <Text style={styles.appName}>Shop<Text style={styles.accentText}>Premium</Text></Text>
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
                  colors={slide.colors as any}
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

      {/* Bottom Footer Section */}
      <View style={styles.footer}>
        {/* Dot Indicators */}
        <View style={styles.indicators}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                index === activeIndex && styles.indicatorActive,
              ]}
            />
          ))}
        </View>

        {/* Action Button */}
        <TouchableOpacity onPress={handleNext} activeOpacity={0.9} style={styles.actionButton}>
          <LinearGradient
            colors={['#2563eb', '#1d4ed8']}
            style={styles.btnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.actionBtnText}>
              {activeIndex === slides.length - 1 ? 'Get Started' : 'Next'}
            </Text>
            <ArrowRight size={18} color="#ffffff" strokeWidth={2.5} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 40 : 16,
    height: 70,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    backgroundColor: '#2563eb',
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  appName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  accentText: {
    color: '#2563eb',
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
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
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
    color: '#2563eb',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  titleText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
    letterSpacing: -1,
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
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
    backgroundColor: '#2563eb',
  },
  actionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#2563eb',
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
