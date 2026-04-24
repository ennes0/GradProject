import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { Colors } from '../../constants/Colors';
import { resolveUserMediaUrl } from '../../config/api';

const DEFAULT_AVATAR = 'https://www.gravatar.com/avatar/?d=mp&s=200';

export default function UserListModal({
  visible,
  title,
  loading = false,
  users = [],
  onClose,
  onSelectUser,
}) {
  const { tx } = useLanguage();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityRole="button">
              <Ionicons name="close" size={24} color="#334155" />
            </TouchableOpacity>
          </View>
          {loading ? (
            <ActivityIndicator size="small" color={Colors.primary} style={styles.loader} />
          ) : (
            <FlatList
              data={users}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <Text style={styles.empty}>{tx('Liste boş', 'No users to show')}</Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.row}
                  activeOpacity={0.75}
                  onPress={() => {
                    if (onSelectUser) onSelectUser(item);
                    onClose();
                  }}
                >
                  <Image
                    source={{ uri: resolveUserMediaUrl(item.profilePhotoUrl) || DEFAULT_AVATAR }}
                    style={styles.avatar}
                  />
                  <View style={styles.rowText}>
                    <Text style={styles.name}>{item.fullName || item.username}</Text>
                    <Text style={styles.sub}>@{item.username}</Text>
                    {item.city ? <Text style={styles.city}>{item.city}</Text> : null}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '72%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  loader: {
    marginVertical: 24,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  sub: {
    fontSize: 12,
    color: Colors.primaryDark,
    fontWeight: '600',
  },
  city: {
    fontSize: 11,
    color: '#64748B',
  },
  empty: {
    textAlign: 'center',
    color: '#64748B',
    paddingVertical: 28,
    fontSize: 14,
  },
});
