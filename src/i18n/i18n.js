// C:\Users\filip\Gazzer\src\i18n\i18n.js
import * as Localization from 'expo-localization';
import i18n from 'i18n-js';

// Configura las traducciones
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

// Establece el locale basado en el dispositivo
i18n.locale = Localization.locale;

// Habilita fallbacks
i18n.fallbacks = true;

// Exporta i18n
export default i18n;