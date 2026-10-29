import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { launchImageLibrary } from 'react-native-image-picker';
import { useSessionStore } from '../../store/sessionStore';
import { saveUserProfile } from '../../db/repositories/userRepository';
import { getFamilyStats, FamilyStats } from '../../db/repositories/personRepository';
import { execute } from '../../db/database';
import { seed6GenerationsFamily } from '../../db/seed6Generations';
import { colors, radius, spacing, typography } from '../../theme';
import { Avatar, AppButton, Icon, useToast, ImageCropModal } from '../../components';
import { persistAvatarImage } from '../../utils/avatarStorage';
import { Gender } from '../../types';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const user = useSessionStore(s => s.user);
  const updateProfile = useSessionStore(s => s.updateProfile);
  const resetAllData = useSessionStore(s => s.resetAllData);
  const toast = useToast();

  const [name, setName] = useState(user?.name || '');
  const [birthYear, setBirthYear] = useState(user?.birthYear ? String(user?.birthYear) : '');
  const [avatarUri, setAvatarUri] = useState<string | undefined>(user?.avatarUri);
  const [gender, setGender] = useState<Gender>(user?.gender || 'male');
  const [isEditing, setIsEditing] = useState(false);
  const [stats, setStats] = useState<FamilyStats>({
    total: 0,
    branchNoi: 0,
    branchNgoai: 0,
    branchVoChong: 0,
    deceased: 0,
  });

  // Avatar cropping state
  const [pendingCropUri, setPendingCropUri] = useState<string | null>(null);
  const [isCropModalVisible, setIsCropModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getFamilyStats().then(setStats).catch(console.warn);
    }, []),
  );

  const handlePickAvatar = async () => {
    try {
      const res = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.9,
        maxWidth: 1200,
        maxHeight: 1200,
      });

      if (res.assets && res.assets.length > 0 && res.assets[0].uri) {
        setPendingCropUri(res.assets[0].uri);
        setIsCropModalVisible(true);
      }
    } catch (e) {
      console.warn('Pick avatar error:', e);
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Lỗi', 'Họ tên không được để trống.');
      return;
    }

    const parsedYear = birthYear ? parseInt(birthYear.trim(), 10) : undefined;
    await saveUserProfile({
      name: name.trim(),
      gender,
      birthYear: isNaN(parsedYear as number) ? undefined : parsedYear,
      avatarUri,
    });

    updateProfile({
      name: name.trim(),
      gender,
      birthYear: isNaN(parsedYear as number) ? undefined : parsedYear,
      avatarUri,
    });

    setIsEditing(false);
    toast.show('Đã cập nhật danh tính của bạn', 'success');
  };

  const handleSeedSampleData = () => {
    Alert.alert(
      'Nạp gia phả 6 đời mẫu?',
      'Hệ thống sẽ nạp dữ liệu một dòng họ lớn gồm 6 thế hệ (từ Cụ Khởi tổ Cao Tổ, Tằng Tổ, Ông Bà, Cha Chú, Thế hệ của Bạn, và 2 con nhỏ đời mới nhất) với đầy đủ ngày giỗ, liên kết gia tộc.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Nạp mẫu ngay',
          onPress: async () => {
            try {
              const res = await seed6GenerationsFamily();
              const newStats = await getFamilyStats();
              setStats(newStats);
              toast.show(`Đã nạp thành công gia phả 6 đời (${res.totalCount} người thân)!`, 'success');
            } catch (err) {
              console.error(err);
              Alert.alert('Lỗi', 'Không thể nạp dữ liệu mẫu.');
            }
          },
        },
      ],
    );
  };

  const handleResetData = () => {
    Alert.alert(
      'Đặt lại toàn bộ ứng dụng?',
      'Tất cả danh bạ họ hàng, ngày giỗ và thông tin cá nhân sẽ bị xóa hoàn toàn khỏi máy.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa toàn bộ',
          style: 'destructive',
          onPress: async () => {
            await execute('DELETE FROM user_profile;');
            await execute('DELETE FROM persons;');
            await execute('DELETE FROM relationships;');
            await execute('DELETE FROM memorial_events;');
            resetAllData();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Identity Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={isEditing ? handlePickAvatar : undefined}
            style={styles.avatarWrapper}>
            <Avatar
              uri={avatarUri}
              name={name || 'Tôi'}
              gender={gender}
              size="xl"
            />
            {isEditing && (
              <View style={styles.cameraBadge}>
                <Icon name="camera" size={16} color="#FFF" />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.profileInfo}>
            <Text style={[typography.h2, styles.profileName]}>{user?.name}</Text>
            <View style={styles.roleTag}>
              <Icon name="account-check" size={14} color={colors.primary} />
              <Text style={styles.roleTagText}>Danh tính chủ máy ("Tôi")</Text>
            </View>
            {user?.birthYear ? (
              <Text style={[typography.caption, styles.birthYearText]}>
                Năm sinh: {user.birthYear}
              </Text>
            ) : null}
          </View>
        </View>

        {isEditing ? (
          <View style={styles.editSection}>
            <Text style={[typography.subtitle2, styles.label]}>Họ và tên</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Nhập họ và tên"
            />

            <Text style={[typography.subtitle2, styles.label]}>Năm sinh</Text>
            <TextInput
              style={styles.input}
              value={birthYear}
              onChangeText={setBirthYear}
              keyboardType="numeric"
              placeholder="Ví dụ: 1995"
            />

            <View style={styles.editActions}>
              <AppButton
                title="Hủy"
                variant="ghost"
                onPress={() => setIsEditing(false)}
                style={styles.actionBtn}
              />
              <AppButton
                title="Lưu thay đổi"
                variant="primary"
                onPress={handleSaveProfile}
                style={styles.actionBtn}
              />
            </View>
          </View>
        ) : (
          <AppButton
            title="Sửa thông tin của tôi"
            variant="outline"
            icon="account-edit-outline"
            size="sm"
            onPress={() => setIsEditing(true)}
            style={styles.editButton}
          />
        )}
      </View>

      {/* Statistics Card */}
      <View style={styles.card}>
        <Text style={[typography.subtitle1, styles.cardTitle]}>Thống Kê Dòng Họ</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={[typography.h1, { color: colors.primary }]}>{stats.total}</Text>
            <Text style={[typography.caption, styles.statLabel]}>Tổng người thân</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={[typography.h1, { color: colors.branchNoi }]}>{stats.branchNoi}</Text>
            <Text style={[typography.caption, styles.statLabel]}>Bên Nội</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={[typography.h1, { color: colors.branchNgoai }]}>{stats.branchNgoai}</Text>
            <Text style={[typography.caption, styles.statLabel]}>Bên Ngoại</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={[typography.h1, { color: colors.branchVoChong }]}>{stats.branchVoChong}</Text>
            <Text style={[typography.caption, styles.statLabel]}>Bên Vợ/Chồng</Text>
          </View>
        </View>
      </View>

      {/* Quick Tools */}
      <View style={styles.card}>
        <Text style={[typography.subtitle1, styles.cardTitle]}>Tiện Ích & Dữ Liệu</Text>

        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => navigation.navigate('TreeExport', {})}
          activeOpacity={0.7}>
          <View style={[styles.settingIcon, { backgroundColor: colors.primarySoft }]}>
            <Icon name="file-image-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.settingText}>
            <Text style={[typography.subtitle2, styles.settingTitle]}>Xuất cây gia phả (Dạng ảnh)</Text>
            <Text style={[typography.caption, styles.settingDesc]}>
              Tạo poster cây gia tộc nghệ thuật để lưu vào máy hoặc chia sẻ
            </Text>
          </View>
          <Icon name="chevron-right" size={20} color={colors.border} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => navigation.navigate('BackupRestore')}
          activeOpacity={0.7}>
          <View style={[styles.settingIcon, { backgroundColor: colors.secondaryLight }]}>
            <Icon name="archive-sync-outline" size={20} color={colors.secondary} />
          </View>
          <View style={styles.settingText}>
            <Text style={[typography.subtitle2, styles.settingTitle]}>Sao lưu & Phục hồi (File ZIP)</Text>
            <Text style={[typography.caption, styles.settingDesc]}>
              Đóng gói toàn bộ gia phả & ảnh vào file zip hoặc khôi phục dữ liệu
            </Text>
          </View>
          <Icon name="chevron-right" size={20} color={colors.border} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingRow} onPress={handleSeedSampleData} activeOpacity={0.7}>
          <View style={[styles.settingIcon, { backgroundColor: colors.primarySoft }]}>
            <Icon name="database-plus-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.settingText}>
            <Text style={[typography.subtitle2, styles.settingTitle]}>Nạp gia phả 6 đời mẫu</Text>
            <Text style={[typography.caption, styles.settingDesc]}>
              Quy mô 6 thế hệ (các đời trước 4-7 con, đời gần nhất 2 con)
            </Text>
          </View>
          <Icon name="chevron-right" size={20} color={colors.border} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingRow} onPress={handleResetData} activeOpacity={0.7}>
          <View style={[styles.settingIcon, { backgroundColor: colors.dangerBg }]}>
            <Icon name="trash-can-outline" size={20} color={colors.danger} />
          </View>
          <View style={styles.settingText}>
            <Text style={[typography.subtitle2, { color: colors.danger }]}>Đặt lại ứng dụng</Text>
            <Text style={[typography.caption, styles.settingDesc]}>
              Xóa sạch dữ liệu trên máy và bắt đầu lại từ đầu
            </Text>
          </View>
          <Icon name="chevron-right" size={20} color={colors.border} />
        </TouchableOpacity>
      </View>

      {/* Privacy safe badge */}
      <View style={styles.privacyBox}>
        <Icon name="shield-lock" size={24} color={colors.secondary} />
        <View style={styles.privacyTextBox}>
          <Text style={[typography.subtitle2, { color: colors.secondaryDark }]}>
            Cam kết an toàn tuyệt đối
          </Text>
          <Text style={[typography.caption, { color: colors.secondaryDark }]}>
            Ứng dụng hoạt động 100% độc lập không cần internet hay máy chủ. Mọi dữ liệu hình ảnh, tên tuổi người thân của bạn chỉ lưu trong bộ nhớ máy của bạn.
          </Text>
        </View>
      </View>
      </ScrollView>

      {/* Modal Cắt ảnh đại diện */}
      <ImageCropModal
        visible={isCropModalVisible}
        imageUri={pendingCropUri}
        onClose={() => setIsCropModalVisible(false)}
        onCropDone={async croppedUri => {
          const localUri = await persistAvatarImage(croppedUri);
          setAvatarUri(localUri);
        }}
      />
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
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl + 16,
    gap: spacing.lg,
  },
  profileCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  avatarWrapper: {
    position: 'relative',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: colors.primary,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: colors.text,
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    marginTop: 4,
    gap: 4,
  },
  roleTagText: {
    fontSize: 11,
    color: colors.primaryDark,
    fontWeight: '700',
  },
  birthYearText: {
    color: colors.textSecondary,
    marginTop: 4,
  },
  editButton: {
    marginTop: spacing.lg,
  },
  editSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  label: {
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    ...typography.body1,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionBtn: {
    minWidth: 100,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    color: colors.text,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    gap: spacing.md,
  },
  settingIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    color: colors.text,
  },
  settingDesc: {
    color: colors.textMuted,
    marginTop: 2,
  },
  privacyBox: {
    flexDirection: 'row',
    backgroundColor: colors.secondaryLight,
    padding: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  privacyTextBox: {
    flex: 1,
  },
});
