import { LinearGradient } from 'expo-linear-gradient';

// Gradientes definidos como constante independiente
const gradients = {
  primary: ['#8A4AF3', '#6A36C9'], // Lila vibrante a oscuro
  accent: ['#FF6F61', '#E55A4F'], // Coral a coral oscuro
  event: ['#8A4AF3', '#FF6F61'], // Mezcla lila-coral para eventos
  subtle: ['#F8F9FA', '#E5E7EB'], // Fondo claro a gris suave
};

// Tema base
export const theme = {
  colors: {
    primary: '#8A4AF3',
    primaryDark: '#6A36C9',
    primaryLight: '#A78BFA',
    secondary: '#BFA8F7',
    accent: '#FF6F61',
    accentDark: '#E55A4F',
    background: '#F8F9FA',
    card: '#FFFFFF',
    text: '#1A1A1A',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    success: '#34C759',
    error: '#F44336',
    highlight: '#FFD700',
  },
  darkColors: {
    primary: '#A78BFA',
    primaryDark: '#8A4AF3',
    primaryLight: '#C4B5FD',
    secondary: '#D8B4FE',
    accent: '#FF867C',
    accentDark: '#FF6F61',
    background: '#121212',
    card: '#1F1F1F',
    text: '#E5E5E5',
    textSecondary: '#9CA3AF',
    border: '#374151',
    success: '#4ADE80',
    error: '#F87171',
    highlight: '#FFD700',
  },
  gradients, // Incluimos los gradientes como propiedad
  Button: {
    raised: true,
    containerStyle: {
      marginVertical: 12,
      borderRadius: 30,
    },
    buttonStyle: {
      borderRadius: 30,
      paddingVertical: 14,
      paddingHorizontal: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 6,
    },
    // Función para renderizar gradiente, usando colors como prop
    renderGradient: ({ colors, style }) => (
      <LinearGradient
        colors={colors || gradients.primary} // Usamos colors o primary por defecto
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[style, { borderRadius: 30 }]}
      />
    ),
    titleStyle: {
      color: '#FFFFFF',
      fontFamily: 'Poppins-SemiBold',
      fontSize: 16,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    pressedStyle: {
      opacity: 0.9,
      shadowOpacity: 0.35,
    },
    variants: {
      primary: { colors: gradients.primary },
      accent: { colors: gradients.accent },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '#8A4AF3',
        titleStyle: { color: '#8A4AF3' },
      },
      event: { colors: gradients.event },
    },
  },
  Input: {
    containerStyle: {
      marginVertical: 12,
    },
    inputContainerStyle: {
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 15,
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.15,
      shadowRadius: 5,
      elevation: 3,
    },
    inputStyle: {
      color: '#1A1A1A',
      fontFamily: 'Poppins-Regular',
      fontSize: 16,
    },
    placeholderTextColor: '#9CA3AF',
    focusedStyle: {
      borderColor: '#8A4AF3',
      shadowOpacity: 0.25,
      borderWidth: 2,
    },
  },
  Text: {
    style: {
      color: '#1A1A1A',
      fontFamily: 'Poppins-Regular',
      fontSize: 16,
    },
    h1Style: {
      fontFamily: 'Poppins-Bold',
      fontSize: 28,
      color: '#8A4AF3',
      fontWeight: '700',
    },
    h4Style: {
      fontFamily: 'Poppins-SemiBold',
      fontSize: 20,
      color: '#8A4AF3',
    },
    eventTitle: {
      fontFamily: 'Poppins-SemiBold',
      fontSize: 18,
      color: '#FF6F61',
    },
  },
  Slider: {
    thumbStyle: {
      height: 24,
      width: 24,
      backgroundColor: '#8A4AF3',
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
    trackStyle: {
      height: 8,
      borderRadius: 4,
      backgroundColor: '#E5E7EB',
    },
    minimumTrackTintColor: '#8A4AF3',
    maximumTrackTintColor: '#E5E7EB',
  },
  Overlay: {
    overlayStyle: {
      borderRadius: 20,
      padding: 24,
      backgroundColor: '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 12,
    },
  },
  Card: {
    containerStyle: {
      borderRadius: 15,
      backgroundColor: '#FFFFFF',
      padding: 16,
      marginVertical: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 5,
    },
    eventStyle: {
      borderLeftWidth: 4,
      borderLeftColor: '#FF6F61',
    },
  },
  Avatar: {
    containerStyle: {
      borderRadius: 50,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    size: {
      small: 32,
      medium: 48,
      large: 64,
    },
  },
  Icon: {
    style: {
      color: '#8A4AF3',
      size: 24,
    },
    activeStyle: {
      color: '#FF6F61',
    },
  },
};

// Carga de fuentes
export const loadFonts = async () => {
  await Font.loadAsync({
    'Poppins-Regular': require('./assets/fonts/Poppins-Regular.ttf'),
    'Poppins-SemiBold': require('./assets/fonts/Poppins-SemiBold.ttf'),
    'Poppins-Bold': require('./assets/fonts/Poppins-Bold.ttf'),
  });
};