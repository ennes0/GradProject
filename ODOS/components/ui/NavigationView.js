import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Modal,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function NavigationView({ visible, route, onClose }) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  const [currentStep, setCurrentStep] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  // Simulated navigation data
  const navigationData = {
    totalDistance: route?.distance || '2.4 km',
    totalClimb: route?.totalClimb || '45m',
    estimatedTime: route?.duration || '18 dk',
    currentSpeed: '4.8 km/s',
    calories: '0',
    steps: '0',
  };

  const instructions = [
    { action: 'straight', distance: '200m', text: '200m düz devam edin', street: 'Atatürk Caddesi' },
    { action: 'left', distance: '150m', text: '150m sonra sola dönün', street: 'Cumhuriyet Sokak' },
    { action: 'right', distance: '300m', text: '300m sonra sağa dönün', street: 'Bağdat Caddesi' },
    { action: 'straight', distance: '400m', text: 'Hedefinize ulaştınız', street: '' },
  ];

  const currentInstruction = instructions[currentStep] || instructions[0];

  // Upcoming slope warning
  const upcomingWarning = {
    type: 'slope',
    distance: '80m',
    value: '%12 eğim',
    severity: 'medium', // low, medium, high
  };

  useEffect(() => {
    if (visible) {
      // Progress animation
      Animated.timing(progressAnim, {
        toValue: 0.35,
        duration: 2000,
        useNativeDriver: false,
      }).start();
    } else {
      progressAnim.setValue(0);
      setElapsedTime(0);
    }
  }, [visible]);

  // Timer
  useEffect(() => {
    let interval;
    if (visible && !isPaused) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [visible, isPaused]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getDirectionIcon = (action) => {
    switch (action) {
      case 'left': return 'arrow-back';
      case 'right': return 'arrow-forward';
      case 'straight': return 'arrow-up';
      case 'uturn': return 'return-down-back';
      default: return 'arrow-up';
    }
  };

  const getDirectionText = (action) => {
    switch (action) {
      case 'left': return 'Sola Dön';
      case 'right': return 'Sağa Dön';
      case 'straight': return 'Düz Git';
      case 'uturn': return 'Geri Dön';
      default: return 'Devam Et';
    }
  };

  const handleEndNavigation = () => {
    setElapsedTime(0);
    setCurrentStep(0);
    setIsPaused(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleEndNavigation}
    >
      <View style={styles.container}>
        {/* Background gradient effect */}
        <View style={styles.backgroundGradient} />
        
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={handleEndNavigation} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
            
            <View style={styles.timerContainer}>
              <Ionicons name="time-outline" size={18} color="rgba(255,255,255,0.8)" />
              <Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.pauseButton}
              onPress={() => setIsPaused(!isPaused)}
            >
              <Ionicons name={isPaused ? "play" : "pause"} size={22} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Main Instruction Card */}
          <View style={styles.instructionCard}>
            <View style={styles.distanceBadge}>
              <Text style={styles.distanceText}>{currentInstruction.distance}</Text>
            </View>
            
            <View style={styles.directionContainer}>
              <View style={styles.directionIconBg}>
                <Ionicons 
                  name={getDirectionIcon(currentInstruction.action)} 
                  size={48} 
                  color="#FFF" 
                />
              </View>
              <Text style={styles.directionLabel}>
                {getDirectionText(currentInstruction.action)}
              </Text>
            </View>
            
            <Text style={styles.instructionText}>{currentInstruction.text}</Text>
            
            {currentInstruction.street && (
              <View style={styles.streetRow}>
                <Ionicons name="navigate" size={16} color="rgba(255,255,255,0.7)" />
                <Text style={styles.streetText}>{currentInstruction.street}</Text>
              </View>
            )}
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <Animated.View 
                style={[
                  styles.progressFill,
                  { 
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%']
                    })
                  }
                ]} 
              />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressText}>0.8 km</Text>
              <Text style={styles.progressText}>{navigationData.totalDistance}</Text>
            </View>
          </View>

          {/* Warning Card */}
          {upcomingWarning && (
            <View style={styles.warningCard}>
              <View style={[
                styles.warningIconBg,
                upcomingWarning.severity === 'high' && { backgroundColor: '#FF6B6B' },
                upcomingWarning.severity === 'medium' && { backgroundColor: '#FFB347' },
              ]}>
                <Ionicons 
                  name={upcomingWarning.type === 'slope' ? 'trending-up' : 'warning'} 
                  size={20} 
                  color="#FFF" 
                />
              </View>
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>Dikkat: {upcomingWarning.distance} sonra</Text>
                <Text style={styles.warningValue}>{upcomingWarning.value} başlıyor</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#888" />
            </View>
          )}

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="speedometer-outline" size={22} color={Colors.primary} />
              <Text style={styles.statValue}>{navigationData.currentSpeed}</Text>
              <Text style={styles.statLabel}>Hız</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="trending-up-outline" size={22} color={Colors.primary} />
              <Text style={styles.statValue}>{navigationData.totalClimb}</Text>
              <Text style={styles.statLabel}>Tırmanış</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="flame-outline" size={22} color={Colors.primary} />
              <Text style={styles.statValue}>{Math.floor(elapsedTime * 0.1)} kcal</Text>
              <Text style={styles.statLabel}>Kalori</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="footsteps-outline" size={22} color={Colors.primary} />
              <Text style={styles.statValue}>{Math.floor(elapsedTime * 1.5)}</Text>
              <Text style={styles.statLabel}>Adım</Text>
            </View>
          </View>

          {/* Next Steps Preview */}
          <View style={styles.nextStepsContainer}>
            <Text style={styles.nextStepsTitle}>Sonraki Adımlar</Text>
            {instructions.slice(currentStep + 1, currentStep + 3).map((instruction, index) => (
              <View key={index} style={styles.nextStepItem}>
                <View style={styles.nextStepIcon}>
                  <Ionicons 
                    name={getDirectionIcon(instruction.action)} 
                    size={16} 
                    color="#666" 
                  />
                </View>
                <Text style={styles.nextStepText} numberOfLines={1}>
                  {instruction.distance} - {instruction.text}
                </Text>
              </View>
            ))}
          </View>

          {/* Bottom Action Bar */}
          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.bottomButton}>
              <Ionicons name="volume-high" size={22} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.bottomButton}>
              <Ionicons name="compass-outline" size={22} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.endButton}
              onPress={handleEndNavigation}
            >
              <Ionicons name="flag" size={20} color="#FFF" />
              <Text style={styles.endButtonText}>Bitir</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bottomButton}>
              <Ionicons name="list-outline" size={22} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.bottomButton}>
              <Ionicons name="settings-outline" size={22} color="#666" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.5,
    backgroundColor: Colors.primary,
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  timerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  pauseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionCard: {
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  distanceBadge: {
    position: 'absolute',
    top: -12,
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  distanceText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  directionContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  directionIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  directionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  instructionText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  streetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streetText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  progressContainer: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFF',
    borderRadius: 3,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
  },
  warningIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFB347',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  warningValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  statsGrid: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  nextStepsContainer: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
  },
  nextStepsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    marginBottom: 10,
  },
  nextStepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  nextStepIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  nextStepText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFF',
    paddingVertical: 12,
    paddingBottom: 28,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  bottomButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  endButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
});
