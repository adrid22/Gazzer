import React from 'react';
import { View, Text } from 'react-native';
import { colors, textStyles } from '../styles/styles'; // Añadido para consistencia

const EventDetailsScreen = ({ route }) => {
  const { event } = route.params;

  return (
    <View style={styles.container}>
      <Text style={[textStyles.heading, styles.title]}>{event.title}</Text>
      <Text style={[textStyles.normal, styles.description]}>{event.description}</Text>
      <Text style={styles.date}>{event.date}</Text>
      <Text style={styles.location}>Location: {event.location}</Text>
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
    marginBottom: 10,
  },
  description: {
    marginBottom: 10,
  },
  date: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 10,
  },
  location: {
    fontSize: 14,
    color: colors.gray,
  },
};

export default EventDetailsScreen;