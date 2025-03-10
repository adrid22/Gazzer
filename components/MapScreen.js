import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, ActivityIndicator, Alert } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { colors, textStyles, containerStyles, buttonStyles } from '../styles'; // Estilos centralizados
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';

export default function MapScreen() {
  const [userLocation, setUserLocation] = useState(null);
  const [region, setRegion] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [radius, setRadius] = useState(1000); // Radio en metros
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const mapRef = useRef(null);

  // Obtener ubicación del usuario
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se necesita acceso a la ubicación para mostrar el mapa.');
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setUserLocation(location.coords);
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
      setIsLoading(false);
    })();
  }, []);

  // Cargar marcadores desde Firestore (amigos o eventos)
  useEffect(() => {
    const q = collection(db, 'users'); // Cambia a 'events' si aplica
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const markersList = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          latitude: data.location?.latitude,
          longitude: data.location?.longitude,
          name: data.name || 'Sin nombre',
          type: 'friend', // O 'event' según corresponda
        };
      }).filter(marker => marker.latitude && marker.longitude);
      setMarkers(markersList);
    });
    return () => unsubscribe();
  }, []);

  // Filtrar marcadores dentro del radio seleccionado
  const filteredMarkers = useMemo(() => {
    if (!userLocation) return [];
    return markers.filter(marker => {
      const distance = getDistance(userLocation, marker);
      return distance <= radius;
    });
  }, [markers, radius, userLocation]);

  // Calcular distancia entre dos puntos (en metros)
  const getDistance = (loc1, loc2) => {
    const R = 6371e3; // Radio de la Tierra en metros
    const lat1 = loc1.latitude * Math.PI / 180;
    const lat2 = loc2.latitude * Math.PI / 180;
    const deltaLat = (loc2.latitude - loc1.latitude) * Math.PI / 180;
    const deltaLon = (loc2.longitude - loc1.longitude) * Math.PI / 180;
    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Centrar el mapa en la ubicación actual
  const centerMap = () => {
    if (userLocation) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }, 1000); // Animación de 1 segundo
    }
  };

  // Renderizar marcadores en el mapa
  const renderMarkers = () => {
    return filteredMarkers.map(marker => (
      <Marker
        key={marker.id}
        coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
        title={marker.name}
        description={marker.type === 'friend' ? 'Amigo' : 'Evento'}
        onPress={() => {
          setSelectedMarker(marker);
          setModalVisible(true);
        }}
      >
        <Ionicons
          name={marker.type === 'friend' ? 'person' : 'calendar'}
          size={24}
          color={colors.primary}
        />
        <Callout>
          <Text style={textStyles.normalText}>{marker.name}</Text>
          <Text style={textStyles.smallText}>
            Distancia: {Math.round(getDistance(userLocation, marker))} m
          </Text>
        </Callout>
      </Marker>
    ));
  };

  return (
    <View style={containerStyles.mainContainer}>
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={containerStyles.centered} />
      ) : (
        <>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={region}
            showsUserLocation={true}
            showsMyLocationButton={false}
          >
            {renderMarkers()}
          </MapView>
          <View style={styles.controlsContainer}>
            <Slider
              style={styles.slider}
              minimumValue={100}
              maximumValue={5000}
              step={100}
              value={radius}
              onValueChange={setRadius}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.gray}
            />
            <Text style={textStyles.normalText}>Radio: {radius} m</Text>
            <TouchableOpacity style={buttonStyles.primaryButton} onPress={centerMap}>
              <Ionicons name="locate" size={24} color={colors.textLight} />
            </TouchableOpacity>
          </View>
          {selectedMarker && (
            <Modal
              animationType="slide"
              transparent={true}
              visible={modalVisible}
              onRequestClose={() => setModalVisible(false)}
            >
              <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                  <Text style={textStyles.sectionTitle}>{selectedMarker.name}</Text>
                  <Text style={textStyles.normalText}>
                    Tipo: {selectedMarker.type === 'friend' ? 'Amigo' : 'Evento'}
                  </Text>
                  <Text style={textStyles.normalText}>
                    Distancia: {Math.round(getDistance(userLocation, selectedMarker))} m
                  </Text>
                  <TouchableOpacity
                    style={buttonStyles.primaryButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={buttonStyles.buttonText}>Cerrar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          )}
        </>
      )}
    </View>
  );
}

// Estilos locales
const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});