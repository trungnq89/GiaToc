import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useSessionStore } from '../../store/sessionStore';
import { saveUserProfile } from '../../db/repositories/userRepository';
import { colors, radius, spacing, typography } from '../../theme';
import { Avatar, AppButton, Icon, ImageCropModal } from '../../components';
import { Gender } from '../../types';
import { persistAvatarImage } from '../../utils/avatarStorage';
import { SafeAreaView } from 'react-native-safe-area-context';

export function OnboardingScreen() {
  const completeOnboarding = useSessionStore(s => s.completeOnboarding);

  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [birthYear, setBirthYear] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  // Avatar cropping state
  const [pendingCropUri, setPendingCropUri] = useState<string | null>(null);
  const [isCropModalVisible, setIsCropModalVisible] = useState(false);

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

  const handleStart = async () => {
    if (!name.trim()) {
      Alert.alert('Vui lòng nhập tên', 'Tên của bạn là điểm mốc để xác định danh xưng và quan hệ họ hàng.');
      return;
    }

    try {
      setSubmitting(true);
      const parsedBirthYear = birthYear ? parseInt(birthYear.trim(), 10) : undefined;
      await saveUserProfile({
        name: name.trim(),
        gender,
        birthYear: isNaN(parsedBirthYear as number) ? undefined : parsedBirthYear,
        avatarUri,
      });

      completeOnboarding({
        name: name.trim(),
        gender,
        birthYear: isNaN(parsedBirthYear as number) ? undefined : parsedBirthYear,
        avatarUri,
      });
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể khởi tạo thông tin.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.heroSection}>
        <View style={styles.heroIconCircle}>
          <Icon name="family-tree" size={54} color={colors.primary} />
        </View>
        <Text style={[typography.h1, styles.heroTitle]}>Gia Tộc</Text>
        <Text style={[typography.body1, styles.heroSubtitle]}>
          Sổ tay họ hàng tối giản: Ghi nhớ gương mặt, cách xưng hô chuẩn xác và tìm kiếm tức thì.
        </Text>
      </View>

      <View style={styles.formCard}>
        <Text style={[typography.subtitle1, styles.sectionTitle]}>
          Xác định danh tính của bạn ("Tôi")
        </Text>
        <Text style={[typography.caption, styles.sectionSubtitle]}>
          Mọi quan hệ họ hàng (Bác, Chú, Cô, Cậu...) sẽ được tính toán xoay quanh bạn.
        </Text>

        <View style={styles.avatarPickerRow}>
          <TouchableOpacity activeOpacity={0.8} onPress={handlePickAvatar} style={styles.avatarWrapper}>
            <Avatar
              uri={avatarUri}
              name={name || 'Tôi'}
              gender={gender}
              size="lg"
            />
            <View style={styles.cameraBadge}>
              <Icon name="camera" size={14} color="#FFF" />
            </View>
          </TouchableOpacity>
          <View style={styles.avatarHelper}>
            <Text style={[typography.subtitle2, styles.avatarPrompt]}>Ảnh chân dung</Text>
            <Text style={[typography.caption, styles.avatarNote]}>
              Chạm để chọn ảnh đại diện của bạn từ máy
            </Text>
          </View>
        </View>

        <Text style={[typography.subtitle2, styles.label]}>Họ và tên bạn *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ví dụ: Nguyễn Quang Trung"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <Text style={[typography.subtitle2, styles.label]}>Giới tính *</Text>
        <View style={styles.genderRow}>
          <TouchableOpacity
            style={[styles.genderButton, gender === 'male' && styles.genderButtonActiveMale]}
            onPress={() => setGender('male')}
            activeOpacity={0.7}>
            <Icon
              name="gender-male"
              size={20}
              color={gender === 'male' ? colors.textInverse : colors.male}
            />
            <Text
              style={[
                typography.subtitle2,
                styles.genderText,
                gender === 'male' && styles.genderTextActive,
              ]}>
              Nam
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.genderButton, gender === 'female' && styles.genderButtonActiveFemale]}
            onPress={() => setGender('female')}
            activeOpacity={0.7}>
            <Icon
              name="gender-female"
              size={20}
              color={gender === 'female' ? colors.textInverse : colors.female}
            />
            <Text
              style={[
                typography.subtitle2,
                styles.genderText,
                gender === 'female' && styles.genderTextActive,
              ]}>
              Nữ
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[typography.subtitle2, styles.label]}>Năm sinh (tùy chọn)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ví dụ: 1995"
          placeholderTextColor={colors.textMuted}
          value={birthYear}
          onChangeText={setBirthYear}
          keyboardType="numeric"
          maxLength={4}
        />

        <View style={styles.privacyNote}>
          <Icon name="shield-check-outline" size={18} color={colors.secondary} />
          <Text style={[typography.caption, styles.privacyText]}>
            Hoàn toàn offline: Dữ liệu chỉ lưu cục bộ trên máy của bạn, không có máy chủ hay đăng nhập.
          </Text>
        </View>

        <AppButton
          title="Bắt đầu sử dụng"
          onPress={handleStart}
          loading={submitting}
          icon="arrow-right"
          size="lg"
          style={styles.submitButton}
        />
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
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  heroSection: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  heroIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroTitle: {
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
  },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  sectionTitle: {
    color: colors.text,
  },
  sectionSubtitle: {
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  avatarPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  avatarWrapper: {
    position: 'relative',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: colors.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  avatarHelper: {
    flex: 1,
  },
  avatarPrompt: {
    color: colors.text,
  },
  avatarNote: {
    color: colors.textMuted,
  },
  label: {
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...typography.body1,
    color: colors.text,
  },
  genderRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    gap: spacing.xs,
  },
  genderButtonActiveMale: {
    backgroundColor: colors.male,
    borderColor: colors.male,
  },
  genderButtonActiveFemale: {
    backgroundColor: colors.female,
    borderColor: colors.female,
  },
  genderText: {
    color: colors.textSecondary,
  },
  genderTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.secondaryLight,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  privacyText: {
    color: colors.secondaryDark,
    flex: 1,
  },
  submitButton: {
    marginTop: spacing.sm,
  },
});
