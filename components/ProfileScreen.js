import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, FlatList, RefreshControl, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button, Card, Input, Overlay, Avatar } from '@rneui/themed';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { auth, db } from '../firebaseConfig';
import { collection, onSnapshot, query, where, doc, updateDoc, signOut } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileScreen({ navigation }) {
  const [userData, setUserData] = useState({ name: '', email: '', photoURL: null });
  const [createdEvents, setCreatedEvents] = useState([]);
  const [joinedEvents, setJoinedEvents] = useState([]);
  const [friendsCount, setFriendsCount] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhotoURL, setEditPhotoURL] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(100);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!auth.currentUser) return;

    // Cargar datos del usuario
    setUserData({
      name: auth.currentUser.displayName || 'Usuario',
      email: auth.currentUser.email || 'No disponible',
      photoURL: auth.currentUser.photoURL || null,
    });

    // Cargar eventos creados por el usuario
    const createdQuery = query(collection(db, 'locations'), where('createdBy', '==', auth.currentUser.uid));
    const unsubscribeCreated = onSnapshot(createdQuery, (snapshot) => {
      const eventsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCreatedEvents(eventsList);
    });

    // Cargar eventos a los que se ha unido el usuario
    const joinedQuery = query(collection(db, 'locations'), where('participants', 'array-contains', auth.currentUser.uid));
    const unsubscribeJoined = onSnapshot(joinedQuery, (snapshot) => {
      const eventsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setJoinedEvents(eventsList);
    });

    // Cargar número de amigos (simulado, reemplazar con Firestore real)
    // Aquí podrías hacer una consulta a una colección de amigos
    setFriendsCount(3); // Simulado

    setLoading(false);
    fadeAnim.value = withTiming(1, { duration: 800 });
    slideAnim.value = withSpring(0, { damping: 15, stiffness: 100 });

    return () => {
      unsubscribeCreated();
      unsubscribeJoined();
    };
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1000);
  }, []);

  const handleSignOut = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await signOut(auth);
    navigation.replace('Login'); // Asegúrate de tener una pantalla de login configurada
  };

  const handleEditProfile = async () => {
    if (!editName && !editPhotoURL) return;

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const updates = {};
      if (editName) updates.displayName = editName;
      if (editPhotoURL) updates.photoURL = editPhotoURL;

      await updateDoc(userRef, updates);
      await auth.currentUser.updateProfile(updates);

      setUserData({
        ...userData,
        name: editName || userData.name,
        photoURL: editPhotoURL || userData.photoURL,
      });

      setShowEditModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.log('Error al actualizar el perfil:', err.message);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setEditPhotoURL(result.assets[0].uri);
    }
  };

  const renderEventItem = ({ item }) => (
    <TouchableOpacity style={styles.eventCard}>
      <Card containerStyle={[styles.card, { borderLeftColor: item.color || '#8A4AF3', borderLeftWidth: 5 }]}>
        <View style={styles.eventHeader}>
          <Text style={styles.eventTitle}>{item.title}</Text>
          <Text style={styles.eventDetail}>{item.isPrivate ? 'Privado' : 'Público'}</Text>
        </View>
        <Text style={styles.eventDetail}>Participantes: {item.participants.length}</Text>
      </Card>
    </TouchableOpacity>
  );

  const animatedFadeStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  const animatedSlideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideAnim.value }],
  }));

  const data = [
    { type: 'createdEvents', data: createdEvents },
    { type: 'joinedEvents', data: joinedEvents },
  ];

  const renderItem = ({ item }) => {
    if (item.type === 'createdEvents') {
      return (
        <Card containerStyle={styles.card}>
          <Text style={styles.sectionTitle}>Eventos Creados</Text>
          {item.data.length > 0 ? (
            item.data.map((event) => (
              <View key={event.id}>
                {renderEventItem({ item: event })}
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No has creado eventos aún</Text>
          )}
        </Card>
      );
    } else if (item.type === 'joinedEvents') {
      return (
        <Card containerStyle={styles.card}>
          <Text style={styles.sectionTitle}>Eventos a los que te has unido</Text>
          {item.data.length > 0 ? (
            item.data.map((event) => (
              <View key={event.id}>
                {renderEventItem({ item: event })}
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No te has unido a ningún evento</Text>
          )}
        </Card>
      );
    }
    return null;
  };

  const ListHeader = () => (
    <>
      <View style={styles.profileHeader}>
        <Avatar
          size={100}
          rounded
          source={{ uri: userData.photoURL || 'https://randomuser.me/api/portraits/men/1.jpg' }}
          containerStyle={styles.avatar}
        />
        <Text style={styles.profileName}>{userData.name}</Text>
        <Text style={styles.profileEmail}>{userData.email}</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{friendsCount}</Text>
            <Text style={styles.statLabel}>Amigos</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{createdEvents.length}</Text>
            <Text style={styles.statLabel}>Eventos Creados</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{joinedEvents.length}</Text>
            <Text style={styles.statLabel}>Eventos Asistidos</Text>
          </View>
        </View>
        <Button
          title="Editar Perfil"
          onPress={() => {
            setEditName(userData.name);
            setEditPhotoURL(userData.photoURL);
            setShowEditModal(true);
          }}
          buttonStyle={styles.editButton}
          titleStyle={styles.buttonText}
          icon={<Ionicons name="pencil" size={18} color="#fff" />}
          iconPosition="left"
        />
        <Button
          title="Ver Amigos"
          onPress={() => navigation.navigate('Amigos')}
          buttonStyle={styles.friendsButton}
          titleStyle={styles.buttonText}
          icon={<Ionicons name="people" size={18} color="#fff" />}
          iconPosition="left"
        />
      </View>
    </>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#8A4AF3" style={styles.loading} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Animated.View style={[styles.content, animatedFadeStyle]}>
        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.type}-${index}`}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={
            <Button
              title="Cerrar Sesión"
              onPress={handleSignOut}
              buttonStyle={styles.signOutButton}
              titleStyle={styles.buttonText}
              icon={<Ionicons name="log-out" size={18} color="#fff" />}
              iconPosition="left"
            />
          }
          ListEmptyComponent={<Text style={styles.emptyText}>No hay contenido para mostrar</Text>}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8A4AF3" />
          }
        />
      </Animated.View>

      {/* Modal para editar perfil */}
      {showEditModal && (
        <Overlay isVisible={true} overlayStyle={styles.editModal}>
          <Text style={styles.modalTitle}>Editar Perfil</Text>
          <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
            <Avatar
              size={80}
              rounded
              source={{ uri: editPhotoURL || userData.photoURL || 'https://randomuser.me/api/portraits/men/1.jpg' }}
              containerStyle={styles.avatar}
            />
            <Ionicons name="camera" size={24} color="#8A4AF3" style={styles.cameraIcon} />
          </TouchableOpacity>
          <Input
            placeholder="Nombre"
            value={editName}
            onChangeText={setEditName}
            containerStyle={styles.inputContainer}
            inputStyle={styles.inputText}
          />
          <Button
            title="Guardar Cambios"
            onPress={handleEditProfile}
            buttonStyle={styles.applyButton}
            titleStyle={styles.buttonText}
          />
          <Button
            title="Cancelar"
            onPress={() => setShowEditModal(false)}
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
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  avatar: {
    marginBottom: 10,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  profileEmail: {
    fontSize: 16,
    color: '#666',
    marginVertical: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: 15,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8A4AF3',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  editButton: {
    backgroundColor: '#8A4AF3',
    borderRadius: 8,
    paddingVertical: 10,
    marginVertical: 5,
    width: '80%',
  },
  friendsButton: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    paddingVertical: 10,
    marginVertical: 5,
    width: '80%',
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
  sectionTitle: {
    fontSize: 18,
    color: '#1A1A1A',
    fontWeight: '600',
    marginBottom: 10,
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
  eventDetail: {
    fontSize: 14,
    color: '#666',
    marginVertical: 2,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
  signOutButton: {
    backgroundColor: '#FF6F61',
    borderRadius: 8,
    paddingVertical: 12,
    marginVertical: 20,
    marginHorizontal: 10,
  },
  editModal: {
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
  modalTitle: {
    fontSize: 20,
    color: '#1A1A1A',
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: '30%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 5,
  },
  inputContainer: {
    marginVertical: 10,
  },
  inputText: {
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
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});