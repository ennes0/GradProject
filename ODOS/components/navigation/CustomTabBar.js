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

// Tab konfigürasyonu - Home, Routes, (Map ortada), Community, Profile
const TAB_CONFIG = [
  { name: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { name: 'Routes', icon: 'footsteps-outline', activeIcon: 'footsteps' },
  // Ortada Map butonu
  { name: 'Community', icon: 'globe-outline', activeIcon: 'globe' },
  { name: 'Profile', icon: 'person-outline', activeIcon: 'person' },
];

const CustomTabBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  
  // Animasyon değerleri
  const indicatorPosition = useRef(new Animated.Value(0)).current;
  const scaleAnims = useRef(TAB_CONFIG.map(() => new Animated.Value(1))).current;
  
  // Tab genişliği hesaplama
  const TAB_BAR_WIDTH = SCREEN_WIDTH - 32; // 16px margin her iki tarafta
  const CENTER_BUTTON_WIDTH = 70; // Ortadaki buton + boşlukları
  const AVAILABLE_WIDTH = TAB_BAR_WIDTH - CENTER_BUTTON_WIDTH - 16; // 16 = paddingHorizontal toplamı
  const TAB_WIDTH = AVAILABLE_WIDTH / 4; // 4 tab için
  
  // Aktif tab indeksini hesapla (Map ekranı ortada)
  const getAdjustedIndex = (index) => {
    if (index < 2) return index;
    if (index === 2) return -1; // Map butonu
    return index - 1; // 3->2, 4->3
  };
  
  const currentTabIndex = getAdjustedIndex(state.index);
  
  useEffect(() => {
    if (currentTabIndex >= 0) {
      let targetPosition;
      
      if (currentTabIndex === 0) {
        // İlk tab (Home)
        targetPosition = 8 + TAB_WIDTH / 2;
      } else if (currentTabIndex === 1) {
        // İkinci tab (Routes)
        targetPosition = 8 + TAB_WIDTH + TAB_WIDTH / 2;
      } else if (currentTabIndex === 2) {
        // Üçüncü tab (Community) - ortadaki butondan sonra
        targetPosition = 8 + (TAB_WIDTH * 2) + CENTER_BUTTON_WIDTH + TAB_WIDTH / 2;
      } else {
        // Dördüncü tab (Profile)
        targetPosition = 8 + (TAB_WIDTH * 3) + CENTER_BUTTON_WIDTH + TAB_WIDTH / 2;
      }
      
      Animated.spring(indicatorPosition, {
        toValue: targetPosition,
        useNativeDriver: true,
        tension: 68,
        friction: 10,
      }).start();
      
      scaleAnims.forEach((anim, index) => {
        Animated.spring(anim, {
          toValue: index === currentTabIndex ? 1.15 : 1,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        }).start();
      });
    }
  }, [currentTabIndex]);
  
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
  
  const renderTab = (tabConfig, tabIndex, routeIndex) => {
    const isFocused = currentTabIndex === tabIndex;
    
    return (
      <TouchableOpacity
        key={tabConfig.name}
        onPress={() => handleTabPress(state.routes[routeIndex].name, routeIndex)}
        style={styles.tab}
        activeOpacity={0.7}
      >
        <Animated.View
          style={[
            styles.tabContent,
            { transform: [{ scale: scaleAnims[tabIndex] }] },
          ]}
        >
          <Ionicons
            name={isFocused ? tabConfig.activeIcon : tabConfig.icon}
            size={26}
            color={isFocused ? '#4ECDC4' : '#9CA3AF'}
          />
        </Animated.View>
      </TouchableOpacity>
    );
  };
  
  const handleMapPress = () => {
    navigation.navigate('Map');
  };

  const isMapFocused = state.index === 2;
  
  const bottomPadding = Platform.OS === 'ios' ? Math.max(insets.bottom, 10) : 12;
  
  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }]}>
      {/* SVG ile notch efektli navbar arka planı */}
      <View style={styles.tabBarWrapper}>
        <Svg
          width={SCREEN_WIDTH - 32}
          height={85}
          style={styles.svgBackground}
        >
          <Path
            d={`
              M 32 15
              L ${(SCREEN_WIDTH - 32) / 2 - 45} 15
              C ${(SCREEN_WIDTH - 32) / 2 - 35} 15 ${(SCREEN_WIDTH - 32) / 2 - 35} 15 ${(SCREEN_WIDTH - 32) / 2 - 30} 20
              A 40 40 0 0 0 ${(SCREEN_WIDTH - 32) / 2 + 30} 20
              C ${(SCREEN_WIDTH - 32) / 2 + 35} 15 ${(SCREEN_WIDTH - 32) / 2 + 35} 15 ${(SCREEN_WIDTH - 32) / 2 + 45} 15
              L ${SCREEN_WIDTH - 32 - 32} 15
              A 32 32 0 0 1 ${SCREEN_WIDTH - 32} 47
              L ${SCREEN_WIDTH - 32} 53
              A 32 32 0 0 1 ${SCREEN_WIDTH - 32 - 32} 85
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
          {/* Sol taraftaki tablar - Home, Routes */}
          <View style={styles.leftTabs}>
            {renderTab(TAB_CONFIG[0], 0, 0)}
            {renderTab(TAB_CONFIG[1], 1, 1)}
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
          
          {/* Sağ taraftaki tablar - Community, Profile */}
          <View style={styles.rightTabs}>
            {renderTab(TAB_CONFIG[2], 2, 3)}
            {renderTab(TAB_CONFIG[3], 3, 4)}
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
    width: SCREEN_WIDTH - 32,
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
    width: (SCREEN_WIDTH - 32 - 70 - 16) / 2, // Sabit genişlik
    justifyContent: 'space-evenly',
  },
  rightTabs: {
    flexDirection: 'row',
    width: (SCREEN_WIDTH - 32 - 70 - 16) / 2, // Sabit genişlik
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
});

export default CustomTabBar;

