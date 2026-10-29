import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Share,
  Platform,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as FS from '@dr.pogodin/react-native-fs';
import { RootStackParamList } from '../../navigation/types';
import { useSessionStore } from '../../store/sessionStore';
import { getFamilyStats, FamilyStats } from '../../db/repositories/personRepository';
import { query } from '../../db/database';
import {
  createBackupZip,
  inspectBackupZip,
  restoreFromBackupZip,
  listAvailableBackups,
  deleteBackupFile,
  formatFileSize,
  BackupManifest,
  BackupSummary,
  BackupFileInfo,
} from '../../services/backupService';
import { colors, radius, spacing, typography } from '../../theme';
import { ScreenHeader, Icon, AppButton, useToast } from '../../components';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ActiveTab = 'backup' | 'restore';

export function BackupRestoreScreen() {
  const navigation = useNavigation<NavigationProp>();
  const toast = useToast();
  const user = useSessionStore(s => s.user);

  const [activeTab, setActiveTab] = useState<ActiveTab>('backup');
  const [stats, setStats] = useState<FamilyStats>({
    total: 0,
    branchNoi: 0,
    branchNgoai: 0,
    branchVoChong: 0,
    deceased: 0,
  });
  const [relCount, setRelCount] = useState(0);
  const [eventCount, setEventCount] = useState(0);

  // Backup State
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [lastBackup, setLastBackup] = useState<BackupSummary | null>(null);

  // Restore State
  const [availableBackups, setAvailableBackups] = useState<BackupFileInfo[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Inspection Modal State before restore
  const [inspectModalVisible, setInspectModalVisible] = useState(false);
  const [inspectData, setInspectData] = useState<{
    filePath: string;
    fileName: string;
    manifest: BackupManifest;
    fileSizeBytes?: number;
  } | null>(null);

  // Load current database stats
  const loadStats = useCallback(async () => {
    try {
      const s = await getFamilyStats();
      setStats(s);

      const relRows = await query<{ count: number }>('SELECT COUNT(*) as count FROM relationships;');
      setRelCount(relRows[0]?.count ?? 0);

      const eventRows = await query<{ count: number }>('SELECT COUNT(*) as count FROM memorial_events;');
      setEventCount(eventRows[0]?.count ?? 0);
    } catch (e) {
      console.warn('Lỗi đọc thống kê:', e);
    }
  }, []);

  // Load available backup files on device
  const loadBackups = useCallback(async () => {
    setIsLoadingBackups(true);
    try {
      const list = await listAvailableBackups();
      setAvailableBackups(list);
    } catch (e) {
      console.warn('Lỗi đọc danh sách file sao lưu:', e);
    } finally {
      setIsLoadingBackups(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadBackups();
  }, [loadStats, loadBackups]);

  // Handle Backup Creation
  const handleCreateBackup = async () => {
    try {
      setIsBackingUp(true);
      const res = await createBackupZip();
      setLastBackup(res);
      await loadBackups();
      toast.show('Đã tạo tệp sao lưu ZIP thành công!', 'success');
      Alert.alert(
        'Sao lưu hoàn tất!',
        `Tệp sao lưu ZIP đã được tạo thành công:\n\n📁 ${res.fileName}\n📦 Dung lượng: ${formatFileSize(res.fileSizeBytes)}\n📍 Vị trí: ${res.publicPath || res.filePath}`,
        [
          { text: 'Đóng', style: 'default' },
          {
            text: 'Chia sẻ file',
            onPress: () => handleShareFile(res.publicPath || res.filePath),
          },
        ],
      );
    } catch (err: any) {
      console.error(err);
      Alert.alert('Lỗi sao lưu', err?.message || 'Không thể tạo file sao lưu ZIP.');
    } finally {
      setIsBackingUp(false);
    }
  };

  // Handle File Sharing
  const handleShareFile = async (filePath: string) => {
    try {
      let uriToShare = filePath;
      if (!uriToShare.startsWith('file://')) {
        uriToShare = `file://${uriToShare}`;
      }
      await Share.share({
        title: 'Bản Sao Lưu Gia Phả',
        message: 'Tệp sao lưu dữ liệu Gia Tộc (file zip an toàn)',
        url: uriToShare,
      });
    } catch (e) {
      console.warn('Chia sẻ file lỗi:', e);
    }
  };

  // Handle Picking a ZIP file from device storage
  const handlePickZipFile = async () => {
    try {
      const picked = await FS.pickFile({
        pickerType: 'singleFile',
        mimeTypes: ['application/zip', 'application/x-zip-compressed', '*/*'],
      });

      if (!picked || picked.length === 0) return;

      const chosenUri = picked[0];
      await handleInspectAndPrompt(chosenUri);
    } catch (err: any) {
      console.warn('Chọn file lỗi:', err);
      Alert.alert('Thông báo', 'Không thể đọc tệp đã chọn. Vui lòng thử lại.');
    }
  };

  // Inspect file and show confirmation modal
  const handleInspectAndPrompt = async (filePathOrUri: string) => {
    try {
      setIsRestoring(true);
      const inspected = await inspectBackupZip(filePathOrUri);
      setInspectData({
        filePath: filePathOrUri,
        fileName: inspected.fileName,
        manifest: inspected.manifest,
        fileSizeBytes: inspected.fileSizeBytes,
      });
      setInspectModalVisible(true);
    } catch (err: any) {
      Alert.alert('Không thể đọc file ZIP', err?.message || 'Tệp không hợp lệ.');
    } finally {
      setIsRestoring(false);
    }
  };

  // Confirm and Execute Restore
  const handleExecuteRestore = async () => {
    if (!inspectData) return;
    setInspectModalVisible(false);
    setIsRestoring(true);

    try {
      const res = await restoreFromBackupZip(inspectData.filePath);
      await loadStats();
      toast.show(`Phục hồi thành công ${res.personsCount} người thân!`, 'success');

      Alert.alert(
        'Phục hồi thành công!',
        `Dữ liệu đã được nạp lại hoàn toàn vào máy:\n\n` +
          `• Thành viên gia tộc: ${res.personsCount} người\n` +
          `• Mối quan hệ liên kết: ${res.relationshipsCount}\n` +
          `• Ngày giỗ & sự kiện: ${res.memorialEventsCount}\n` +
          `• Ảnh đại diện: ${res.avatarsCount} ảnh`,
        [
          {
            text: 'Về trang chính',
            onPress: () => navigation.navigate('MainTabs', { screen: 'Home' }),
          },
        ],
      );
    } catch (err: any) {
      console.error(err);
      Alert.alert('Lỗi phục hồi', err?.message || 'Không thể khôi phục dữ liệu từ file ZIP.');
    } finally {
      setIsRestoring(false);
      setInspectData(null);
    }
  };

  // Handle Delete a backup file
  const handleDeleteBackup = (file: BackupFileInfo) => {
    Alert.alert(
      'Xóa bản sao lưu này?',
      `Tệp "${file.fileName}" (${file.formattedSize}) sẽ bị xóa khỏi bộ nhớ máy.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa vĩnh viễn',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBackupFile(file.filePath);
              await loadBackups();
              toast.show('Đã xóa bản sao lưu', 'info');
            } catch (e) {
              Alert.alert('Lỗi', 'Không thể xóa file này.');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader
        title="Sao Lưu & Phục Hồi"
        canGoBack
        onGoBack={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs' as any))}
      />

      {/* Segmented Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'backup' && styles.tabButtonActive]}
          onPress={() => setActiveTab('backup')}
          activeOpacity={0.7}>
          <Icon
            name="archive-arrow-down-outline"
            size={18}
            color={activeTab === 'backup' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'backup' && styles.tabTextActive]}>
            Sao Lưu Dữ Liệu
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'restore' && styles.tabButtonActive]}
          onPress={() => setActiveTab('restore')}
          activeOpacity={0.7}>
          <Icon
            name="archive-arrow-up-outline"
            size={18}
            color={activeTab === 'restore' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'restore' && styles.tabTextActive]}>
            Phục Hồi Từ ZIP
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* ===================== TAB 1: SAO LƯU ===================== */}
        {activeTab === 'backup' ? (
          <View style={styles.tabSection}>
            {/* Thống kê dữ liệu hiện tại */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconPill, { backgroundColor: colors.primarySoft }]}>
                  <Icon name="database-check-outline" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.subtitle1, styles.cardTitle]}>Dữ Liệu Sẽ Được Đóng Gói</Text>
                  <Text style={[typography.caption, styles.cardDesc]}>
                    Toàn bộ cơ sở dữ liệu và hình ảnh đại diện sẽ được nén vào 1 file ZIP duy nhất
                  </Text>
                </View>
              </View>

              <View style={styles.statsList}>
                <View style={styles.statRow}>
                  <View style={styles.statDot} />
                  <Text style={styles.statLabel}>Chủ máy ("Tôi"):</Text>
                  <Text style={styles.statValue}>{user?.name || 'Chưa thiết lập'}</Text>
                </View>

                <View style={styles.statRow}>
                  <View style={styles.statDot} />
                  <Text style={styles.statLabel}>Tổng người thân trong danh bạ:</Text>
                  <Text style={styles.statValue}>{stats.total} người</Text>
                </View>

                <View style={styles.statRow}>
                  <View style={styles.statDot} />
                  <Text style={styles.statLabel}>Liên kết gia phả trực hệ:</Text>
                  <Text style={styles.statValue}>{relCount} mối quan hệ</Text>
                </View>

                <View style={styles.statRow}>
                  <View style={styles.statDot} />
                  <Text style={styles.statLabel}>Ngày giỗ & sự kiện gia tộc:</Text>
                  <Text style={styles.statValue}>{eventCount} sự kiện</Text>
                </View>

                <View style={styles.statRow}>
                  <View style={styles.statDot} />
                  <Text style={styles.statLabel}>Ảnh đại diện các thành viên:</Text>
                  <Text style={styles.statValue}>Bao gồm trọn bộ trong ZIP</Text>
                </View>
              </View>
            </View>

            {/* Nút Tạo bản sao lưu */}
            <View style={styles.actionCard}>
              <AppButton
                title={isBackingUp ? 'Đang đóng gói file ZIP...' : 'Tạo Bản Sao Lưu ZIP Ngay'}
                icon="archive-arrow-down-outline"
                variant="primary"
                size="lg"
                loading={isBackingUp}
                disabled={isBackingUp}
                onPress={handleCreateBackup}
              />
              <Text style={styles.hintText}>
                File ZIP sẽ được lưu vào bộ nhớ máy và thư mục "Tải về" (Download), sẵn sàng chia sẻ qua Zalo, Google Drive, Gmail hoặc chuyển sang máy khác.
              </Text>
            </View>

            {/* Kết quả bản sao lưu vừa tạo */}
            {lastBackup && (
              <View style={styles.successCard}>
                <View style={styles.successHeader}>
                  <Icon name="check-circle" size={22} color={colors.secondary} />
                  <Text style={styles.successTitle}>Đã tạo bản sao lưu mới nhất</Text>
                </View>
                <Text style={styles.fileNameText} numberOfLines={1}>
                  📁 {lastBackup.fileName}
                </Text>
                <Text style={styles.fileDetailText}>
                  Dung lượng: {formatFileSize(lastBackup.fileSizeBytes)} • {lastBackup.manifest.stats.personsCount} người • {lastBackup.manifest.stats.avatarsCount} ảnh
                </Text>
                <View style={styles.successBtnRow}>
                  <AppButton
                    title="Chia sẻ file ZIP"
                    variant="primary"
                    icon="share-variant"
                    size="sm"
                    onPress={() => handleShareFile(lastBackup.publicPath || lastBackup.filePath)}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            )}
          </View>
        ) : null}

        {/* ===================== TAB 2: PHỤC HỒI ===================== */}
        {activeTab === 'restore' ? (
          <View style={styles.tabSection}>
            {/* Hộp chọn file bên ngoài */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconPill, { backgroundColor: colors.secondaryLight }]}>
                  <Icon name="folder-zip-outline" size={22} color={colors.secondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.subtitle1, styles.cardTitle]}>Chọn Tệp ZIP Từ Máy</Text>
                  <Text style={[typography.caption, styles.cardDesc]}>
                    Mở trình quản lý file để chọn tệp sao lưu từ thư mục Tải về, Google Drive, thẻ nhớ hoặc tin nhắn Zalo
                  </Text>
                </View>
              </View>

              <AppButton
                title={isRestoring ? 'Đang đọc file...' : '📂 Chọn file ZIP từ thiết bị'}
                variant="outline"
                size="md"
                disabled={isRestoring}
                loading={isRestoring}
                onPress={handlePickZipFile}
                style={{ marginTop: spacing.sm }}
              />
            </View>

            {/* Danh sách các bản sao lưu đã có sẵn trên máy */}
            <View style={styles.card}>
              <View style={styles.historyHeader}>
                <Text style={[typography.subtitle1, styles.cardTitle]}>
                  Bản Sao Lưu Tìm Thấy Trên Máy ({availableBackups.length})
                </Text>
                <TouchableOpacity onPress={loadBackups} activeOpacity={0.7} style={styles.reloadBtn}>
                  <Icon name="reload" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>

              {isLoadingBackups ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: spacing.lg }} />
              ) : availableBackups.length === 0 ? (
                <View style={styles.emptyBackupsBox}>
                  <Icon name="archive-off-outline" size={32} color={colors.border} />
                  <Text style={styles.emptyBackupsText}>
                    Chưa tìm thấy bản sao lưu nào trong thư mục Tải về hoặc bộ nhớ máy.
                  </Text>
                  <Text style={styles.emptyBackupsSub}>
                    Bạn có thể bấm nút "Chọn file ZIP từ thiết bị" ở trên để duyệt file từ bất kỳ thư mục nào.
                  </Text>
                </View>
              ) : (
                <View style={styles.backupList}>
                  {availableBackups.map(file => (
                    <View key={file.filePath} style={styles.backupItem}>
                      <View style={styles.backupItemLeft}>
                        <Icon name="zip-box-outline" size={28} color={colors.primary} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.backupItemName} numberOfLines={1}>
                            {file.fileName}
                          </Text>
                          <Text style={styles.backupItemMeta}>
                            {file.formattedSize} • {new Date(file.modifiedTime).toLocaleString('vi-VN')}
                          </Text>
                          {file.isPublicDownload && (
                            <Text style={styles.downloadTag}>Thư mục Tải về (Download)</Text>
                          )}
                        </View>
                      </View>

                      <View style={styles.backupItemActions}>
                        <TouchableOpacity
                          style={[styles.smallActionBtn, { backgroundColor: colors.primarySoft }]}
                          onPress={() => handleInspectAndPrompt(file.filePath)}
                          activeOpacity={0.7}>
                          <Text style={[styles.smallActionText, { color: colors.primary }]}>Nạp</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.smallIconBtn, { backgroundColor: colors.background }]}
                          onPress={() => handleShareFile(file.filePath)}
                          activeOpacity={0.7}>
                          <Icon name="share-variant-outline" size={16} color={colors.textSecondary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.smallIconBtn, { backgroundColor: colors.dangerBg }]}
                          onPress={() => handleDeleteBackup(file)}
                          activeOpacity={0.7}>
                          <Icon name="trash-can-outline" size={16} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        ) : null}

        {/* Cam kết an toàn & bảo mật */}
        <View style={styles.securityBox}>
          <Icon name="shield-check" size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.securityTitle}>Đảm bảo an toàn 100%</Text>
            <Text style={styles.securityDesc}>
              Bản sao lưu hoàn toàn do bạn nắm giữ. Bạn có thể lưu trữ trên USB, gửi cho con cháu trong gia đình hoặc lưu trữ trên tài khoản Google Drive cá nhân.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ===================== MODAL XÁC NHẬN PHỤC HỒI ===================== */}
      <Modal visible={inspectModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={[styles.iconPill, { backgroundColor: colors.primarySoft }]}>
                <Icon name="archive-sync" size={24} color={colors.primary} />
              </View>
              <Text style={styles.modalTitle}>Xác Nhận Phục Hồi Dữ Liệu</Text>
            </View>

            {inspectData ? (
              <View style={styles.inspectInfoBox}>
                <Text style={styles.inspectFileName} numberOfLines={1}>
                  📁 {inspectData.fileName}
                </Text>
                <Text style={styles.inspectDate}>
                  Thời gian tạo: {new Date(inspectData.manifest.createdAt).toLocaleString('vi-VN')}
                </Text>

                <View style={styles.inspectDivider} />

                <Text style={styles.inspectSubTitle}>Nội dung trong bản sao lưu:</Text>

                <View style={styles.inspectGrid}>
                  <View style={styles.inspectGridItem}>
                    <Text style={styles.inspectGridNum}>
                      {inspectData.manifest.stats.personsCount}
                    </Text>
                    <Text style={styles.inspectGridLabel}>Người thân</Text>
                  </View>

                  <View style={styles.inspectGridItem}>
                    <Text style={styles.inspectGridNum}>
                      {inspectData.manifest.stats.relationshipsCount}
                    </Text>
                    <Text style={styles.inspectGridLabel}>Quan hệ gia phả</Text>
                  </View>

                  <View style={styles.inspectGridItem}>
                    <Text style={styles.inspectGridNum}>
                      {inspectData.manifest.stats.memorialEventsCount}
                    </Text>
                    <Text style={styles.inspectGridLabel}>Ngày giỗ</Text>
                  </View>

                  <View style={styles.inspectGridItem}>
                    <Text style={styles.inspectGridNum}>
                      {inspectData.manifest.stats.avatarsCount}
                    </Text>
                    <Text style={styles.inspectGridLabel}>Ảnh đại diện</Text>
                  </View>
                </View>

                {inspectData.manifest.stats.userName ? (
                  <View style={styles.ownerRow}>
                    <Icon name="account-outline" size={16} color={colors.primary} />
                    <Text style={styles.ownerText}>
                      Chủ gia phả: <Text style={{ fontWeight: '700' }}>{inspectData.manifest.stats.userName}</Text>
                    </Text>
                  </View>
                ) : null}

                <View style={styles.warningBox}>
                  <Icon name="alert-circle-outline" size={18} color={colors.warning} />
                  <Text style={styles.warningText}>
                    Lưu ý: Quá trình này sẽ thay thế toàn bộ dữ liệu hiện tại trên máy bằng dữ liệu từ file sao lưu này.
                  </Text>
                </View>
              </View>
            ) : null}

            <View style={styles.modalBtnRow}>
              <AppButton
                title="Hủy bỏ"
                variant="ghost"
                onPress={() => setInspectModalVisible(false)}
                style={{ flex: 1 }}
              />
              <AppButton
                title="Khôi Phục Ngay"
                variant="primary"
                onPress={handleExecuteRestore}
                style={{ flex: 1.4 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  tabButtonActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  tabText: {
    ...typography.subtitle2,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  tabSection: {
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  iconPill: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    color: colors.text,
  },
  cardDesc: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  statsList: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginRight: spacing.sm,
  },
  statLabel: {
    ...typography.body2,
    color: colors.textSecondary,
    flex: 1,
  },
  statValue: {
    ...typography.subtitle2,
    color: colors.text,
    fontWeight: '600',
  },
  actionCard: {
    gap: spacing.sm,
  },
  hintText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
    lineHeight: 18,
  },
  successCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: spacing.xs,
  },
  successHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  successTitle: {
    ...typography.subtitle1,
    color: '#166534',
    fontWeight: '700',
  },
  fileNameText: {
    ...typography.subtitle2,
    color: '#14532D',
    marginTop: 4,
  },
  fileDetailText: {
    ...typography.caption,
    color: '#15803D',
  },
  successBtnRow: {
    marginTop: spacing.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  reloadBtn: {
    padding: spacing.xs,
  },
  emptyBackupsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  emptyBackupsText: {
    ...typography.subtitle2,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  emptyBackupsSub: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  backupList: {
    gap: spacing.sm,
  },
  backupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backupItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    marginRight: spacing.xs,
  },
  backupItemName: {
    ...typography.subtitle2,
    color: colors.text,
  },
  backupItemMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  downloadTag: {
    ...typography.caption,
    color: colors.primary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  backupItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  smallActionBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  smallActionText: {
    ...typography.caption,
    fontWeight: '700',
  },
  smallIconBtn: {
    padding: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  securityTitle: {
    ...typography.subtitle2,
    color: colors.text,
    fontWeight: '700',
  },
  securityDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text,
  },
  inspectInfoBox: {
    gap: spacing.sm,
  },
  inspectFileName: {
    ...typography.subtitle2,
    color: colors.text,
    fontWeight: '700',
  },
  inspectDate: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  inspectDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  inspectSubTitle: {
    ...typography.subtitle2,
    color: colors.text,
  },
  inspectGrid: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.sm,
    justifyContent: 'space-around',
  },
  inspectGridItem: {
    alignItems: 'center',
  },
  inspectGridNum: {
    ...typography.h2,
    color: colors.primary,
  },
  inspectGridLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ownerText: {
    ...typography.body2,
    color: colors.text,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.warningBg,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  warningText: {
    ...typography.caption,
    color: colors.warning,
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
