import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { listPersons } from '../../db/repositories/personRepository';
import { PersonSummary, FamilyBranch } from '../../types';
import { colors, radius, spacing, typography } from '../../theme';
import { Avatar, Chip, Icon } from '../../components';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface GenerationSection {
  title: string;
  generation: number;
  subtitle: string;
  icon: string;
  persons: PersonSummary[];
}

export function GenerationsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [activeBranch, setActiveBranch] = useState<FamilyBranch>('noi');
  const [sections, setSections] = useState<GenerationSection[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const all = await listPersons({ branch: activeBranch });

      // Group by 6 generations
      const caoToTier = all.filter(p => p.generation >= 4);
      const tangToTier = all.filter(p => p.generation === 3);
      const ongBaTier = all.filter(p => p.generation === 2);
      const parentsTier = all.filter(p => p.generation === 1);
      const myTier = all.filter(p => p.generation === 0);
      const childrenTier = all.filter(p => p.generation <= -1);

      const sectionList: GenerationSection[] = [];

      // Chỉ hiện tier nếu có người hoặc là các tier chính
      if (caoToTier.length > 0) {
        sectionList.push({
          title: 'Đời 1: Bậc Cao Tổ / Cụ Kỵ (+4)',
          generation: 4,
          subtitle: 'Cụ Khởi tổ, Cao tổ phụ, Cao tổ mẫu...',
          icon: 'shield-crown-outline',
          persons: caoToTier,
        });
      }

      if (tangToTier.length > 0) {
        sectionList.push({
          title: 'Đời 2: Bậc Cụ Cố / Tằng Tổ (+3)',
          generation: 3,
          subtitle: 'Cụ Cố, Cụ Bác, Cụ Chú, Cụ Cô...',
          icon: 'crown-outline',
          persons: tangToTier,
        });
      }

      sectionList.push(
        {
          title: 'Đời 3: Bậc Ông Bà / Tiền Bối (+2)',
          generation: 2,
          subtitle: 'Ông, Bà, Ông Bác, Ông Chú, Bà Cô...',
          icon: 'account-supervisor-circle',
          persons: ongBaTier,
        },
        {
          title: 'Đời 4: Bậc Cha Chú / Cô Dì Bác (+1)',
          generation: 1,
          subtitle: 'Bố, Mẹ, Bác, Chú, Cô, Cậu, Dì...',
          icon: 'account-supervisor',
          persons: parentsTier,
        },
        {
          title: 'Đời 5: Thế Hệ Của Tôi (0)',
          generation: 0,
          subtitle: 'Tôi, Vợ/Chồng, Anh Chị Em ruột & họ...',
          icon: 'account-multiple-outline',
          persons: myTier,
        },
        {
          title: 'Đời 6: Bậc Con Cháu Đời Mới (-1)',
          generation: -1,
          subtitle: 'Con trai, Con gái, Cháu...',
          icon: 'human-child',
          persons: childrenTier,
        },
      );

      setSections(sectionList);
    } catch (e) {
      console.warn('Load generations error:', e);
    }
  }, [activeBranch]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top action header */}
      <View style={styles.topActionHeader}>
        <View>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Phả Hệ Gia Tộc</Text>
          <Text style={[typography.h3, { color: colors.text }]}>Sơ Đồ 6 Thế Hệ</Text>
        </View>

        <TouchableOpacity
          style={styles.exportBtn}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('TreeExport', { defaultBranch: activeBranch })}>
          <Icon name="file-image-outline" size={18} color="#FFF" />
          <Text style={[typography.button, styles.exportBtnText]}>Xuất ảnh</Text>
        </TouchableOpacity>
      </View>

      {/* Branch selector */}
      <View style={styles.branchHeader}>
        <Text style={[typography.subtitle2, styles.branchTitle]}>Chọn Nhánh Họ Hàng:</Text>
        <View style={styles.branchRow}>
          <Chip
            label="Bên Nội"
            selected={activeBranch === 'noi'}
            activeColor={colors.branchNoi}
            onPress={() => setActiveBranch('noi')}
          />
          <Chip
            label="Bên Ngoại"
            selected={activeBranch === 'ngoai'}
            activeColor={colors.branchNgoai}
            onPress={() => setActiveBranch('ngoai')}
          />
          <Chip
            label="Bên Vợ / Chồng"
            selected={activeBranch === 'vo_chong'}
            activeColor={colors.branchVoChong}
            onPress={() => setActiveBranch('vo_chong')}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }>
        {sections.map(section => (
          <View key={section.title} style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Icon name={section.icon} size={22} color={colors.primary} />
                <View>
                  <Text style={[typography.subtitle1, styles.sectionTitleText]}>
                    {section.title}
                  </Text>
                  <Text style={[typography.caption, styles.sectionSubtitleText]}>
                    {section.subtitle}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.addMiniButton}
                activeOpacity={0.7}
                onPress={() =>
                  navigation.navigate('PersonForm', {
                    defaultBranch: activeBranch,
                  })
                }>
                <Icon name="plus" size={16} color={colors.primary} />
                <Text style={styles.addMiniText}>Thêm</Text>
              </TouchableOpacity>
            </View>

            {section.persons.length === 0 ? (
              <View style={styles.emptyTier}>
                <Text style={[typography.caption, styles.emptyTierText]}>
                  Chưa ghi nhận ai ở bậc này
                </Text>
              </View>
            ) : (
              <View style={styles.grid}>
                {section.persons.map(p => {
                  const relationBadge = p.customRelationToMe || p.inferredRelationToMe || 'Họ hàng';
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={styles.gridItem}
                      activeOpacity={0.7}
                      onPress={() => navigation.navigate('PersonDetail', { personId: p.id })}>
                      <Avatar
                        uri={p.avatarUri}
                        name={p.name}
                        gender={p.gender}
                        branch={p.branch}
                        size="md"
                        isDeceased={p.isDeceased}
                      />
                      <Text style={[typography.subtitle2, styles.itemName]} numberOfLines={1}>
                        {p.name}
                      </Text>
                      <View style={styles.itemBadge}>
                        <Text style={styles.itemBadgeText} numberOfLines={1}>
                          {relationBadge}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  branchHeader: {
    backgroundColor: colors.card,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  branchTitle: {
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  branchRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl + 16,
    gap: spacing.lg,
  },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  sectionTitleText: {
    color: colors.text,
  },
  sectionSubtitleText: {
    color: colors.textMuted,
  },
  addMiniButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    gap: 2,
  },
  addMiniText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyTier: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  emptyTierText: {
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  gridItem: {
    width: '30%',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: 4,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  itemName: {
    marginTop: spacing.xs,
    color: colors.text,
    textAlign: 'center',
    fontSize: 13,
  },
  itemBadge: {
    marginTop: 2,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.xs,
    backgroundColor: colors.primarySoft,
  },
  itemBadgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  topActionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    backgroundColor: colors.card,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  exportBtnText: {
    color: '#FFF',
    fontSize: 13,
  },
});
