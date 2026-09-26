import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [lastResetTime, setLastResetTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState({ days: 0, hours: 0, minutes: 0 });
  const [bestStreakMs, setBestStreakMs] = useState(0);

  // 1. Beim Start der App gespeicherte Daten laden
  useEffect(() => {
    loadSavedData();
  }, []);

  // 2. Timer jede Sekunde aktualisieren
  useEffect(() => {
    if (!lastResetTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const difference = now - lastResetTime; // Millisekunden seit letztem Reset

      const totalSeconds = Math.floor(difference / 1000);
      const days = Math.floor(totalSeconds / (3600 * 24));
      const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);

      setElapsedTime({ days, hours, minutes });

      // Rekord automatisch aktualisieren, wenn der aktuelle Streak länger ist
      if (difference > bestStreakMs) {
        setBestStreakMs(difference);
        AsyncStorage.setItem('bestStreakMs', difference.toString());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastResetTime, bestStreakMs]);

  const loadSavedData = async () => {
    try {
      const savedReset = await AsyncStorage.getItem('lastResetTime');
      const savedBest = await AsyncStorage.getItem('bestStreakMs');

      if (savedReset) {
        setLastResetTime(parseInt(savedReset, 10));
      } else {
        const now = Date.now();
        setLastResetTime(now);
        await AsyncStorage.setItem('lastResetTime', now.toString());
      }

      if (savedBest) {
        setBestStreakMs(parseInt(savedBest, 10));
      }
    } catch (error) {
      console.log("Fehler beim Laden:", error);
    }
  };

  const handleReset = () => {
    Alert.alert(
      "Reset Streak",
      "Are you sure you want to reset your streak?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Reset", 
          style: "destructive", 
          onPress: async () => {
            const now = Date.now();
            setLastResetTime(now);
            await AsyncStorage.setItem('lastResetTime', now.toString());
          } 
        }
      ]
    );
  };

  // Rekord-Millisekunden in Tage, Stunden und Minuten umrechnen
  const recordTotalSeconds = Math.floor(bestStreakMs / 1000);
  const recordDays = Math.floor(recordTotalSeconds / (3600 * 24));
  const recordHours = Math.floor((recordTotalSeconds % (3600 * 24)) / 3600);
  const recordMinutes = Math.floor((recordTotalSeconds % 3600) / 60);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <Text style={styles.topText}>MSM</Text>
        <Text style={styles.topText2}>ManStopMilking</Text>

        {/* Haupt-Box mit dem Live-Timer */}
        <View style={styles.card}>
          <Text style={styles.timerText}>
            {elapsedTime.days} Days, {elapsedTime.hours} Hours, {elapsedTime.minutes} Min
          </Text>
          <Text style={styles.streakText}>Current Streak</Text>
        </View>

        {/* Rekord-Box (Mit Tagen, Stunden und Minuten) */}
        <View style={styles.recordCard}>
          <Text style={styles.recordText}>
            Best: {recordDays} Days, {recordHours} Hours, {recordMinutes} Min
          </Text>
        </View>

        {/* Reset Button */}
        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
          <Text style={styles.resetButtonText}>Reset Counter</Text>
        </TouchableOpacity>

        <StatusBar style="light" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c293b',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  topText: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 10,
  },
  topText2: {
    color: "white",
    fontSize: 18,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#24344d',
    width: '90%',
    borderRadius: 20,
    paddingVertical: 25,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
    marginBottom: 15,
  },
  recordCard: {
    backgroundColor: '#24344d',
    width: '90%',
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 25,
  },
  recordText: {
    color: '#fbbf24',
    fontSize: 16,
    fontWeight: 'bold',
  },
  timerText: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  streakText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  resetButton: {
    backgroundColor: 'white',
    width: '90%',
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
    marginTop: 300,
  },
  resetButtonText: {
    color: '#1c293b',
    fontSize: 16,
    fontWeight: 'bold',
  },
});