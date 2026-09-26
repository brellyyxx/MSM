import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <Text style={styles.topText}>MSM</Text>
        <Text style={styles.topText2}>ManStopMilking</Text>

        {/* Box in der Mitte */}
        <View style={styles.card}>
          <Text style={styles.timerText}>7 Days, 4 Hours</Text>
          <Text style={styles.streakText}>Current Streak</Text>
        </View>

        {/* Box darunter */}
        <View style={styles.card}>
          <Text style={styles.timerText}>Record:</Text>
          <Text style={styles.streakText}>21 Days</Text>
        </View>

        <TouchableOpacity>
          <Text style={styles.reset}>Reset Counter</Text>
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
    // paddingTop entfernt, damit SafeAreaView das automatisch regelt!
  },
  topText: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 10, // Kleiner Abstand nach der Dynamic Island
  },
  topText2: {
    color: "white",
    fontSize: 18,
    marginBottom: 30,
  },
  card: {
    backgroundColor: '#24344d',
    width: '90%',
    borderRadius: 20,
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
    marginBottom: 15,
  },
  timerText: {
    color: 'white',
    fontSize: 26,
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
  reset: {
    fontSize: 18,
    backgroundColor: "white",
    borderRadius: 50,
    borderWidth: 10,
    borderColor: "white",
    paddingHorizontal: 80,
    fontWeight: "bold",
    marginTop: 250,
  }
});