import React, { useState, useEffect } from 'react';
import { StatusBar, Appearance, Platform, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import * as SplashScreen from 'expo-splash-screen';
import { Ionicons } from '@expo/vector-icons';
import { colors } from './src/styles/styles'; // Estilos centralizados
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import FriendsScreen from './src/screens/FriendsScreen';
import MapScreen from './src/screens/MapScreen';
import EventDetailsScreen from './src/screens/EventDetailsScreen';
import CreateEventScreen from './src/screens/CreateEventScreen';

// Placeholders temporales para pantallas nuevas
const HomeScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
    <Text style={{ fontSize: 20, color: colors.text }}>Home Screen Placeholder</Text>
  </View>
);

const ConnectionsScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
    <Text style={{ fontSize: 20, color: colors.text }}>Connections Screen Placeholder</Text>
  </View>
);

const ProfileScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
    <Text style={{ fontSize: 20, color: colors.text }}>Profile Screen Placeholder</Text>
  </View>
);

SplashScreen.preventAutoHideAsync();

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

const MainStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="Friends" component={FriendsScreen} />
    <Stack.Screen name="Map" component={MapScreen} />
    <Stack.Screen name="EventDetails" component={EventDetailsScreen} />
    <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
  </Stack.Navigator>
);

const TabNavigator = () => (
  <Tab.Navigator
    initialRouteName="Inicio"
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;

        if (route.name === 'Inicio') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'Mapa') {
          iconName = focused ? 'map' : 'map-outline';
        } else if (route.name === 'Conexiones') {
          iconName = focused ? 'people' : 'people-outline';
        } else if (route.name === 'Perfil') {
          iconName = focused ? 'person' : 'person-outline';
        }

        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.gray,
      tabBarStyle: {
        backgroundColor: colors.background,
        height: Platform.OS === 'ios' ? 90 : 60,
        paddingBottom: Platform.OS === 'ios' ? 20 : 5,
        paddingTop: 5,
        borderTopWidth: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
      },
      tabBarLabelStyle: {
        fontSize: 12,
        marginBottom: Platform.OS === 'ios' ? 0 : 5,
      },
      headerShown: false,
    })}
  >
    <Tab.Screen name="Inicio" component={MainStack} />
    <Tab.Screen name="Mapa" component={MapScreen} />
    <Tab.Screen name="Conexiones" component={ConnectionsScreen} />
    <Tab.Screen name="Perfil" component={ProfileScreen} />
  </Tab.Navigator>
);

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [appIsReady, setAppIsReady] = useState(false);
  const [userData, setUserData] = useState(null);
  const auth = getAuth();

  const colorScheme = Appearance.getColorScheme();
  const [theme, setTheme] = useState(colorScheme === 'dark' ? 'dark' : 'light');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
        setUserData({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        });
      } else {
        setIsAuthenticated(false);
        setUserData(null);
      }
      setIsLoading(false);
    });

    async function prepare() {
      try {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (e) {
        console.warn('Error durante la carga inicial:', e);
        Alert.alert('Error', 'No se pudo cargar la aplicación. Por favor, intenta de nuevo.');
      } finally {
        setAppIsReady(true);
        await SplashScreen.hideAsync();
      }
    }

    prepare();

    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setTheme(colorScheme === 'dark' ? 'dark' : 'light');
    });

    return () => {
      unsubscribe();
      subscription.remove();
    };
  }, []);

  if (!appIsReady || isLoading) {
    return null;
  }

  return (
    <>
      <StatusBar
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme === 'dark' ? colors.darkBackground : colors.background}
        translucent={false}
      />
      <NavigationContainer theme={theme === 'dark' ? { dark: true } : { dark: false }}>
        {isAuthenticated ? <TabNavigator /> : <AuthStack />}
      </NavigationContainer>
    </>
  );
}