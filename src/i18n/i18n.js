import * as Localization from 'expo-localization';
import i18n from 'i18n-js';

// Verifica que i18n esté definido
if (!i18n) {
  console.error('i18n-js no se importó correctamente. Asegúrate de que el módulo esté instalado.');
}

// Definir traducciones
i18n.translations = {
  en: {
    welcome: 'Welcome to Gazzer',
    connect: 'Connect and live unique experiences',
    login: 'Login',
    register: 'Register',
    email: 'Email',
    password: 'Password',
    forgotPassword: 'Forgot your password?',
    noAccount: "Don't have an account? Register here",
    name: 'Name',
    confirmPassword: 'Confirm Password',
    alreadyHaveAccount: 'Already have an account? Login here',
    friends: 'Friends',
    yourFriends: 'Your Friends',
    pendingRequests: 'Pending Requests',
    inviteFriends: 'Invite friends to an event',
    chatWith: 'Chat with',
    send: 'Send',
    messagePlaceholder: 'Write a message...',
    eventCreated: 'New Event Created',
    eventCreatedBody: '{0} has created a new event: {1}',
    pleaseCompleteAllFields: 'Please complete all fields',
    passwordsDoNotMatch: 'Passwords do not match',
    passwordMinLength: 'Password must be at least 6 characters',
    chooseFriendToInvite: 'Choose a friend to invite',
    close: 'Close',
    resetEmailSent: 'Password reset email sent. Check your inbox.',
    isTyping: 'is typing...',
  },
  es: {
    welcome: 'Bienvenido a Gazzer',
    connect: 'Conecta y vive experiencias únicas',
    login: 'Iniciar Sesión',
    register: 'Registrarse',
    email: 'Correo electrónico',
    password: 'Contraseña',
    forgotPassword: '¿Olvidaste tu contraseña?',
    noAccount: '¿No tienes cuenta? Regístrate aquí',
    name: 'Nombre',
    confirmPassword: 'Confirmar contraseña',
    alreadyHaveAccount: '¿Ya tienes cuenta? Inicia sesión aquí',
    friends: 'Amigos',
    yourFriends: 'Tus amigos',
    pendingRequests: 'Solicitudes pendientes',
    inviteFriends: 'Invitar amigos a un evento',
    chatWith: 'Chatear con',
    send: 'Enviar',
    messagePlaceholder: 'Escribe un mensaje...',
    eventCreated: 'Nuevo Evento Creado',
    eventCreatedBody: '{0} ha creado un nuevo evento: {1}',
    pleaseCompleteAllFields: 'Por favor, completa todos los campos',
    passwordsDoNotMatch: 'Las contraseñas no coinciden',
    passwordMinLength: 'La contraseña debe tener al menos 6 caracteres',
    chooseFriendToInvite: 'Elige un amigo para invitar',
    close: 'Cerrar',
    resetEmailSent: 'Correo de restablecimiento de contraseña enviado. Revisa tu bandeja de entrada.',
    isTyping: 'está escribiendo...',
  },
};

// Configurar el idioma predeterminado
const locale = Localization.locale.split('-')[0]; // Obtiene el idioma base (por ejemplo, 'en' o 'es')
i18n.locale = locale in i18n.translations ? locale : 'en';
i18n.fallbacks = true;

export default i18n;