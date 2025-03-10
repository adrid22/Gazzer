import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import MapViewDirections from 'react-native-maps-directions';
import { colors, textStyles } from '../styles/styles'; // Añadido para consistencia

const MapScreen = ({ route }) => {
  const { friend } = route.params || {};
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    })();
  }, []);

  if (!userLocation) {
    return (
      <View style={styles.container}>
        <Text style={textStyles.normal}>Loading...</Text>
      </View>
    );
  }

  const friendLocation = friend?.location
    ? {
        latitude: friend.location.latitude,
        longitude: friend.location.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }
    : null;

  return (
    <View style={styles.container}>
      <MapView style={styles.map} region={userLocation}>
        <Marker coordinate={userLocation} title="You" pinColor="blue" />
        {friendLocation && (
          <>
            <Marker coordinate={friendLocation} title={friend.displayName} />
            <MapViewDirections
              origin={userLocation}
              destination={friendLocation}
              apikey="YOUR_GOOGLE_MAPS_API_KEY"
              strokeWidth={3}
              strokeColor={colors.primary}
            />
          </>
        )}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  map: {
    flex: 1,
  },
});

export default MapScreen;