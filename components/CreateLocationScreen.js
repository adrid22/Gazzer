import React, { useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Input, Switch, Text } from '@rneui/themed';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

export default function CreateLocationScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [latitude, setLatitude] = useState(0);
  const [longitude, setLongitude] = useState(0);
  const offset = useSharedValue(-100);

  useEffect(() => {
    offset.value = withSpring(0, { damping: 10, stiffness: 100 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: offset.value }],
    };
  });

  const handleCreate = () => {
    const newLocation = {
      title,
      latitude,
      longitude,
      isPrivate,
      createdBy: auth.currentUser.uid,
      createdAt: serverTimestamp(),
    };

    addDoc(collection(db, 'locations'), newLocation)
      .then(() => {
        alert('Punto de reunión creado');
        navigation.navigate('Mapa');
      })
      .catch((error) => alert(error.message));
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[animatedStyle]}>
        <Text h4 style={styles.title}>
          Crear Punto de Reunión
        </Text>
      </Animated.View>
      <Input placeholder="Título del punto" value={title} onChangeText={setTitle} />
      <Input
        placeholder="Latitud"
        value={latitude.toString()}
        onChangeText={(text) => setLatitude(parseFloat(text) || 0)}
        keyboardType="numeric"
      />
      <Input
        placeholder="Longitud"
        value={longitude.toString()}
        onChangeText={(text) => setLongitude(parseFloat(text) || 0)}
        keyboardType="numeric"
      />
      <View style={styles.switchContainer}>
        <Text>Privado</Text>
        <Switch value={isPrivate} onValueChange={setIsPrivate} color="#8A4AF3" />
      </View>
      <Animated.View style={[animatedStyle]}>
        <Button title="Crear Punto" onPress={handleCreate} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  title: {
    marginBottom: 20,
    color: '#8A4AF3',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
});