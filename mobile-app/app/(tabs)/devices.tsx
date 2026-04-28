import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import CustomHeader from '../../components/CustomHeader';
import { deviceService } from '../../services/deviceService';
import { supabase } from '../../services/supabaseClient';
const cihazImg = require('../../assets/images/cihazfotograf.png');

type DeviceRow = {
  id: number;
  serial_number: string;
  label: string | null;
  status: 'online' | 'offline';
  lastSeenAt: string | null;
};

const ONLINE_THRESHOLD_MS = 300000;

export default function DevicesScreen() {
  const { user } = useAuth();
  const { theme, isDarkMode } = useTheme();

  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDevice, setEditingDevice] = useState<DeviceRow | null>(null);
  const [editingName, setEditingName] = useState('');
  const [saving, setSaving] = useState(false);
  const hasInitialLoadCompleted = useRef(false);

  const hasDevices = useMemo(() => devices.length > 0, [devices]);

  const resolveDeviceStatus = async (serialNumber: string): Promise<{ status: 'online' | 'offline'; lastSeenAt: string | null }> => {
    const { data, error } = await supabase
      .from('sensor_readings')
      .select('created_at')
      .eq('device_serial', serialNumber)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data?.created_at) {
      return { status: 'offline', lastSeenAt: null };
    }

    const createdAt = new Date(data.created_at).getTime();
    if (Number.isNaN(createdAt)) {
      return { status: 'offline', lastSeenAt: data.created_at };
    }

    const isOnline = Date.now() - createdAt <= ONLINE_THRESHOLD_MS;
    return {
      status: isOnline ? 'online' : 'offline',
      lastSeenAt: data.created_at,
    };
  };

  const loadDevices = useCallback(async (silent = false) => {
    const shouldBlockUI = !silent && !hasInitialLoadCompleted.current;

    if (!user?.id) {
      setDevices([]);
      if (shouldBlockUI) {
        setLoading(false);
        hasInitialLoadCompleted.current = true;
      }
      return;
    }

    if (shouldBlockUI) {
      setLoading(true);
    }

    try {
      const { data, error } = await supabase
        .from('devices')
        .select('id, serial_number, label')
        .eq('user_id', user.id)
        .order('id', { ascending: true });

      if (error) throw error;

      const normalized = (data ?? []) as { id: number; serial_number: string; label: string | null }[];
      const withStatus = await Promise.all(
        normalized.map(async (item) => {
          const statusInfo = await resolveDeviceStatus(item.serial_number);
          return {
            id: item.id,
            serial_number: item.serial_number,
            label: item.label,
            status: statusInfo.status,
            lastSeenAt: statusInfo.lastSeenAt,
          } as DeviceRow;
        })
      );

      setDevices(withStatus);
    } catch (error) {
      console.error('[Devices] loadDevices hatasi:', error);
      if (!silent) {
        Alert.alert('Hata', 'Cihazlar yuklenirken bir sorun olustu.');
      }
    } finally {
      if (shouldBlockUI) {
        setLoading(false);
        hasInitialLoadCompleted.current = true;
      }
    }
  }, [user?.id]);

  useEffect(() => {
    hasInitialLoadCompleted.current = false;
    setLoading(true);
    loadDevices(false);
  }, [user?.id, loadDevices]);

  useEffect(() => {
    if (!user?.id) return;

    const timer = setInterval(() => {
      loadDevices(true);
    }, 15000);

    return () => clearInterval(timer);
  }, [user?.id, loadDevices]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDevices(true);
    setRefreshing(false);
  };

  const openRenameModal = (device: DeviceRow) => {
    setEditingDevice(device);
    setEditingName(device.label ?? '');
    setModalVisible(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalVisible(false);
    setEditingDevice(null);
    setEditingName('');
  };

  const saveDeviceName = async () => {
    if (!editingDevice) return;

    const nextName = editingName.trim();
    setSaving(true);
    try {
      await deviceService.updateDeviceLabel(
        editingDevice.serial_number,
        nextName.length > 0 ? nextName : null
      );

      setDevices((prev) =>
        prev.map((item) =>
          item.id === editingDevice.id
            ? { ...item, label: nextName.length > 0 ? nextName : null }
            : item
        )
      );
      closeModal();
    } catch (error) {
      console.error('[Devices] saveDeviceName hatasi:', error);
      Alert.alert('Hata', 'Cihaz ismi guncellenemedi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <CustomHeader />
      {loading ? (
        <View style={[styles.loadingWrap, { backgroundColor: theme.background }]}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={[styles.loadingText, { color: theme.subText }]}>Cihazlar yukleniyor...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#10B981" />}
        >
          {!hasDevices ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="hardware-chip-outline" size={30} color={theme.subText} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>Henüz cihaz bulunmuyor</Text>
              <Text style={[styles.emptyText, { color: theme.subText }]}>
                Yeni cihazlarin buradan yonetilecek.
              </Text>
            </View>
          ) : null}

          {devices.map((device) => {
            const online = device.status === 'online';
            return (
              <View
                key={device.id}
                style={[
                  styles.deviceCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: isDarkMode ? '#262626' : '#F0F0F0',
                  },
                ]}
              >
                <View style={styles.heroWrap}>
                  <View
                    style={[
                      styles.imageWrap,
                      { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(16,185,129,0.12)' },
                    ]}
                  >
                    <Image
                      source={cihazImg}
                      style={styles.deviceImage}
                      resizeMode="contain"
                      resizeMethod="resize"
                      fadeDuration={0}
                    />
                  </View>
                </View>

                <View style={styles.textBlock}>
                  <Text style={[styles.deviceTitle, { color: theme.text }]}>
                    {device.label?.trim() ? device.label : device.serial_number}
                  </Text>
                  <Text style={[styles.deviceSerial, { color: theme.subText }]}>{device.serial_number}</Text>
                </View>

                <View style={styles.actionRow}>
                  <View style={styles.statusWrap}>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: online ? '#10B981' : '#EF4444' },
                      ]}
                    />
                    <Text style={[styles.statusText, { color: online ? '#10B981' : '#EF4444' }]}>
                      {online ? 'Çevrimiçi' : 'Çevrimdışı'}
                    </Text>
                  </View>

                  <View style={[styles.familyIconWrap, { backgroundColor: isDarkMode ? '#1F2937' : '#ECFDF5' }]}>
                    <Ionicons name="people-outline" size={18} color="#10B981" />
                  </View>
                </View>

                <Text style={[styles.lastSeenText, { color: theme.subText }]}>
                  {device.lastSeenAt
                    ? `Son veri: ${new Date(device.lastSeenAt).toLocaleString()}`
                    : 'Bu cihaza ait veri bulunamadi'}
                </Text>

                <TouchableOpacity style={styles.renameButtonFloating} onPress={() => openRenameModal(device)}>
                  <Ionicons name="pencil-outline" size={18} color="#10B981" />
                  <Text style={styles.renameText}>İsmi Düzenle</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => Alert.alert('Bilgi', 'Cok yakinda yeni cihaz ekleme ozelligi aktif olacak!')}
      >
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Cihaz Ismini Duzenle</Text>
            <TextInput
              value={editingName}
              onChangeText={setEditingName}
              placeholder="Orn: Yatak Odasi"
              placeholderTextColor={theme.subText}
              style={[
                styles.modalInput,
                { color: theme.text, borderColor: theme.border, backgroundColor: isDarkMode ? '#181818' : '#FAFAFA' },
              ]}
              autoCapitalize="words"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={closeModal} disabled={saving}>
                <Text style={styles.cancelBtnText}>Iptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={saveDeviceName} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Kaydet</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 96, gap: 12 },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 14 },

  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginTop: 8 },
  emptyText: { fontSize: 13, marginTop: 4 },

  deviceCard: {
    position: 'relative',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 9,
  },
  heroWrap: { alignItems: 'flex-start', marginTop: 2, marginBottom: 14 },
  imageWrap: {
    width: 218,
    height: 218,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deviceImage: {
    width: 204,
    height: 204,
  },
  textBlock: {
    alignItems: 'flex-start',
  },
  deviceTitle: { fontSize: 32, fontWeight: '800', lineHeight: 36 },
  deviceSerial: { marginTop: 4, fontSize: 12, fontWeight: '400' },

  actionRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
    paddingRight: 150,
  },
  statusWrap: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 9, height: 9, borderRadius: 4.5, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: '700' },

  familyIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  lastSeenText: { fontSize: 11, marginTop: 12 },
  renameButtonFloating: {
    position: 'absolute',
    right: -2,
    top: '50%',
    transform: [{ translateY: -12 }, { rotate: '-90deg' }],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 999,
    minWidth: 190,
    paddingVertical: 11,
    paddingHorizontal: 22,
    gap: 6,
  },
  renameText: { color: '#10B981', fontSize: 14, fontWeight: '800' },

  fab: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 7,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: { borderRadius: 18, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  modalButtons: { marginTop: 14, flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalBtn: { borderRadius: 10, paddingVertical: 9, paddingHorizontal: 16, minWidth: 84, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#E5E7EB' },
  cancelBtnText: { color: '#374151', fontWeight: '700' },
  saveBtn: { backgroundColor: '#10B981' },
  saveBtnText: { color: '#FFFFFF', fontWeight: '700' },
});
