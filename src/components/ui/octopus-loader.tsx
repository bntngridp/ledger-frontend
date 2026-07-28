import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { ThemedText } from '../themed-text';
import { useTheme } from '@/hooks/use-theme';

interface OctopusLoaderProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  fullScreen?: boolean;
}

export function OctopusLoader({
  size = 'large',
  message,
  fullScreen = false,
}: OctopusLoaderProps) {
  const theme = useTheme();

  // Animation References
  const swimAnim = useRef(new Animated.Value(0)).current;
  const tentacleWiggleAnim = useRef(new Animated.Value(0)).current;
  const bubble1Anim = useRef(new Animated.Value(0)).current;
  const bubble2Anim = useRef(new Animated.Value(0)).current;
  const bubble3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Swimming bobbing animation (up & down)
    const swimLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(swimAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(swimAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    // 2. Tentacles wiggle animation
    const tentacleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(tentacleWiggleAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(tentacleWiggleAnim, {
          toValue: 0,
          duration: 600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // 3. Bubbles floating upwards animation
    const createBubbleLoop = (anim: Animated.Value, delay: number, duration: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: duration,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const b1Loop = createBubbleLoop(bubble1Anim, 0, 1800);
    const b2Loop = createBubbleLoop(bubble2Anim, 400, 2200);
    const b3Loop = createBubbleLoop(bubble3Anim, 900, 1600);

    swimLoop.start();
    tentacleLoop.start();
    b1Loop.start();
    b2Loop.start();
    b3Loop.start();

    return () => {
      swimLoop.stop();
      tentacleLoop.stop();
      b1Loop.stop();
      b2Loop.stop();
      b3Loop.stop();
    };
  }, [swimAnim, tentacleWiggleAnim, bubble1Anim, bubble2Anim, bubble3Anim]);

  // Interpolations
  const translateY = swimAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, size === 'small' ? -6 : -14],
  });

  const bodyScaleY = swimAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.05, 0.96],
  });

  const tentacleRotate1 = tentacleWiggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-12deg', '12deg'],
  });

  const tentacleRotate2 = tentacleWiggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['10deg', '-10deg'],
  });

  // Size configurations
  const dimensions = {
    small: { body: 32, font: 24, bubbleMax: 20 },
    medium: { body: 56, font: 44, bubbleMax: 40 },
    large: { body: 80, font: 64, bubbleMax: 60 },
  }[size];

  const renderBubbles = () => (
    <View style={styles.bubblesContainer}>
      <Animated.View
        style={[
          styles.bubble,
          {
            backgroundColor: theme.primary + '60',
            width: size === 'small' ? 4 : 8,
            height: size === 'small' ? 4 : 8,
            left: '30%',
            opacity: bubble1Anim.interpolate({
              inputRange: [0, 0.8, 1],
              outputRange: [0.9, 0.6, 0],
            }),
            transform: [
              {
                translateY: bubble1Anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -dimensions.bubbleMax],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.bubble,
          {
            backgroundColor: theme.primary + '50',
            width: size === 'small' ? 3 : 6,
            height: size === 'small' ? 3 : 6,
            left: '60%',
            opacity: bubble2Anim.interpolate({
              inputRange: [0, 0.8, 1],
              outputRange: [0.8, 0.5, 0],
            }),
            transform: [
              {
                translateY: bubble2Anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [5, -dimensions.bubbleMax * 1.3],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.bubble,
          {
            backgroundColor: theme.primary + '70',
            width: size === 'small' ? 5 : 10,
            height: size === 'small' ? 5 : 10,
            left: '45%',
            opacity: bubble3Anim.interpolate({
              inputRange: [0, 0.8, 1],
              outputRange: [1, 0.4, 0],
            }),
            transform: [
              {
                translateY: bubble3Anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [2, -dimensions.bubbleMax * 1.5],
                }),
              },
            ],
          },
        ]}
      />
    </View>
  );

  const loaderContent = (
    <View style={styles.centerContainer}>
      {renderBubbles()}

      {/* Animated Swimming Octopus */}
      <Animated.View
        style={[
          styles.octopusWrapper,
          {
            transform: [
              { translateY },
              { scaleY: bodyScaleY },
            ],
          },
        ]}
      >
        {/* Octopus Emoji / Character with Swimming Tentacles */}
        <Animated.View
          style={{
            transform: [{ rotate: tentacleRotate1 }],
          }}
        >
          <ThemedText style={{ fontSize: dimensions.font }}>🐙</ThemedText>
        </Animated.View>
      </Animated.View>

      {/* Ripple wave shadow under octopus */}
      <Animated.View
        style={[
          styles.waterRipple,
          {
            backgroundColor: theme.primary + '25',
            width: dimensions.body * 0.8,
            height: size === 'small' ? 4 : 8,
            transform: [
              {
                scaleX: swimAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0.6],
                }),
              },
            ],
            opacity: swimAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.7, 0.2],
            }),
          },
        ]}
      />

      {message && (
        <ThemedText type="small" style={[styles.messageText, { color: theme.textSecondary }]}>
          {message}
        </ThemedText>
      )}
    </View>
  );

  if (fullScreen) {
    return (
      <View style={[styles.fullScreenOverlay, { backgroundColor: theme.background }]}>
        {loaderContent}
      </View>
    );
  }

  return loaderContent;
}

const styles = StyleSheet.create({
  fullScreenOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    position: 'relative',
  },
  bubblesContainer: {
    position: 'absolute',
    width: 60,
    height: 60,
    top: 0,
  },
  bubble: {
    position: 'absolute',
    borderRadius: 50,
  },
  octopusWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterRipple: {
    borderRadius: 10,
    marginTop: 4,
  },
  messageText: {
    marginTop: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
