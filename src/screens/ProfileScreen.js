import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../styles/styles';

const ProfileScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
    <Text style={{ fontSize: 20, color: colors.text }}>Profile Screen Placeholder</Text>
  </View>
);

export default ProfileScreen;