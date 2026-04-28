import React from 'react';
import { FlatList, Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useSensorData } from '../context/SensorContext';

export default function CustomHeader() {
  const { theme, isDarkMode } = useTheme();
  const { notifications, unreadCount, clearNotifications, removeNotification } = useSensorData();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleNotificationsPress = () => {
    console.log('Bildirimler açıldı');
    setIsOpen((prev) => !prev);
  };
  const formatNotificationTime = (iso: string) => {
    const date = new Date(iso);
    const hh = date.getHours().toString().padStart(2, '0');
    const mm = date.getMinutes().toString().padStart(2, '0');
    const dd = date.getDate().toString().padStart(2, '0');
    return `${hh}:${mm} | ${dd}`;
  };

  const getStatusColor = (message: string) => {
    const match = message.match(/CO2\s+(\d+)/i);
    const co2 = match ? Number(match[1]) : 0;
    if (co2 > 1200) return '#EF4444';
    if (co2 > 800) return '#F59E0B';
    return '#10B981';
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.wrapper}>
        <View style={styles.container}>
          <View style={styles.leftGroup}>
            <Image
              source={require('../assets/images/logo.png')}
              style={[
                styles.logo,
                {
                  backgroundColor: theme.logoBackground,
                  borderRadius: theme.logoRadius,
                  padding: theme.logoPadding,
                },
              ]}
              resizeMode="contain"
            />
            <Text style={[styles.title, { color: theme.text }]}>AirSense</Text>
          </View>

          <TouchableOpacity
            onPress={handleNotificationsPress}
            style={styles.iconButton}
            hitSlop={10}
          >
            <Ionicons name="notifications-outline" size={25} color={theme.icon} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

      </View>

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.dropdown,
                  {
                    backgroundColor: isDarkMode ? 'rgba(28,28,30,0.86)' : 'rgba(255,255,255,0.84)',
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={styles.dropdownHeader}>
                    <View style={styles.dropdownTitleWrap}>
                      <Ionicons name="notifications" size={16} color={theme.icon} />
                      <Text style={[styles.dropdownTitle, { color: theme.text }]}>Bildirimler</Text>
                    </View>
                    <Pressable onPress={clearNotifications} style={styles.clearButton}>
                      <Text style={styles.clearText}>Tümünü Temizle</Text>
                    </Pressable>
                </View>
                {notifications.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="notifications-off-outline" size={28} color={theme.subText} />
                    <Text style={[styles.emptyTitle, { color: theme.text }]}>Henüz bir bildiriminiz yok</Text>
                    <Text style={[styles.emptySubtitle, { color: theme.subText }]}>
                      Yeni uyarılar geldiğinde burada listelenecek.
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    data={notifications}
                    keyExtractor={(item) => item.id}
                    style={styles.list}
                    contentContainerStyle={styles.listContent}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator
                    bounces
                    onScroll={(event) => {
                      if (event.nativeEvent.contentOffset.y < -40) {
                        setIsOpen(false);
                      }
                    }}
                    scrollEventThrottle={16}
                    renderItem={({ item }) => (
                      <View style={[styles.notificationItem, { borderBottomColor: theme.border }]}>
                        <View style={[styles.levelDot, { backgroundColor: getStatusColor(item.message) }]} />
                        <View style={styles.notificationBody}>
                          <Text style={[styles.notificationTitle, { color: theme.text }]}>{item.title}</Text>
                          <Text style={[styles.notificationMessage, { color: theme.subText }]}>{item.message}</Text>
                          <Text style={styles.notificationTime}>{formatNotificationTime(item.received_at)}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => removeNotification(item.id)}
                          hitSlop={8}
                        >
                          <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    )}
                  />
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: 'transparent',
  },
  wrapper: {
    position: 'relative',
    zIndex: 20,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 64,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 46,
    height: 46,
    marginRight: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  iconButton: {
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#D50000',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  dropdown: {
    position: 'absolute',
    top: 76,
    right: 20,
    width: 300,
    maxHeight: 360,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  dropdownTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dropdownTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  clearButton: {
    backgroundColor: '#FFEAEA',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  clearText: {
    color: '#D50000',
    fontSize: 11,
    fontWeight: '700',
  },
  list: {
    maxHeight: 285,
  },
  listContent: {
    paddingBottom: 6,
  },
  notificationItem: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  levelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: 8,
  },
  notificationBody: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  notificationMessage: {
    fontSize: 12.5,
    marginBottom: 4,
    lineHeight: 17,
  },
  notificationTime: {
    fontSize: 10,
    color: '#888',
  },
  deleteButton: {
    marginLeft: 8,
    padding: 4,
  },
  emptyState: {
    paddingHorizontal: 18,
    paddingVertical: 22,
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '700',
  },
  emptySubtitle: {
    marginTop: 4,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 17,
  },
});
