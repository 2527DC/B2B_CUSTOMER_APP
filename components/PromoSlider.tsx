import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Dimensions, TouchableOpacity, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors } from '@/constants/theme';

const { width } = Dimensions.get('window');
const SLIDE_WIDTH = width;

interface PromoSliderProps {
  // Pass absolute image URLs from the API.
  // Falls back to gradient placeholders if empty or not provided.
  images?: string[];
}

// Fallback gradient slides shown when no API images are available
const fallbackSlides = [
  { id: '1', title: 'Wholesale Grocery Deals', subtitle: 'Direct bulk pricing on top essentials', gradient: [Colors.primaryDark, Colors.primary] as const },
  { id: '2', title: 'Fresh Grains & Pulses',    subtitle: '100% verified quality guarantee',     gradient: [Colors.primary, '#629352'] as const },
  { id: '3', title: 'Instant B2B Delivery',     subtitle: 'Fast dispatch from your local hub',   gradient: ['#2e5927', Colors.primary] as const },
];

export function PromoSlider({ images }: PromoSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const useApiImages = images && images.length > 0;
  const slideCount = useApiImages ? images.length : fallbackSlides.length;

  useEffect(() => {
    if (slideCount <= 1) return;
    const timer = setInterval(() => {
      const nextIndex = (activeIndex + 1) % slideCount;
      scrollViewRef.current?.scrollTo({ x: nextIndex * SLIDE_WIDTH, animated: true });
      setActiveIndex(nextIndex);
    }, 4000);
    return () => clearInterval(timer);
  }, [activeIndex, slideCount]);

  const handleScroll = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SLIDE_WIDTH);
    setActiveIndex(index);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
      >
        {useApiImages
          ? images.map((uri, i) => (
              <TouchableOpacity key={i} activeOpacity={0.9} style={styles.slide}>
                <Image
                  source={{ uri }}
                  style={styles.slideImage}
                  resizeMode="cover"
                  onError={e => console.warn('[PromoSlider] image load error', uri, e.nativeEvent.error)}
                />
              </TouchableOpacity>
            ))
          : fallbackSlides.map(slide => (
              <TouchableOpacity key={slide.id} activeOpacity={0.9} style={styles.slide}>
                <LinearGradient
                  colors={slide.gradient}
                  style={styles.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.slideContent}>
                    <Text style={styles.slideTitle}>{slide.title}</Text>
                    <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>
                  </View>
                  <View style={styles.decorCircle} />
                </LinearGradient>
              </TouchableOpacity>
            ))}
      </ScrollView>

      {/* Dot indicators */}
      <View style={styles.indicators}>
        {Array.from({ length: slideCount }).map((_, i) => (
          <View
            key={i}
            style={[styles.indicator, i === activeIndex && styles.indicatorActive]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 0,
  },
  scrollContent: {},
  slide: {
    width: SLIDE_WIDTH,
    height: 200,
    borderRadius: 0,
    overflow: 'hidden',
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    width: '100%',
    height: '100%',
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  slideContent: {
    flex: 1,
    justifyContent: 'center',
    zIndex: 1,
  },
  slideTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  slideSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  decorCircle: {
    position: 'absolute',
    right: -30,
    top: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
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
});
