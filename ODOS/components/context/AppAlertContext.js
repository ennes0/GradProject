import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../../constants/Colors';

const AppAlertContext = createContext(null);

const TYPE_META = {
  info: {
    icon: 'information-circle',
    color: '#0EA5E9',
    bg: '#E0F2FE',
  },
  success: {
    icon: 'checkmark-circle',
    color: '#059669',
    bg: '#DCFCE7',
  },
  warning: {
    icon: 'warning',
    color: '#D97706',
    bg: '#FEF3C7',
  },
  error: {
    icon: 'alert-circle',
    color: '#DC2626',
    bg: '#FEE2E2',
  },
};

export function AppAlertProvider({ children }) {
  const [alertState, setAlertState] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    buttons: [],
  });

  const closeAlert = useCallback(() => {
    setAlertState((prev) => ({ ...prev, visible: false }));
  }, []);

  const showAlert = useCallback(({
    title,
    message,
    type = 'info',
    buttons,
  }) => {
    const normalizedButtons = (buttons && buttons.length
      ? buttons
      : [{ text: 'Tamam' }]).map((btn) => ({
      text: btn.text || 'Tamam',
      style: btn.style || 'default',
      onPress: btn.onPress,
    }));

    setAlertState({
      visible: true,
      title: title || 'Bilgilendirme',
      message: message || '',
      type,
      buttons: normalizedButtons,
    });
  }, []);

  const value = useMemo(() => ({
    showAlert,
    closeAlert,
  }), [showAlert, closeAlert]);

  const meta = TYPE_META[alertState.type] || TYPE_META.info;

  return (
    <AppAlertContext.Provider value={value}>
      {children}

      <Modal visible={alertState.visible} transparent animationType="fade" onRequestClose={closeAlert}>
        <Pressable style={styles.overlay} onPress={closeAlert}>
          <Pressable style={styles.card} onPress={() => {}}>
            <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
              <Ionicons name={meta.icon} size={28} color={meta.color} />
            </View>
            <Text style={styles.title}>{alertState.title}</Text>
            {!!alertState.message && <Text style={styles.message}>{alertState.message}</Text>}

            <View style={styles.buttonRow}>
              {alertState.buttons.map((btn, index) => {
                const isDestructive = btn.style === 'destructive';
                const isCancel = btn.style === 'cancel';
                return (
                  <TouchableOpacity
                    key={`${btn.text}-${index}`}
                    activeOpacity={0.85}
                    style={[
                      styles.button,
                      isDestructive && styles.buttonDestructive,
                      isCancel && styles.buttonCancel,
                    ]}
                    onPress={() => {
                      closeAlert();
                      btn.onPress?.();
                    }}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        isDestructive && styles.buttonTextDestructive,
                        isCancel && styles.buttonTextCancel,
                      ]}
                    >
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </AppAlertContext.Provider>
  );
}

export function useAppAlert() {
  const context = useContext(AppAlertContext);
  if (!context) {
    throw new Error('useAppAlert must be used within AppAlertProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },
  message: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: '#475569',
    textAlign: 'center',
    fontWeight: '500',
  },
  buttonRow: {
    marginTop: 18,
    gap: 10,
  },
  button: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  buttonDestructive: {
    backgroundColor: '#DC2626',
  },
  buttonCancel: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  buttonTextDestructive: {
    color: '#FFFFFF',
  },
  buttonTextCancel: {
    color: '#334155',
  },
});
