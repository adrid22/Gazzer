import i18n from 'i18n-js';
import * as Localization from 'expo-localization';

i18n.translations = {
  en: {
    welcome: 'Welcome to Gazzer!',
    login: 'Log In',
    register: 'Register',
  },
  es: {
    welcome: '¡Bienvenido a Gazzer!',
    login: 'Iniciar Sesión',
    register: 'Registrarse',
  },
};

i18n.locale = Localization.locale;
i18n.fallbacks = true;

export default i18n;