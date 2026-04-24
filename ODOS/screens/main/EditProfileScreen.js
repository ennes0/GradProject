import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Modal,
  Pressable,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../components/context/AuthContext';
import { useAppAlert } from '../../components/context/AppAlertContext';
import { useLanguage } from '../../components/context/LanguageContext';
import { Colors } from '../../constants/Colors';
import { resolveUserMediaUrl } from '../../config/api';

const DEFAULT_PROFILE_IMAGE = 'https://www.gravatar.com/avatar/?d=mp&s=200';
const DEFAULT_BANNER_IMAGE = 'https://images.unsplash.com/photo-1605224095400-f925b422a578?auto=format&fit=crop&q=80&w=800';

function isLocalDeviceAsset(uri) {
  if (!uri || typeof uri !== 'string') return false;
  return uri.startsWith('file:') || uri.startsWith('content:');
}

function initialDisplayPhoto(url, fallback) {
  if (isLocalDeviceAsset(url)) return fallback;
  return resolveUserMediaUrl(url) || fallback;
}

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, updateMe, uploadProfilePhoto, uploadBannerPhoto } = useAuth();
  const { showAlert } = useAppAlert();
  const { tx } = useLanguage();
  const [photoPickerVisible, setPhotoPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState('profile');
  /** Galeri/kamera, RN Modal hâlâ kapanırken açılırsa iOS/Android'de sessizce patlayabiliyor; sheet false olduktan sonra tek seferlik çalıştırılır. */
  const pickerAfterCloseRef = useRef(null);
  const [displayName, setDisplayName] = useState(user?.fullName || '');
  const [username] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [city, setCity] = useState(user?.city || '');
  const [isPublic, setIsPublic] = useState(user?.isPublic ?? true);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(() =>
    initialDisplayPhoto(user?.profilePhotoUrl, DEFAULT_PROFILE_IMAGE));
  const [bannerPhotoUrl, setBannerPhotoUrl] = useState(() =>
    initialDisplayPhoto(user?.bannerPhotoUrl, DEFAULT_BANNER_IMAGE));
  const applyPickerResult = (result, target) => {
    if (!result.canceled && result.assets?.length) {
      if (target === 'banner') {
        setBannerPhotoUrl(result.assets[0].uri);
      } else {
        setProfilePhotoUrl(result.assets[0].uri);
      }
    }
  };

  const permissionDeniedAlert = (title, body) => {
    showAlert({
      title,
      message: body,
      type: 'warning',
      buttons: [
        { text: 'Ayarlari ac', onPress: () => Linking.openSettings() },
        { text: 'Tamam' },
      ],
    });
  };

  const cropLaunchOptions = (target) => ({
    allowsEditing: true,
    aspect: target === 'banner' ? [16, 9] : [1, 1],
    quality: 0.85,
  });

  const imagePickerLaunchOptions = (target) => ({
    mediaTypes: ['images'],
    ...cropLaunchOptions(target),
  });

  const pickFromLibrary = async (target) => {
    try {
      let perm = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }
      if (!perm.granted) {
        permissionDeniedAlert(
          tx('Galeri izni', 'Gallery permission'),
          tx(
            'Fotoğraf seçmek için galeri erişimi gerekli. Expo Go kullanıyorsan: Ayarlar > Expo Go > Fotoğraflar.',
            'Gallery access is required to choose a photo. If you use Expo Go: Settings > Expo Go > Photos.',
          ),
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync(imagePickerLaunchOptions(target));

      applyPickerResult(result, target);
    } catch (e) {
      showAlert({
        title: tx('Galeri', 'Gallery'),
        message: e?.message || 'Galeri acilamadi.',
        type: 'error',
      });
    }
  };

  const pickFromCamera = async (target) => {
    try {
      let perm = await ImagePicker.getCameraPermissionsAsync();
      if (!perm.granted) {
        perm = await ImagePicker.requestCameraPermissionsAsync();
      }
      if (!perm.granted) {
        permissionDeniedAlert(
          tx('Kamera izni', 'Camera permission'),
          tx(
            'Fotoğraf çekmek için kamera izni gerekli. Expo Go kullanıyorsan: Ayarlar > Expo Go > Kamera.',
            'Camera access is required to take a photo. If you use Expo Go: Settings > Expo Go > Camera.',
          ),
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        ...cropLaunchOptions(target),
        cameraType: ImagePicker.CameraType.front,
      });

      applyPickerResult(result, target);
    } catch (e) {
      showAlert({
        title: tx('Kamera', 'Camera'),
        message: e?.message || 'Kamera acilamadi.',
        type: 'error',
      });
    }
  };

  useEffect(() => {
    if (photoPickerVisible) return;
    const job = pickerAfterCloseRef.current;
    if (!job) return;
    const delayMs = Platform.OS === 'ios' ? 520 : 220;
    const id = setTimeout(() => {
      pickerAfterCloseRef.current = null;
      if (job.kind === 'library') void pickFromLibrary(job.target);
      else void pickFromCamera(job.target);
    }, delayMs);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sheet kapanınca; pick* her render'da yeni
  }, [photoPickerVisible]);

  const promptPhotoSource = (target = 'profile') => {
    setPickerTarget(target);
    setPhotoPickerVisible(true);
  };

  const closePhotoPicker = () => setPhotoPickerVisible(false);

  const openLibraryFromSheet = () => {
    pickerAfterCloseRef.current = { kind: 'library', target: pickerTarget };
    closePhotoPicker();
  };

  const openCameraFromSheet = () => {
    pickerAfterCloseRef.current = { kind: 'camera', target: pickerTarget };
    closePhotoPicker();
  };

  const handleSave = async () => {
    try {
      if (isLocalDeviceAsset(profilePhotoUrl)) {
        const me = await uploadProfilePhoto(profilePhotoUrl);
        setProfilePhotoUrl(resolveUserMediaUrl(me.profilePhotoUrl) || DEFAULT_PROFILE_IMAGE);
      }
      if (isLocalDeviceAsset(bannerPhotoUrl)) {
        const me = await uploadBannerPhoto(bannerPhotoUrl);
        setBannerPhotoUrl(resolveUserMediaUrl(me.bannerPhotoUrl) || DEFAULT_BANNER_IMAGE);
      }
      await updateMe({
        fullName: displayName,
        bio,
        city,
        isPublic,
      });
      showAlert({
        title: tx('Profil güncellendi', 'Profile updated'),
        message: tx('Değişiklikler başarıyla kaydedildi.', 'Changes were saved successfully.'),
        type: 'success',
        buttons: [{ text: 'Tamam', onPress: () => navigation.goBack() }],
      });
    } catch (e) {
      showAlert({
        title: tx('Profil', 'Profile'),
        message: e?.message || tx('Kayıt başarısız', 'Save failed'),
        type: 'error',
      });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{tx('Profili Düzenle', 'Edit Profile')}</Text>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.bannerEditorCard} activeOpacity={0.9} onPress={() => promptPhotoSource('banner')}>
            <Image source={{ uri: bannerPhotoUrl }} style={styles.bannerPreview} />
            <View style={styles.bannerOverlay}>
              <View style={styles.bannerBadge}>
                <Ionicons name="image-outline" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.bannerTitle}>{tx('Banner fotoğrafını değiştir', 'Change banner photo')}</Text>
              <Text style={styles.bannerSubtitle}>{tx('Profil üst kapağında görünecek yatay görseli seç.', 'Choose a wide image shown on your profile header.')}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.avatarBlock} activeOpacity={0.85} onPress={() => promptPhotoSource('profile')}>
            <View style={styles.avatarWrap}>
              <Image
                source={{ uri: profilePhotoUrl }}
                style={styles.avatar}
              />
              <View style={styles.avatarBadge}>
                <Ionicons name="camera" size={18} color="#FFF" />
              </View>
            </View>
            <Text style={styles.avatarHint}>{tx('Fotoğrafı değiştir', 'Change photo')}</Text>
          </TouchableOpacity>

          <View style={styles.card}>
            <Text style={styles.label}>{tx('Ad Soyad', 'Full Name')}</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder={tx('Adınız', 'Your name')}
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>{tx('Kullanıcı adı', 'Username')}</Text>
            <TextInput
              style={styles.input}
              value={username}
              placeholder={tx('kullanici_adi', 'username')}
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
              editable={false}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>{tx('Hakkında', 'About')}</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={bio}
              onChangeText={setBio}
              placeholder={tx('Kendinizi kısaca anlatın', 'Tell us about yourself briefly')}
              placeholderTextColor="#94A3B8"
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>{tx('Konum', 'Location')}</Text>
            <View style={styles.inputRow}>
              <Ionicons name="location-outline" size={20} color={Colors.primary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.inputBare]}
                value={city}
                onChangeText={setCity}
                placeholder={tx('Şehir, ülke', 'City, country')}
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.card, styles.visibilityCard]}
            activeOpacity={0.8}
            onPress={() => setIsPublic((prev) => !prev)}
          >
            <View style={styles.visibilityLeft}>
              <Ionicons name={isPublic ? 'eye-outline' : 'lock-closed-outline'} size={20} color={Colors.primary} />
              <View>
                <Text style={styles.visibilityTitle}>{tx('Profil görünürlüğü', 'Profile visibility')}</Text>
                <Text style={styles.visibilitySubtitle}>{isPublic ? tx('Herkese açık profil', 'Public profile') : tx('Sadece sana özel', 'Only visible to you')}</Text>
              </View>
            </View>
            <Ionicons name={isPublic ? 'toggle' : 'toggle-outline'} size={32} color={isPublic ? Colors.primary : '#CBD5E1'} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.9}>
            <Text style={styles.saveBtnText}>{tx('Kaydet', 'Save')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelBtnText}>{tx('Vazgeç', 'Cancel')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={photoPickerVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closePhotoPicker}
      >
        <Pressable style={styles.pickerBackdrop} onPress={closePhotoPicker}>
          <Pressable
            style={[styles.pickerSheet, { paddingBottom: 20 + insets.bottom }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.pickerHandle} />
            <Text style={styles.pickerTitle}>
              {pickerTarget === 'banner' ? tx('Banner fotoğrafı', 'Banner photo') : tx('Profil fotoğrafı', 'Profile photo')}
            </Text>
            <Text style={styles.pickerSubtitle}>{tx('Galeriden seçin veya kamerayı kullanın; kare veya geniş alan için kırpma açılır.', 'Choose from gallery or use camera; crop opens for square or wide format.')}</Text>

            <TouchableOpacity style={styles.pickerRow} onPress={openLibraryFromSheet} activeOpacity={0.85}>
              <View style={styles.pickerRowIcon}>
                <Ionicons name="images-outline" size={22} color={Colors.primary} />
              </View>
              <Text style={styles.pickerRowLabel}>{tx('Galeriden seç', 'Choose from gallery')}</Text>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.pickerRow} onPress={openCameraFromSheet} activeOpacity={0.85}>
              <View style={styles.pickerRowIcon}>
                <Ionicons name="camera-outline" size={22} color={Colors.primary} />
              </View>
              <Text style={styles.pickerRowLabel}>{tx('Kamera', 'Camera')}</Text>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.pickerCancel} onPress={closePhotoPicker} activeOpacity={0.85}>
              <Text style={styles.pickerCancelText}>{tx('İptal', 'Cancel')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  flex: {
    flex: 1,
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
    paddingBottom: 40,
  },
  bannerEditorCard: {
    height: 160,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: '#DDE7EE',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  bannerPreview: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.25)',
    padding: 18,
    justifyContent: 'flex-end',
  },
  bannerBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bannerSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  avatarBlock: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatarWrap: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E2E8F0',
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#F8FAFC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarHint: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  input: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    padding: 0,
    minHeight: 24,
  },
  inputMultiline: {
    minHeight: 88,
    lineHeight: 22,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    marginRight: 10,
  },
  inputBare: {
    flex: 1,
  },
  visibilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  visibilityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  visibilityTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  visibilitySubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  saveBtn: {
    marginTop: 8,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  cancelBtn: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: '#EEF2F6',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 16,
  },
  pickerHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  pickerSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 18,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  pickerRowIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  pickerRowLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  pickerCancel: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 4,
  },
  pickerCancelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
  },
});
