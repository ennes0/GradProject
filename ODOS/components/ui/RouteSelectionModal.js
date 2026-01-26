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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function RouteSelectionModal({ visible, onClose, onSelectRoute, routes }) {
  const defaultRoutes = [
    {
      id: 1,
      type: 'easiest',
      label: 'Easiest',
      totalClimb: '15m',
      duration: '22 min',
      color: '#4CAF50',
      elevationData: [2, 3, 4, 5, 7, 9, 10, 12, 14, 15],
    },
    {
      id: 2,
      type: 'balanced',
      label: 'Balanced',
      totalClimb: '45m',
      duration: '18 min',
      color: '#4ECDC4',
      elevationData: [2, 5, 10, 15, 20, 28, 35, 40, 43, 45],
    },
    {
      id: 3,
      type: 'fastest',
      label: 'Fastest',
      totalClimb: '86m',
      duration: '15 min',
      color: '#F44336',
      elevationData: [2, 10, 25, 40, 55, 65, 72, 78, 82, 86],
    },
  ];

  const routeData = routes || defaultRoutes;

  const renderElevationChart = (data, color) => {
    const maxValue = Math.max(...data);
    return (
      <View style={styles.chartContainer}>
        {data.map((value, index) => {
          const height = (value / maxValue) * 40;
          return (
            <View
              key={index}
              style={[
                styles.chartBar,
                { height, backgroundColor: color, opacity: 0.8 },
              ]}
            />
          );
        })}
      </View>
    );
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

          {/* Mini Harita Preview */}
          <View style={styles.mapPreview}>
            <View style={styles.mapPlaceholder}>
              <View style={styles.routeLinePreview} />
              <View style={styles.markerStart}>
                <Text style={styles.markerLabel}>A</Text>
              </View>
              <View style={styles.markerEnd}>
                <Text style={styles.markerLabel}>B</Text>
              </View>
            </View>
          </View>

          {/* Rota Seçenekleri */}
          <ScrollView style={styles.routesContainer} showsVerticalScrollIndicator={false}>
            {routeData.map((route) => (
              <TouchableOpacity
                key={route.id}
                style={styles.routeCard}
                onPress={() => {
                  onSelectRoute(route);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.routeHeader, { borderLeftColor: route.color, borderLeftWidth: 4 }]}>
                  <View style={styles.routeLabelContainer}>
                    <Text style={[styles.routeLabel, { color: route.color }]}>
                      {route.label}
                    </Text>
                    <View style={styles.routeMetrics}>
                      <View style={styles.metric}>
                        <Ionicons name="trending-up" size={16} color="#666" />
                        <Text style={styles.metricText}>{route.totalClimb}</Text>
                      </View>
                      <View style={styles.metricDivider} />
                      <View style={styles.metric}>
                        <Ionicons name="time-outline" size={16} color="#666" />
                        <Text style={styles.metricText}>{route.duration}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={[styles.routeBadge, { backgroundColor: route.color + '15' }]}>
                    <Ionicons name="checkmark-circle" size={24} color={route.color} />
                  </View>
                </View>
                
                <View style={styles.elevationSection}>
                  <Text style={styles.elevationLabel}>Elevation Profile</Text>
                  {renderElevationChart(route.elevationData, route.color)}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
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
    height: SCREEN_HEIGHT * 0.92,
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  mapPreview: {
    height: 160,
    backgroundColor: '#E8E4D9',
    position: 'relative',
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeLinePreview: {
    position: 'absolute',
    width: '50%',
    height: 60,
    borderWidth: 3,
    borderColor: '#4ECDC4',
    borderRadius: 12,
    transform: [{ rotate: '10deg' }],
    opacity: 0.8,
  },
  markerStart: {
    position: 'absolute',
    top: 45,
    left: '28%',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4ECDC4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  markerEnd: {
    position: 'absolute',
    bottom: 50,
    right: '25%',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F44336',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  markerLabel: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  locateButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  routesContainer: {
    flex: 1,
    padding: 16,
  },
  routeCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingLeft: 12,
  },
  routeLabelContainer: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  routeMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  metricDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#DDD',
    marginHorizontal: 12,
  },
  routeBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  elevationSection: {
    marginTop: 8,
  },
  elevationLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 60,
    gap: 4,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 8,
  },
  chartBar: {
    flex: 1,
    borderRadius: 3,
    minHeight: 6,
  },
});
