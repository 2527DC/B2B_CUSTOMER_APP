import React, { useState, useRef, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView,
  Dimensions, TouchableOpacity, Image,
} from 'react-native';

import { Colors } from '@/constants/theme';

const { width } = Dimensions.get('window');
const SLIDE_WIDTH = width;

interface PromoSliderProps {
  // Pass absolute image URLs from the API.
  // If empty or not provided, PromoSlider renders nothing (null).
  images?: string[];
}

export function PromoSlider({ images }: PromoSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // If no images returned from backend, do not display the slider
  if (!images || images.length === 0) {
    return null;
  }

  const slideCount = images.length;

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
        {images.map((uri, i) => (
          <TouchableOpacity key={i} activeOpacity={0.9} style={styles.slide}>
            <Image
              source={{ uri }}
              style={styles.slideImage}
              resizeMode="cover"
              onError={e => console.warn('[PromoSlider] image load error', uri, e.nativeEvent.error)}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Dot indicators — only shown if there are multiple slides */}
      {slideCount > 1 && (
        <View style={styles.indicators}>
          {Array.from({ length: slideCount }).map((_, i) => (
            <View
              key={i}
              style={[styles.indicator, i === activeIndex && styles.indicatorActive]}
            />
          ))}
        </View>
      )}
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
