import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [lastResetTime, setLastResetTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState({ days: 0, hours: 0, minutes: 0 });
  const [bestStreakMs, setBestStreakMs] = useState(0);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'longest', 'shortest'

  // 1. Daten beim Start laden
  useEffect(() => {
    loadSavedData();
  }, []);

  // 2. Live-Timer jede Sekunde aktualisieren
  useEffect(() => {
    if (!lastResetTime || showHistory) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const difference = now - lastResetTime;

      const totalSeconds = Math.floor(difference / 1000);
      const days = Math.floor(totalSeconds / (3600 * 24));
      const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);

      setElapsedTime({ days, hours, minutes });

      if (difference > bestStreakMs) {
        setBestStreakMs(difference);
        AsyncStorage.setItem('bestStreakMs', difference.toString());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastResetTime, bestStreakMs, showHistory]);

  const loadSavedData = async () => {
    try {
      const savedReset = await AsyncStorage.getItem('lastResetTime');
      const savedBest = await AsyncStorage.getItem('bestStreakMs');
      const savedHistory = await AsyncStorage.getItem('streakHistory');

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

      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.log("Fehler beim Laden:", error);
    }
  };

  // 3. Reset-Logik mit automatischem Speichern in der History
  const handleReset = () => {
    Alert.alert(
      "Reset Counter",
      "Are you sure you want to reset your streak?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Reset", 
          style: "destructive", 
          onPress: async () => {
            const now = Date.now();
            
            if (lastResetTime) {
              const duration = now - lastResetTime;
              const newHistoryItem = {
                id: now.toString(),
                startDate: lastResetTime,
                endDate: now,
                durationMs: duration,
              };

              const updatedHistory = [newHistoryItem, ...history];
              setHistory(updatedHistory);
              await AsyncStorage.setItem('streakHistory', JSON.stringify(updatedHistory));
            }

            setLastResetTime(now);
            await AsyncStorage.setItem('lastResetTime', now.toString());
          } 
        }
      ]
    );
  };

  // --- NEU: Einzelnen History-Eintrag löschen ---
  const handleDeleteItem = (id) => {
    Alert.alert(
      "Delete Entry",
      "Are you sure you want to delete this specific streak record?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const updatedHistory = history.filter(item => item.id !== id);
            setHistory(updatedHistory);
            await AsyncStorage.setItem('streakHistory', JSON.stringify(updatedHistory));
          }
        }
      ]
    );
  };

  // --- NEU: Komplettes History löschen ---
  const handleClearHistory = () => {
    Alert.alert(
      "Clear History",
      "Are you sure you want to delete all past streak records?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            setHistory([]);
            await AsyncStorage.removeItem('streakHistory');
          }
        }
      ]
    );
  };

  // Hilfsfunktion: Millisekunden in lesbare Tage/Stunden/Minuten umwandeln
  const formatDuration = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${days} Days, ${hours} Hours, ${minutes} Min`;
  };

  // Hilfsfunktion: Datum formatieren
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Sortier-Funktion für die History
  const getSortedHistory = () => {
    const listCopy = [...history];

    return listCopy.sort((a, b) => {
      if (sortBy === 'newest') {
        return b.endDate - a.endDate;
      } else if (sortBy === 'oldest') {
        return a.endDate - b.endDate;
      } else if (sortBy === 'longest') {
        return b.durationMs - a.durationMs;
      } else if (sortBy === 'shortest') {
        return a.durationMs - b.durationMs;
      }
      return 0;
    });
  };

  // Rekord umrechnen
  const recordTotalSeconds = Math.floor(bestStreakMs / 1000);
  const recordDays = Math.floor(recordTotalSeconds / (3600 * 24));
  const recordHours = Math.floor((recordTotalSeconds % (3600 * 24)) / 3600);
  const recordMinutes = Math.floor((recordTotalSeconds % 3600) / 60);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <Text style={styles.topText}>MSM</Text>
        <Text style={styles.topText2}>ManStopMilking</Text>

        {/* Ansicht umschalten (Timer vs. History) */}
        <TouchableOpacity 
          style={styles.toggleButton} 
          onPress={() => setShowHistory(!showHistory)}
        >
          <Text style={styles.toggleButtonText}>
            {showHistory ? "← Back to Timer" : "📜 View History"}
          </Text>
        </TouchableOpacity>

        {showHistory ? (
          /* HIER IST DIE HISTORY-ANSICHT */
          <ScrollView style={styles.historyContainer} contentContainerStyle={{ alignItems: 'center', paddingBottom: 30 }}>
            <Text style={styles.historyTitle}>Past Streaks</Text>

            {/* Filter-Buttons nebeneinander */}
            {history.length > 0 && (
              <>
                <View style={styles.filterRow}>
                  <TouchableOpacity 
                    style={[styles.filterButton, sortBy === 'newest' && styles.filterActive]} 
                    onPress={() => setSortBy('newest')}
                  >
                    <Text style={[styles.filterText, sortBy === 'newest' && styles.filterTextActive]}>Newest</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.filterButton, sortBy === 'oldest' && styles.filterActive]} 
                    onPress={() => setSortBy('oldest')}
                  >
                    <Text style={[styles.filterText, sortBy === 'oldest' && styles.filterTextActive]}>Oldest</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.filterButton, sortBy === 'longest' && styles.filterActive]} 
                    onPress={() => setSortBy('longest')}
                  >
                    <Text style={[styles.filterText, sortBy === 'longest' && styles.filterTextActive]}>Longest</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.filterButton, sortBy === 'shortest' && styles.filterActive]} 
                    onPress={() => setSortBy('shortest')}
                  >
                    <Text style={[styles.filterText, sortBy === 'shortest' && styles.filterTextActive]}>Shortest</Text>
                  </TouchableOpacity>
                </View>

                {/* Clear All Button */}
                <TouchableOpacity style={styles.clearAllButton} onPress={handleClearHistory}>
                  <Text style={styles.clearAllText}>Clear All History</Text>
                </TouchableOpacity>
              </>
            )}

            {history.length === 0 ? (
              <Text style={styles.emptyText}>No history yet. Reset your counter to save entries!</Text>
            ) : (
              getSortedHistory().map((item) => (
                <View key={item.id} style={styles.historyCard}>
                  <View style={styles.historyCardHeader}>
                    <Text style={styles.historyDuration}>{formatDuration(item.durationMs)}</Text>
                    {/* Einzelner Lösch-Button */}
                    <TouchableOpacity onPress={() => handleDeleteItem(item.id)} style={styles.deleteButton}>
                      <Text style={styles.deleteButtonText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.historyDate}>From: {formatDate(item.startDate)}</Text>
                  <Text style={styles.historyDate}>To: {formatDate(item.endDate)}</Text>
                </View>
              ))
            )}
          </ScrollView>
        ) : (
          /* HIER IST DER NORMALE TIMER-BILDSCHIRM */
          <>
            <View style={styles.card}>
              <Text style={styles.timerText}>
                {elapsedTime.days} Days, {elapsedTime.hours} Hours, {elapsedTime.minutes} Min
              </Text>
              <Text style={styles.streakText}>Current Streak</Text>
            </View>

            <View style={styles.recordCard}>
              <Text style={styles.recordText}>
                Best: {recordDays} Days, {recordHours} Hours, {recordMinutes} Min
              </Text>
            </View>

            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>Reset Counter</Text>
            </TouchableOpacity>
          </>
        )}

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
    marginBottom: 10,
  },
  toggleButton: {
    backgroundColor: '#334155',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginBottom: 15,
  },
  toggleButtonText: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: 'bold',
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
  },
  resetButtonText: {
    color: '#1c293b',
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyContainer: {
    width: '100%',
  },
  historyTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 10,
    width: '90%',
    justifyContent: 'space-between',
  },
  filterButton: {
    backgroundColor: '#24344d',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterActive: {
    backgroundColor: '#38bdf8',
    borderColor: '#38bdf8',
  },
  filterText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  filterTextActive: {
    color: '#1c293b',
  },
  clearAllButton: {
    marginBottom: 15,
    paddingVertical: 5,
  },
  clearAllText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  historyCard: {
    backgroundColor: '#24344d',
    width: '90%',
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  historyDuration: {
    color: '#38bdf8',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    padding: 5,
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyDate: {
    color: '#94a3b8',
    fontSize: 12,
  },
});