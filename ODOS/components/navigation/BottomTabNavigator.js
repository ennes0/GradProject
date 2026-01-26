import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import CustomTabBar from './CustomTabBar';
import HomeScreen from '../../screens/main/HomeScreen';
import RoutesScreen from '../../screens/main/RoutesScreen';
import MapScreen from '../../screens/main/MapScreen';
import CommunityScreen from '../../screens/main/CommunityScreen';
import ProfileScreen from '../../screens/main/ProfileScreen';

const Tab = createBottomTabNavigator();

const BottomTabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
      />
      <Tab.Screen 
        name="Routes" 
        component={RoutesScreen}
      />
      <Tab.Screen 
        name="Map" 
        component={MapScreen}
      />
      <Tab.Screen 
        name="Community" 
        component={CommunityScreen}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
