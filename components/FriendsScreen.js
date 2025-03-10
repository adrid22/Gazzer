import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, FlatList, RefreshControl, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button, Card, Avatar, Overlay } from '@rneui/themed';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { auth, db } from '../firebaseConfig';
import { collection, addDoc, onSnapshot, query, orderBy, doc, setDoc } from 'firebase/firestore';
import i18n from '../i18n';

export default function FriendsScreen({ navigation, route }) {
  const { chatId, friendId } = route.params || {};
  const [friends, setFriends] = useState([
    { id: '1', name: 'Ana García', online: true, event: 'Fiesta en el Parque', avatar: 'https://randomuser.me/api/portraits/women/1.jpg' },
    { id: '2', name: 'Luis Pérez', online: false, event: null, avatar: 'https://randomuser.me/api/portraits/men/2.jpg' },
    { id: '3', name: 'María López', online: true, event: 'Deporte en el Centro', avatar: 'https://randomuser.me/api/portraits/women/2.jpg' },
  ]);
  const [requests, setRequests] = useState([
    { id: 'r1', name: 'Juan Díaz', avatar: 'https://randomuser.me/api/portraits/men/3.jpg' },
    { id: 'r2', name: 'Sofía Ruiz', avatar: 'https://randomuser.me/api/portraits/women/3.jpg' },
  ]);
  const [showInvites, setShowInvites] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [friendTyping, setFriendTyping] = useState(false);
  const flatListRef = useRef(null);
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(100);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: 800 });
    slideAnim.value = withSpring(0, { damping: 15, stiffness: 100 });

    // Si hay un chatId y friendId desde la notificación, abrir el chat automáticamente
    if (chatId && friendId) {
      const friend = friends.find((f) => f.id === friendId);
      if (friend) {
        setSelectedFriend(friend);
      }
    }

    if (selectedFriend) {
      const chatId = [auth.currentUser.uid, selectedFriend.id].sort().join('_');
      const messagesQuery = query(
        collection(db, 'chats', chatId, 'messages'),
        orderBy('timestamp', 'asc')
      );
      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        const messagesList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMessages(messagesList);

        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }

        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' && change.doc.data().senderId !== auth.currentUser.uid) {
            setFriendTyping(true);
            setTimeout(() => setFriendTyping(false), 1000);
          }
        });
      });

      return () => unsubscribe();
    }
  }, [selectedFriend, chatId, friendId]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1000);
  };

  const handleAcceptRequest = (requestId) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setRequests(requests.filter((req) => req.id !== requestId));
    setFriends([...friends, { id: requestId, name: requests.find((r) => r.id === requestId).name, online: true, event: null, avatar: requests.find((r) => r.id === requestId).avatar }]);
  };

  const handleRejectRequest = (requestId) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setRequests(requests.filter((req) => req.id !== requestId));
  };

  const handleInviteFriend = (friendId) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    console.log(`Invitando a ${friends.find((f) => f.id === friendId).name} a un evento`);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedFriend) return;

    const chatId = [auth.currentUser.uid, selectedFriend.id].sort().join('_');
    try {
      const messageData = {
        senderId: auth.currentUser.uid,
        message: newMessage.trim(),
        timestamp: new Date().toISOString(),
      };

      await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);
      setNewMessage('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const friendDoc = doc(db, 'users', selectedFriend.id);
      const friendSnap = await friendDoc.get();
      const friendData = friendSnap.data();
      const pushToken = friendData?.pushToken;

      if (pushToken) {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: pushToken,
            sound: 'default',
            title: `${auth.currentUser.displayName} te ha enviado un mensaje`,
            body: newMessage.trim(),
            data: { chatId, friendId: auth.currentUser.uid },
          }),
        });
      }
    } catch (err) {
      console.log('Error al enviar mensaje:', err.message);
    }
  };

  const renderFriendItem = ({ item }) => (
    <View style={styles.friendItem}>
      <Avatar
        size={40}
        rounded
        source={{ uri: item.avatar }}
        containerStyle={styles.avatar}
      />
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.name}</Text>
        <Text style={styles.friendStatus}>
          {item.online ? 'En línea' : 'Desconectado'} {item.event && `• ${item.event}`}
        </Text>
      </View>
      <TouchableOpacity onPress={() => setSelectedFriend(item)} style={styles.chatButton}>
        <Ionicons name="chatbubble" size={20} color="#8A4AF3" />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => handleInviteFriend(item.id)} style={styles.inviteButton}>
        <Ionicons name="person-add" size={20} color="#8A4AF3" />
      </TouchableOpacity>
    </View>
  );

  const renderRequestItem = ({ item }) => (
    <View style={styles.requestItem}>
      <Avatar
        size={40}
        rounded
        source={{ uri: item.avatar }}
        containerStyle={styles.avatar}
      />
      <Text style={styles.requestName}>{item.name}</Text>
      <View style={styles.requestButtons}>
        <TouchableOpacity onPress={() => handleAcceptRequest(item.id)} style={styles.acceptButton}>
          <Ionicons name="checkmark" size={20} color="#34C759" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleRejectRequest(item.id)} style={styles.rejectButton}>
          <Ionicons name="close" size={20} color="#FF6F61" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderMessageItem = ({ item }) => (
    <View style={[styles.messageItem, item.senderId === auth.currentUser.uid ? styles.messageSent : styles.messageReceived]}>
      <Text style={item.senderId === auth.currentUser.uid ? styles.messageTextSent : styles.messageTextReceived}>
        {item.message}
      </Text>
      <Text style={styles.messageTimestamp}>{new Date(item.timestamp).toLocaleTimeString()}</Text>
    </View>
  );

  const animatedFadeStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  const animatedSlideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideAnim.value }],
  }));

  const data = [
    { type: 'friends', data: friends },
    { type: 'requests', data: requests },
    { type: 'inviteButton' },
  ];

  const renderItem = ({ item }) => {
    if (item.type === 'friends') {
      return (
        <Card containerStyle={styles.card}>
          <Text style={styles.sectionTitle}>{i18n.t('yourFriends')}</Text>
          {item.data.length > 0 ? (
            item.data.map((friend) => (
              <View key={friend.id}>
                {renderFriendItem({ item: friend })}
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No tienes amigos aún. ¡Invita a algunos!</Text>
          )}
        </Card>
      );
    } else if (item.type === 'requests' && item.data.length > 0) {
      return (
        <Card containerStyle={styles.card}>
          <Text style={styles.sectionTitle}>{i18n.t('pendingRequests')}</Text>
          {item.data.map((request) => (
            <View key={request.id}>
              {renderRequestItem({ item: request })}
            </View>
          ))}
        </Card>
      );
    } else if (item.type === 'inviteButton') {
      return (
        <Button
          title={i18n.t('inviteFriends')}
          onPress={() => setShowInvites(!showInvites)}
          buttonStyle={styles.inviteButtonStyle}
          titleStyle={styles.buttonText}
          icon={<Ionicons name="add" size={18} color="#fff" />}
          iconPosition="left"
        />
      );
    }
    return null;
  };

  const ListHeader = () => (
    <Text h4 style={styles.title}>{i18n.t('friends')}</Text>
  );

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Animated.View style={[styles.content, animatedFadeStyle]}>
        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.type}-${index}`}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={<Text style={styles.emptyText}>No hay contenido para mostrar</Text>}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8A4AF3" />
          }
        />
      </Animated.View>

      {/* Modal para invitar (simulado) */}
      {showInvites && (
        <Animated.View style={[styles.inviteModal, animatedSlideStyle]}>
          <Card containerStyle={styles.inviteCard}>
            <Text style={styles.modalTitle}>{i18n.t('chooseFriendToInvite')}</Text>
            <FlatList
              data={friends}
              renderItem={renderFriendItem}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={<Text style={styles.emptyText}>No hay amigos disponibles</Text>}
            />
            <Button
              title={i18n.t('close')}
              onPress={() => setShowInvites(false)}
              buttonStyle={styles.closeButton}
              titleStyle={styles.buttonText}
            />
          </Card>
        </Animated.View>
      )}

      {/* Modal para el chat */}
      {selectedFriend && (
        <Overlay isVisible={true} onBackdropPress={() => setSelectedFriend(null)} overlayStyle={styles.chatModal}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.chatContainer}
          >
            <Text style={styles.modalTitle}>{i18n.t('chatWith')} {selectedFriend.name}</Text>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessageItem}
              keyExtractor={(item) => item.id}
              style={styles.messageList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />
            {friendTyping && (
              <Text style={styles.typingIndicator}>{selectedFriend.name} está escribiendo...</Text>
            )}
            <View style={styles.messageInputContainer}>
              <TextInput
                style={styles.messageInput}
                placeholder={i18n.t('messagePlaceholder')}
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
              />
              <TouchableOpacity onPress={handleSendMessage} style={styles.sendButton}>
                <Ionicons name="send" size={24} color="#8A4AF3" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
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
  card: {
    borderRadius: 12,
    marginVertical: 10,
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
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  avatar: {
    marginRight: 10,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  friendStatus: {
    fontSize: 12,
    color: '#666',
  },
  chatButton: {
    padding: 8,
    marginRight: 10,
  },
  inviteButton: {
    padding: 8,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  requestName: {
    fontSize: 16,
    color: '#1A1A1A',
    flex: 1,
    marginLeft: 10,
  },
  requestButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  acceptButton: {
    padding: 8,
    marginRight: 10,
  },
  rejectButton: {
    padding: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    padding: 10,
  },
  inviteButtonStyle: {
    backgroundColor: '#8A4AF3',
    borderRadius: 8,
    paddingVertical: 12,
    marginVertical: 10,
    marginHorizontal: 10,
  },
  inviteModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  inviteCard: {
    borderRadius: 12,
    padding: 15,
    width: '80%',
    maxHeight: '70%',
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 20,
    color: '#1A1A1A',
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#FF6F61',
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 15,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  chatModal: {
    width: '90%',
    height: '80%',
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 20,
  },
  chatContainer: {
    flex: 1,
  },
  messageList: {
    flex: 1,
    marginBottom: 10,
  },
  messageItem: {
    padding: 10,
    borderRadius: 10,
    marginVertical: 5,
    maxWidth: '80%',
  },
  messageSent: {
    backgroundColor: '#8A4AF3',
    alignSelf: 'flex-end',
  },
  messageReceived: {
    backgroundColor: '#E0E0E0',
    alignSelf: 'flex-start',
  },
  messageTextSent: {
    color: '#fff',
    fontSize: 16,
  },
  messageTextReceived: {
    color: '#1A1A1A',
    fontSize: 16,
  },
  messageTimestamp: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
    textAlign: 'right',
  },
  typingIndicator: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingVertical: 10,
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    padding: 10,
    marginLeft: 10,
  },
});