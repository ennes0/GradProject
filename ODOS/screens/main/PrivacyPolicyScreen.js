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

export default function PrivacyPolicyScreen() {
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
        <Text style={styles.headerTitle}>{tx('Gizlilik Politikası', 'Privacy Policy')}</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="shield-checkmark-outline" size={22} color="#FFFFFF" />
          </View>
          <Text style={styles.heroTitle}>{tx('Veri gizliliği ODOS için önceliklidir', 'Data privacy is a priority for ODOS')}</Text>
          <Text style={styles.heroText}>
            {tx(
              'Bu politika, ODOS uygulamasını kullanırken hangi verilerin toplandığını, nasıl işlendiğinin esaslarını ve kullanıcıların verileri üzerindeki haklarını açıklar.',
              'This policy explains what data is collected when using ODOS, how it is processed, and users’ rights over their data.',
            )}
          </Text>
        </View>

        <SectionCard
          title={tx('1. Toplanan veriler', '1. Data collected')}
          body={tx(
            'ODOS; hesap oluşturma ve deneyimi kişiselleştirme amacıyla ad-soyad, kullanıcı adı, e-posta, profil fotoğrafı ve isteğe bağlı profil bilgilerini toplayabilir. Navigasyon deneyimi için rota tercihleri, konum tabanlı arama verileri ve oturum özet metrikleri (mesafe, süre, kalori vb.) işlenebilir.',
            'ODOS may collect full name, username, email, profile photo, and optional profile details for account creation and personalization. For navigation, route preferences, location-based search data, and session summary metrics (distance, duration, calories, etc.) may be processed.',
          )}
        />

        <SectionCard
          title={tx('2. Verilerin kullanımı', '2. Purpose of use')}
          body={tx(
            'Toplanan veriler; kimlik doğrulama, profil yönetimi, rota oluşturma, uygulama güvenliği ve hizmet kalitesinin artırılması amaçlarıyla kullanılır. Veriler, kullanıcının deneyimini geliştirmek ve uygulamanın temel fonksiyonlarını sağlamak dışında farklı bir amaçla kullanılmaz.',
            'Collected data is used for authentication, profile management, route generation, app security, and service quality improvement. Data is not used for purposes beyond improving user experience and core app functionality.',
          )}
        />

        <SectionCard
          title={tx('3. Konum verisi ve rota verileri', '3. Location and route data')}
          body={tx(
            'Konum verisi, yalnızca rota oluşturma ve navigasyon özelliklerinin çalışması için işlenir. Konum bilgisi, kullanıcının açık işlemi olmadan sürekli takip amacıyla kullanılmaz. Rota verileri, uygulama performansını artırmak ve kullanıcıya daha iyi öneriler sunmak için anonimleştirilmiş biçimde değerlendirilebilir.',
            'Location data is processed only to enable route generation and navigation features. It is not used for continuous tracking without explicit user action. Route data may be anonymized to improve app performance and recommendations.',
          )}
        />

        <SectionCard
          title={tx('4. Veri paylaşımı', '4. Data sharing')}
          body={tx(
            'ODOS, kullanıcı verilerini açık rıza veya yasal zorunluluk olmadıkça üçüncü taraflarla pazarlama amaçlı paylaşmaz. Teknik altyapı sağlayıcılarıyla yapılan veri paylaşımları, yalnızca hizmetin sunulması için gerekli olduğu ölçüde ve güvenlik yükümlülükleri altında yapılır.',
            'ODOS does not share user data with third parties for marketing purposes unless there is explicit consent or legal obligation. Data sharing with infrastructure providers is limited to what is necessary for service delivery and bound by security obligations.',
          )}
        />

        <SectionCard
          title={tx('5. Veri güvenliği', '5. Data security')}
          body={tx(
            'Kullanıcı hesapları, token tabanlı kimlik doğrulama ve uygun güvenlik kontrolleri ile korunur. Yetkisiz erişim, veri kaybı veya kötü niyetli kullanım riskini azaltmak için teknik ve operasyonel önlemler uygulanır.',
            'User accounts are protected with token-based authentication and appropriate security controls. Technical and operational safeguards are applied to reduce risks of unauthorized access, data loss, or abuse.',
          )}
        />

        <SectionCard
          title={tx('6. Kullanıcı hakları', '6. User rights')}
          body={tx(
            'Kullanıcılar profil verilerini görüntüleme, güncelleme ve hesaplarını sonlandırma haklarına sahiptir. Kullanıcı, gizlilikle ilgili taleplerini uygulama içindeki destek kanalları veya resmi iletişim adresleri üzerinden iletebilir.',
            'Users have the right to view, update, and terminate their account data. Privacy-related requests can be submitted through in-app support channels or official contact addresses.',
          )}
        />

        <SectionCard
          title={tx('7. Politika güncellemeleri', '7. Policy updates')}
          body={tx(
            'Gizlilik politikası, yasal yükümlülükler veya ürün gelişimleri doğrultusunda güncellenebilir. Önemli değişiklikler uygulama üzerinden kullanıcılara duyurulur.',
            'The privacy policy may be updated in line with legal obligations or product improvements. Significant changes are announced within the application.',
          )}
        />

        <View style={styles.footerCard}>
          <Text style={styles.footerTitle}>{tx('Son güncelleme: 14.04.2026', 'Last updated: 14.04.2026')}</Text>
          <Text style={styles.footerText}>
            {tx(
              'Bu metin, ODOS uygulamasının genel gizlilik çerçevesini sunar. Yasal yayına alınacak nihai sürümde kurum unvanı, iletişim bilgileri ve ek yasal maddeler detaylandırılabilir.',
              'This text outlines the general privacy framework of the ODOS application. In the final legal version, company details, contact information, and additional legal clauses may be further detailed.',
            )}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionCard({ title, body }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{body}</Text>
    </View>
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
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 13,
    lineHeight: 21,
    color: '#475569',
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
  footerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  footerText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: '#0F766E',
    fontWeight: '600',
  },
});
