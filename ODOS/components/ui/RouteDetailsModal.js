import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Modal,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function RouteDetailsModal({ visible, onClose, route, onStartNavigation }) {
  if (!route) return null;

  // Örnek elevation data (25km boyunca)
  const elevationData = {
    labels: ['0', '', '5', '', '10', '', '15', '', '20', '', '25k'],
    datasets: [
      {
        data: [2, 4, 6, 8, 10, 12, 14, 12, 10, 8, 4],
        color: (opacity = 1) => {
          // Gradyan renkler - zorluk derecesine göre
          if (route.difficulty === 'Hard') return `rgba(244, 67, 54, ${opacity})`;
          if (route.difficulty === 'Medium') return `rgba(255, 193, 7, ${opacity})`;
          return `rgba(76, 175, 80, ${opacity})`;
        },
        strokeWidth: 3,
      },
    ],
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Hard':
        return '#F44336';
      case 'Medium':
        return '#FFC107';
      case 'Easy':
        return '#4CAF50';
      default:
        return '#4ECDC4';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <SafeAreaView edges={['top']}>
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.backButton}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Elevation Chart */}
          <View style={styles.chartSection}>
            <LineChart
              data={elevationData}
              width={SCREEN_WIDTH - 32}
              height={220}
              chartConfig={{
                backgroundColor: '#FFFFFF',
                backgroundGradientFrom: '#FFFFFF',
                backgroundGradientTo: '#FFFFFF',
                decimalPlaces: 0,
                color: (opacity = 1) => getDifficultyColor(route.difficulty || 'Easy'),
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
                  stroke: '#FFF',
                },
                fillShadowGradient: getDifficultyColor(route.difficulty || 'Easy'),
                fillShadowGradientOpacity: 0.3,
              }}
              bezier
              style={styles.chart}
              withInnerLines={true}
              withOuterLines={true}
              withVerticalLines={false}
              withHorizontalLines={true}
              segments={7}
            />
          </View>

          {/* Route Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Difficulty</Text>
              <View style={styles.statValue}>
                <Text style={[styles.difficultyText, { color: getDifficultyColor(route.difficulty || 'Easy') }]}>
                  {route.difficulty || 'Medium'} (Kırmızı)
                </Text>
              </View>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Max Slope</Text>
              <Text style={styles.statValueText}>{route.maxSlope || '12%'}</Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Estimated Effort</Text>
              <Text style={styles.statValueText}>{route.estimatedEffort || 'High'}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Distance</Text>
              <Text style={styles.statValueText}>{route.distance || '2.5 km'}</Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Duration</Text>
              <Text style={styles.statValueText}>{route.duration || '18 min'}</Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Climb</Text>
              <Text style={styles.statValueText}>{route.totalClimb || '45m'}</Text>
            </View>
          </View>

          {/* Additional Info */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="information-circle-outline" size={20} color="#4ECDC4" />
              <Text style={styles.infoText}>
                Bu rota orta zorlukta eğimler içerir. Uygun ayakkabı önerilir.
              </Text>
            </View>
          </View>
          </ScrollView>

          {/* Start Navigation Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => {
                onStartNavigation(route);
                onClose();
              }}
              activeOpacity={0.9}
            >
              <Ionicons name="navigate" size={24} color="#FFF" />
              <Text style={styles.startButtonText}>Start Navigation</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#F5F5F5',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.92,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 20,
  },
  content: {
    maxHeight: SCREEN_HEIGHT * 0.65,
  },
  chartSection: {
    backgroundColor: '#FFF',
    padding: 16,
    marginBottom: 12,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  statsContainer: {
    backgroundColor: '#FFF',
    padding: 20,
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  statLabel: {
    fontSize: 15,
    color: '#666',
  },
  statValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statValueText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  difficultyText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 8,
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4ECDC4',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 20,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  startButton: {
    flexDirection: 'row',
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  startButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 8,
  },
});
