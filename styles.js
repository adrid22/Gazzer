// styles.js
import { StyleSheet } from 'react-native';

export const colors = {
  primary: '#8A4AF3',
  secondary: '#4CAF50',
  danger: '#F44336',
  background: '#F5F5F5',
  text: '#000',
  textLight: '#fff',
  gray: '#888',
};

export const textStyles = StyleSheet.create({
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textLight,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  normalText: {
    fontSize: 16,
    color: colors.text,
  },
  smallText: {
    fontSize: 12,
    color: colors.gray,
  },
});

export const containerStyles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  paddedContainer: {
    padding: 15,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export const buttonStyles = StyleSheet.create({
  primaryButton: {
    backgroundColor: colors.primary,
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: colors.secondary,
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  dangerButton: {
    backgroundColor: colors.danger,
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.textLight,
    fontWeight: 'bold',
  },
});