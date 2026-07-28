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

  // Animation values for GitHub-style Octocat Swimming Physics
  const swimAnim = useRef(new Animated.Value(0)).current; // 0 to 1 cycle
  const jetParticleAnim = useRef(new Animated.Value(0)).current;
  const bubble1Anim = useRef(new Animated.Value(0)).current;
  const bubble2Anim = useRef(new Animated.Value(0)).current;
  const bubble3Anim = useRef(new Animated.Value(0)).current;

  // Ledger Brand Colors
  const LEDGER_INDIGO = '#6C63FF';
  const LEDGER_INDIGO_DARK = '#4F46E5';
  const LEDGER_EMERALD = '#10B981';
  const LEDGER_MINT_GLOW = '#34D399';

  useEffect(() => {
    // 1. GitHub-style Squish-and-Propel Swim Cycle (1400ms duration)
    const swimLoop = Animated.loop(
      Animated.timing(swimAnim, {
        toValue: 1,
        duration: 1400,
        easing: Easing.bezier(0.42, 0, 0.58, 1),
        useNativeDriver: true,
      })
    );

    // 2. Jet propulsion bubble particles
    const jetLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(jetParticleAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(jetParticleAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    // 3. Background floating water bubbles
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

    const b1Loop = createBubbleLoop(bubble1Anim, 0, 1600);
    const b2Loop = createBubbleLoop(bubble2Anim, 450, 2000);
    const b3Loop = createBubbleLoop(bubble3Anim, 900, 1800);

    swimLoop.start();
    jetLoop.start();
    b1Loop.start();
    b2Loop.start();
    b3Loop.start();

    return () => {
      swimLoop.stop();
      jetLoop.stop();
      b1Loop.stop();
      b2Loop.stop();
      b3Loop.stop();
    };
  }, [swimAnim, jetParticleAnim, bubble1Anim, bubble2Anim, bubble3Anim]);

  // Interpolations for GitHub Propulsion Swim Physics:
  // Phase 1 (0-0.2): Compress (down + squish wide)
  // Phase 2 (0.2-0.5): Propel upward (launch + stretch tall)
  // Phase 3 (0.5-0.8): Glide at peak height
  // Phase 4 (0.8-1.0): Relax & sink back to start
  const translateY = swimAnim.interpolate({
    inputRange: [0, 0.2, 0.5, 0.8, 1],
    outputRange: [0, size === 'small' ? 3 : 6, size === 'small' ? -12 : -24, size === 'small' ? -8 : -16, 0],
  });

  const scaleY = swimAnim.interpolate({
    inputRange: [0, 0.2, 0.5, 0.8, 1],
    outputRange: [1, 0.86, 1.18, 1.02, 1],
  });

  const scaleX = swimAnim.interpolate({
    inputRange: [0, 0.2, 0.5, 0.8, 1],
    outputRange: [1, 1.15, 0.86, 0.98, 1],
  });

  // Tentacle fan angle during propulsion & glide
  const tentacleWaveLeft = swimAnim.interpolate({
    inputRange: [0, 0.2, 0.5, 0.8, 1],
    outputRange: ['0deg', '15deg', '-20deg', '8deg', '0deg'],
  });

  const tentacleWaveRight = swimAnim.interpolate({
    inputRange: [0, 0.2, 0.5, 0.8, 1],
    outputRange: ['0deg', '-15deg', '20deg', '-8deg', '0deg'],
  });

  const dimensions = {
    small: { width: 36, height: 36, head: 22, tentacleH: 14, font: 12 },
    medium: { width: 64, height: 64, head: 40, tentacleH: 24, font: 14 },
    large: { width: 90, height: 90, head: 56, tentacleH: 34, font: 16 },
  }[size];

  // Render GitHub-style Vector Octopus in Ledger Brand Colors
  const renderLedgerOctopus = () => {
    const isSmall = size === 'small';
    const headSize = dimensions.head;

    return (
      <Animated.View
        style={[
          styles.octopusBodyWrapper,
          {
            transform: [
              { translateY },
              { scaleX },
              { scaleY },
            ],
          },
        ]}
      >
        {/* Octopus Dome Head (Ledger Brand Indigo Gradient) */}
        <View
          style={[
            styles.octopusHead,
            {
              width: headSize,
              height: headSize * 0.9,
              borderRadius: headSize * 0.45,
              backgroundColor: LEDGER_INDIGO,
              borderWidth: 2,
              borderColor: LEDGER_INDIGO_DARK,
            },
          ]}
        >
          {/* Head Shine Highlight */}
          <View
            style={[
              styles.headShine,
              {
                width: headSize * 0.3,
                height: headSize * 0.18,
                borderRadius: 10,
                backgroundColor: 'rgba(255, 255, 255, 0.4)',
              },
            ]}
          />

          {/* Expressive Ledger Eyes */}
          <View style={styles.eyesRow}>
            <View style={[styles.eye, { width: isSmall ? 4 : 8, height: isSmall ? 4 : 8 }]}>
              <View style={[styles.pupil, { backgroundColor: LEDGER_MINT_GLOW }]} />
            </View>
            <View style={[styles.eye, { width: isSmall ? 4 : 8, height: isSmall ? 4 : 8 }]}>
              <View style={[styles.pupil, { backgroundColor: LEDGER_MINT_GLOW }]} />
            </View>
          </View>

          {/* Cute Smiling Mouth */}
          {!isSmall && <View style={[styles.mouth, { borderColor: '#FFFFFF' }]} />}
        </View>

        {/* 8 Swimming Tentacles in Ledger Emerald & Indigo Accent */}
        <View style={[styles.tentaclesContainer, { width: headSize, height: dimensions.tentacleH }]}>
          {/* Tentacle 1 & 2 (Outer Left) */}
          <Animated.View
            style={[
              styles.tentacle,
              {
                backgroundColor: LEDGER_EMERALD,
                height: dimensions.tentacleH,
                width: isSmall ? 3 : 6,
                transform: [{ rotate: tentacleWaveLeft }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.tentacle,
              {
                backgroundColor: LEDGER_INDIGO_DARK,
                height: dimensions.tentacleH * 0.85,
                width: isSmall ? 3 : 5,
                transform: [{ rotate: tentacleWaveLeft }],
              },
            ]}
          />

          {/* Tentacle 3 & 4 (Inner Left & Middle) */}
          <Animated.View
            style={[
              styles.tentacle,
              {
                backgroundColor: LEDGER_EMERALD,
                height: dimensions.tentacleH * 1.1,
                width: isSmall ? 3 : 6,
                transform: [{ rotate: tentacleWaveRight }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.tentacle,
              {
                backgroundColor: LEDGER_MINT_GLOW,
                height: dimensions.tentacleH * 0.9,
                width: isSmall ? 3 : 5,
                transform: [{ rotate: tentacleWaveLeft }],
              },
            ]}
          />

          {/* Tentacle 5 & 6 (Inner Right & Middle) */}
          <Animated.View
            style={[
              styles.tentacle,
              {
                backgroundColor: LEDGER_MINT_GLOW,
                height: dimensions.tentacleH * 0.9,
                width: isSmall ? 3 : 5,
                transform: [{ rotate: tentacleWaveRight }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.tentacle,
              {
                backgroundColor: LEDGER_EMERALD,
                height: dimensions.tentacleH * 1.1,
                width: isSmall ? 3 : 6,
                transform: [{ rotate: tentacleWaveLeft }],
              },
            ]}
          />

          {/* Tentacle 7 & 8 (Outer Right) */}
          <Animated.View
            style={[
              styles.tentacle,
              {
                backgroundColor: LEDGER_INDIGO_DARK,
                height: dimensions.tentacleH * 0.85,
                width: isSmall ? 3 : 5,
                transform: [{ rotate: tentacleWaveRight }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.tentacle,
              {
                backgroundColor: LEDGER_EMERALD,
                height: dimensions.tentacleH,
                width: isSmall ? 3 : 6,
                transform: [{ rotate: tentacleWaveRight }],
              },
            ]}
          />
        </View>
      </Animated.View>
    );
  };

  // Water Bubbles Trail (Ledger Mint Glowing Particles)
  const renderWaterTrail = () => (
    <View style={styles.bubblesContainer}>
      <Animated.View
        style={[
          styles.bubble,
          {
            backgroundColor: LEDGER_EMERALD,
            width: size === 'small' ? 4 : 8,
            height: size === 'small' ? 4 : 8,
            left: '35%',
            opacity: bubble1Anim.interpolate({
              inputRange: [0, 0.7, 1],
              outputRange: [0.8, 0.4, 0],
            }),
            transform: [
              {
                translateY: bubble1Anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, -45],
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
            backgroundColor: LEDGER_MINT_GLOW,
            width: size === 'small' ? 3 : 6,
            height: size === 'small' ? 3 : 6,
            left: '55%',
            opacity: bubble2Anim.interpolate({
              inputRange: [0, 0.7, 1],
              outputRange: [0.9, 0.3, 0],
            }),
            transform: [
              {
                translateY: bubble2Anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [15, -55],
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
            backgroundColor: LEDGER_INDIGO,
            width: size === 'small' ? 5 : 9,
            height: size === 'small' ? 5 : 9,
            left: '45%',
            opacity: bubble3Anim.interpolate({
              inputRange: [0, 0.7, 1],
              outputRange: [0.7, 0.2, 0],
            }),
            transform: [
              {
                translateY: bubble3Anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [5, -60],
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
      {renderWaterTrail()}
      {renderLedgerOctopus()}

      {/* Water Propulsion Ripple Shadow */}
      <Animated.View
        style={[
          styles.waterRipple,
          {
            backgroundColor: LEDGER_EMERALD + '35',
            width: dimensions.head * 0.9,
            height: size === 'small' ? 3 : 6,
            transform: [
              {
                scaleX: swimAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [1, 0.5, 1],
                }),
              },
            ],
            opacity: swimAnim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.6, 0.15, 0.6],
            }),
          },
        ]}
      />

      {message && (
        <ThemedText
          type="smallBold"
          style={[
            styles.messageText,
            { color: theme.textSecondary, fontSize: dimensions.font },
          ]}
        >
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
    padding: 8,
    position: 'relative',
  },
  bubblesContainer: {
    position: 'absolute',
    width: 70,
    height: 70,
    top: 0,
  },
  bubble: {
    position: 'absolute',
    borderRadius: 50,
  },
  octopusBodyWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  octopusHead: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  headShine: {
    position: 'absolute',
    top: 5,
    left: 6,
  },
  eyesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '50%',
    marginTop: 4,
  },
  eye: {
    backgroundColor: '#FFFFFF',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pupil: {
    width: '60%',
    height: '60%',
    borderRadius: 50,
  },
  mouth: {
    width: 6,
    height: 3,
    borderBottomWidth: 1.5,
    borderRadius: 3,
    marginTop: 2,
  },
  tentaclesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    marginTop: -2,
  },
  tentacle: {
    borderRadius: 4,
    marginHorizontal: 1,
  },
  waterRipple: {
    borderRadius: 10,
    marginTop: 8,
  },
  messageText: {
    marginTop: 10,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
