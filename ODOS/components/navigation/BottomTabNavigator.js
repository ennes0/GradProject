import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import CustomTabBar from './CustomTabBar';
import HomeScreen from '../../screens/main/HomeScreen';
import RoutesScreen from '../../screens/main/RoutesScreen';
import MapScreen from '../../screens/main/MapScreen';
import CommunityScreen from '../../screens/main/CommunityScreen';
import ProfileScreen from '../../screens/main/ProfileScreen';
import LockedFeatureScreen from '../../screens/main/LockedFeatureScreen';

const Tab = createBottomTabNavigator();

const BottomTabNavigator = () => {
  const { isAuthenticated } = useAuth();
  const { tx } = useLanguage();

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={isAuthenticated ? HomeScreen : LockedFeatureScreen}
        initialParams={!isAuthenticated ? { featureName: tx('Ana Sayfa', 'Home') } : undefined}
        options={{ tabLocked: !isAuthenticated }}
      />
      <Tab.Screen
        name="Routes"
        component={isAuthenticated ? RoutesScreen : LockedFeatureScreen}
        initialParams={!isAuthenticated ? { featureName: tx('Rotalar', 'Routes') } : undefined}
        options={{ tabLocked: !isAuthenticated }}
      />
      <Tab.Screen 
        name="Map" 
        component={MapScreen}
        options={{ tabLocked: false }}
      />
      <Tab.Screen
        name="Community"
        component={isAuthenticated ? CommunityScreen : LockedFeatureScreen}
        initialParams={!isAuthenticated ? { featureName: tx('Topluluk', 'Community') } : undefined}
        options={{ tabLocked: !isAuthenticated }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ tabLocked: false }}
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
