import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../components/context/AuthContext';
import { useAppAlert } from '../../components/context/AppAlertContext';
import { useLanguage } from '../../components/context/LanguageContext';
import { TRANSLATIONS } from '../../constants/i18n';
import { Colors } from '../../constants/Colors';

function SectionTitle({ children }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function SettingsRow({
  icon,
  iconBg,
  iconColor,
  label,
  subtitle,
  onPress,
  right,
  showChevron = true,
  danger,
}) {
  const content = (
    <>
      <View style={[styles.rowIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.rowTextWrap}>
        <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {right != null ? right : showChevron && onPress ? (
        <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.row}>{content}</View>;
}

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { user, logout, updateMe, isAuthenticated } = useAuth();
  const { showAlert } = useAppAlert();
  const { language, setLanguage, t, tx } = useLanguage();
  const [routeAlerts, setRouteAlerts] = useState(true);
  const [publicProfile, setPublicProfile] = useState(!!user?.isPublic);

  useEffect(() => {
    setPublicProfile(!!user?.isPublic);
  }, [user?.isPublic]);

  const handleLogout = async () => {
    await logout();
    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'MainTabs',
          state: {
            index: 1,
            routes: [
              { name: 'Map' },
              { name: 'Profile' },
            ],
          },
        },
      ],
    });
  };

  const confirmLogout = () => {
    showAlert({
      title: t('settings.logout.title'),
      message: t('settings.logout.message'),
      type: 'warning',
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.logout'), style: 'destructive', onPress: () => handleLogout() },
      ],
    });
  };

  const handleLanguageChange = async (nextLanguage) => {
    const normalized = nextLanguage === 'tr' ? 'tr' : 'en';
    if (normalized === language) return;
    const nextT = (key) =>
      TRANSLATIONS[normalized]?.[key]
      ?? TRANSLATIONS.tr?.[key]
      ?? key;
    await setLanguage(normalized);
    if (isAuthenticated) {
      try {
        await updateMe({ preferredLanguage: normalized });
      } catch {
        // local değişiklik kalsın; backend geçici hata olabilir
      }
    }
    showAlert({
      title: nextT('settings.language.updatedTitle'),
      message: nextT('settings.language.updatedMessage'),
      type: 'success',
    });
  };

  const openLanguagePicker = () => {
    showAlert({
      title: t('settings.language.dialogTitle'),
      message: t('settings.language.dialogMessage'),
      type: 'info',
      buttons: [
        { text: t('settings.language.subtitle.tr'), onPress: () => handleLanguageChange('tr') },
        { text: t('settings.language.subtitle.en'), onPress: () => handleLanguageChange('en') },
        { text: t('common.cancel'), style: 'cancel' },
      ],
    });
  };

  const handleTogglePublicProfile = async (nextValue) => {
    setPublicProfile(nextValue);
    if (!isAuthenticated) {
      return;
    }
    try {
      await updateMe({ isPublic: nextValue });
      showAlert({
        title: tx('Gizlilik', 'Privacy'),
        message: nextValue
          ? tx('Profilin artık herkese açık.', 'Your profile is now public.')
          : tx('Profilin artık gizli. Takip isteği gerekiyor.', 'Your profile is now private. Follow requests are required.'),
        type: 'success',
      });
    } catch (e) {
      setPublicProfile(!!user?.isPublic);
      showAlert({
        title: tx('Gizlilik', 'Privacy'),
        message: e?.message || tx('Profil görünürlüğü güncellenemedi.', 'Profile visibility could not be updated.'),
        type: 'error',
      });
    }
  };

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
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <SectionTitle>{t('settings.section.notifications')}</SectionTitle>
        <View style={styles.group}>
          <SettingsRow
            icon="notifications-outline"
            iconBg="#E0F2FE"
            iconColor="#0284C7"
            label={tx('Topluluk bildirimleri', 'Community notifications')}
            subtitle={tx('Takip ve takip isteği güncellemeleri', 'Follow and follow-request updates')}
            onPress={() => navigation.navigate('Notifications')}
          />
          <View style={styles.separator} />
          <SettingsRow
            icon="navigate-outline"
            iconBg="#DCFCE7"
            iconColor="#059669"
            label={tx('Rota uyarıları', 'Route alerts')}
            subtitle={tx('Sapma ve hatırlatmalar', 'Deviation and reminder alerts')}
            showChevron={false}
            right={
              <Switch
                value={routeAlerts}
                onValueChange={setRouteAlerts}
                trackColor={{ false: '#E2E8F0', true: Colors.primary + '55' }}
                thumbColor={routeAlerts ? Colors.primary : '#F1F5F9'}
              />
            }
          />
        </View>

        <SectionTitle>{t('settings.section.account')}</SectionTitle>
        <View style={styles.group}>
          <SettingsRow
            icon="lock-closed-outline"
            iconBg="#FEF3C7"
            iconColor="#D97706"
            label={tx('Gizlilik', 'Privacy')}
            subtitle={tx('Profil görünürlüğü ve veriler', 'Profile visibility and data')}
            onPress={() => showAlert({ title: tx('Gizlilik', 'Privacy'), message: t('common.comingSoon'), type: 'info' })}
          />
          <View style={styles.separator} />
          <SettingsRow
            icon="eye-outline"
            iconBg="#EDE9FE"
            iconColor="#7C3AED"
            label={tx('Herkese açık profil', 'Public profile')}
            showChevron={false}
            right={
              <Switch
                value={publicProfile}
                onValueChange={(value) => { void handleTogglePublicProfile(value); }}
                trackColor={{ false: '#E2E8F0', true: Colors.primary + '55' }}
                thumbColor={publicProfile ? Colors.primary : '#F1F5F9'}
              />
            }
          />
          <View style={styles.separator} />
          <SettingsRow
            icon="mail-outline"
            iconBg="#F1F5F9"
            iconColor="#475569"
            label={tx('E-posta ve güvenlik', 'Email and security')}
            onPress={() => showAlert({ title: tx('E-posta ve güvenlik', 'Email and security'), message: t('common.comingSoon'), type: 'info' })}
          />
        </View>

        <SectionTitle>{t('settings.section.app')}</SectionTitle>
        <View style={styles.group}>
          <SettingsRow
            icon="language-outline"
            iconBg="#E0F2FE"
            iconColor="#0369A1"
            label={t('settings.language.label')}
            subtitle={language === 'tr' ? t('settings.language.subtitle.tr') : t('settings.language.subtitle.en')}
            onPress={openLanguagePicker}
          />
          <View style={styles.separator} />
          <SettingsRow
            icon="map-outline"
            iconBg="#F0FDF4"
            iconColor="#15803D"
            label={tx('Varsayılan harita görünümü', 'Default map style')}
            subtitle={tx('Standart', 'Standard')}
            onPress={() => showAlert({ title: tx('Harita görünümü', 'Map style'), message: t('common.comingSoon'), type: 'info' })}
          />
        </View>

        <SectionTitle>{t('settings.section.support')}</SectionTitle>
        <View style={styles.group}>
          <SettingsRow
            icon="help-circle-outline"
            iconBg="#F1F5F9"
            iconColor="#475569"
            label={tx('Yardım merkezi', 'Help center')}
            onPress={() => Linking.openURL('https://example.com/help')}
          />
          <View style={styles.separator} />
          <SettingsRow
            icon="document-text-outline"
            iconBg="#F1F5F9"
            iconColor="#475569"
            label={tx('Gizlilik politikası', 'Privacy policy')}
            subtitle={tx('Veri güvenliği ve kullanım esasları', 'Data security and usage terms')}
            onPress={() => navigation.navigate('PrivacyPolicy')}
          />
          <View style={styles.separator} />
          <SettingsRow
            icon="information-circle-outline"
            iconBg="#F1F5F9"
            iconColor="#475569"
            label={tx('Hakkında', 'About')}
            subtitle={tx('Vizyon, özellikler ve yol haritası', 'Vision, features and roadmap')}
            onPress={() => navigation.navigate('About')}
          />
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={22} color="#DC2626" />
          <Text style={styles.logoutText}>{tx('Çıkış yap', 'Sign out')}</Text>
        </TouchableOpacity>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 48,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 8,
  },
  group: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    overflow: 'hidden',
    marginBottom: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    minHeight: 56,
  },
  rowIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowTextWrap: {
    flex: 1,
    paddingRight: 8,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  rowLabelDanger: {
    color: '#DC2626',
  },
  rowSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#EEF2F6',
    marginLeft: 66,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 24,
    paddingVertical: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#DC2626',
  },
});
