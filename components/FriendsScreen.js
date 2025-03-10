import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, FlatList, TextInput, TouchableOpacity, Text, Image, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, onSnapshot, query, orderBy, doc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db, storage } from '../firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import i18n from '../i18n';
import { colors, textStyles, containerStyles, buttonStyles } from '../styles'; // Estilos centralizados

// Configuración de notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function FriendsScreen() {
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [friendTyping, setFriendTyping] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [eventToInvite, setEventToInvite] = useState(null);
  const flatListRef = useRef();
  const auth = getAuth();

  // Cargar lista de amigos
  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const friendsList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(user => user.id !== auth.currentUser.uid);
      setFriends(friendsList);
    });
    return () => unsubscribe();
  }, []);

  // Cargar solicitudes de amistad pendientes
  useEffect(() => {
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const userData = doc.data();
        setPendingRequests(userData.friendRequests || []);
      }
    });
    return () => unsubscribe();
  }, []);

  // Cargar eventos
  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvents(eventsList);
    });
    return () => unsubscribe();
  }, []);

  // Cargar mensajes y estado de escritura del chat seleccionado
  useEffect(() => {
    if (selectedFriend) {
      const chatId = [auth.currentUser.uid, selectedFriend.id].sort().join('_');
      const messagesQuery = query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp', 'asc'));
      const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
        const messagesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMessages(messagesList);
      });

      const typingQuery = doc(db, 'chats', chatId, 'typingStatus', selectedFriend.id);
      const unsubscribeTyping = onSnapshot(typingQuery, (doc) => {
        setFriendTyping(doc.exists() && doc.data().isTyping || false);
      });

      return () => {
        unsubscribeMessages();
        unsubscribeTyping();
      };
    }
  }, [selectedFriend]);

  // Desplazar al final de la lista de mensajes cuando cambian
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // Enviar mensaje
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedFriend) return;
    const chatId = [auth.currentUser.uid, selectedFriend.id].sort().join('_');
    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      senderId: auth.currentUser.uid,
      message: newMessage,
      timestamp: new Date().toISOString(),
    });
    setNewMessage('');
    handleStopTyping();
  };

  // Seleccionar y enviar imagen
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      const chatId = [auth.currentUser.uid, selectedFriend.id].sort().join('_');
      const uri = result.assets[0].uri;
      const response = await fetch(uri);
      const blob = await response.blob();
      const storageRef = ref(storage, `chats/${chatId}/${Date.now()}.jpg`);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: auth.currentUser.uid,
        message: '',
        imageUrl: downloadURL,
        timestamp: new Date().toISOString(),
      });
    }
  };

  // Indicar que el usuario está escribiendo
  const handleTyping = async () => {
    if (!selectedFriend || !newMessage.trim()) return;
    const chatId = [auth.currentUser.uid, selectedFriend.id].sort().join('_');
    await setDoc(doc(db, 'chats', chatId, 'typingStatus', auth.currentUser.uid), {
      isTyping: true,
      timestamp: new Date().toISOString(),
    }, { merge: true });
  };

  // Indicar que el usuario dejó de escribir
  const handleStopTyping = async () => {
    if (!selectedFriend) return;
    const chatId = [auth.currentUser.uid, selectedFriend.id].sort().join('_');
    await setDoc(doc(db, 'chats', chatId, 'typingStatus', auth.currentUser.uid), {
      isTyping: false,
      timestamp: new Date().toISOString(),
    }, { merge: true });
  };

  // Aceptar solicitud de amistad
  const acceptFriendRequest = async (friendId) => {
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const friendRef = doc(db, 'users', friendId);
      await updateDoc(userRef, {
        friends: arrayUnion(friendId),
        friendRequests: arrayRemove(friendId),
      });
      await updateDoc(friendRef, { friends: arrayUnion(auth.currentUser.uid) });
      Alert.alert('Éxito', 'Solicitud de amistad aceptada!');
    } catch (error) {
      console.error('Error al aceptar solicitud:', error);
      Alert.alert('Error', 'No se pudo aceptar la solicitud.');
    }
  };

  // Rechazar solicitud de amistad
  const declineFriendRequest = async (friendId) => {
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { friendRequests: arrayRemove(friendId) });
      Alert.alert('Éxito', 'Solicitud de amistad rechazada.');
    } catch (error) {
      console.error('Error al rechazar solicitud:', error);
      Alert.alert('Error', 'No se pudo rechazar la solicitud.');
    }
  };

  // Programar notificación push
  const schedulePushNotification = async (title, body) => {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: { seconds: 2 },
    });
  };

  // Invitar amigo a evento
  const inviteFriendToEvent = async (friendId) => {
    try {
      if (!eventToInvite) return;
      const eventRef = doc(db, 'events', eventToInvite.id);
      await updateDoc(eventRef, { invitedFriends: arrayUnion(friendId) });
      const friendRef = doc(db, 'users', friendId);
      await updateDoc(friendRef, {
        eventInvites: arrayUnion({
          eventId: eventToInvite.id,
          name: eventToInvite.name,
          date: eventToInvite.date,
          location: eventToInvite.location,
        }),
      });
      setModalVisible(false);
      Alert.alert('Éxito', 'Amigo invitado al evento!');
    } catch (error) {
      console.error('Error al invitar amigo:', error);
      Alert.alert('Error', 'No se pudo invitar al amigo.');
    }
  };

  // Renderizar elementos de la UI
  const renderFriendItem = ({ item }) => (
    <TouchableOpacity style={styles.friendItem} onPress={() => setSelectedFriend(item)}>
      <Ionicons name="person-circle" size={40} color={colors.primary} />
      <Text style={styles.friendName}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderPendingRequestItem = ({ item }) => (
    <View style={styles.requestItem}>
      <Text style={styles.requestText}>{item.name}</Text>
      <View style={styles.requestButtons}>
        <TouchableOpacity style={[buttonStyles.secondaryButton, styles.requestButton]} onPress={() => acceptFriendRequest(item.id)}>
          <Text style={buttonStyles.buttonText}>Aceptar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[buttonStyles.dangerButton, styles.requestButton]} onPress={() => declineFriendRequest(item.id)}>
          <Text style={buttonStyles.buttonText}>Rechazar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEventItem = ({ item }) => (
    <View style={styles.eventItem}>
      <Text style={styles.eventName}>{item.name}</Text>
      <Text style={styles.eventDetails}>{item.date} - {item.location}</Text>
      <TouchableOpacity style={buttonStyles.primaryButton} onPress={() => { setEventToInvite(item); setModalVisible(true); }}>
        <Ionicons name="person-add" size={24} color={colors.textLight} />
        <Text style={buttonStyles.buttonText}>{i18n.t('inviteFriends')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderInviteFriendItem = ({ item }) => (
    <TouchableOpacity style={styles.inviteFriendItem} onPress={() => inviteFriendToEvent(item.id)}>
      <Ionicons name="person-circle" size={40} color={colors.primary} />
      <Text style={styles.friendName}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderMessageItem = ({ item }) => (
    <View style={[styles.messageItem, item.senderId === auth.currentUser.uid ? styles.messageSent : styles.messageReceived]}>
      {item.message ? (
        <Text style={item.senderId === auth.currentUser.uid ? styles.messageTextSent : styles.messageTextReceived}>
          {item.message}
        </Text>
      ) : item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.messageImage} />
      ) : null}
      <Text style={styles.messageTimestamp}>{new Date(item.timestamp).toLocaleTimeString()}</Text>
    </View>
  );

  return (
    <SafeAreaView style={containerStyles.mainContainer}>
      <View style={[containerStyles.paddedContainer, { backgroundColor: colors.primary }]}>
        <Text style={textStyles.headerTitle}>{i18n.t('friends')}</Text>
      </View>
      {!selectedFriend ? (
        <View style={containerStyles.paddedContainer}>
          <Text style={textStyles.sectionTitle}>{i18n.t('yourFriends')}</Text>
          <FlatList
            data={friends}
            renderItem={renderFriendItem}
            keyExtractor={(item) => item.id}
            style={styles.friendsList}
          />
          <Text style={textStyles.sectionTitle}>{i18n.t('pendingRequests')}</Text>
          <FlatList
            data={pendingRequests}
            renderItem={renderPendingRequestItem}
            keyExtractor={(item) => item.id}
            style={styles.requestsList}
          />
          <Text style={textStyles.sectionTitle}>Eventos</Text>
          <FlatList
            data={events}
            renderItem={renderEventItem}
            keyExtractor={(item) => item.id}
            style={styles.eventsList}
          />
        </View>
      ) : (
        <View style={containerStyles.mainContainer}>
          <View style={[containerStyles.paddedContainer, { backgroundColor: colors.primary }]}>
            <TouchableOpacity onPress={() => setSelectedFriend(null)}>
              <Ionicons name="arrow-back" size={24} color={colors.textLight} />
            </TouchableOpacity>
            <Text style={textStyles.headerTitle}>{i18n.t('chatWith')} {selectedFriend.name}</Text>
          </View>
          {friendTyping && (
            <Text style={styles.typingIndicator}>{selectedFriend.name} {i18n.t('isTyping')}</Text>
          )}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessageItem}
            keyExtractor={(item) => item.id}
            style={styles.messagesList}
            onContentSizeChange={() => flatListRef.current.scrollToEnd({ animated: true })}
          />
          <View style={styles.messageInputContainer}>
            <TouchableOpacity onPress={pickImage} style={styles.attachButton}>
              <Ionicons name="attach" size={24} color={colors.primary} />
            </TouchableOpacity>
            <TextInput
              style={styles.messageInput}
              placeholder={i18n.t('messagePlaceholder')}
              value={newMessage}
              onChangeText={(text) => {
                setNewMessage(text);
                if (text.length > 0) handleTyping();
                else handleStopTyping();
              }}
              onBlur={handleStopTyping}
              multiline
            />
            <TouchableOpacity onPress={handleSendMessage} style={buttonStyles.primaryButton}>
              <Ionicons name="send" size={24} color={colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>
      )}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={textStyles.sectionTitle}>{i18n.t('chooseFriendToInvite')}</Text>
            <FlatList
              data={friends}
              renderItem={renderInviteFriendItem}
              keyExtractor={(item) => item.id}
              style={styles.inviteFriendsList}
            />
            <TouchableOpacity style={buttonStyles.primaryButton} onPress={() => setModalVisible(false)}>
              <Text style={buttonStyles.buttonText}>{i18n.t('close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Estilos locales específicos para FriendsScreen
const styles = StyleSheet.create({
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 10,
  },
  friendName: {
    fontSize: 16,
    marginLeft: 10,
  },
  requestItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 10,
  },
  requestText: {
    fontSize: 16,
  },
  requestButtons: {
    flexDirection: 'row',
  },
  requestButton: {
    marginLeft: 10,
    paddingVertical: 5,
    paddingHorizontal: 15,
  },
  eventItem: {
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 10,
  },
  eventName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  eventDetails: {
    fontSize: 14,
    color: colors.gray,
    marginVertical: 5,
  },
  typingIndicator: {
    fontSize: 14,
    color: colors.gray,
    padding: 10,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 15,
  },
  messageItem: {
    marginVertical: 5,
    padding: 10,
    borderRadius: 10,
    maxWidth: '80%',
  },
  messageSent: {
    backgroundColor: colors.primary,
    alignSelf: 'flex-end',
  },
  messageReceived: {
    backgroundColor: '#E0E0E0',
    alignSelf: 'flex-start',
  },
  messageTextSent: {
    color: colors.textLight,
    fontSize: 16,
  },
  messageTextReceived: {
    color: colors.text,
    fontSize: 16,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginVertical: 5,
  },
  messageTimestamp: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 5,
    alignSelf: 'flex-end',
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  attachButton: {
    padding: 10,
  },
  messageInput: {
    flex: 1,
    fontSize: 16,
    padding: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    marginHorizontal: 10,
    maxHeight: 100,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
  },
  inviteFriendsList: {
    maxHeight: 300,
  },
  inviteFriendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
});