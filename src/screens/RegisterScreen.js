import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Input, Button } from '@rneui/themed';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import i18n from '../i18n';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(50);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: 800 });
    slideAnim.value = withTiming(0, { duration: 800 });
  }, []);

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setError(i18n.t('pleaseCompleteAllFields')); // Añadido como ejemplo, ajusta en i18n.js si lo deseas
      return;
    }

    if (password !== confirmPassword) {
      setError(i18n.t('passwordsDoNotMatch')); // Añadido como ejemplo
      return;
    }

    if (password.length < 6) {
      setError(i18n.t('passwordMinLength')); // Añadido como ejemplo
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: name });

      await setDoc(doc(db, 'users', user.uid), {
        name,
        email,
        createdAt: new Date().toISOString(),
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.replace('Mapa');
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
            <Text h3 style={styles.title}>{i18n.t('register')}</Text>
            <Text style={styles.subtitle}>{i18n.t('connect')}</Text>

            <Input
              placeholder={i18n.t('name')}
              value={name}
              onChangeText={setName}
              containerStyle={styles.inputContainer}
              inputStyle={styles.inputText}
              leftIcon={<Ionicons name="person" size={20} color="#fff" />}
            />
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
            <Input
              placeholder={i18n.t('confirmPassword')}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
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

            <Button
              title={i18n.t('register')}
              onPress={handleRegister}
              buttonStyle={styles.registerButton}
              titleStyle={styles.buttonText}
              loading={loading}
              disabled={loading}
            />

            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>{i18n.t('alreadyHaveAccount')}</Text>
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
  registerButton: {
    backgroundColor: '#34C759',
    borderRadius: 10,
    paddingVertical: 12,
    width: '100%',
    marginVertical: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginLink: {
    color: '#fff',
    fontSize: 14,
    marginTop: 20,
    textDecorationLine: 'underline',
  },
});