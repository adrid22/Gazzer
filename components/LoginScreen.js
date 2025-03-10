import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Input, Button } from '@rneui/themed';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { signInWithEmailAndPassword, sendPasswordResetEmail, signInWithCredential } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider } from 'firebase/auth';
import i18n from '../i18n';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(50);
  const insets = useSafeAreaInsets();

  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: 'TU_EXPO_CLIENT_ID_AQUI', // Lo obtendremos a continuación
    iosClientId: 'TU_IOS_CLIENT_ID_AQUI',   // Lo obtendremos a continuación
    androidClientId: 'TU_ANDROID_CLIENT_ID_AQUI', // Lo obtendremos a continuación
    webClientId: '973873548951-d1r9h0drvh5c0lsvptjfhqvdis1r2fv3.apps.googleusercontent.com', // Client ID proporcionado
  });

  useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: 800 });
    slideAnim.value = withTiming(0, { duration: 800 });

    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithGoogle(credential);
    }
  }, [response]);

  const signInWithGoogle = async (credential) => {
    setLoading(true);
    setError(null);

    try {
      await signInWithCredential(auth, credential);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.replace('Mapa');
    } catch (err) {
      setError(err.message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Por favor, completa todos los campos');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.replace('Mapa');
    } catch (err) {
      setError(err.message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setError('Por favor, ingresa tu correo electrónico');
      return;
    }

    setLoading(true);
    setError(null);
    setResetEmailSent(false);

    try {
      await sendPasswordResetEmail(auth, email);
      setResetEmailSent(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      setError(err.message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const animatedFadeStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  const animatedSlideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideAnim.value }],
  }));

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <LinearGradient
        colors={['#8A4AF3', '#A56EFF']}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <Animated.View style={[styles.content, animatedFadeStyle, animatedSlideStyle]}>
            <Ionicons name="map" size={80} color="#fff" style={styles.logo} />
            <Text h3 style={styles.title}>{i18n.t('welcome')}</Text>
            <Text style={styles.subtitle}>{i18n.t('connect')}</Text>

            <Input
              placeholder={i18n.t('email')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              containerStyle={styles.inputContainer}
              inputStyle={styles.inputText}
              leftIcon={<Ionicons name="mail" size={20} color="#fff" />}
            />
            <Input
              placeholder={i18n.t('password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              containerStyle={styles.inputContainer}
              inputStyle={styles.inputText}
              leftIcon={<Ionicons name="lock-closed" size={20} color="#fff" />}
              rightIcon={
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? "eye-off" : "eye"}
                    size={20}
                    color="#fff"
                  />
                </TouchableOpacity>
              }
            />

            {error && <Text style={styles.errorText}>{error}</Text>}
            {resetEmailSent && (
              <Text style={styles.successText}>
                {i18n.t('resetEmailSent')} {/* Añade esta clave a i18n.js si deseas traducirla */}
              </Text>
            )}

            <Button
              title={i18n.t('login')}
              onPress={handleLogin}
              buttonStyle={styles.loginButton}
              titleStyle={styles.buttonText}
              loading={loading}
              disabled={loading}
            />

            <Button
              title="Iniciar Sesión con Google"
              onPress={() => promptAsync()}
              buttonStyle={styles.googleButton}
              titleStyle={styles.buttonText}
              icon={<Ionicons name="logo-google" size={20} color="#fff" style={styles.googleIcon} />}
              iconPosition="left"
              loading={loading}
              disabled={loading || !request}
            />

            <TouchableOpacity onPress={handlePasswordReset}>
              <Text style={styles.resetLink}>{i18n.t('forgotPassword')}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>{i18n.t('noAccount')}</Text>
            </TouchableOpacity>
          </Animated.View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  content: {
    width: '90%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  logo: {
    marginBottom: 20,
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 30,
  },
  inputContainer: {
    marginVertical: 10,
    width: '100%',
  },
  inputText: {
    color: '#fff',
    fontSize: 16,
  },
  errorText: {
    color: '#FF6F61',
    fontSize: 14,
    marginBottom: 15,
    textAlign: 'center',
  },
  successText: {
    color: '#34C759',
    fontSize: 14,
    marginBottom: 15,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#34C759',
    borderRadius: 10,
    paddingVertical: 12,
    width: '100%',
    marginVertical: 10,
  },
  googleButton: {
    backgroundColor: '#4285F4',
    borderRadius: 10,
    paddingVertical: 12,
    width: '100%',
    marginVertical: 10,
  },
  googleIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resetLink: {
    color: '#fff',
    fontSize: 14,
    marginVertical: 10,
    textDecorationLine: 'underline',
  },
  registerLink: {
    color: '#fff',
    fontSize: 14,
    marginTop: 20,
    textDecorationLine: 'underline',
  },
});