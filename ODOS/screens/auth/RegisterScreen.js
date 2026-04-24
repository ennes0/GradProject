import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../../constants/Colors';
import { useAuth } from '../../components/context/AuthContext';
import { useAppAlert } from '../../components/context/AppAlertContext';
import { useLanguage } from '../../components/context/LanguageContext';

export default function RegisterScreen({ navigation }) {
  const { register, isAuthenticated } = useAuth();
  const { showAlert } = useAppAlert();
  const { t, language } = useLanguage();
  const [form, setForm] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    }
  }, [isAuthenticated, navigation]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const isStrongPassword = (password) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);

  const handleRegister = async () => {
    if (!form.fullName || !form.username || !form.email || !form.password || !form.confirmPassword) {
      showAlert({
        title: t('auth.register.missingTitle'),
        message: t('auth.register.missingMessage'),
        type: 'warning',
      });
      return;
    }
    if (!isStrongPassword(form.password)) {
      showAlert({
        title: t('auth.register.weakTitle'),
        message: t('auth.register.weakMessage'),
        type: 'warning',
      });
      return;
    }
    if (form.password !== form.confirmPassword) {
      showAlert({
        title: t('auth.register.mismatchTitle'),
        message: t('auth.register.mismatchMessage'),
        type: 'warning',
      });
      return;
    }
    try {
      setLoading(true);
      await register({
        fullName: form.fullName,
        username: form.username,
        email: form.email,
        password: form.password,
        preferredLanguage: language,
      });
    } catch (e) {
      showAlert({
        title: t('auth.register.failedTitle'),
        message: e.message,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>{t('auth.register.title')}</Text>
          <Text style={styles.subtitle}>{t('auth.register.subtitle')}</Text>

          <View style={styles.card}>
            <Text style={styles.label}>{t('auth.register.fullName')}</Text>
            <TextInput style={styles.input} value={form.fullName} onChangeText={(v) => setField('fullName', v)} placeholder={t('auth.register.fullNamePlaceholder')} placeholderTextColor="#94A3B8" />
            <Text style={styles.label}>{t('auth.register.username')}</Text>
            <TextInput style={styles.input} value={form.username} onChangeText={(v) => setField('username', v)} autoCapitalize="none" placeholder={t('auth.register.usernamePlaceholder')} placeholderTextColor="#94A3B8" />
            <Text style={styles.label}>{t('auth.register.email')}</Text>
            <TextInput style={styles.input} value={form.email} onChangeText={(v) => setField('email', v)} autoCapitalize="none" keyboardType="email-address" placeholder={t('auth.register.emailPlaceholder')} placeholderTextColor="#94A3B8" />
            <Text style={styles.label}>{t('auth.register.password')}</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={form.password}
                onChangeText={(v) => setField('password', v)}
                secureTextEntry={!showPassword}
                placeholder={t('auth.register.passwordPlaceholder')}
                placeholderTextColor="#94A3B8"
              />
              <TouchableOpacity style={styles.passwordToggle} onPress={() => setShowPassword((prev) => !prev)} activeOpacity={0.7}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.passwordRuleText}>{t('auth.register.passwordRule')}</Text>

            <Text style={styles.label}>{t('auth.register.confirmPassword')}</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={form.confirmPassword}
                onChangeText={(v) => setField('confirmPassword', v)}
                secureTextEntry={!showConfirmPassword}
                placeholder={t('auth.register.confirmPasswordPlaceholder')}
                placeholderTextColor="#94A3B8"
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowConfirmPassword((prev) => !prev)}
                activeOpacity={0.7}
              >
                <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={handleRegister} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryButtonText}>{t('auth.register.button')}</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>{t('auth.register.hasAccount')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  flex: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 36, paddingBottom: 36 },
  title: { fontSize: 30, fontWeight: '900', color: '#0F172A', letterSpacing: -0.6 },
  subtitle: { marginTop: 10, marginBottom: 28, fontSize: 15, lineHeight: 22, color: '#64748B' },
  card: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#EEF2F6' },
  label: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8, marginTop: 12 },
  input: {
    height: 52, borderRadius: 16, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
    paddingHorizontal: 16, fontSize: 15, color: '#0F172A', fontWeight: '600',
  },
  passwordWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 48,
  },
  passwordToggle: {
    position: 'absolute',
    right: 14,
    height: 52,
    justifyContent: 'center',
  },
  passwordRuleText: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: '#64748B',
    fontWeight: '600',
  },
  primaryButton: { marginTop: 24, height: 54, borderRadius: 27, backgroundColor: Colors.primaryDark, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  secondaryButton: { marginTop: 16, alignItems: 'center', paddingVertical: 8 },
  secondaryButtonText: { color: Colors.primary, fontSize: 14, fontWeight: '700' },
});
