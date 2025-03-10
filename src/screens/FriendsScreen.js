import React from 'react';
import { View, Text, Button } from 'react-native';
import i18n from '../i18n/i18n';

export default function FriendsScreen() {
  return (
    <View style={{ padding: 20 }}>
      <Text>{i18n.t('friends')}</Text>
      <Button title="Add Friend" onPress={() => console.log('Add Friend')} />
    </View>
  );
}