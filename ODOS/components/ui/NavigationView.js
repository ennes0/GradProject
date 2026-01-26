import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function NavigationView({ visible, route, onClose }) {
  const [currentInstruction, setCurrentInstruction] = useState({
    action: 'left',
    distance: '100m',
    instruction: 'Turn left in 100m',
  });
  
  const [remainingDistance, setRemainingDistance] = useState('1.1km');
  const [remainingClimb, setRemainingClimb] = useState('30m');
  const [upcomingSlope, setUpcomingSlope] = useState({ distance: '50m', percentage: 10 });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Top Navigation Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Turn Instruction Card */}
        <View style={styles.instructionCard}>
        <View style={styles.turnIconContainer}>
          <Ionicons 
            name={
              currentInstruction.action === 'left' ? 'arrow-back' :
              currentInstruction.action === 'right' ? 'arrow-forward' :
              'arrow-up'
            } 
            size={64} 
            color="#FFF" 
          />
        </View>
        <Text style={styles.instructionText}>{currentInstruction.instruction}</Text>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Ionicons name="location-outline" size={20} color="#FFF" />
          <View style={styles.statTextContainer}>
            <Text style={styles.statLabel}>Remaining Distance</Text>
            <Text style={styles.statValue}>{remainingDistance}</Text>
          </View>
        </View>
        
        <View style={styles.statDivider} />
        
        <View style={styles.statItem}>
          <Ionicons name="trending-up-outline" size={20} color="#FFF" />
          <View style={styles.statTextContainer}>
            <Text style={styles.statLabel}>Remaining Climb</Text>
            <Text style={styles.statValue}>{remainingClimb}</Text>
          </View>
        </View>
      </View>

        {/* Warning Card */}
        <View style={styles.warningCard}>
          <Ionicons name="warning-outline" size={20} color="#FF9800" />
          <Text style={styles.warningText}>
            Caution: {upcomingSlope.distance} ahead, %{upcomingSlope.percentage} slope begins
          </Text>
        </View>

        {/* Compass Button */}
        <TouchableOpacity style={styles.compassButton}>
          <Ionicons name="compass-outline" size={28} color="#333" />
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4ECDC4',
  },
  topBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionCard: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  turnIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  instructionText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
  },
  statsBar: {
    position: 'absolute',
    bottom: 140,
    left: 20,
    right: 20,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 16,
    padding: 16,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statTextContainer: {
    marginLeft: 12,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 16,
  },
  warningCard: {
    position: 'absolute',
    bottom: 70,
    left: 20,
    right: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  warningText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  compassButton: {
    position: 'absolute',
    bottom: 70,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
