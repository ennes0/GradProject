import React, { useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TAB_CONFIG = {
  Home: { icon: 'home-outline', activeIcon: 'home' },
  Routes: { icon: 'footsteps-outline', activeIcon: 'footsteps' },
  Community: { icon: 'globe-outline', activeIcon: 'globe' },
  Profile: { icon: 'person-outline', activeIcon: 'person' },
};

const CustomTabBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const routes = state.routes || [];
  const nonMapRoutes = routes.filter((route) => route.name !== 'Map');
  const leftRoutes = nonMapRoutes.slice(0, Math.ceil(nonMapRoutes.length / 2));
  const rightRoutes = nonMapRoutes.slice(Math.ceil(nonMapRoutes.length / 2));
  
  // Animasyon değerleri
  const indicatorPosition = useRef(new Animated.Value(0)).current;
  const scaleAnims = useRef({}).current;
  nonMapRoutes.forEach((route) => {
    if (!scaleAnims[route.key]) {
      scaleAnims[route.key] = new Animated.Value(1);
    }
  });
  
  // Tab genişliği hesaplama
  const TAB_BAR_WIDTH = SCREEN_WIDTH - 32;
  const CENTER_BUTTON_WIDTH = 70;
  const AVAILABLE_WIDTH = TAB_BAR_WIDTH - CENTER_BUTTON_WIDTH - 16; // 16 = paddingHorizontal toplamı
  const TAB_WIDTH = nonMapRoutes.length > 0 ? AVAILABLE_WIDTH / nonMapRoutes.length : AVAILABLE_WIDTH;
  const currentRouteName = routes[state.index]?.name;
  const currentTabIndex = nonMapRoutes.findIndex((route) => route.name === currentRouteName);
  const mapRouteIndex = routes.findIndex((route) => route.name === 'Map');
  
  useEffect(() => {
    if (currentTabIndex >= 0) {
      const targetRoute = nonMapRoutes[currentTabIndex];
      const onRightSide = rightRoutes.some((route) => route.key === targetRoute.key);
      const localIndex = onRightSide
        ? rightRoutes.findIndex((route) => route.key === targetRoute.key)
        : leftRoutes.findIndex((route) => route.key === targetRoute.key);

      const beforeCenterCount = onRightSide ? leftRoutes.length + localIndex : localIndex;
      const targetPosition = 8 + (beforeCenterCount * TAB_WIDTH) + (onRightSide ? CENTER_BUTTON_WIDTH : 0) + TAB_WIDTH / 2;
      
      Animated.spring(indicatorPosition, {
        toValue: targetPosition,
        useNativeDriver: true,
        tension: 68,
        friction: 10,
      }).start();
      
      nonMapRoutes.forEach((route, index) => {
        Animated.spring(scaleAnims[route.key], {
          toValue: index === currentTabIndex ? 1.15 : 1,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        }).start();
      });
    }
  }, [currentTabIndex, TAB_WIDTH, leftRoutes, nonMapRoutes, rightRoutes, indicatorPosition, scaleAnims]);
  
  const handleTabPress = (routeName, routeIndex) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: state.routes[routeIndex].key,
      canPreventDefault: true,
    });
    
    if (!event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  };
  
  const renderTab = (route, tabIndex) => {
    const tabConfig = TAB_CONFIG[route.name];
    const isFocused = currentRouteName === route.name;
    if (!tabConfig) return null;
    
    return (
      <TouchableOpacity
        key={route.key}
        onPress={() => handleTabPress(route.name, routes.findIndex((item) => item.key === route.key))}
        style={styles.tab}
        activeOpacity={0.7}
      >
        <Animated.View
          style={[
            styles.tabContent,
            { transform: [{ scale: scaleAnims[route.key] || 1 }] },
          ]}
        >
          <Ionicons
            name={isFocused ? tabConfig.activeIcon : tabConfig.icon}
            size={26}
            color={isFocused ? '#4ECDC4' : '#9CA3AF'}
          />
          {!!descriptors?.[route.key]?.options?.tabLocked && (
            <View style={styles.lockBadge}>
              <Ionicons name="lock-closed" size={10} color="#FFFFFF" />
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>
    );
  };
  
  const handleMapPress = () => {
    if (mapRouteIndex >= 0) {
      navigation.navigate('Map');
    }
  };

  const isMapFocused = currentRouteName === 'Map';

  /** iOS home indicator + Android 3-button / gesture nav çubuğu — sabit px yerine inset */
  const minBottom = Platform.OS === 'ios' ? 10 : 6;
  const bottomPadding = Math.max(insets.bottom, minBottom);
  
  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }]}>
      <View style={[styles.tabBarWrapper, { width: TAB_BAR_WIDTH }]}>
        <Svg
          width={TAB_BAR_WIDTH}
          height={85}
          style={styles.svgBackground}
        >
          <Path
            d={`
              M 32 15
              L ${TAB_BAR_WIDTH / 2 - 45} 15
              C ${TAB_BAR_WIDTH / 2 - 35} 15 ${TAB_BAR_WIDTH / 2 - 35} 15 ${TAB_BAR_WIDTH / 2 - 30} 20
              A 40 40 0 0 0 ${TAB_BAR_WIDTH / 2 + 30} 20
              C ${TAB_BAR_WIDTH / 2 + 35} 15 ${TAB_BAR_WIDTH / 2 + 35} 15 ${TAB_BAR_WIDTH / 2 + 45} 15
              L ${TAB_BAR_WIDTH - 32} 15
              A 32 32 0 0 1 ${TAB_BAR_WIDTH} 47
              L ${TAB_BAR_WIDTH} 53
              A 32 32 0 0 1 ${TAB_BAR_WIDTH - 32} 85
              L 32 85
              A 32 32 0 0 1 0 53
              L 0 47
              A 32 32 0 0 1 32 15
              Z
            `}
            fill="#FFFFFF"
          />
        </Svg>
        
        <View style={styles.tabBar}>
          {/* Sol taraftaki tablar */}
          <View style={[styles.leftTabs, { width: AVAILABLE_WIDTH / 2 }]}>
            {leftRoutes.map((route, index) => renderTab(route, index))}
          </View>
          
          {/* Ortadaki Map butonu */}
          <View style={styles.centerButtonContainer}>
            <TouchableOpacity
              onPress={handleMapPress}
              style={[styles.mapButton, isMapFocused && styles.mapButtonActive]}
              activeOpacity={0.8}
            >
              <Ionicons name="map" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          {/* Sağ taraftaki tablar */}
          <View style={[styles.rightTabs, { width: AVAILABLE_WIDTH / 2 }]}>
            {rightRoutes.map((route, index) => renderTab(route, leftRoutes.length + index))}
          </View>
          
          {/* Animated indicator */}
          {currentTabIndex >= 0 && (
            <Animated.View
              style={[
                styles.indicator,
                {
                  transform: [{ translateX: indicatorPosition }],
                },
              ]}
            />
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  tabBarWrapper: {
    height: 85,
    position: 'relative',
  },
  svgBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  tabBar: {
    flexDirection: 'row',
    position: 'absolute',
    top: 15,
    left: 0,
    right: 0,
    height: 70,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  leftTabs: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  rightTabs: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerButtonContainer: {
    width: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -42,
  },
  mapButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4ECDC4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4ECDC4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 12,
  },
  mapButtonActive: {
    backgroundColor: '#3155B8',
    transform: [{ scale: 0.95 }],
  },
  indicator: {
    position: 'absolute',
    bottom: 8,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#4ECDC4',
    marginLeft: -2.5,
  },
  lockBadge: {
    position: 'absolute',
    right: -6,
    top: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CustomTabBar;

