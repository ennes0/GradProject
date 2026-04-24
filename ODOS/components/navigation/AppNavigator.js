import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import BottomTabNavigator from './BottomTabNavigator';
import EditProfileScreen from '../../screens/main/EditProfileScreen';
import SettingsScreen from '../../screens/main/SettingsScreen';
import AboutScreen from '../../screens/main/AboutScreen';
import PrivacyPolicyScreen from '../../screens/main/PrivacyPolicyScreen';
import PublicProfileScreen from '../../screens/main/PublicProfileScreen';
import NotificationsScreen from '../../screens/main/NotificationsScreen';
import LoginScreen from '../../screens/auth/LoginScreen';
import RegisterScreen from '../../screens/auth/RegisterScreen';
import { useLanguage } from '../context/LanguageContext';
import OnboardingScreen from '../../screens/onboarding/OnboardingScreen';

const Stack = createNativeStackNavigator();

const linking = {
  prefixes: ['odos://', 'https://odos.app'],
  config: {
    screens: {
      MainTabs: {
        screens: {
          Routes: 'shared-route/:routeId',
        },
      },
    },
  },
};

const AppNavigator = () => {
  const { isAuthLoading, isAuthenticated, user } = useAuth();
  const { isLanguageReady } = useLanguage();
  const [showOnboarding, setShowOnboarding] = React.useState(null);
  const navigationKeyRef = React.useRef(0);

  React.useEffect(() => {
    if (isAuthenticated && user && !isAuthLoading) {
      const shouldShowOnboarding = !user?.onboarding_completed;
      console.log('[Onboarding] user.onboarding_completed:', user?.onboarding_completed, 'showOnboarding:', shouldShowOnboarding);
      setShowOnboarding(shouldShowOnboarding);
    } else {
      setShowOnboarding(null);
    }
  }, [isAuthenticated, user?.onboarding_completed, isAuthLoading]);

  const handleOnboardingComplete = React.useCallback(() => {
    console.log('[AppNavigator] Onboarding completion triggered, setting showOnboarding to false');
    setShowOnboarding(false);
  }, []);

  if (isAuthLoading || !isLanguageReady) {
    return null;
  }

  console.log('[AppNavigator] Render - showOnboarding:', showOnboarding, 'isAuthenticated:', isAuthenticated);

  if (showOnboarding === true) {
    return (
      <NavigationContainer linking={linking} key={`onboarding-${navigationKeyRef.current}`}>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animationEnabled: false,
          }}
        >
          <Stack.Screen
            name="Onboarding"
            component={OnboardingScreen}
            initialParams={{ onComplete: handleOnboardingComplete }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer linking={linking} key={`main-${navigationKeyRef.current}`}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#FFFFFF' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="About" component={AboutScreen} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
        <Stack.Screen name="PublicProfile" component={PublicProfileScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
