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

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvents(eventsList);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedFriend) {
      const chatId = [auth.currentUser.uid, selectedFriend.id].sort().join('_');
      const messagesQuery = query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp', 'asc'));
      const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
        const messagesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMessages(messagesList);
      });

      // Escuchar el estado de escritura del amigo
      const typingQuery = doc(db, 'chats', chatId, 'typingStatus', selectedFriend.id);
      const unsubscribeTyping = onSnapshot(typingQuery, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setFriendTyping(data.isTyping || false);
        } else {
          setFriendTyping(false);
        }
      });

      return () => {
        unsubscribeMessages();
        unsubscribeTyping();
      };
    }
  }, [selectedFriend]);

  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedFriend) return;

    const chatId = [auth.currentUser.uid, selectedFriend.id].sort().join('_');
    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      senderId: auth.currentUser.uid,
      message: newMessage,
      timestamp: new Date().toISOString(),
    });
    setNewMessage('');
    handleStopTyping();
  };

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

  const handleTyping = async () => {
    if (!selectedFriend || !newMessage.trim()) return;
    const chatId = [auth.currentUser.uid, selectedFriend.id].sort().join('_');
    await setDoc(doc(db, 'chats', chatId, 'typingStatus', auth.currentUser.uid), {
      isTyping: true,
      timestamp: new Date().toISOString(),
    }, { merge: true });
  };

  const handleStopTyping = async () => {
    if (!selectedFriend) return;
    const chatId = [auth.currentUser.uid, selectedFriend.id].sort().join('_');
    await setDoc(doc(db, 'chats', chatId, 'typingStatus', auth.currentUser.uid), {
      isTyping: false,
      timestamp: new Date().toISOString(),
    }, { merge: true });
  };

  const acceptFriendRequest = async (friendId) => {
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const friendRef = doc(db, 'users', friendId);

      await updateDoc(userRef, {
        friends: arrayUnion(friendId),
        friendRequests: arrayRemove(friendId),
      });

      await updateDoc(friendRef, {
        friends: arrayUnion(auth.currentUser.uid),
      });

      Alert.alert('Success', 'Friend request accepted!');
    } catch (error) {
      console.error('Error accepting friend request:', error);
      Alert.alert('Error', 'Failed to accept friend request.');
    }
  };

  const declineFriendRequest = async (friendId) => {
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        friendRequests: arrayRemove(friendId),
      });
      Alert.alert('Success', 'Friend request declined.');
    } catch (error) {
      console.error('Error declining friend request:', error);
      Alert.alert('Error', 'Failed to decline friend request.');
    }
  };

  const schedulePushNotification = async (title, body) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
      },
      trigger: { seconds: 2 },
    });
  };

  const handleEventCreated = async (event) => {
    const title = i18n.t('eventCreated');
    const body = i18n.t('eventCreatedBody', [auth.currentUser.displayName || 'User', event.name]);
    await schedulePushNotification(title, body);
    // Lógica adicional para notificar a otros usuarios (puedes expandirla con Firebase Functions)
  };

  const inviteFriendToEvent = async (friendId) => {
    try {
      if (!eventToInvite) return;

      const eventRef = doc(db, 'events', eventToInvite.id);
      await updateDoc(eventRef, {
        invitedFriends: arrayUnion(friendId),
      });

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
      Alert.alert('Success', 'Friend invited to the event!');
    } catch (error) {
      console.error('Error inviting friend to event:', error);
      Alert.alert('Error', 'Failed to invite friend to event.');
    }
  };

  const renderFriendItem = ({ item }) => (
    <TouchableOpacity
      style={styles.friendItem}
      onPress={() => setSelectedFriend(item)}
    >
      <Ionicons name="person-circle" size={40} color="#8A4AF3" />
      <Text style={styles.friendName}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderPendingRequestItem = ({ item }) => (
    <View style={styles.requestItem}>
      <Text style={styles.requestText}>{item.name}</Text>
      <View style={styles.requestButtons}>
        <TouchableOpacity
          style={[styles.requestButton, styles.acceptButton]}
          onPress={() => acceptFriendRequest(item.id)}
        >
          <Text style={styles.buttonText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.requestButton, styles.declineButton]}
          onPress={() => declineFriendRequest(item.id)}
        >
          <Text style={styles.buttonText}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEventItem = ({ item }) => (
    <View style={styles.eventItem}>
      <Text style={styles.eventName}>{item.name}</Text>
      <Text style={styles.eventDetails}>{item.date} - {item.location}</Text>
      <TouchableOpacity
        style={styles.inviteButton}
        onPress={() => {
          setEventToInvite(item);
          setModalVisible(true);
        }}
      >
        <Ionicons name="person-add" size={24} color="#fff" />
        <Text style={styles.inviteButtonText}>{i18n.t('inviteFriends')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderInviteFriendItem = ({ item }) => (
    <TouchableOpacity
      style={styles.inviteFriendItem}
      onPress={() => inviteFriendToEvent(item.id)}
    >
      <Ionicons name="person-circle" size={40} color="#8A4AF3" />
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{i18n.t('friends')}</Text>
      </View>
      {!selectedFriend ? (
        <View style={styles.friendsContainer}>
          <Text style={styles.sectionTitle}>{i18n.t('yourFriends')}</Text>
          <FlatList
            data={friends}
            renderItem={renderFriendItem}
            keyExtractor={(item) => item.id}
            style={styles.friendsList}
          />
          <Text style={styles.sectionTitle}>{i18n.t('pendingRequests')}</Text>
          <FlatList
            data={pendingRequests}
            renderItem={renderPendingRequestItem}
            keyExtractor={(item) => item.id}
            style={styles.requestsList}
          />
          <Text style={styles.sectionTitle}>Events</Text>
          <FlatList
            data={events}
            renderItem={renderEventItem}
            keyExtractor={(item) => item.id}
            style={styles.eventsList}
          />
        </View>
      ) : (
        <View style={styles.chatContainer}>
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={() => setSelectedFriend(null)}>
              <Ionicons name="arrow-back" size={24} color="#8A4AF3" />
            </TouchableOpacity>
            <Text style={styles.chatTitle}>{i18n.t('chatWith')} {selectedFriend.name}</Text>
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
              <Ionicons name="attach" size={24} color="#8A4AF3" />
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
            <TouchableOpacity onPress={handleSendMessage} style={styles.sendButton}>
              <Ionicons name="send" size={24} color="#8A4AF3" />
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
            <Text style={styles.modalTitle}>{i18n.t('chooseFriendToInvite')}</Text>
            <FlatList
              data={friends}
              renderItem={renderInviteFriendItem}
              keyExtractor={(item) => item.id}
              style={styles.inviteFriendsList}
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>{i18n.t('close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { padding: 15, backgroundColor: '#8A4AF3', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  friendsContainer: { flex: 1, padding: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  friendsList: { flex: 0.3, marginBottom: 20 },
  requestsList: { flex: 0.3, marginBottom: 20 },
  eventsList: { flex: 0.4 },
  friendItem: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#fff', borderRadius: 10, marginBottom: 10 },
  friendName: { fontSize: 16, marginLeft: 10 },
  requestItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, backgroundColor: '#fff', borderRadius: 10, marginBottom: 10 },
  requestText: { fontSize: 16 },
  requestButtons: { flexDirection: 'row' },
  requestButton: { padding: 10, borderRadius: 5, marginLeft: 10 },
  acceptButton: { backgroundColor: '#4CAF50' },
  declineButton: { backgroundColor: '#F44336' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  eventItem: { padding: 15, backgroundColor: '#fff', borderRadius: 10, marginBottom: 10 },
  eventName: { fontSize: 16, fontWeight: 'bold' },
  eventDetails: { fontSize: 14, color: '#888', marginVertical: 5 },
  inviteButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#8A4AF3', padding: 10, borderRadius: 5, marginTop: 10 },
  inviteButtonText: { color: '#fff', marginLeft: 5 },
  chatContainer: { flex: 1 },
  chatHeader: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#8A4AF3' },
  chatTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginLeft: 10 },
  typingIndicator: { fontSize: 14, color: '#888', padding: 10 },
  messagesList: { flex: 1, paddingHorizontal: 15 },
  messageItem: { marginVertical: 5, padding: 10, borderRadius: 10, maxWidth: '80%' },
  messageSent: { backgroundColor: '#8A4AF3', alignSelf: 'flex-end' },
  messageReceived: { backgroundColor: '#E0E0E0', alignSelf: 'flex-start' },
  messageTextSent: { color: '#fff', fontSize: 16 },
  messageTextReceived: { color: '#000', fontSize: 16 },
  messageImage: { width: 200, height: 200, borderRadius: 10, marginVertical: 5 },
  messageTimestamp: { fontSize: 12, color: '#888', marginTop: 5, alignSelf: 'flex-end' },
  messageInputContainer: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  attachButton: { padding: 10 },
  messageInput: { flex: 1, fontSize: 16, padding: 10, backgroundColor: '#F5F5F5', borderRadius: 20, marginHorizontal: 10, maxHeight: 100 },
  sendButton: { padding: 10 },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '80%', backgroundColor: '#fff', borderRadius: 10, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  inviteFriendsList: { maxHeight: 300 },
  inviteFriendItem: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#fff', borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#E0E0E0' },
  closeButton: { backgroundColor: '#8A4AF3', padding: 10, borderRadius: 5, alignItems: 'center', marginTop: 15 },
  closeButtonText: { color: '#fff', fontWeight: 'bold' },
});