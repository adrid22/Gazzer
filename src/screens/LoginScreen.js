import React, { useState } from 'react';
import { View, TextInput, Button, Text, Alert } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';
import i18n from '../i18n/i18n';
import { colors, textStyles } from '../styles/styles'; // Importa estilos centralizados

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigation.navigate('Friends');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[textStyles.heading, styles.title]}>{i18n.t('welcome')}</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title={i18n.t('login')} onPress={handleLogin} color={colors.primary} />
      <Text style={styles.registerText}>
        Don't have an account?{' '}
        <Text
          style={styles.registerLink}
          onPress={() => navigation.navigate('Register')}
        >
          {i18n.t('register')}
        </Text>
      </Text>
    </View>
  );
};

const styles = {
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: colors.background,
  },
  title: {
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 50,
    borderColor: colors.gray,
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
  },
  registerText: {
    marginTop: 20,
    textAlign: 'center',
    color: colors.gray,
  },
  registerLink: {
    color: colors.primary,
    fontWeight: 'bold',
  },
};

export default LoginScreen;