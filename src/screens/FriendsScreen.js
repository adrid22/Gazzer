import i18n from '../i18n/i18n'; // Ajustada previamente
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image } from 'react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig'; // Ajustada la ruta
import { colors, textStyles } from '../styles/styles'; // Añadido para consistencia

const FriendsScreen = ({ navigation }) => {
  const [friends, setFriends] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('uid', '!=', auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const friendsData = [];
      snapshot.forEach((doc) => {
        friendsData.push({ id: doc.id, ...doc.data() });
      });
      setFriends(friendsData);
    });

    return () => unsubscribe();
  }, []);

  const renderFriend = ({ item }) => (
    <TouchableOpacity
      style={styles.friendCard}
      onPress={() => navigation.navigate('Map', { friend: item })}
    >
      <Image source={{ uri: item.profilePic || 'https://via.placeholder.com/50' }} style={styles.avatar} />
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.displayName}</Text>
        <Text style={styles.friendStatus}>{item.status || 'No status'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={[textStyles.heading, styles.title]}>{i18n.t('friends')}</Text>
      <FlatList
        data={friends}
        renderItem={renderFriend}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={textStyles.normal}>No friends found.</Text>}
      />
    </View>
  );
};

const styles = {
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.background,
  },
  title: {
    marginBottom: 20,
    textAlign: 'center',
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  friendStatus: {
    fontSize: 14,
    color: colors.gray,
  },
};

export default FriendsScreen;