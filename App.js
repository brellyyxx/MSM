import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ScrollView, Modal } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [lastResetTime, setLastResetTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState({ days: 0, hours: 0, minutes: 0 });
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showMilestones, setShowMilestones] = useState(false);
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'longest', 'shortest'

  // State für das Vollbild-Pokal-Modal beim Klick auf einen Meilenstein
  const [selectedMilestone, setSelectedMilestone] = useState(null);

  // 1. Daten beim Start laden
  useEffect(() => {
    loadSavedData();
  }, []);

  // 2. Live-Timer jede Sekunde aktualisieren
  useEffect(() => {
    if (!lastResetTime || showHistory || showMilestones) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const difference = now - lastResetTime;

      const totalSeconds = Math.floor(difference / 1000);
      const days = Math.floor(totalSeconds / (3600 * 24));
      const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);

      setElapsedTime({ days, hours, minutes });
    }, 1000);

    return () => clearInterval(interval);
  }, [lastResetTime, showHistory, showMilestones]);

  const loadSavedData = async () => {
    try {
      const savedReset = await AsyncStorage.getItem('lastResetTime');
      const savedHistory = await AsyncStorage.getItem('streakHistory');

      if (savedReset) {
        setLastResetTime(parseInt(savedReset, 10));
      } else {
        const now = Date.now();
        setLastResetTime(now);
        await AsyncStorage.setItem('lastResetTime', now.toString());
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

  // DEBUG: Zeit in der Vergangenheit manipulieren
  const handleDebugAddOffset = async (daysToAdd, hoursToAdd) => {
    const msToAdd = (daysToAdd * 24 * 3600 * 1000) + (hoursToAdd * 3600 * 1000);
    const newResetTime = lastResetTime - msToAdd;
    setLastResetTime(newResetTime);
    await AsyncStorage.setItem('lastResetTime', newResetTime.toString());
  };

  // Alles komplett zurücksetzen (für Tests)
  const handleClearAllStorage = () => {
    Alert.alert(
      "DEBUG: Clear All Data",
      "This will wipe everything (Timer, History). Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Wipe Everything",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              setHistory([]);
              const now = Date.now();
              setLastResetTime(now);
              await AsyncStorage.setItem('lastResetTime', now.toString());
            } catch (error) {
              console.log("Fehler beim Zurücksetzen:", error);
            }
          }
        }
      ]
    );
  };

  // Einzelnen History-Eintrag löschen
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

  // Komplettes History löschen
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

  // Statistiken berechnen
  const totalResets = history.length;
  const totalCleanTimeMs = history.reduce((sum, item) => sum + item.durationMs, 0);
  const averageMs = totalResets > 0 ? Math.floor(totalCleanTimeMs / totalResets) : 0;

  // REKORD AUTOMATISCH AUS DER HISTORY ERMITTELN
  const currentActiveMs = lastResetTime ? Date.now() - lastResetTime : 0;
  const longestHistoryMs = history.length > 0 ? Math.max(...history.map(item => item.durationMs)) : 0;
  const bestStreakMs = Math.max(currentActiveMs, longestHistoryMs);

  const recordTotalSeconds = Math.floor(bestStreakMs / 1000);
  const recordDays = Math.floor(recordTotalSeconds / (3600 * 24));
  const recordHours = Math.floor((recordTotalSeconds % (3600 * 24)) / 3600);
  const recordMinutes = Math.floor((recordTotalSeconds % 3600) / 60);

  // Meilensteine Definition
  const milestonesList = [
    { id: '1', days: 1, title: '24 Hours', desc: 'The first full day mastered.' },
    { id: '2', days: 3, title: '3 Days', desc: 'Getting through the initial phase.' },
    { id: '3', days: 7, title: '1 Week', desc: 'A full week of total control.' },
    { id: '4', days: 14, title: '2 Weeks', desc: 'Two weeks strong!' },
    { id: '5', days: 30, title: '30 Days', desc: 'One whole month. Amazing discipline.' },
    { id: '6', days: 60, title: '60 Days', desc: 'Two months of unstoppable progress.' },
    { id: '7', days: 90, title: '90 Days', desc: 'Quarter of a year milestone!' },
    { id: '8', days: 180, title: '6 Months', desc: 'Half a year of pure dedication.' },
    { id: '9', days: 365, title: '1 Year', desc: 'Legendary status: 365 days.' },
  ];

  // Prüfen, ob ein Meilenstein erreicht wurde (aktiv oder in der History)
  const isMilestoneUnlocked = (targetDays) => {
    const targetMs = targetDays * 24 * 3600 * 1000;
    if (currentActiveMs >= targetMs) return true;
    return history.some(item => item.durationMs >= targetMs);
  };

  // Fortschritt in Prozent für einen bestimmten Meilenstein berechnen (0 bis 100)
  const getMilestoneProgress = (targetDays) => {
    const targetMs = targetDays * 24 * 3600 * 1000;
    const maxAchieved = Math.max(currentActiveMs, longestHistoryMs);
    if (maxAchieved >= targetMs) return 100;
    const percentage = (maxAchieved / targetMs) * 100;
    return Math.min(Math.max(Math.floor(percentage), 0), 100);
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <Text style={styles.topText}>MSM</Text>
        <Text style={styles.topText2}>ManStopMilking</Text>

        {/* Navigation / Toggle Leiste */}
        <View style={styles.navRow}>
          <TouchableOpacity 
            style={[styles.navButton, !showHistory && !showMilestones && styles.navButtonActive]} 
            onPress={() => { setShowHistory(false); setShowMilestones(false); }}
          >
            <Text style={[styles.navButtonText, !showHistory && !showMilestones && styles.navButtonTextActive]}>⏱️ Timer</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.navButton, showHistory && styles.navButtonActive]} 
            onPress={() => { setShowHistory(true); setShowMilestones(false); }}
          >
            <Text style={[styles.navButtonText, showHistory && styles.navButtonTextActive]}>📜 History</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.navButton, showMilestones && styles.navButtonActive]} 
            onPress={() => { setShowMilestones(true); setShowHistory(false); }}
          >
            <Text style={[styles.navButtonText, showMilestones && styles.navButtonTextActive]}>🏆 Badges</Text>
          </TouchableOpacity>
        </View>

        {showMilestones ? (
          /* BADGES-ANSICHT */
          <ScrollView style={styles.historyContainer} contentContainerStyle={{ alignItems: 'center', paddingBottom: 30 }}>
            <Text style={styles.historyTitle}>Milestones & Badges</Text>
            
            {milestonesList.map((m) => {
              const unlocked = isMilestoneUnlocked(m.days);
              const progress = getMilestoneProgress(m.days);
              return (
                <TouchableOpacity 
                  key={m.id} 
                  style={[styles.milestoneCard, unlocked ? styles.milestoneUnlocked : styles.milestoneLocked]}
                  onPress={() => setSelectedMilestone(m)}
                >
                  <View style={styles.historyCardHeader}>
                    <Text style={[styles.historyDuration, unlocked ? styles.textUnlocked : styles.textLocked]}>
                      {unlocked ? "🏆" : "🔒"} {m.title}
                    </Text>
                    <Text style={[styles.milestoneBadgeStatus, unlocked ? styles.statusUnlocked : styles.statusLocked]}>
                      {unlocked ? "Unlocked" : `${progress}%`}
                    </Text>
                  </View>
                  <Text style={styles.historyDate}>{m.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : showHistory ? (
          /* HISTORY-ANSICHT */
          <ScrollView style={styles.historyContainer} contentContainerStyle={{ alignItems: 'center', paddingBottom: 30 }}>
            <Text style={styles.historyTitle}>Past Streaks</Text>

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
          /* TIMER-BILDSCHIRM */
          <ScrollView style={styles.historyContainer} contentContainerStyle={{ alignItems: 'center', paddingBottom: 30 }}>
            <View style={styles.card}>
              <Text style={styles.timerText}>
                {elapsedTime.days} Days, {elapsedTime.hours} Hours, {elapsedTime.minutes} Min
              </Text>
              <Text style={styles.streakText}>Current Streak</Text>
            </View>

            {/* REKORD-KARTE */}
            <View style={styles.recordCard}>
              <Text style={styles.recordText}>
                Best: {recordDays} Days, {recordHours} Hours, {recordMinutes} Min
              </Text>
            </View>

            {/* STATISTIK-BOX */}
            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>Overview & Stats</Text>
              
              <View style={styles.statsItem}>
                <Text style={styles.statsLabel}>Total Resets</Text>
                <Text style={styles.statsValue}>{totalResets}</Text>
              </View>

              <View style={styles.statsDivider} />

              <View style={styles.statsItem}>
                <Text style={styles.statsLabel}>Average Streak</Text>
                <Text style={styles.statsValue}>{formatDuration(averageMs)}</Text>
              </View>

              <View style={styles.statsDivider} />

              <View style={styles.statsItem}>
                <Text style={styles.statsLabel}>Total Clean Time</Text>
                <Text style={styles.statsValue}>{formatDuration(totalCleanTimeMs)}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>Reset Counter</Text>
            </TouchableOpacity>

            {/* DEBUG TOOLS */}
            <View style={styles.debugRow}>
              <TouchableOpacity style={styles.debugSmallButton} onPress={() => handleDebugAddOffset(1, 0)}>
                <Text style={styles.debugSmallText}>+1 Day</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.debugSmallButton} onPress={() => handleDebugAddOffset(7, 0)}>
                <Text style={styles.debugSmallText}>+7 Days</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.debugSmallButton} onPress={() => handleDebugAddOffset(30, 0)}>
                <Text style={styles.debugSmallText}>+30 Days</Text>
              </TouchableOpacity>
            </View>

            {/* Debug Wipe Button */}
            <TouchableOpacity style={styles.debugButton} onPress={handleClearAllStorage}>
              <Text style={styles.debugButtonText}>DEBUG: Reset All Data</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* VOLLBILD-POKAL MODAL MIT BESCHRIFTUNG UND LICHT-EFFEKT */}
        <Modal
          animationType="slide"
          transparent={false}
          visible={selectedMilestone !== null}
          onRequestClose={() => setSelectedMilestone(null)}
        >
          <SafeAreaView style={styles.fullModalContainer}>
            {selectedMilestone && (() => {
              const progress = getMilestoneProgress(selectedMilestone.days);
              const unlocked = isMilestoneUnlocked(selectedMilestone.days);

              return (
                <View style={styles.fullModalInner}>
                  <Text style={styles.fullModalTitle}>Milestone Reward</Text>
                  <Text style={styles.fullModalDesc}>{selectedMilestone.desc}</Text>

                  {/* DER POKAL SCREEN ELEMENT */}
                  <View style={[styles.trophyWrapper, unlocked && styles.trophyWrapperGlowing]}>
                    
                    {/* Füll-Effekt (je mehr Fortschritt, desto goldener/heller wird er von unten gefüllt) */}
                    <View style={[styles.trophyGoldFill, { height: `${progress}%` }]} />

                    {/* Inhalt des Pokals: Das Icon und DIREKT DARAUF der Tag (z.B. "24 Hours") */}
                    <View style={styles.trophyContentCenter}>
                      <Text style={styles.trophyMainIcon}>{unlocked ? "🏆" : "🔒"}</Text>
                      
                      <View style={styles.trophyEmblemTag}>
                        <Text style={styles.trophyEmblemText}>{selectedMilestone.title}</Text>
                      </View>

                      <Text style={styles.trophyProgressLabel}>{progress}% Complete</Text>
                    </View>
                  </View>

                  <Text style={styles.fullModalStatus}>
                    {unlocked ? "🌟 Legendary Status Unlocked! 🌟" : `Keep going! Light fills up as you progress.`}
                  </Text>

                  <TouchableOpacity 
                    style={styles.fullModalCloseButton} 
                    onPress={() => setSelectedMilestone(null)}
                  >
                    <Text style={styles.fullModalCloseButtonText}>Back to Badges</Text>
                  </TouchableOpacity>
                </View>
              );
            })()}
          </SafeAreaView>
        </Modal>

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
  navRow: {
    flexDirection: 'row',
    backgroundColor: '#162231',
    borderRadius: 20,
    padding: 4,
    marginBottom: 15,
    width: '90%',
    justifyContent: 'space-between',
  },
  navButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 16,
  },
  navButtonActive: {
    backgroundColor: '#334155',
  },
  navButtonText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: 'bold',
  },
  navButtonTextActive: {
    color: '#38bdf8',
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
    paddingHorizontal: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  recordText: {
    color: '#fbbf24',
    fontSize: 16,
    fontWeight: 'bold',
  },
  timerText: {
    color: 'white',
    fontSize: 18,
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
    marginTop: 10,
  },
  resetButtonText: {
    color: '#1c293b',
    fontSize: 16,
    fontWeight: 'bold',
  },
  debugRow: {
    flexDirection: 'row',
    width: '90%',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  debugSmallButton: {
    backgroundColor: '#334155',
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  debugSmallText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  debugButton: {
    backgroundColor: '#ef4444',
    width: '90%',
    paddingVertical: 12,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 15,
  },
  debugButtonText: {
    color: 'white',
    fontSize: 14,
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
  statsCard: {
    backgroundColor: '#24344d',
    width: '90%',
    borderRadius: 15,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statsTitle: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsItem: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  statsLabel: {
    color: '#94a3b8',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statsValue: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statsDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 6,
    width: '100%',
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
  milestoneCard: {
    backgroundColor: '#24344d',
    width: '90%',
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  milestoneUnlocked: {
    borderColor: '#fbbf24',
    backgroundColor: '#1e293b',
  },
  milestoneLocked: {
    opacity: 0.6,
  },
  textUnlocked: {
    color: '#fbbf24',
  },
  textLocked: {
    color: '#94a3b8',
  },
  milestoneBadgeStatus: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusUnlocked: {
    color: '#fbbf24',
  },
  statusLocked: {
    color: '#94a3b8',
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
  // Vollbild Modal Styles für den Pokal-Bildschirm
  fullModalContainer: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  fullModalInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 25,
    paddingHorizontal: 20,
  },
  fullModalTitle: {
    color: '#fbbf24',
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  fullModalDesc: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 5,
  },
  trophyWrapper: {
    width: 260,
    height: 350,
    backgroundColor: '#131c2e',
    borderRadius: 35,
    borderWidth: 3,
    borderColor: '#334155',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 12,
  },
  trophyWrapperGlowing: {
    borderColor: '#fbbf24',
    shadowColor: '#fbbf24',
    shadowOpacity: 0.5,
    shadowRadius: 25,
  },
  trophyGoldFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(251, 191, 36, 0.22)', // Strahlendes Licht von unten
    borderTopWidth: 2,
    borderTopColor: '#fbbf24',
  },
  trophyContentCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    paddingHorizontal: 15,
  },
  trophyMainIcon: {
    fontSize: 70,
    marginBottom: 10,
    textShadowColor: 'rgba(251, 191, 36, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  trophyEmblemTag: {
    backgroundColor: '#0f172a',
    paddingVertical: 8,
    paddingHorizontal: 22,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#fbbf24',
    marginBottom: 12,
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
  },
  trophyEmblemText: {
    color: '#fbbf24',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  trophyProgressLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  fullModalStatus: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 10,
  },
  fullModalCloseButton: {
    backgroundColor: '#334155',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  fullModalCloseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});