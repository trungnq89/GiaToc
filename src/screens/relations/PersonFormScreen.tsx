import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { launchImageLibrary } from 'react-native-image-picker';
import { RootStackParamList } from '../../navigation/types';
import { createPerson, updatePerson, getPersonById, listPersons } from '../../db/repositories/personRepository';
import { getDirectRelatives, linkRelatives, removeRelationship } from '../../db/repositories/relationshipRepository';
import { Gender, FamilyBranch, PersonSummary } from '../../types';
import { colors, radius, spacing, typography } from '../../theme';
import { Avatar, ScreenHeader, AppButton, Icon, useToast, RelationPickerModal } from '../../components';
import { KINSHIP_PRESETS, RelationPreset, getBranchLabel } from '../../utils/kinshipCalculator';
import { persistAvatarImage } from '../../utils/avatarStorage';
import { SafeAreaView } from 'react-native-safe-area-context';

type ScreenRouteProp = RouteProp<RootStackParamList, 'PersonForm'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function PersonFormScreen() {
  const route = useRoute<ScreenRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const toast = useToast();

  const { personId, defaultBranch } = route.params || {};
  const isEditing = Boolean(personId);

  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [branch, setBranch] = useState<FamilyBranch>(defaultBranch || 'noi');
  const [avatarUri, setAvatarUri] = useState<string | undefined>(undefined);
  const [customRelation, setCustomRelation] = useState('');
  const [inferredRelation, setInferredRelation] = useState('');
  const [howTheyCallMe, setHowTheyCallMe] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [generation, setGeneration] = useState(0);
  const [isDeceased, setIsDeceased] = useState(false);
  const [deathDateLunar, setDeathDateLunar] = useState('');

  // Parent & Spouse relationship linking
  const [selectedParent, setSelectedParent] = useState<PersonSummary | null>(null);
  const [selectedSpouse, setSelectedSpouse] = useState<PersonSummary | null>(null);
  const [initialParentId, setInitialParentId] = useState<string | undefined>(undefined);
  const [initialSpouseId, setInitialSpouseId] = useState<string | undefined>(undefined);
  const [showParentModal, setShowParentModal] = useState(false);
  const [showSpouseModal, setShowSpouseModal] = useState(false);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (personId) {
      getPersonById(personId).then(p => {
        if (p) {
          setName(p.name);
          setNickname(p.nickname || '');
          setGender(p.gender);
          setBranch(p.branch);
          setAvatarUri(p.avatarUri);
          setCustomRelation(p.customRelationToMe || '');
          setInferredRelation(p.inferredRelationToMe || '');
          setHowTheyCallMe(p.howTheyCallMe || '');
          setBirthYear(p.birthYear ? String(p.birthYear) : '');
          setPhone(p.phone || '');
          setAddress(p.address || '');
          setNotes(p.notes || '');
          setGeneration(p.generation);
          setIsDeceased(p.isDeceased);
          setDeathDateLunar(p.deathDateLunar || '');
        }
      });

      // Load existing direct relatives
      getDirectRelatives(personId).then(rels => {
        if (rels.parents.length > 0) {
          setSelectedParent(rels.parents[0]);
          setInitialParentId(rels.parents[0].id);
        }
        if (rels.spouses.length > 0) {
          setSelectedSpouse(rels.spouses[0]);
          setInitialSpouseId(rels.spouses[0].id);
        }
      });
    }
  }, [personId]);

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
      console.warn('Pick avatar failed:', e);
    }
  };

  const handleSelectPreset = (preset: RelationPreset) => {
    setCustomRelation(preset.shortTitle);
    setInferredRelation(preset.title);
    setHowTheyCallMe(preset.howTheyCallMe);
    setGender(preset.gender);
    setBranch(preset.branch);
    setGeneration(preset.generation);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Vui lòng nhập tên', 'Họ và tên của người thân là bắt buộc.');
      return;
    }

    try {
      setSaving(true);
      const parsedBirthYear = birthYear ? parseInt(birthYear.trim(), 10) : undefined;

      const personPayload = {
        name: name.trim(),
        nickname: nickname.trim() || undefined,
        gender,
        branch,
        avatarUri,
        customRelationToMe: customRelation.trim() || undefined,
        inferredRelationToMe: inferredRelation.trim() || undefined,
        howTheyCallMe: howTheyCallMe.trim() || undefined,
        birthYear: isNaN(parsedBirthYear as number) ? undefined : parsedBirthYear,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
        generation,
        isDeceased,
        deathDateLunar: isDeceased ? deathDateLunar.trim() || undefined : undefined,
      };

      if (isEditing && personId) {
        await updatePerson(personId, personPayload);

        // Update Parent relationship if changed
        const currentParentId = selectedParent?.id;
        if (currentParentId !== initialParentId) {
          if (initialParentId) {
            await removeRelationship(personId, initialParentId);
          }
          if (currentParentId) {
            // personId is child of currentParentId
            await linkRelatives(personId, currentParentId, 'parent');
          }
        }

        // Update Spouse relationship if changed
        const currentSpouseId = selectedSpouse?.id;
        if (currentSpouseId !== initialSpouseId) {
          if (initialSpouseId) {
            await removeRelationship(personId, initialSpouseId);
          }
          if (currentSpouseId) {
            await linkRelatives(personId, currentSpouseId, 'spouse');
          }
        }

        toast.show('Đã cập nhật thông tin người thân', 'success');
      } else {
        const created = await createPerson(personPayload);

        // Link with selected Parent (created.id is child of selectedParent.id)
        if (selectedParent?.id) {
          await linkRelatives(created.id, selectedParent.id, 'parent');
        }

        // Link with selected Spouse
        if (selectedSpouse?.id) {
          await linkRelatives(created.id, selectedSpouse.id, 'spouse');
        }

        toast.show('Đã thêm người thân mới', 'success');
      }

      navigation.goBack();
    } catch (e) {
      console.error('Save person error:', e);
      Alert.alert('Lỗi', 'Không thể lưu thông tin người thân.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title={isEditing ? 'Sửa Người Thân' : 'Thêm Người Thân'}
        canGoBack
        onGoBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Avatar Picker */}
        <View style={styles.avatarSection}>
          <TouchableOpacity activeOpacity={0.8} onPress={handlePickAvatar} style={styles.avatarBtn}>
            <Avatar
              uri={avatarUri}
              name={name || '?'}
              gender={gender}
              branch={branch}
              size="xl"
              isDeceased={isDeceased}
            />
            <View style={styles.cameraIconBadge}>
              <Icon name="camera" size={16} color="#FFF" />
            </View>
          </TouchableOpacity>
          <Text style={[typography.caption, styles.avatarTip]}>
            Chạm để chọn hoặc chụp ảnh khuôn mặt
          </Text>
        </View>

        {/* Basic Info */}
        <View style={styles.card}>
          <Text style={[typography.subtitle1, styles.cardTitle]}>Thông Tin Cơ Bản</Text>

          <Text style={[typography.subtitle2, styles.label]}>Họ và tên *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ví dụ: Nguyễn Văn Hùng"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          <Text style={[typography.subtitle2, styles.label]}>Tên thường gọi / Biệt danh ở nhà</Text>
          <TextInput
            style={styles.input}
            placeholder="Ví dụ: Bác Cả, Chú Ba, Bé Bắp..."
            placeholderTextColor={colors.textMuted}
            value={nickname}
            onChangeText={setNickname}
          />

          <Text style={[typography.subtitle2, styles.label]}>Giới tính *</Text>
          <View style={styles.genderRow}>
            <TouchableOpacity
              style={[styles.genderBtn, gender === 'male' && styles.genderBtnActiveMale]}
              onPress={() => setGender('male')}>
              <Icon
                name="gender-male"
                size={18}
                color={gender === 'male' ? colors.textInverse : colors.male}
              />
              <Text
                style={[styles.genderText, gender === 'male' && styles.genderTextActive]}>
                Nam
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.genderBtn, gender === 'female' && styles.genderBtnActiveFemale]}
              onPress={() => setGender('female')}>
              <Icon
                name="gender-female"
                size={18}
                color={gender === 'female' ? colors.textInverse : colors.female}
              />
              <Text
                style={[styles.genderText, gender === 'female' && styles.genderTextActive]}>
                Nữ
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[typography.subtitle2, styles.label]}>Nhánh họ *</Text>
          <View style={styles.branchRow}>
            {(['noi', 'ngoai', 'vo_chong', 'khac'] as FamilyBranch[]).map(b => {
              const isSelected = branch === b;
              const title =
                b === 'noi'
                  ? 'Bên Nội'
                  : b === 'ngoai'
                  ? 'Bên Ngoại'
                  : b === 'vo_chong'
                  ? 'Bên Vợ/Chồng'
                  : 'Khác';
              return (
                <TouchableOpacity
                  key={b}
                  style={[styles.branchBtn, isSelected && styles.branchBtnActive]}
                  onPress={() => setBranch(b)}>
                  <Text
                    style={[
                      styles.branchText,
                      isSelected && styles.branchTextActive,
                    ]}>
                    {title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Quan hệ & Xưng hô với Tôi */}
        <View style={styles.card}>
          <Text style={[typography.subtitle1, styles.cardTitle]}>
            Mối Quan Hệ & Cách Xưng Hô
          </Text>

          <Text style={[typography.caption, styles.presetSubtitle]}>
            Chọn nhanh quan hệ phổ biến:
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
            {KINSHIP_PRESETS.map(preset => (
              <TouchableOpacity
                key={preset.id}
                style={[
                  styles.presetChip,
                  customRelation === preset.shortTitle && styles.presetChipActive,
                ]}
                onPress={() => handleSelectPreset(preset)}>
                <Text
                  style={[
                    styles.presetChipText,
                    customRelation === preset.shortTitle && styles.presetChipTextActive,
                  ]}>
                  {preset.shortTitle}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[typography.subtitle2, styles.label]}>
            Tôi gọi người này là:
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Ví dụ: Bác Cả, Chú Ba, Dì Út..."
            placeholderTextColor={colors.textMuted}
            value={customRelation}
            onChangeText={setCustomRelation}
          />

          <Text style={[typography.subtitle2, styles.label]}>
            Người này gọi Tôi là:
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Ví dụ: Cháu, Em, Con..."
            placeholderTextColor={colors.textMuted}
            value={howTheyCallMe}
            onChangeText={setHowTheyCallMe}
          />

          <Text style={[typography.subtitle2, styles.label]}>
            Bậc thế hệ so với Tôi:
          </Text>
          <View style={styles.genRow}>
            {[
              { val: 2, label: 'Ông Bà (+2)' },
              { val: 1, label: 'Cha Chú (+1)' },
              { val: 0, label: 'Cùng thế hệ (0)' },
              { val: -1, label: 'Con Cháu (-1)' },
            ].map(g => (
              <TouchableOpacity
                key={g.val}
                style={[styles.genBtn, generation === g.val && styles.genBtnActive]}
                onPress={() => setGeneration(g.val)}>
                <Text style={[styles.genText, generation === g.val && styles.genTextActive]}>
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Liên kết gia phả trực hệ */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Icon name="family-tree" size={22} color={colors.primary} />
            <Text style={[typography.subtitle1, styles.cardTitleWithIcon]}>
              Liên Kết Gia Phả
            </Text>
          </View>

          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.md }]}>
            Gắn kết người thân với Cha/Mẹ và Vợ/Chồng để hệ thống tự động vẽ cây gia phả chuẩn xác.
          </Text>

          {/* 1. Chọn Cha/Mẹ */}
          <Text style={[typography.subtitle2, styles.relationSubHeader]}>
            1. Là con của ai? (Cha / Mẹ)
          </Text>

          {selectedParent ? (
            <View style={styles.linkedRelationCard}>
              <Avatar
                uri={selectedParent.avatarUri}
                name={selectedParent.name}
                gender={selectedParent.gender}
                size="md"
                isDeceased={selectedParent.isDeceased}
              />
              <View style={styles.linkedInfo}>
                <Text style={styles.linkedName}>{selectedParent.name}</Text>
                <Text style={styles.linkedDetail}>
                  {selectedParent.customRelationToMe || selectedParent.inferredRelationToMe || 'Bậc trên'}
                  {selectedParent.birthYear ? ` • Sinh ${selectedParent.birthYear}` : ''} • {getBranchLabel(selectedParent.branch)}
                </Text>
              </View>

              <View style={styles.linkedActions}>
                <TouchableOpacity
                  style={styles.changeRelBtn}
                  onPress={() => setShowParentModal(true)}>
                  <Icon name="pencil" size={14} color={colors.primary} />
                  <Text style={styles.changeRelText}>Đổi</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.removeRelBtn}
                  onPress={() => setSelectedParent(null)}>
                  <Icon name="close" size={16} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.selectRelButton}
              activeOpacity={0.7}
              onPress={() => setShowParentModal(true)}>
              <View style={styles.selectRelIconWrap}>
                <Icon name="account-child-circle" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectRelButtonTitle}>+ Chọn Cha hoặc Mẹ</Text>
                <Text style={styles.selectRelButtonSub}>
                  Tìm kiếm theo tên người thân trong họ
                </Text>
              </View>
              <Icon name="magnify" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}

          {/* 2. Xác định quan hệ Vợ / Chồng */}
          <Text style={[typography.subtitle2, styles.relationSubHeader, { marginTop: spacing.lg }]}>
            2. Quan hệ Vợ / Chồng
          </Text>

          {selectedSpouse ? (
            <View style={styles.linkedRelationCard}>
              <Avatar
                uri={selectedSpouse.avatarUri}
                name={selectedSpouse.name}
                gender={selectedSpouse.gender}
                size="md"
                isDeceased={selectedSpouse.isDeceased}
              />
              <View style={styles.linkedInfo}>
                <Text style={styles.linkedName}>{selectedSpouse.name}</Text>
                <Text style={styles.linkedDetail}>
                  {selectedSpouse.customRelationToMe || selectedSpouse.inferredRelationToMe || 'Người phối ngẫu'}
                  {selectedSpouse.birthYear ? ` • Sinh ${selectedSpouse.birthYear}` : ''} • {getBranchLabel(selectedSpouse.branch)}
                </Text>
              </View>

              <View style={styles.linkedActions}>
                <TouchableOpacity
                  style={styles.changeRelBtn}
                  onPress={() => setShowSpouseModal(true)}>
                  <Icon name="pencil" size={14} color={colors.primary} />
                  <Text style={styles.changeRelText}>Đổi</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.removeRelBtn}
                  onPress={() => setSelectedSpouse(null)}>
                  <Icon name="close" size={16} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.selectRelButton}
              activeOpacity={0.7}
              onPress={() => setShowSpouseModal(true)}>
              <View style={[styles.selectRelIconWrap, { backgroundColor: '#FDF2F8' }]}>
                <Icon name="ring" size={20} color="#DB2777" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.selectRelButtonTitle, { color: '#BE185D' }]}>
                  + Xác định Vợ hoặc Chồng
                </Text>
                <Text style={styles.selectRelButtonSub}>
                  Tìm kiếm theo tên người phối ngẫu
                </Text>
              </View>
              <Icon name="magnify" size={20} color="#DB2777" />
            </TouchableOpacity>
          )}
        </View>

        {/* Tình trạng & Thông tin chi tiết */}
        <View style={styles.card}>
          <Text style={[typography.subtitle1, styles.cardTitle]}>Chi Tiết Thêm</Text>

          <View style={styles.switchRow}>
            <View>
              <Text style={[typography.subtitle2, { color: colors.text }]}>Đã mất?</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                Bật nếu người này đã khuất để ghi nhận ngày giỗ
              </Text>
            </View>
            <Switch
              value={isDeceased}
              onValueChange={setIsDeceased}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          {isDeceased && (
            <View style={styles.deathDateBlock}>
              <Text style={[typography.subtitle2, styles.label]}>
                Ngày giỗ âm lịch
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Ví dụ: 15 tháng 7 Âm lịch (hoặc 15/07 AL)"
                placeholderTextColor={colors.textMuted}
                value={deathDateLunar}
                onChangeText={setDeathDateLunar}
              />
            </View>
          )}

          <Text style={[typography.subtitle2, styles.label]}>Năm sinh</Text>
          <TextInput
            style={styles.input}
            placeholder="Ví dụ: 1968"
            placeholderTextColor={colors.textMuted}
            value={birthYear}
            onChangeText={setBirthYear}
            keyboardType="numeric"
            maxLength={4}
          />

          <Text style={[typography.subtitle2, styles.label]}>Số điện thoại</Text>
          <TextInput
            style={styles.input}
            placeholder="Ví dụ: 0912 345 678"
            placeholderTextColor={colors.textMuted}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <Text style={[typography.subtitle2, styles.label]}>Quê quán / Địa chỉ nơi ở</Text>
          <TextInput
            style={styles.input}
            placeholder="Ví dụ: Quê Nam Định, hiện ở Cầu Giấy"
            placeholderTextColor={colors.textMuted}
            value={address}
            onChangeText={setAddress}
          />

          <Text style={[typography.subtitle2, styles.label]}>Ghi chú & Đặc điểm nhớ</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Sở thích, tính cách, con cái, nghề nghiệp, kỷ niệm đáng nhớ..."
            placeholderTextColor={colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        <AppButton
          title={isEditing ? 'Lưu thay đổi' : 'Hoàn tất thêm người thân'}
          onPress={handleSave}
          loading={saving}
          icon="check"
          size="lg"
          style={styles.saveBtn}
        />
      </ScrollView>

      {/* Modal chọn Cha/Mẹ */}
      <RelationPickerModal
        visible={showParentModal}
        title="Chọn Cha hoặc Mẹ"
        subtitle="Tìm kiếm theo tên người thân trong họ hàng"
        relationType="parent"
        currentSelectedId={selectedParent?.id}
        excludePersonIds={personId ? [personId] : []}
        onSelect={p => setSelectedParent(p)}
        onClear={() => setSelectedParent(null)}
        onClose={() => setShowParentModal(false)}
      />

      {/* Modal chọn Vợ/Chồng */}
      <RelationPickerModal
        visible={showSpouseModal}
        title="Xác Định Quan Hệ Vợ / Chồng"
        subtitle="Tìm kiếm theo tên người phối ngẫu"
        relationType="spouse"
        currentSelectedId={selectedSpouse?.id}
        excludePersonIds={personId ? [personId] : []}
        onSelect={p => setSelectedSpouse(p)}
        onClear={() => setSelectedSpouse(null)}
        onClose={() => setShowSpouseModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  avatarBtn: {
    position: 'relative',
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  avatarTip: {
    color: colors.textMuted,
    marginTop: spacing.xs,
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
    marginBottom: spacing.xs,
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    ...typography.body1,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  genderRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  genderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    gap: spacing.xs,
  },
  genderBtnActiveMale: {
    backgroundColor: colors.male,
    borderColor: colors.male,
  },
  genderBtnActiveFemale: {
    backgroundColor: colors.female,
    borderColor: colors.female,
  },
  genderText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  genderTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  branchRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  branchBtn: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  branchBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  branchText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  branchTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  presetSubtitle: {
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  presetScroll: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  presetChip: {
    backgroundColor: colors.background,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  presetChipText: {
    fontSize: 12,
    color: colors.text,
  },
  presetChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  genRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  genBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  genBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  genText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  genTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  cardTitleWithIcon: {
    color: colors.text,
    marginBottom: 0,
    fontWeight: '700',
  },
  relationSubHeader: {
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  linkedRelationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkedInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  linkedName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  linkedDetail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  linkedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  changeRelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
  },
  changeRelText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  removeRelBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectRelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.background,
  },
  selectRelIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectRelButtonTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  selectRelButtonSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  deathDateBlock: {
    marginTop: spacing.xs,
  },
  saveBtn: {
    marginTop: spacing.sm,
  },
});
