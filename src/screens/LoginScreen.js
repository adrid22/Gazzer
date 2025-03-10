import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import i18n from '../i18n';
import { colors, textStyles, containerStyles, buttonStyles } from '../styles'; // Estilos centralizados

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const auth = getAuth();

  // Manejar inicio de sesión
  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(i18n.t('pleaseCompleteAllFields'));
      return;
    }

    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigation.navigate('MainTabs'); // Navegar a la pantalla principal
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      let errorMessage = i18n.t('loginFailed');
      if (error.code === 'auth/invalid-email') {
        errorMessage = 'El correo electrónico no es válido.';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'Usuario no encontrado.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Contraseña incorrecta.';
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Manejar restablecimiento de contraseña
  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert(i18n.t('pleaseCompleteAllFields'));
      return;
    }

    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(i18n.t('resetEmailSent'));
    } catch (error) {
      console.error('Error al enviar correo de restablecimiento:', error);
      Alert.alert('Error', 'No se pudo enviar el correo de restablecimiento.');
    } finally {
      setIsLoading(false);
    }
  };

  // Navegar a la pantalla de registro
  const goToRegister = () => {
    navigation.navigate('RegisterScreen');
  };

  return (
    <SafeAreaView style={containerStyles.mainContainer}>
      <View style={[containerStyles.paddedContainer, containerStyles.centered, styles.container]}>
        <Text style={textStyles.headerTitle}>{i18n.t('welcome')}</Text>
        <Text style={[textStyles.normalText, styles.subTitle]}>{i18n.t('connect')}</Text>

        <TextInput
          style={styles.input}
          placeholder={i18n.t('email')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor={colors.gray}
        />
        <TextInput
          style={styles.input}
          placeholder={i18n.t('password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          placeholderTextColor={colors.gray}
        />

        <TouchableOpacity
          style={[buttonStyles.primaryButton, styles.button]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.textLight} />
          ) : (
            <Text style={buttonStyles.buttonText}>{i18n.t('login')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleForgotPassword} disabled={isLoading}>
          <Text style={[textStyles.normalText, styles.forgotPassword]}>
            {i18n.t('forgotPassword')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={goToRegister} disabled={isLoading}>
          <Text style={[textStyles.normalText, styles.registerLink]}>
            {i18n.t('noAccount')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Estilos locales específicos para LoginScreen
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  subTitle: {
    marginBottom: 30,
  },
  input: {
    width: '80%',
    padding: 10,
    marginVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.gray,
    fontSize: 16,
  },
  button: {
    width: '80%',
    marginVertical: 10,
  },
  forgotPassword: {
    marginTop: 15,
    color: colors.primary,
  },
  registerLink: {
    marginTop: 15,
    color: colors.primary,
  },
});