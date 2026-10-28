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
import { getDirectRelatives } from '../../db/repositories/relationshipRepository';
import { Person } from '../../types';
import { colors, radius, spacing, typography } from '../../theme';
import { Avatar, ScreenHeader, Icon, useToast } from '../../components';
import { getBranchLabel } from '../../utils/kinshipCalculator';
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
            <Text style={[typography.caption, styles.relSectionTitle]}>Vợ / Chồng:</Text>
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
              <Text style={styles.noRelText}>Chưa ghi nhận</Text>
            )}
          </View>

          {/* Cha Mẹ */}
          <View style={styles.relSection}>
            <Text style={[typography.caption, styles.relSectionTitle]}>Cha Mẹ:</Text>
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
              <Text style={styles.noRelText}>Chưa ghi nhận</Text>
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

          {person.isDeceased && person.deathDateLunar ? (
            <View style={styles.detailRow}>
              <Text style={[typography.body2, styles.detailLabel]}>Ngày giỗ:</Text>
              <Text style={[typography.body1, { color: colors.primary, fontWeight: '700' }]}>
                {person.deathDateLunar}
              </Text>
            </View>
          ) : null}

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
    paddingBottom: spacing.xxxl,
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
    marginBottom: spacing.sm,
  },
  relSectionTitle: {
    color: colors.textSecondary,
    marginBottom: 4,
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
