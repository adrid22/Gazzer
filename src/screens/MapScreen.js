import React from 'react';
import { View } from 'react-native';
import MapView from 'react-native-maps';
import i18n from '../i18n/i18n';

export default function MapScreen() {
  return (
    <View style={{ flex: 1 }}>
      <MapView style={{ flex: 1 }} initialRegion={{
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }} />
      <Text>{i18n.t('map')}</Text>
    </View>
  );
}