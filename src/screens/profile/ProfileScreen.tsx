import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useSessionStore } from '../../store/sessionStore';
import { saveUserProfile } from '../../db/repositories/userRepository';
import { getFamilyStats, FamilyStats, createPerson } from '../../db/repositories/personRepository';
import { linkRelatives } from '../../db/repositories/relationshipRepository';
import { execute } from '../../db/database';
import { colors, radius, spacing, typography } from '../../theme';
import { Avatar, AppButton, Icon, useToast } from '../../components';
import { persistAvatarImage } from '../../utils/avatarStorage';
import { Gender } from '../../types';

export function ProfileScreen() {
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

  useEffect(() => {
    getFamilyStats().then(setStats).catch(console.warn);
  }, []);

  const handlePickAvatar = async () => {
    try {
      const res = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 800,
        maxHeight: 800,
      });

      if (res.assets && res.assets.length > 0 && res.assets[0].uri) {
        const localUri = await persistAvatarImage(res.assets[0].uri);
        setAvatarUri(localUri);
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
      'Nạp dữ liệu mẫu?',
      'Hệ thống sẽ thêm một gia phả mẫu (Ông bà nội ngoại, Bố mẹ, Bác Cả, Chú Ba, Dì Út, Anh chị em họ...) để bạn trải nghiệm ngay tính năng suy diễn và tìm kiếm.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Nạp mẫu ngay',
          onPress: async () => {
            try {
              // 1. Ông nội
              const ongNoi = await createPerson({
                name: 'Nguyễn Văn An',
                nickname: 'Cụ Trưởng',
                gender: 'male',
                branch: 'noi',
                customRelationToMe: 'Ông nội',
                inferredRelationToMe: 'Ông nội',
                generation: 2,
                isDeceased: true,
                deathDateLunar: '15/07 Âm lịch',
                address: 'Hà Tây cũ',
              });

              // 2. Bà nội
              const baNoi = await createPerson({
                name: 'Trần Thị Mùi',
                gender: 'female',
                branch: 'noi',
                customRelationToMe: 'Bà nội',
                inferredRelationToMe: 'Bà nội',
                generation: 2,
                isDeceased: false,
                birthYear: 1940,
                address: 'Hà Nội',
              });
              await linkRelatives(ongNoi.id, baNoi.id, 'spouse');

              // 3. Bố
              const bo = await createPerson({
                name: 'Nguyễn Văn Bình',
                nickname: 'Bố Bình',
                gender: 'male',
                branch: 'noi',
                customRelationToMe: 'Bố ruột',
                inferredRelationToMe: 'Bố',
                generation: 1,
                isDeceased: false,
                birthYear: 1968,
                phone: '0912345678',
                address: 'Cầu Giấy, Hà Nội',
              });
              await linkRelatives(ongNoi.id, bo.id, 'parent');
              await linkRelatives(baNoi.id, bo.id, 'parent');

              // 4. Bác Cả (Anh trai của Bố)
              const bacCa = await createPerson({
                name: 'Nguyễn Văn Cường',
                nickname: 'Bác Cả',
                gender: 'male',
                branch: 'noi',
                customRelationToMe: 'Bác Cả',
                inferredRelationToMe: 'Bác trai (Anh của Bố)',
                generation: 1,
                isDeceased: false,
                birthYear: 1962,
                phone: '0988776655',
                notes: 'Trưởng tộc họ Nguyễn, am hiểu gia phả.',
              });
              await linkRelatives(ongNoi.id, bacCa.id, 'parent');
              await linkRelatives(bo.id, bacCa.id, 'sibling');

              // 5. Mẹ
              const me = await createPerson({
                name: 'Lê Thị Dung',
                gender: 'female',
                branch: 'ngoai',
                customRelationToMe: 'Mẹ ruột',
                inferredRelationToMe: 'Mẹ',
                generation: 1,
                isDeceased: false,
                birthYear: 1970,
                phone: '0903456789',
              });
              await linkRelatives(bo.id, me.id, 'spouse');

              // 6. Dì Út (Em gái của Mẹ)
              const diUt = await createPerson({
                name: 'Lê Thị Mai',
                nickname: 'Dì Út',
                gender: 'female',
                branch: 'ngoai',
                customRelationToMe: 'Dì Út',
                inferredRelationToMe: 'Dì (Em gái của Mẹ)',
                generation: 1,
                isDeceased: false,
                birthYear: 1978,
                address: 'Đà Nẵng',
              });
              await linkRelatives(me.id, diUt.id, 'sibling');

              // 7. Anh họ (Con của Bác Cả)
              const anhHo = await createPerson({
                name: 'Nguyễn Quang Minh',
                nickname: 'Minh Xoăn',
                gender: 'male',
                branch: 'noi',
                customRelationToMe: 'Anh họ',
                inferredRelationToMe: 'Anh họ (Con của Bác Cả)',
                generation: 0,
                isDeceased: false,
                birthYear: 1990,
                phone: '0977112233',
                notes: 'Làm kỹ sư công nghệ, hay về quê dịp Tết.',
              });
              await linkRelatives(bacCa.id, anhHo.id, 'parent');

              const newStats = await getFamilyStats();
              setStats(newStats);
              toast.show('Đã nạp 7 người thân mẫu thành công!', 'success');
            } catch (err) {
              console.error(err);
              Alert.alert('Lỗi', 'Không thể nạp dữ liệu mẫu.');
            }
          },
        },
      ]);
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

        <TouchableOpacity style={styles.settingRow} onPress={handleSeedSampleData} activeOpacity={0.7}>
          <View style={[styles.settingIcon, { backgroundColor: colors.primarySoft }]}>
            <Icon name="database-plus-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.settingText}>
            <Text style={[typography.subtitle2, styles.settingTitle]}>Nạp dữ liệu họ hàng mẫu</Text>
            <Text style={[typography.caption, styles.settingDesc]}>
              Tạo nhanh mẫu gia phả 3 thế hệ để trải nghiệm thử
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
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
