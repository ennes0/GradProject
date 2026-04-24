import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../components/context/AuthContext';
import { useLanguage } from '../../components/context/LanguageContext';
import { useAppAlert } from '../../components/context/AppAlertContext';
import { Colors } from '../../constants/Colors';
import { resolveUserMediaUrl } from '../../config/api';

const DEFAULT_AVATAR = 'https://www.gravatar.com/avatar/?d=mp&s=200';

function formatRelative(iso, tx) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return tx('şimdi', 'now');
  if (mins < 60) return `${mins} ${tx('dk', 'min')}`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} ${tx('sa', 'h')}`;
  const days = Math.round(hrs / 24);
  return `${days} ${tx('g', 'd')}`;
}

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const { tx } = useLanguage();
  const { showAlert } = useAppAlert();
  const {
    fetchIncomingFollowRequests,
    acceptFollowRequest,
    rejectFollowRequest,
    fetchCommunityNotifications,
  } = useAuth();

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [pendingIds, setPendingIds] = useState([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [reqRows, notifRows] = await Promise.all([
        fetchIncomingFollowRequests(50),
        fetchCommunityNotifications(80),
      ]);
      setRequests(reqRows);
      setNotifications(notifRows);
    } catch (e) {
      showAlert({
        title: tx('Bildirimler', 'Notifications'),
        message: e?.message || tx('Bildirimler yüklenemedi.', 'Notifications could not be loaded.'),
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [fetchIncomingFollowRequests, fetchCommunityNotifications, showAlert, tx]);

  useFocusEffect(
    useCallback(() => {
      void loadAll();
    }, [loadAll]),
  );

  const onAccept = useCallback(async (requestId) => {
    if (!requestId || pendingIds.includes(requestId)) return;
    setPendingIds((prev) => [...prev, requestId]);
    try {
      await acceptFollowRequest(requestId);
      setRequests((prev) => prev.filter((r) => r.requestId !== requestId));
      await loadAll();
    } catch (e) {
      showAlert({
        title: tx('Takip isteği', 'Follow request'),
        message: e?.message || tx('İstek kabul edilemedi.', 'Request could not be accepted.'),
        type: 'error',
      });
    } finally {
      setPendingIds((prev) => prev.filter((id) => id !== requestId));
    }
  }, [acceptFollowRequest, pendingIds, showAlert, tx, loadAll]);

  const onReject = useCallback(async (requestId) => {
    if (!requestId || pendingIds.includes(requestId)) return;
    setPendingIds((prev) => [...prev, requestId]);
    try {
      await rejectFollowRequest(requestId);
      setRequests((prev) => prev.filter((r) => r.requestId !== requestId));
      await loadAll();
    } catch (e) {
      showAlert({
        title: tx('Takip isteği', 'Follow request'),
        message: e?.message || tx('İstek reddedilemedi.', 'Request could not be rejected.'),
        type: 'error',
      });
    } finally {
      setPendingIds((prev) => prev.filter((id) => id !== requestId));
    }
  }, [rejectFollowRequest, pendingIds, showAlert, tx, loadAll]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{tx('Bildirimler', 'Notifications')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 20 }} /> : null}

        <Text style={styles.sectionTitle}>{tx('Takip İstekleri', 'Follow Requests')}</Text>
        <View style={styles.sectionCard}>
          {!loading && requests.length === 0 ? (
            <Text style={styles.emptyText}>{tx('Bekleyen istek yok.', 'No pending requests.')}</Text>
          ) : (
            requests.map((req) => (
              <View key={req.requestId} style={styles.reqRow}>
                <Image
                  source={{ uri: resolveUserMediaUrl(req.profilePhotoUrl) || DEFAULT_AVATAR }}
                  style={styles.avatar}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.reqName}>{req.fullName || req.username}</Text>
                  <Text style={styles.reqSub}>@{req.username}</Text>
                </View>
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => void onAccept(req.requestId)}
                  disabled={pendingIds.includes(req.requestId)}
                >
                  <Text style={styles.acceptText}>{tx('Kabul', 'Accept')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => void onReject(req.requestId)}
                  disabled={pendingIds.includes(req.requestId)}
                >
                  <Text style={styles.rejectText}>{tx('Reddet', 'Reject')}</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <Text style={styles.sectionTitle}>{tx('Son Bildirimler', 'Recent Notifications')}</Text>
        <View style={styles.sectionCard}>
          {!loading && notifications.length === 0 ? (
            <Text style={styles.emptyText}>{tx('Henüz bildirim yok.', 'No notifications yet.')}</Text>
          ) : (
            notifications.map((n) => (
              <View key={n.id} style={styles.notifRow}>
                <Image
                  source={{ uri: resolveUserMediaUrl(n.actorProfilePhotoUrl) || DEFAULT_AVATAR }}
                  style={styles.avatarSmall}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifText}>
                    {n.type === 'follow_request_received'
                      ? tx('Sana bir takip isteği gönderdi.', 'sent you a follow request.')
                      : n.type === 'follow_request_accepted'
                        ? tx('Takip isteğini kabul etti.', 'accepted your follow request.')
                        : n.type === 'follow_request_rejected'
                          ? tx('Takip isteğini reddetti.', 'rejected your follow request.')
                          : tx('Seni takip etmeye başladı.', 'started following you.')}
                  </Text>
                  <Text style={styles.notifMeta}>
                    {(n.actorFullName || n.actorUsername || tx('Biri', 'Someone'))} · {formatRelative(n.createdAt, tx)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  sectionTitle: { marginTop: 6, fontSize: 13, fontWeight: '700', color: '#64748B' },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 10,
    gap: 8,
  },
  emptyText: { textAlign: 'center', color: '#94A3B8', fontSize: 13, paddingVertical: 10 },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E2E8F0' },
  reqName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  reqSub: { fontSize: 12, color: Colors.primaryDark, fontWeight: '600' },
  acceptBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  acceptText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  rejectBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  rejectText: { color: '#334155', fontSize: 12, fontWeight: '700' },
  notifRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  avatarSmall: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#E2E8F0' },
  notifText: { fontSize: 13, color: '#0F172A', fontWeight: '600' },
  notifMeta: { marginTop: 1, fontSize: 11, color: '#64748B' },
});

