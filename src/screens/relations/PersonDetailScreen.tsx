import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { getPersonById, deletePerson } from '../../db/repositories/personRepository';
import { getDirectRelatives, linkRelatives, removeRelationship } from '../../db/repositories/relationshipRepository';
import { Person, PersonSummary } from '../../types';
import { colors, radius, spacing, typography } from '../../theme';
import { Avatar, ScreenHeader, Icon, useToast, RelationPickerModal } from '../../components';
import { getBranchLabel } from '../../utils/kinshipCalculator';
import { parseLunarDateString, calculateAnniversaryCountdown } from '../../utils/lunarCalendar';
import { SafeAreaView } from 'react-native-safe-area-context';

type ScreenRouteProp = RouteProp<RootStackParamList, 'PersonDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function PersonDetailScreen() {
  const route = useRoute<ScreenRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const toast = useToast();
  const { personId } = route.params;

  const [person, setPerson] = useState<Person | null>(null);
  const [relatives, setRelatives] = useState<{
    parents: Person[];
    spouses: Person[];
    children: Person[];
    siblings: Person[];
  }>({ parents: [], spouses: [], children: [], siblings: [] });

  const [showSpouseModal, setShowSpouseModal] = useState(false);
  const [showParentModal, setShowParentModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const p = await getPersonById(personId);
      if (p) {
        setPerson(p);
        const rels = await getDirectRelatives(personId);
        setRelatives(rels);
      }
    } catch (e) {
      console.warn('Load person detail error:', e);
    }
  }, [personId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = () => {
    if (!person) return;
    Alert.alert(
      'Xóa người thân',
      `Bạn có chắc chắn muốn xóa "${person.name}" khỏi danh bạ họ hàng?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            await deletePerson(person.id);
            toast.show('Đã xóa người thân', 'info');
            navigation.goBack();
          },
        },
      ],
    );
  };

  const handleCall = () => {
    if (person?.phone) {
      Linking.openURL(`tel:${person.phone}`);
    }
  };

  const handleSMS = () => {
    if (person?.phone) {
      Linking.openURL(`sms:${person.phone}`);
    }
  };

  const handleSelectSpouse = async (selected: PersonSummary) => {
    if (!person) return;
    try {
      await linkRelatives(person.id, selected.id, 'spouse');
      await loadData();
      toast.show(`Đã gắn kết quan hệ vợ/chồng với ${selected.name}`, 'success');
    } catch (e) {
      console.warn('Link spouse error:', e);
      Alert.alert('Lỗi', 'Không thể gắn kết quan hệ vợ/chồng.');
    }
  };

  const handleClearSpouse = () => {
    if (!person || relatives.spouses.length === 0) return;
    Alert.alert(
      'Gỡ bỏ quan hệ vợ/chồng',
      'Bạn có chắc chắn muốn gỡ bỏ liên kết vợ/chồng của người này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Gỡ bỏ',
          style: 'destructive',
          onPress: async () => {
            for (const sp of relatives.spouses) {
              await removeRelationship(person.id, sp.id);
            }
            await loadData();
            setShowSpouseModal(false);
            toast.show('Đã gỡ liên kết vợ/chồng', 'info');
          },
        },
      ],
    );
  };

  const handleSelectParent = async (selected: PersonSummary) => {
    if (!person) return;
    try {
      // person.id is child of selected.id
      await linkRelatives(person.id, selected.id, 'parent');
      await loadData();
      toast.show(`Đã liên kết cha/mẹ: ${selected.name}`, 'success');
    } catch (e) {
      console.warn('Link parent error:', e);
      Alert.alert('Lỗi', 'Không thể liên kết cha/mẹ.');
    }
  };

  const handleClearParent = () => {
    if (!person || relatives.parents.length === 0) return;
    Alert.alert(
      'Gỡ bỏ quan hệ cha/mẹ',
      'Bạn có chắc chắn muốn gỡ bỏ liên kết cha/mẹ của người này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Gỡ bỏ',
          style: 'destructive',
          onPress: async () => {
            for (const p of relatives.parents) {
              await removeRelationship(person.id, p.id);
            }
            await loadData();
            setShowParentModal(false);
            toast.show('Đã gỡ liên kết cha/mẹ', 'info');
          },
        },
      ],
    );
  };

  if (!person) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={typography.body1}>Đang tải...</Text>
      </View>
    );
  }

  const relationToMe = person.customRelationToMe || person.inferredRelationToMe || 'Họ hàng';
  const howTheyCallMe = person.howTheyCallMe || 'Tôi';
  const branchLabel = getBranchLabel(person.branch);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title={person.name}
        canGoBack
        onGoBack={() => navigation.goBack()}
        rightAction={{
          icon: 'pencil-outline',
          onPress: () => navigation.navigate('PersonForm', { personId: person.id }),
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <Avatar
            uri={person.avatarUri}
            name={person.name}
            gender={person.gender}
            branch={person.branch}
            size="xl"
            isDeceased={person.isDeceased}
          />

          <Text style={[typography.h1, styles.nameText]}>{person.name}</Text>
          {person.nickname ? (
            <Text style={[typography.subtitle1, styles.nicknameText]}>
              (Tên gọi: {person.nickname})
            </Text>
          ) : null}

          <View style={styles.branchBadge}>
            <Icon name="tag-outline" size={14} color={colors.primary} />
            <Text style={styles.branchBadgeText}>{branchLabel}</Text>
          </View>
        </View>

        {/* Mối quan hệ đối với Tôi - FEATURE CHỦ ĐẠO */}
        <View style={styles.card}>
          <Text style={[typography.subtitle1, styles.cardTitle]}>
            Cách Xưng Hô Với Tôi
          </Text>

          <View style={styles.relationRow}>
            <View style={styles.relationBox}>
              <Text style={[typography.caption, styles.relationSub]}>Tôi gọi người này là:</Text>
              <Text style={[typography.h3, styles.relationHighlight]}>{relationToMe}</Text>
            </View>

            <View style={styles.dividerVertical} />

            <View style={styles.relationBox}>
              <Text style={[typography.caption, styles.relationSub]}>Người này gọi Tôi là:</Text>
              <Text style={[typography.h3, styles.relationHighlightSecondary]}>{howTheyCallMe}</Text>
            </View>
          </View>
        </View>

        {/* Thông tin liên hệ nhanh */}
        {person.phone ? (
          <View style={styles.card}>
            <Text style={[typography.subtitle1, styles.cardTitle]}>Liên Hệ Nhanh</Text>
            <View style={styles.phoneActionRow}>
              <View style={styles.phoneInfo}>
                <Icon name="phone" size={20} color={colors.textSecondary} />
                <Text style={[typography.subtitle1, styles.phoneText]}>{person.phone}</Text>
              </View>

              <View style={styles.callButtons}>
                <TouchableOpacity style={styles.iconActionBtn} onPress={handleCall} activeOpacity={0.7}>
                  <Icon name="phone-outgoing" size={20} color={colors.success} />
                  <Text style={[styles.actionBtnLabel, { color: colors.success }]}>Gọi</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.iconActionBtn} onPress={handleSMS} activeOpacity={0.7}>
                  <Icon name="message-text" size={20} color={colors.info} />
                  <Text style={[styles.actionBtnLabel, { color: colors.info }]}>Nhắn</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : null}

        {/* Liên kết gia đình trực hệ */}
        <View style={styles.card}>
          <Text style={[typography.subtitle1, styles.cardTitle]}>Mối Quan Hệ Trực Hệ</Text>

          {/* Vợ / Chồng */}
          <View style={styles.relSection}>
            <View style={styles.relSectionHeader}>
              <Text style={[typography.caption, styles.relSectionTitle]}>Vợ / Chồng:</Text>
              <TouchableOpacity
                style={styles.addRelBtn}
                onPress={() => setShowSpouseModal(true)}>
                <Icon name="plus-circle-outline" size={13} color={colors.primary} />
                <Text style={styles.addRelBtnText}>
                  {relatives.spouses.length > 0 ? 'Thêm / Đổi Vợ Chồng' : '+ Thêm Vợ / Chồng'}
                </Text>
              </TouchableOpacity>
            </View>

            {relatives.spouses.length > 0 ? (
              <View style={styles.relList}>
                {relatives.spouses.map(s => (
                  <TouchableOpacity
                    key={s.id}
                    style={styles.relChip}
                    onPress={() => navigation.push('PersonDetail', { personId: s.id })}>
                    <Avatar uri={s.avatarUri} name={s.name} gender={s.gender} size="sm" />
                    <Text style={styles.relChipText}>{s.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <TouchableOpacity
                style={styles.emptyRelPrompt}
                onPress={() => setShowSpouseModal(true)}>
                <Icon name="ring" size={14} color={colors.textMuted} />
                <Text style={styles.noRelText}>Chưa ghi nhận • Chạm để chọn vợ/chồng</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Cha Mẹ */}
          <View style={styles.relSection}>
            <View style={styles.relSectionHeader}>
              <Text style={[typography.caption, styles.relSectionTitle]}>Cha Mẹ:</Text>
              <TouchableOpacity
                style={styles.addRelBtn}
                onPress={() => setShowParentModal(true)}>
                <Icon name="plus-circle-outline" size={13} color={colors.primary} />
                <Text style={styles.addRelBtnText}>
                  {relatives.parents.length > 0 ? 'Thêm / Đổi Cha Mẹ' : '+ Thêm Cha / Mẹ'}
                </Text>
              </TouchableOpacity>
            </View>

            {relatives.parents.length > 0 ? (
              <View style={styles.relList}>
                {relatives.parents.map(p => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.relChip}
                    onPress={() => navigation.push('PersonDetail', { personId: p.id })}>
                    <Avatar uri={p.avatarUri} name={p.name} gender={p.gender} size="sm" />
                    <Text style={styles.relChipText}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <TouchableOpacity
                style={styles.emptyRelPrompt}
                onPress={() => setShowParentModal(true)}>
                <Icon name="account-child-circle" size={14} color={colors.textMuted} />
                <Text style={styles.noRelText}>Chưa ghi nhận • Chạm để chọn cha/mẹ</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Anh Chị Em */}
          <View style={styles.relSection}>
            <Text style={[typography.caption, styles.relSectionTitle]}>Anh Chị Em:</Text>
            {relatives.siblings.length > 0 ? (
              <View style={styles.relList}>
                {relatives.siblings.map(sib => (
                  <TouchableOpacity
                    key={sib.id}
                    style={styles.relChip}
                    onPress={() => navigation.push('PersonDetail', { personId: sib.id })}>
                    <Avatar uri={sib.avatarUri} name={sib.name} gender={sib.gender} size="sm" />
                    <Text style={styles.relChipText}>{sib.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.noRelText}>Chưa ghi nhận</Text>
            )}
          </View>

          {/* Con cái */}
          <View style={styles.relSection}>
            <Text style={[typography.caption, styles.relSectionTitle]}>Con cái:</Text>
            {relatives.children.length > 0 ? (
              <View style={styles.relList}>
                {relatives.children.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.relChip}
                    onPress={() => navigation.push('PersonDetail', { personId: c.id })}>
                    <Avatar uri={c.avatarUri} name={c.name} gender={c.gender} size="sm" />
                    <Text style={styles.relChipText}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.noRelText}>Chưa ghi nhận</Text>
            )}
          </View>
        </View>

        {/* Thông tin chi tiết cá nhân */}
        <View style={styles.card}>
          <Text style={[typography.subtitle1, styles.cardTitle]}>Thông Tin Chi Tiết</Text>

          <View style={styles.detailRow}>
            <Text style={[typography.body2, styles.detailLabel]}>Tình trạng:</Text>
            <Text style={[typography.body1, person.isDeceased ? styles.deceasedText : styles.aliveText]}>
              {person.isDeceased ? 'Đã mất' : 'Còn sống'}
            </Text>
          </View>

          {person.isDeceased && person.deathDateLunar ? (() => {
            const parsed = parseLunarDateString(person.deathDateLunar);
            const countdown = parsed
              ? calculateAnniversaryCountdown({ lunarDay: parsed.day, lunarMonth: parsed.month })
              : null;

            return (
              <View style={styles.anniversaryContainer}>
                <View style={styles.detailRow}>
                  <Text style={[typography.body2, styles.detailLabel]}>Ngày giỗ:</Text>
                  <Text style={[typography.body1, { color: colors.primary, fontWeight: '700' }]}>
                    {person.deathDateLunar}
                  </Text>
                </View>

                {countdown ? (
                  <View
                    style={[
                      styles.countdownPill,
                      countdown.isToday
                        ? styles.pillToday
                        : countdown.isWithinWeek
                        ? styles.pillSoon
                        : styles.pillNormal,
                    ]}>
                    <Icon
                      name={countdown.isToday ? 'fire' : countdown.isWithinWeek ? 'timer-sand' : 'calendar-clock'}
                      size={15}
                      color={
                        countdown.isToday
                          ? '#C62828'
                          : countdown.isWithinWeek
                          ? '#D97706'
                          : colors.primary
                      }
                    />
                    <Text
                      style={[
                        styles.countdownPillText,
                        countdown.isToday
                          ? styles.pillTextToday
                          : countdown.isWithinWeek
                          ? styles.pillTextSoon
                          : styles.pillTextNormal,
                      ]}>
                      {countdown.countdownText} • Dương lịch: {countdown.formattedNextSolar}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })() : null}

          {person.birthYear ? (
            <View style={styles.detailRow}>
              <Text style={[typography.body2, styles.detailLabel]}>Năm sinh:</Text>
              <Text style={[typography.body1, { color: colors.text }]}>{person.birthYear}</Text>
            </View>
          ) : null}

          {person.address ? (
            <View style={styles.detailRow}>
              <Text style={[typography.body2, styles.detailLabel]}>Quê quán / Ở:</Text>
              <Text style={[typography.body1, { color: colors.text, flex: 1, textAlign: 'right' }]}>
                {person.address}
              </Text>
            </View>
          ) : null}

          {person.notes ? (
            <View style={styles.notesBlock}>
              <Text style={[typography.caption, styles.detailLabel]}>Ghi chú & Đặc điểm nhớ:</Text>
              <Text style={[typography.body1, styles.notesContent]}>{person.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* Danger zone: Delete */}
        <TouchableOpacity style={styles.deleteBtn} activeOpacity={0.7} onPress={handleDelete}>
          <Icon name="trash-can-outline" size={18} color={colors.danger} />
          <Text style={styles.deleteBtnText}>Xóa người này khỏi danh bạ họ hàng</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal chọn/đổi Vợ Chồng */}
      <RelationPickerModal
        visible={showSpouseModal}
        title="Xác Định Quan Hệ Vợ / Chồng"
        subtitle={`Chọn người phối ngẫu cho ${person.name}`}
        relationType="spouse"
        currentSelectedId={relatives.spouses[0]?.id}
        excludePersonIds={[person.id]}
        onSelect={handleSelectSpouse}
        onClear={relatives.spouses.length > 0 ? handleClearSpouse : undefined}
        onClose={() => setShowSpouseModal(false)}
      />

      {/* Modal chọn/đổi Cha Mẹ */}
      <RelationPickerModal
        visible={showParentModal}
        title="Chọn Cha hoặc Mẹ"
        subtitle={`Chọn cha hoặc mẹ cho ${person.name}`}
        relationType="parent"
        currentSelectedId={relatives.parents[0]?.id}
        excludePersonIds={[person.id, ...relatives.children.map(c => c.id)]}
        onSelect={handleSelectParent}
        onClear={relatives.parents.length > 0 ? handleClearParent : undefined}
        onClose={() => setShowParentModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl + 16,
    gap: spacing.lg,
  },
  heroCard: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nameText: {
    color: colors.text,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  nicknameText: {
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  branchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    marginTop: spacing.sm,
    gap: 4,
  },
  branchBadgeText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
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
  relationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  relationBox: {
    flex: 1,
    alignItems: 'center',
  },
  dividerVertical: {
    width: 1,
    height: 48,
    backgroundColor: colors.border,
  },
  relationSub: {
    color: colors.textSecondary,
    marginBottom: 4,
  },
  relationHighlight: {
    color: colors.primary,
    fontWeight: '700',
    textAlign: 'center',
  },
  relationHighlightSecondary: {
    color: colors.secondary,
    fontWeight: '700',
    textAlign: 'center',
  },
  phoneActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phoneInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  phoneText: {
    color: colors.text,
  },
  callButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconActionBtn: {
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  relSection: {
    marginBottom: spacing.md,
  },
  relSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  relSectionTitle: {
    color: colors.textSecondary,
    marginBottom: 0,
    fontWeight: '600',
  },
  addRelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
  },
  addRelBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  emptyRelPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  relList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  relChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.full,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  relChipText: {
    fontSize: 13,
    color: colors.text,
  },
  noRelText: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  detailLabel: {
    color: colors.textSecondary,
  },
  aliveText: {
    color: colors.success,
    fontWeight: '600',
  },
  deceasedText: {
    color: colors.deceased,
    fontWeight: '600',
  },
  anniversaryContainer: {
    paddingVertical: spacing.xs,
  },
  countdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    marginTop: 4,
    borderWidth: 1,
  },
  pillToday: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FFCDD2',
  },
  pillSoon: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  pillNormal: {
    backgroundColor: colors.primarySoft,
    borderColor: '#E8D5C4',
  },
  countdownPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pillTextToday: {
    color: '#B71C1C',
    fontWeight: '700',
  },
  pillTextSoon: {
    color: '#B45309',
    fontWeight: '700',
  },
  pillTextNormal: {
    color: colors.primary,
  },
  notesBlock: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  notesContent: {
    color: colors.text,
    marginTop: 4,
    lineHeight: 22,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  deleteBtnText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
});
