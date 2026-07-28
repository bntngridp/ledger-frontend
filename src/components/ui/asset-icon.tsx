import React from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle, type ImageStyle } from 'react-native';

export type AssetSymbol =
  | 'IDR'
  | 'RP'
  | 'USDT'
  | 'USDC'
  | 'Polygon'
  | 'polygon'
  | 'polygon_amoy'
  | 'ETH'
  | 'Ethereum'
  | 'sepolia'
  | string;

interface AssetIconProps {
  symbol: AssetSymbol;
  size?: number;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  bgCircle?: boolean;
}

export function AssetIcon({ symbol, size = 32, style, containerStyle, bgCircle }: AssetIconProps) {
  const getAssetSource = (sym: string) => {
    const s = sym ? sym.toUpperCase() : '';
    switch (s) {
      case 'IDR':
      case 'RP':
        return require('@/assets/images/RP.png');
      case 'USDT':
        return require('@/assets/images/USDT.png');
      case 'USDC':
        return require('@/assets/images/USDC.png');
      case 'POLYGON':
      case 'POLYGON_AMOY':
      case 'AMOY':
        return require('@/assets/images/Polygon.png');
      case 'ETH':
      case 'ETHEREUM':
      case 'SEPOLIA':
        return require('@/assets/images/ETH.png');
      default:
        return require('@/assets/images/logo-leder.png');
    }
  };

  if (bgCircle) {
    const containerDim = size + 8;
    return (
      <View
        style={[
          styles.container,
          {
            width: containerDim,
            height: containerDim,
            borderRadius: containerDim / 2,
            backgroundColor: '#ffffff',
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.15,
            shadowRadius: 2,
            elevation: 2,
          },
          containerStyle,
        ]}
      >
        <Image
          source={getAssetSource(symbol)}
          style={[{ width: size, height: size, borderRadius: size / 2, resizeMode: 'contain' }, style]}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { width: size, height: size }, containerStyle]}>
      <Image
        source={getAssetSource(symbol)}
        style={[{ width: size, height: size, borderRadius: size / 2, resizeMode: 'contain' }, style]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
});

