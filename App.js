import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { ThemeProvider } from '@rneui/themed';
import { theme } from './theme';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { auth, db } from './firebaseConfig';
import LoginScreen from './components/LoginScreen';
import RegisterScreen from './components/RegisterScreen';
import MapScreen from './components/MapScreen';
import ProfileScreen from './components/ProfileScreen';
import LocationListScreen from './components/LocationListScreen';
import FriendsScreen from './components/FriendsScreen';
import * as Font from 'expo-font';
import { Text, View, Image, Appearance, StatusBar, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { doc, setDoc, onSnapshot, collection } from 'firebase/firestore';
import i18n from './i18n';

// Configurar notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerForPushNotificationsAsync() {
  let token;
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Push token:', token);

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

// Componente de pantalla de carga
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#8A4AF3" />
    <Text style={styles.loadingText}>Cargando Gazzer...</Text>
  </View>
);

// Componente separado para el Splash Screen
const SplashScreen = ({ fontsLoaded, fontError }) => {
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    if (fontsLoaded) {
      opacity.value = withTiming(0, { duration: 800, easing: Easing.ease });
      scale.value = withSpring(1.2, { damping: 10, stiffness: 100 });
    }
  }, [fontsLoaded]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.splashContainer}>
      <LinearGradient colors={['#8A4AF3', '#A56EFF']} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.splashContent, animatedStyle]}>
        <Image source={require('./assets/logo.png')} style={styles.splashLogo} />
        <Text style={styles.splashText}>Gazzer</Text>
        {fontError && <Text style={styles.splashError}>Error: {fontError}</Text>}
      </Animated.View>
    </View>
  );
};

// Componente de Onboarding (versión mejorada con múltiples pantallas)
const OnboardingScreen = ({ onComplete }) => {
  const scale = useSharedValue(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = [
    {
      title: i18n.t('welcome'),
      text: i18n.t('connect'),
    },
    {
      title: i18n.t('welcome'),
      text: i18n.t('connect'),
    },
    {
      title: i18n.t('welcome'),
      text: i18n.t('connect'),
    },
  ];

  useEffect(() => {
    scale.value = withSpring(1, { damping: 10, stiffness: 100 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: scale.value,
  }));

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  return (
    <LinearGradient colors={['#8A4AF3', '#A56EFF']} style={styles.onboardingContainer}>
      <Animated.View style={[styles.onboardingContent, animatedStyle]}>
        <Image source={require('./assets/logo.png')} style={styles.onboardingLogo} />
        <Text style={styles.onboardingTitle}>{slides[currentSlide].title}</Text>
        <Text style={styles.onboardingText}>{slides[currentSlide].text}</Text>
        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[styles.paginationDot, currentSlide === index && styles.paginationDotActive]}
            />
          ))}
        </View>
        <Button
          title={currentSlide === slides.length - 1 ? 'Empezar' : 'Siguiente'}
          onPress={nextSlide}
          buttonStyle={styles.onboardingButton}
          titleStyle={styles.buttonText}
          containerStyle={styles.buttonContainer}
          linearGradientProps={{
            colors: ['#34C759', '#8A4AF3'],
            start: { x: 0, y: 0 },
            end: { x: 1, y: 0 },
          }}
        />
      </Animated.View>
    </LinearGradient>
  );
};

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function GazzerTabs({ initialRouteName, initialParams }) {
  const fadeAnim = useSharedValue(0);
  const tabBarHeight = useSharedValue(70);

  useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: 800, easing: Easing.ease });
    tabBarHeight.value = withSpring(70, { damping: 15, stiffness: 100 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  const tabBarStyle = useAnimatedStyle(() => ({
    height: tabBarHeight.value,
  }));

  return (
    <Animated.View style={[styles.tabsContainer, animatedStyle]}>
      <Tab.Navigator
        initialRouteName={initialRouteName}
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size, focused }) => {
            let iconName;
            if (route.name === 'Mapa') iconName = 'map';
            else if (route.name === 'Lista') iconName = 'list';
            else if (route.name === 'Amigos') iconName = 'people';
            else if (route.name === 'Perfil') iconName = 'person';
            return (
              <Ionicons
                name={iconName}
                size={focused ? size + 4 : size}
                color={focused ? theme.colors.accent : color}
                style={focused ? theme.Icon.activeStyle : theme.Icon.style}
              />
            );
          },
          tabBarStyle: {
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            elevation: 8,
            paddingBottom: 5,
          },
          tabBarBackground: () => (
            <LinearGradient
              colors={theme.gradients.subtle}
              style={[StyleSheet.absoluteFill, tabBarStyle]}
            />
          ),
          tabBarActiveTintColor: theme.colors.accent,
          tabBarInactiveTintColor: theme.colors.textSecondary,
          headerShown: false,
          tabBarLabelStyle: {
            fontFamily: 'Poppins-SemiBold',
            fontSize: 12,
          },
        })}
        sceneContainerStyle={{ backgroundColor: theme.colors.background }}
      >
        <Tab.Screen name="Mapa" component={MapScreen} />
        <Tab.Screen name="Lista" component={LocationListScreen} />
        <Tab.Screen name="Amigos" component={FriendsScreen} initialParams={initialParams} />
        <Tab.Screen name="Perfil" component={ProfileScreen} />
      </Tab.Navigator>
    </Animated.View>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [fontError, setFontError] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(Appearance.getColorScheme() === 'dark');
  const [isFirstLaunch, setIsFirstLaunch] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [notification, setNotification] = useState(null);
  const navigationRef = useNavigationContainerRef();
  const [initialRouteName, setInitialRouteName] = useState('Mapa');
  const [initialParams, setInitialParams] = useState({});

  useEffect(() => {
    registerForPushNotificationsAsync().then(async (token) => {
      if (token && auth.currentUser) {
        await setDoc(doc(db, 'users', auth.currentUser.uid), { pushToken: token }, { merge: true });
      }
    });

    const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      setNotification(notification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      const { data } = response.notification.request.content;
      if (data.chatId) {
        setInitialRouteName('Amigos');
        setInitialParams({ chatId: data.chatId, friendId: data.friendId });
        navigationRef.navigate('Gazzer', { screen: 'Amigos', params: { chatId: data.chatId, friendId: data.friendId } });
      } else if (data.eventId) {
        setInitialRouteName('Mapa');
        setInitialParams({});
        navigationRef.navigate('Gazzer', { screen: 'Mapa' });
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    setIsFirstLaunch(false);
    AsyncStorage.setItem('isFirstLaunch', 'false');
  }, []);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await Font.loadAsync({
          'Poppins-Regular': require('./assets/fonts/Poppins-Regular.ttf'),
          'Poppins-SemiBold': require('./assets/fonts/Poppins-SemiBold.ttf'),
          'Poppins-Bold': require('./assets/fonts/Poppins-Bold.ttf'),
        });
        console.log('Fuentes cargadas con éxito');

        const firstLaunch = await AsyncStorage.getItem('isFirstLaunch');
        setIsFirstLaunch(firstLaunch === null);

        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }

        setFontsLoaded(true);
      } catch (error) {
        console.log('Error al cargar recursos:', error.message);
        setFontError(error.message);
        setFontsLoaded(true);
      }
    };

    initializeApp();

    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setIsDarkMode(colorScheme === 'dark');
    });

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        await AsyncStorage.setItem('user', JSON.stringify(user));
        setUser(user);
      } else {
        await AsyncStorage.removeItem('user');
        setUser(null);
      }
    }, (error) => {
      setAuthError(error.message);
    });

    const unsubscribeEvents = onSnapshot(collection(db, 'locations'), async (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const eventData = change.doc.data();
          if (eventData.createdBy !== auth.currentUser?.uid) {
            const creatorDoc = doc(db, 'users', eventData.createdBy);
            const creatorSnap = await creatorDoc.get();
            const creatorData = creatorSnap.data();
            const creatorName = creatorData?.name || 'Un amigo';
            const pushToken = creatorData?.pushToken;

            if (pushToken) {
              await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                  Accept: 'application/json',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  to: pushToken,
                  sound: 'default',
                  title: i18n.t('eventCreated'),
                  body: i18n.t('eventCreatedBody', [creatorName, eventData.title]),
                  data: { eventId: change.doc.id },
                }),
              });
            }
          }
        }
      });
    });

    return () => {
      subscription.remove();
      unsubscribe();
      unsubscribeEvents();
    };
  }, []);

  const currentTheme = useMemo(
    () => (isDarkMode ? { ...theme, colors: theme.darkColors } : theme),
    [isDarkMode]
  );

  if (!fontsLoaded || isFirstLaunch === null) {
    return <SplashScreen fontsLoaded={fontsLoaded} fontError={fontError} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider theme={currentTheme}>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent
        />
        <NavigationContainer ref={navigationRef}>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {isFirstLaunch ? (
              <Stack.Screen
                name="Onboarding"
                children={() => <OnboardingScreen onComplete={handleOnboardingComplete} />}
              />
            ) : user ? (
              <Stack.Screen name="Gazzer">
                {() => <GazzerTabs initialRouteName={initialRouteName} initialParams={initialParams} />}
              </Stack.Screen>
            ) : (
              <>
                <Stack.Screen name="Login">
                  {() => <LoginScreen navigation={navigationRef} />}
                </Stack.Screen>
                <Stack.Screen name="Register">
                  {() => <RegisterScreen navigation={navigationRef} />}
                </Stack.Screen>
              </>
            )}
            {authError && (
              <Stack.Screen name="AuthError" options={{ presentation: 'modal' }}>
                {() => (
                  <View style={styles.errorModal}>
                    <Text style={styles.errorText}>{authError}</Text>
                    <Button
                      title="Reintentar"
                      onPress={() => setAuthError(null)}
                      buttonStyle={styles.errorButton}
                      titleStyle={styles.buttonText}
                    />
                  </View>
                )}
              </Stack.Screen>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashContent: {
    alignItems: 'center',
  },
  splashLogo: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  splashText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 48,
    color: '#FFFFFF',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  splashError: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#FF6F61',
    marginTop: 15,
  },
  onboardingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onboardingContent: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  },
  onboardingLogo: {
    width: 180,
    height: 180,
    marginBottom: 30,
  },
  onboardingTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 36,
    color: '#FFFFFF',
    marginBottom: 15,
    textAlign: 'center',
  },
  onboardingText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  pagination: {
    flexDirection: 'row',
    marginVertical: 20,
  },
  paginationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
    marginHorizontal: 5,
    opacity: 0.5,
  },
  paginationDotActive: {
    opacity: 1,
    backgroundColor: '#34C759',
  },
  onboardingButton: {
    borderRadius: 10,
    paddingVertical: 12,
    width: 200,
  },
  buttonContainer: {
    marginTop: 20,
  },
  tabsContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 18,
    color: '#8A4AF3',
    marginTop: 10,
  },
  errorModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  errorText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 18,
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  errorButton: {
    backgroundColor: '#FF6F61',
    borderRadius: 10,
    paddingVertical: 12,
    width: 150,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});