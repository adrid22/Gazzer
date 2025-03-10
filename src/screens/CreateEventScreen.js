import React from 'react';
import { View, Text } from 'react-native';
import i18n from '../i18n/i18n';

export default function CreateEventScreen() {
  return (
    <View style={{ padding: 20 }}>
      <Text>{i18n.t('createEvent')}</Text>
    </View>
  );
}