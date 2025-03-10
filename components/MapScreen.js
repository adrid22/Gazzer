import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, FlatList, Keyboard, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Circle, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { Text, Overlay, Input, Button, Slider, Switch, Card } from '@rneui/themed';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const INITIAL_REGION = {
  latitude: 40.4168,
  longitude: -3.7038,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

const CATEGORIES = [
  { id: 'party', name: 'Fiesta', icon: 'beer' },
  { id: 'sport', name: 'Deporte', icon: 'basketball' },
  { id: 'meetup', name: 'Encuentro', icon: 'people' },
  { id: 'other', name: 'Otro', icon: 'ellipsis-horizontal' },
];

const COLORS = ['#8A4AF3', '#FF6F61', '#34C759', '#FFD700'];

export default function MapScreen({ navigation }) {
  const [markers, setMarkers] = useState([]);
  const [region, setRegion] = useState(INITIAL_REGION);
  const [step, setStep] = useState(0); // 0: Mapa, 1: Radio, 2: Nombre, 3: Detalles
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [tempMarker, setTempMarker] = useState(null);
  const [radius, setRadius] = useState(100);
  const [title, setTitle] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [category, setCategory] = useState('party');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [error, setError] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const fadeAnim = useSharedValue(0);
  const pinScale = useSharedValue(0);
  const sliderAnim = useSharedValue(1); // Comienza oculto fuera de la pantalla

  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get('window').height;

  useEffect(() => {
    console.log('Initializing MapScreen');
    loadMarkers();
    updateUserLocation();
    fadeAnim.value = withTiming(1, { duration: 800 });
  }, []);

  const loadMarkers = async () => {
    console.log('Loading markers...');
    try {
      const snapshot = await getDocs(collection(db, 'locations'));
      const loadedMarkers = snapshot.docs.map((doc) => {
        const data = doc.data();
        console.log('Raw marker data from Firestore:', data);
        const marker = {
          id: doc.id,
          latitude: typeof data.latitude === 'number' ? data.latitude : 0,
          longitude: typeof data.longitude === 'number' ? data.longitude : 0,
          title: data.title || 'Sin título',
          radius: typeof data.radius === 'number' && data.radius > 0 ? data.radius : 100,
          color: data.color || COLORS[0],
          isPrivate: data.isPrivate || false,
          category: data.category || 'party',
          participants: Array.isArray(data.participants) ? data.participants : [],
          createdBy: data.createdBy || 'unknown',
        };
        console.log('Processed marker:', marker);
        return marker;
      });
      console.log('Processed markers:', loadedMarkers);
      setMarkers(loadedMarkers);
      console.log('Markers loaded:', loadedMarkers.length);
    } catch (err) {
      setError('Error al cargar marcadores: ' + err.message);
      console.log('Markers load error:', err.message);
    }
  };

  const updateUserLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permisos de ubicación denegados');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
      console.log('User location updated');
    } catch (err) {
      console.log('Error updating location:', err.message);
    }
  };

  const handleMapPress = (e) => {
    const coord = e.nativeEvent.coordinate;
    console.log('Map pressed, Coordinates:', coord);
    setSelectedLocation(coord);
    setTempMarker({ latitude: coord.latitude, longitude: coord.longitude, radius, color: selectedColor, category });
    setStep(1);
    pinScale.value = withSpring(1, { damping: 10 });
    sliderAnim.value = withTiming(0, { duration: 300 }); // Desplaza hacia arriba
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleRadiusChange = (value) => {
    console.log('Radius changed to:', value);
    setRadius(value);
    if (tempMarker) {
      setTempMarker((prev) => ({ ...prev, radius: value }));
    }
  };

  const handleNextStep = async () => {
    console.log('Next step triggered, current step:', step);
    if (isCreating) return;
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (!title) {
        alert('Por favor, ingresa un nombre para el evento.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      await handleCreate();
    }
  };

  const handleCreate = async () => {
    setIsCreating(true);
    console.log('Starting create process');
    try {
      if (!auth.currentUser) {
        throw new Error('No hay usuario autenticado');
      }
      console.log('User authenticated:', auth.currentUser.uid);

      const newMarker = {
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        title,
        radius,
        isPrivate,
        category,
        color: selectedColor,
        createdBy: auth.currentUser.uid,
        participants: [auth.currentUser.uid],
        createdAt: new Date().toISOString(),
      };
      console.log('New marker data:', newMarker);

      console.log('Attempting to save to Firestore');
      const docRef = await Promise.race([
        addDoc(collection(db, 'locations'), newMarker),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 5000)),
      ]);
      console.log('Marker saved to Firestore, ID:', docRef.id);

      const updatedMarker = { id: docRef.id, ...newMarker };
      setMarkers((prev) => {
        const newMarkers = [...prev, updatedMarker];
        console.log('New markers state:', newMarkers);
        return newMarkers;
      });

      console.log('Resetting state');
      setStep(0);
      setTempMarker(null);
      setTitle('');
      setRadius(100);
      setIsPrivate(false);
      setCategory('party');
      setSelectedColor(COLORS[0]);
      Keyboard.dismiss();
      pinScale.value = withTiming(0);
      sliderAnim.value = withTiming(1, { duration: 300 }); // Vuelve a ocultarse
      setConfirmationVisible(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      console.log('Event created successfully');
      await loadMarkers();
    } catch (err) {
      setError('Error al crear evento: ' + err.message);
      console.log('Create error:', err.message);
    } finally {
      setIsCreating(false);
      console.log('Create process finished');
    }
  };

  const handleJoinEvent = async (markerId) => {
    if (!auth.currentUser) {
      setError('Debes iniciar sesión para unirte');
      return;
    }
    try {
      const marker = markers.find((m) => m.id === markerId);
      const newParticipants = marker.participants.includes(auth.currentUser.uid)
        ? marker.participants.filter((uid) => uid !== auth.currentUser.uid)
        : [...marker.participants, auth.currentUser.uid];

      await addDoc(collection(db, 'locations', markerId, 'participants'), {
        participants: newParticipants,
      });
      setMarkers((prev) =>
        prev.map((m) => (m.id === markerId ? { ...m, participants: newParticipants } : m))
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      setError('Error al unirse/abandonar: ' + err.message);
      console.log('Join error:', err.message);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  const pinStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pinScale.value }],
  }));

  const sliderStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sliderAnim.value * (screenHeight * 0.7) }], // Desplaza desde fuera hacia arriba
  }));

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity
      style={styles.categoryItem}
      onPress={() => setCategory(item.id)}
    >
      <Ionicons
        name={item.icon}
        size={24}
        color={category === item.id ? '#8A4AF3' : '#666'}
      />
      <Text
        style={[styles.categoryText, category === item.id && { color: '#8A4AF3' }]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.mapContainer, animatedStyle]}>
        <MapView
          style={styles.map}
          initialRegion={INITIAL_REGION}
          region={region}
          onPress={handleMapPress}
          showsUserLocation
          showsMyLocationButton
          onRegionChangeComplete={(newRegion) => setRegion(newRegion)}
        >
          {markers.length > 0 &&
            markers.map((marker) => {
              if (!marker.latitude || !marker.longitude) {
                console.log('Invalid marker skipped:', marker);
                return null;
              }
              console.log('Rendering marker:', marker);
              return (
                <React.Fragment key={marker.id}>
                  <Marker
                    coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
                    pinColor={marker.color}
                  >
                    <Callout onPress={() => handleJoinEvent(marker.id)}>
                      <View style={styles.calloutContainer}>
                        <Text style={styles.calloutTitle}>{marker.title}</Text>
                        <Text style={styles.calloutText}>
                          {marker.isPrivate ? 'Privado' : 'Público'} • {marker.participants.length} participantes
                        </Text>
                        <Button
                          title={marker.participants.includes(auth.currentUser?.uid) ? 'Abandonar' : 'Unirse'}
                          buttonStyle={styles.calloutButton}
                          titleStyle={styles.calloutButtonText}
                        />
                      </View>
                    </Callout>
                  </Marker>
                  <Circle
                    center={{ latitude: marker.latitude, longitude: marker.longitude }}
                    radius={typeof marker.radius === 'number' && marker.radius > 0 ? marker.radius : 100}
                    strokeColor={`${marker.color}8F`}
                    fillColor={`${marker.color}3F`}
                  />
                </React.Fragment>
              );
            })}
          {tempMarker && (
            <>
              <Marker
                coordinate={{ latitude: tempMarker.latitude, longitude: tempMarker.longitude }}
                pinColor={tempMarker.color}
                style={pinStyle}
              />
              <Circle
                center={{ latitude: tempMarker.latitude, longitude: tempMarker.longitude }}
                radius={tempMarker.radius}
                strokeColor={`${tempMarker.color}8F`}
                fillColor={`${tempMarker.color}3F`}
              />
            </>
          )}
        </MapView>
      </Animated.View>

      {/* Paso 1: Radio */}
      {step >= 1 && tempMarker && (
        <Animated.View style={[styles.sliderContainer, sliderStyle]}>
          <Card containerStyle={styles.sliderCard}>
            <Text style={styles.sliderLabel}>Área</Text>
            <Text style={styles.sliderSubLabel}>{radius} m</Text>
            <Slider
              value={radius}
              onValueChange={handleRadiusChange}
              minimumValue={10}
              maximumValue={1000}
              step={10}
              thumbStyle={styles.sliderThumb}
              trackStyle={styles.sliderTrack}
              minimumTrackTintColor="#8A4AF3"
              maximumTrackTintColor="#ccc"
            />
            <Button
              title="Siguiente"
              onPress={handleNextStep}
              buttonStyle={styles.sliderButton}
              titleStyle={styles.buttonText}
              disabled={isCreating}
            />
          </Card>
        </Animated.View>
      )}

      {/* Paso 2: Nombre */}
      {step === 2 && (
        <Overlay isVisible={true} overlayStyle={styles.overlay}>
          <Text style={styles.overlayTitle}>Nombre del Evento</Text>
          <Input
            placeholder="Ejemplo: Fiesta en el parque"
            value={title}
            onChangeText={setTitle}
            autoFocus
            inputStyle={styles.inputText}
            placeholderTextColor="#666"
          />
          <Button
            title="Siguiente"
            onPress={handleNextStep}
            buttonStyle={styles.button}
            titleStyle={styles.buttonText}
            disabled={isCreating}
          />
          <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
            <Ionicons name="arrow-back" size={24} color="#8A4AF3" />
          </TouchableOpacity>
        </Overlay>
      )}

      {/* Paso 3: Detalles */}
      {step === 3 && (
        <Overlay isVisible={true} overlayStyle={styles.overlay}>
          <Text style={styles.overlayTitle}>Detalles del Evento</Text>
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>¿Es privado?</Text>
            <Switch value={isPrivate} onValueChange={setIsPrivate} color="#8A4AF3" />
          </View>
          <Text style={styles.detailLabel}>Elige un color:</Text>
          <View style={styles.colorPicker}>
            {COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  selectedColor === color && styles.colorSelected,
                ]}
                onPress={() => {
                  setSelectedColor(color);
                  setTempMarker((prev) => ({ ...prev, color }));
                }}
              />
            ))}
          </View>
          <Text style={styles.detailLabel}>Selecciona una categoría:</Text>
          <FlatList
            data={CATEGORIES}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryList}
          />
          <Button
            title="Crear"
            onPress={handleNextStep}
            buttonStyle={styles.button}
            titleStyle={styles.buttonText}
            disabled={isCreating}
          />
          <TouchableOpacity style={styles.backButton} onPress={() => setStep(2)}>
            <Ionicons name="arrow-back" size={24} color="#8A4AF3" />
          </TouchableOpacity>
        </Overlay>
      )}

      {/* Confirmación */}
      {confirmationVisible && (
        <Overlay isVisible={true} overlayStyle={styles.overlay}>
          <Text style={styles.confirmationText}>¡Evento creado con éxito!</Text>
          <Button
            title="Entendido"
            onPress={() => setConfirmationVisible(false)}
            buttonStyle={styles.button}
            titleStyle={styles.buttonText}
          />
        </Overlay>
      )}

      {/* Error */}
      {error && (
        <Overlay isVisible={true} overlayStyle={styles.overlay}>
          <Text style={styles.errorText}>{error}</Text>
          <Button
            title="Entendido"
            onPress={() => setError(null)}
            buttonStyle={styles.button}
            titleStyle={styles.buttonText}
          />
        </Overlay>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  sliderContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderCard: {
    borderRadius: 10,
    padding: 4,
    backgroundColor: '#fff',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    maxHeight: 100,
    width: '90%',
  },
  sliderLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 1,
  },
  sliderSubLabel: {
    fontSize: 9,
    color: '#666',
    textAlign: 'center',
    marginBottom: 2,
  },
  sliderThumb: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#8A4AF3',
  },
  sliderTrack: {
    height: 2,
    borderRadius: 1,
  },
  sliderButton: {
    backgroundColor: '#8A4AF3',
    borderRadius: 6,
    paddingVertical: 4,
    marginTop: 2,
  },
  overlay: {
    width: '85%',
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#fff',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    maxHeight: '80%',
  },
  overlayTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  inputText: {
    color: '#333',
    fontSize: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 15,
    marginBottom: 5,
  },
  colorPicker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ccc',
  },
  colorSelected: {
    borderColor: '#8A4AF3',
    borderWidth: 3,
  },
  categoryList: {
    marginVertical: 10,
  },
  categoryItem: {
    alignItems: 'center',
    marginHorizontal: 15,
  },
  categoryText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  button: {
    backgroundColor: '#8A4AF3',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 15,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
  confirmationText: {
    fontSize: 18,
    color: '#8A4AF3',
    marginBottom: 15,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#FF6F61',
    marginBottom: 15,
    textAlign: 'center',
  },
  calloutContainer: {
    width: 160,
    padding: 10,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  calloutText: {
    fontSize: 14,
    color: '#666',
    marginVertical: 5,
  },
  calloutButton: {
    backgroundColor: '#8A4AF3',
    borderRadius: 5,
    paddingVertical: 5,
  },
  calloutButtonText: {
    color: '#fff',
    fontSize: 14,
  },
});