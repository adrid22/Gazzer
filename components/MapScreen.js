import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, ActivityIndicator, Alert } from 'react-native';
import MapView, { Marker, Circle, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { colors, textStyles, containerStyles, buttonStyles } from '../styles'; // Estilos centralizados
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';

export default function MapScreen() {
  const [userLocation, setUserLocation] = useState(null);
  const [region, setRegion] = useState(null);
  const [markers, setMarkers] = useState([]); // Marcadores desde Firestore
  const [userMarkers, setUserMarkers] = useState([]); // Pines creados por el usuario
  const [sliderVisible, setSliderVisible] = useState(false);
  const [radius, setRadius] = useState(100); // Radio inicial en metros
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const mapRef = useRef(null);

  // Obtener ubicación del usuario al cargar
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se necesita acceso a la ubicación.');
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

  // Cargar marcadores desde Firestore
  useEffect(() => {
    const q = collection(db, 'users'); // Ajusta según tu colección
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const markersList = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          latitude: data.location?.latitude,
          longitude: data.location?.longitude,
          name: data.name || 'Sin nombre',
          type: 'friend',
        };
      }).filter(marker => marker.latitude && marker.longitude);
      setMarkers(markersList);
    });
    return () => unsubscribe();
  }, []);

  // Crear pin al tocar el mapa
  const handleMapPress = (e) => {
    const { coordinate } = e.nativeEvent;
    const newMarker = {
      id: `user-${Date.now()}`,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      name: 'Nuevo pin',
      type: 'custom',
    };
    setUserMarkers([newMarker]); // Reemplaza cualquier pin anterior
    setSelectedMarker(newMarker);
    setSliderVisible(true); // Muestra el slider después de crear el pin
    setRadius(100); // Reinicia el radio a 100m
  };

  // Centrar el mapa en la ubicación del usuario
  const centerMap = () => {
    if (userLocation) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }, 1000); // Animación suave
    }
  };

  // Calcular distancia entre dos puntos
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
            onPress={handleMapPress}
          >
            {/* Marcadores de Firestore */}
            {markers.map(marker => (
              <Marker
                key={marker.id}
                coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
                onPress={() => {
                  setSelectedMarker(marker);
                  setModalVisible(true);
                }}
              >
                <Ionicons name="person" size={24} color={colors.primary} />
                <Callout>
                  <Text style={textStyles.normalText}>{marker.name}</Text>
                </Callout>
              </Marker>
            ))}
            {/* Pines creados por el usuario */}
            {userMarkers.map(marker => (
              <React.Fragment key={marker.id}>
                <Marker coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}>
                  <Ionicons name="pin" size={24} color={colors.danger} />
                </Marker>
                <Circle
                  center={{ latitude: marker.latitude, longitude: marker.longitude }}
                  radius={radius}
                  strokeColor={colors.primary}
                  fillColor="rgba(138, 74, 243, 0.2)"
                />
              </React.Fragment>
            ))}
          </MapView>

          {/* Slider vertical con contador de metros */}
          {sliderVisible && (
            <View style={styles.sliderContainer}>
              <Text style={textStyles.normalText}>{radius} m</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={500}
                step={10}
                value={radius}
                onValueChange={setRadius}
                orientation="vertical"
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.gray}
              />
              <TouchableOpacity onPress={() => setSliderVisible(false)}>
                <Ionicons name="close" size={24} color={colors.danger} />
              </TouchableOpacity>
            </View>
          )}

          {/* Botón para centrar el mapa */}
          <TouchableOpacity style={styles.centerButton} onPress={centerMap}>
            <Ionicons name="locate" size={24} color={colors.primary} />
          </TouchableOpacity>

          {/* Modal para marcadores de Firestore */}
          {selectedMarker && selectedMarker.type !== 'custom' && (
            <Modal
              animationType="slide"
              transparent={true}
              visible={modalVisible}
              onRequestClose={() => setModalVisible(false)}
            >
              <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                  <Text style={textStyles.sectionTitle}>{selectedMarker.name}</Text>
                  <Text style={textStyles.normalText}>Tipo: {selectedMarker.type}</Text>
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
  sliderContainer: {
    position: 'absolute',
    right: 10,
    top: '20%', // Comienza más arriba para evitar el menú inferior
    height: 250, // Altura fija para no llegar al fondo
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  slider: {
    height: 180, // Ajustado para caber dentro del contenedor
    width: 30,
  },
  centerButton: {
    position: 'absolute',
    bottom: 80, // Por encima del menú inferior (suponiendo altura de ~60px)
    left: 20,
    backgroundColor: colors.white,
    padding: 10,
    borderRadius: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
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