const i18n = require('i18n-js');
import * as Localization from 'expo-localization';

i18n.translations = {
  en: {
    welcome: 'Welcome',
    login: 'Login',
    register: 'Register',
    friends: 'Friends',
    map: 'Map',
    eventDetails: 'Event Details',
    createEvent: 'Create Event',
    home: 'Home',
    connections: 'Connections',
    profile: 'Profile'
  },
  es: {
    welcome: 'Bienvenido',
    login: 'Iniciar Sesión',
    register: 'Registrarse',
    friends: 'Amigos',
    map: 'Mapa',
    eventDetails: 'Detalles del Evento',
    createEvent: 'Crear Evento',
    home: 'Inicio',
    connections: 'Conexiones',
    profile: 'Perfil'
  }
};

i18n.defaultLocale = Localization.locale;
i18n.fallbacks = true;

export default i18n;