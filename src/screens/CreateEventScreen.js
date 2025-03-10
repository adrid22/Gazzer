import React, { useState } from 'react';
import { View, TextInput, Button } from 'react-native';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig'; // Ajustada la ruta
import i18n from '../i18n/i18n'; // Ajustada previamente
import { colors, textStyles } from '../styles/styles'; // Añadido para consistencia

const CreateEventScreen = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');

  const handleCreateEvent = async () => {
    try {
      await addDoc(collection(db, 'events'), {
        title,
        description,
        date,
        location,
        createdAt: new Date(),
      });
      navigation.goBack();
    } catch (error) {
      console.error('Error creating event:', error);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Event Title"
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={styles.input}
        placeholder="Description"
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <TextInput
        style={styles.input}
        placeholder="Date (e.g., 2023-10-10)"
        value={date}
        onChangeText={setDate}
      />
      <TextInput
        style={styles.input}
        placeholder="Location"
        value={location}
        onChangeText={setLocation}
      />
      <Button title={i18n.t('createEvent')} onPress={handleCreateEvent} color={colors.primary} />
    </View>
  );
};

const styles = {
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.background,
  },
  input: {
    height: 50,
    borderColor: colors.gray,
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
  },
};

export default CreateEventScreen;