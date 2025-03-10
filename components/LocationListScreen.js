import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, FlatList, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button, Card, Input, Overlay, Badge } from '@rneui/themed';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { collection, onSnapshot, query, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig'; // Asegúrate de tener tu configuración de Firestore

const CATEGORIES = [
  { id: 'party', name: 'Fiesta', icon: 'beer' },
  { id: 'sport', name: 'Deporte', icon: 'basketball' },
  { id: 'meetup', name: 'Encuentro', icon: 'people' },
  { id: 'other', name: 'Otro', icon: 'ellipsis-horizontal' },
];

const COLORS = ['#8A4AF3', '#FF6F61', '#34C759', '#FFD700'];

export default function ListScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [maxDistance, setMaxDistance] = useState(5000); // 5km por defecto
  const [showPrivate, setShowPrivate] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(100);
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get('window').height;

  useEffect(() => {
    // Cargar eventos desde Firestore en tiempo real
    const q = query(collection(db, 'locations'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEvents(eventList);
      setFilteredEvents(eventList);
      fadeAnim.value = withTiming(1, { duration: 800 });
      slideAnim.value = withSpring(0, { damping: 15, stiffness: 100 });
    }, (err) => {
      console.log('Error cargando eventos:', err.message);
    });

    return () => unsubscribe();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1000);
  }, []);

  const handleSearch = (text) => {
    setSearchQuery(text);
    filterEvents(text, selectedCategory, maxDistance, showPrivate);
  };

  const handleFilter = () => {
    setShowFilters(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const applyFilters = () => {
    filterEvents(searchQuery, selectedCategory, maxDistance, showPrivate);
    setShowFilters(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const filterEvents = (queryText, category, distance, includePrivate) => {
    let filtered = events;

    // Filtrar por búsqueda
    if (queryText) {
      filtered = filtered.filter((event) =>
        event.title.toLowerCase().includes(queryText.toLowerCase())
      );
    }

    // Filtrar por categoría
    if (category) {
      filtered = filtered.filter((event) => event.category === category);
    }

    // Filtrar por distancia (simulación, necesitarías calcular la distancia real)
    if (distance) {
      filtered = filtered.filter((event) => {
        // Simulación: asumir que cada evento tiene una distancia calculada
        // En producción, usar la latitud/longitud para calcular la distancia real
        const eventDistance = event.radius || 1000; // Ejemplo
        return eventDistance <= distance;
      });
    }

    // Filtrar por privacidad
    if (!includePrivate) {
      filtered = filtered.filter((event) => !event.isPrivate);
    }

    setFilteredEvents(filtered);
  };

  const handleJoinEvent = async (eventId) => {
    if (!auth.currentUser) {
      console.log('Debes iniciar sesión para unirte');
      return;
    }

    const eventRef = doc(db, 'locations', eventId);
    const userId = auth.currentUser.uid;
    const event = events.find((e) => e.id === eventId);

    if (event.participants.includes(userId)) {
      // Abandonar evento
      await updateDoc(eventRef, {
        participants: arrayRemove(userId),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      // Unirse al evento
      await updateDoc(eventRef, {
        participants: arrayUnion(userId),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const renderEventItem = ({ item }) => (
    <TouchableOpacity onPress={() => setSelectedEvent(item)} style={styles.eventCard}>
      <Card containerStyle={[styles.card, { borderLeftColor: item.color || COLORS[0], borderLeftWidth: 5 }]}>
        <View style={styles.eventHeader}>
          <Text style={styles.eventTitle}>{item.title}</Text>
          <Badge
            value={item.isPrivate ? 'Privado' : 'Público'}
            status={item.isPrivate ? 'warning' : 'success'}
            badgeStyle={styles.badge}
            textStyle={styles.badgeText}
          />
        </View>
        <Text style={styles.eventDetail}>
          Categoría: {CATEGORIES.find((cat) => cat.id === item.category)?.name || 'Otro'}
        </Text>
        <Text style={styles.eventDetail}>Participantes: {item.participants.length}</Text>
        <Text style={styles.eventDetail}>Distancia: {(item.radius || 1000) / 1000} km</Text>
        <Button
          title={item.participants.includes(auth.currentUser?.uid) ? 'Abandonar' : 'Unirse'}
          onPress={() => handleJoinEvent(item.id)}
          buttonStyle={[
            styles.joinButton,
            item.participants.includes(auth.currentUser?.uid) && styles.leaveButton,
          ]}
          titleStyle={styles.buttonText}
        />
      </Card>
    </TouchableOpacity>
  );

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.categoryItem, selectedCategory === item.id && styles.categorySelected]}
      onPress={() => setSelectedCategory(selectedCategory === item.id ? null : item.id)}
    >
      <Ionicons
        name={item.icon}
        size={20}
        color={selectedCategory === item.id ? '#8A4AF3' : '#666'}
      />
      <Text
        style={[styles.categoryText, selectedCategory === item.id && { color: '#8A4AF3' }]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const animatedFadeStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  const animatedSlideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideAnim.value }],
  }));

  const animatedModalStyle = useAnimatedStyle(() => ({
    opacity: withTiming(showFilters ? 1 : 0, { duration: 300 }),
    transform: [{ translateY: withTiming(showFilters ? 0 : screenHeight, { duration: 300 }) }],
  }));

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Animated.View style={[styles.content, animatedFadeStyle]}>
        <Text h4 style={styles.title}>Lista de Eventos</Text>
        <View style={styles.searchContainer}>
          <Input
            placeholder="Buscar eventos..."
            value={searchQuery}
            onChangeText={handleSearch}
            containerStyle={styles.searchInputContainer}
            inputContainerStyle={styles.searchInput}
            inputStyle={styles.searchText}
            leftIcon={<Ionicons name="search" size={20} color="#666" />}
          />
          <TouchableOpacity onPress={handleFilter} style={styles.filterButton}>
            <Ionicons name="filter" size={24} color="#8A4AF3" />
          </TouchableOpacity>
        </View>
        <FlatList
          data={filteredEvents}
          renderItem={renderEventItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.emptyText}>No hay eventos disponibles</Text>}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8A4AF3" />
          }
        />
      </Animated.View>

      {/* Modal de filtros */}
      {showFilters && (
        <Animated.View style={[styles.filterModal, animatedModalStyle]}>
          <Card containerStyle={styles.filterCard}>
            <Text style={styles.modalTitle}>Filtros</Text>
            <Text style={styles.filterLabel}>Categoría</Text>
            <FlatList
              data={CATEGORIES}
              renderItem={renderCategoryItem}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryList}
            />
            <Text style={styles.filterLabel}>Distancia Máxima (metros)</Text>
            <Slider
              value={maxDistance}
              onValueChange={setMaxDistance}
              minimumValue={100}
              maximumValue={10000}
              step={100}
              thumbStyle={styles.sliderThumb}
              trackStyle={styles.sliderTrack}
              minimumTrackTintColor="#8A4AF3"
              maximumTrackTintColor="#ccc"
            />
            <Text style={styles.sliderValue}>{maxDistance} m</Text>
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Mostrar eventos privados</Text>
              <Switch value={showPrivate} onValueChange={setShowPrivate} color="#8A4AF3" />
            </View>
            <Button
              title="Aplicar Filtros"
              onPress={applyFilters}
              buttonStyle={styles.applyButton}
              titleStyle={styles.buttonText}
            />
            <Button
              title="Cerrar"
              onPress={() => setShowFilters(false)}
              buttonStyle={styles.closeButton}
              titleStyle={styles.buttonText}
            />
          </Card>
        </Animated.View>
      )}

      {/* Modal de detalles del evento */}
      {selectedEvent && (
        <Overlay isVisible={true} overlayStyle={styles.eventOverlay}>
          <Text style={styles.modalTitle}>{selectedEvent.title}</Text>
          <Text style={styles.eventDetail}>Categoría: {CATEGORIES.find((cat) => cat.id === selectedEvent.category)?.name || 'Otro'}</Text>
          <Text style={styles.eventDetail}>Creado por: {selectedEvent.createdBy}</Text>
          <Text style={styles.eventDetail}>Participantes: {selectedEvent.participants.length}</Text>
          <Text style={styles.eventDetail}>Ubicación: Lat {selectedEvent.latitude}, Lon {selectedEvent.longitude}</Text>
          <Text style={styles.eventDetail}>Estado: {selectedEvent.isPrivate ? 'Privado' : 'Público'}</Text>
          <Button
            title="Cerrar"
            onPress={() => setSelectedEvent(null)}
            buttonStyle={styles.closeButton}
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
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
  },
  title: {
    color: '#8A4AF3',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  searchInputContainer: {
    flex: 1,
    height: 40,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchText: {
    fontSize: 14,
    color: '#1A1A1A',
  },
  filterButton: {
    padding: 10,
  },
  eventCard: {
    marginVertical: 5,
  },
  card: {
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 12,
  },
  eventDetail: {
    fontSize: 14,
    color: '#666',
    marginVertical: 2,
  },
  joinButton: {
    backgroundColor: '#8A4AF3',
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 10,
  },
  leaveButton: {
    backgroundColor: '#FF6F61',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
  filterModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  filterCard: {
    borderRadius: 12,
    padding: 15,
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 20,
    color: '#1A1A1A',
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginVertical: 10,
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
  categorySelected: {
    borderBottomWidth: 2,
    borderBottomColor: '#8A4AF3',
  },
  sliderThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#8A4AF3',
  },
  sliderTrack: {
    height: 2,
    borderRadius: 1,
  },
  sliderValue: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginVertical: 5,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  switchLabel: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  applyButton: {
    backgroundColor: '#8A4AF3',
    borderRadius: 8,
    paddingVertical: 10,
    marginVertical: 10,
  },
  closeButton: {
    backgroundColor: '#FF6F61',
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  eventOverlay: {
    width: '85%',
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#fff',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});