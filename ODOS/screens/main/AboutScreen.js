import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '../../components/context/LanguageContext';

import { Colors } from '../../constants/Colors';

export default function AboutScreen() {
  const navigation = useNavigation();
  const { tx } = useLanguage();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{tx('ODOS Hakkında', 'About ODOS')}</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="walk" size={22} color="#FFFFFF" />
          </View>
          <Text style={styles.heroTitle}>{tx('Eğim duyarlı yaya navigasyonu', 'Slope-aware pedestrian navigation')}</Text>
          <Text style={styles.heroText}>
            {tx(
              'ODOS, şehir içi yürüyüş deneyimini daha konforlu ve erişilebilir hale getirmek için geliştirilen bir mobil navigasyon platformudur. Uygulama, yalnızca en kısa mesafeyi değil; yol eğimi, yürünebilirlik ve kullanıcı tercihlerine göre daha uygun rotaları öne çıkarır.',
              'ODOS is a mobile navigation platform designed to make urban walking more comfortable and accessible. Instead of only the shortest distance, it highlights routes better aligned with slope, walkability, and user preferences.',
            )}
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{tx('Misyonumuz', 'Our Mission')}</Text>
          <Text style={styles.sectionBody}>
            {tx(
              'Her kullanıcının fiziksel durumuna ve günlük ihtiyacına göre kişiselleştirilmiş rota önerileri sunarak, yürüyüşü daha güvenli, sürdürülebilir ve keyifli bir ulaşım alternatifi haline getirmek.',
              'To provide personalized route recommendations based on each user’s physical condition and daily needs, making walking a safer, more sustainable, and enjoyable transportation option.',
            )}
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{tx('Bugün neler sunuyor?', 'What does it offer today?')}</Text>
          <View style={styles.listItem}>
            <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
            <Text style={styles.listText}>{tx('Başlangıç ve varış noktası için alternatif rota seçenekleri', 'Alternative route options between start and destination')}</Text>
          </View>
          <View style={styles.listItem}>
            <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
            <Text style={styles.listText}>{tx('Eğim odaklı rota profilleri (kolay, dengeli, hızlı)', 'Slope-focused route profiles (easy, balanced, fast)')}</Text>
          </View>
          <View style={styles.listItem}>
            <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
            <Text style={styles.listText}>{tx('Yürüyüş seansı özeti ve temel profil kişiselleştirmesi', 'Walking session summary and basic profile personalization')}</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{tx('Yol haritası', 'Roadmap')}</Text>
          <View style={styles.roadmapItem}>
            <Text style={styles.roadmapTitle}>{tx('Sosyal rota ekosistemi', 'Social route ecosystem')}</Text>
            <Text style={styles.roadmapBody}>
              {tx(
                'Kullanıcıların kendi rotalarını paylaşabildiği, puanlayabildiği ve popüler rotaları keşfedebildiği topluluk deneyimi.',
                'A community experience where users can share, rate, and discover popular routes.',
              )}
            </Text>
          </View>
          <View style={styles.roadmapItem}>
            <Text style={styles.roadmapTitle}>{tx('Sağlık ve aktivite entegrasyonu', 'Health and activity integration')}</Text>
            <Text style={styles.roadmapBody}>
              {tx(
                'Adım, mesafe, kalori ve yürüyüş süresi gibi metriklerle kişisel aktivite takibi.',
                'Personal activity tracking with metrics such as steps, distance, calories, and walking duration.',
              )}
            </Text>
          </View>
          <View style={styles.roadmapItem}>
            <Text style={styles.roadmapTitle}>{tx('Akıllı kişiselleştirme', 'Smart personalization')}</Text>
            <Text style={styles.roadmapBody}>
              {tx(
                'Zaman, hava durumu, yoğunluk ve kullanıcı alışkanlıklarına göre dinamik rota önerileri.',
                'Dynamic route suggestions based on time, weather, density, and user habits.',
              )}
            </Text>
          </View>
        </View>

        <View style={styles.footerCard}>
          <Text style={styles.footerText}>
            {tx('Sürüm: 1.0.0', 'Version: 1.0.0')}
          </Text>
          <Text style={styles.footerSubtext}>
            {tx(
              'ODOS, yaya odaklı akıllı şehir ulaşımı vizyonunun bir parçası olarak geliştirilmektedir.',
              'ODOS is being developed as part of a pedestrian-focused smart urban mobility vision.',
            )}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    gap: 12,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E6F4F3',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 3,
  },
  heroIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  heroText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
    fontWeight: '500',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
    fontWeight: '500',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: '#334155',
    fontWeight: '600',
  },
  roadmapItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  roadmapTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  roadmapBody: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 20,
    color: '#64748B',
    fontWeight: '500',
  },
  footerCard: {
    marginTop: 4,
    borderRadius: 16,
    backgroundColor: '#ECFEFF',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    padding: 14,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  footerSubtext: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: '#0F766E',
    fontWeight: '600',
  },
});
