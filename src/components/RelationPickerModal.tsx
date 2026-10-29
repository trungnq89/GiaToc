import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PersonSummary, FamilyBranch } from '../types';
import { listPersons } from '../db/repositories/personRepository';
import { colors, radius, spacing, typography } from '../theme';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { getBranchLabel } from '../utils/kinshipCalculator';
import { matchesVietnameseSearch } from '../utils/vietnameseSearch';

export interface RelationPickerModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  relationType?: 'parent' | 'spouse' | 'child';
  currentSelectedId?: string;
  excludePersonIds?: string[];
  preferredGender?: 'male' | 'female';
  onSelect: (person: PersonSummary) => void;
  onClear?: () => void;
  onClose: () => void;
}

export function RelationPickerModal({
  visible,
  title,
  subtitle,
  relationType,
  currentSelectedId,
  excludePersonIds = [],
  onSelect,
  onClear,
  onClose,
}: RelationPickerModalProps) {
  const insets = useSafeAreaInsets();
  const [persons, setPersons] = useState<PersonSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<FamilyBranch | 'all'>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setSearchQuery('');
      setSelectedBranch('all');
      setLoading(true);
      listPersons()
        .then(all => {
          const filtered = all.filter(p => !excludePersonIds.includes(p.id));
          setPersons(filtered);
        })
        .finally(() => setLoading(false));
    }
  }, [visible, excludePersonIds]);

  const filteredPersons = useMemo(() => {
    let result = persons;

    // Filter by branch
    if (selectedBranch !== 'all') {
      result = result.filter(p => p.branch === selectedBranch);
    }

    // Filter by search query (name, nickname, relation title)
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.trim();
      result = result.filter(
        p =>
          matchesVietnameseSearch(p.name, q) ||
          matchesVietnameseSearch(p.nickname, q) ||
          matchesVietnameseSearch(p.customRelationToMe, q) ||
          matchesVietnameseSearch(p.inferredRelationToMe, q),
      );
    }

    return result;
  }, [persons, selectedBranch, searchQuery]);

  const branches: Array<{ key: FamilyBranch | 'all'; label: string }> = [
    { key: 'all', label: 'Tất cả' },
    { key: 'noi', label: 'Bên Nội' },
    { key: 'ngoai', label: 'Bên Ngoại' },
    { key: 'vo_chong', label: 'Bên Vợ/Chồng' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}>
        <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.iconCircle}>
                <Icon
                  name={relationType === 'spouse' ? 'ring' : 'account-child-circle'}
                  size={20}
                  color={colors.primary}
                />
              </View>
              <View>
                <Text style={[typography.subtitle1, styles.titleText]}>{title}</Text>
                {subtitle ? (
                  <Text style={[typography.caption, styles.subtitleText]}>{subtitle}</Text>
                ) : null}
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Icon name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Search Box */}
          <View style={styles.searchContainer}>
            <Icon name="magnify" size={20} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Nhập tên người thân để tìm..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && Platform.OS !== 'ios' ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                <Icon name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Branch Filter Tabs */}
          <View style={styles.branchTabs}>
            {branches.map(b => (
              <TouchableOpacity
                key={b.key}
                style={[
                  styles.branchTab,
                  selectedBranch === b.key && styles.branchTabActive,
                ]}
                onPress={() => setSelectedBranch(b.key)}>
                <Text
                  style={[
                    styles.branchTabText,
                    selectedBranch === b.key && styles.branchTabTextActive,
                  ]}>
                  {b.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Result Count */}
          <View style={styles.countRow}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {filteredPersons.length} người thân phù hợp
            </Text>
            {currentSelectedId && onClear ? (
              <TouchableOpacity onPress={onClear} style={styles.clearLinkBtn}>
                <Icon name="link-off" size={14} color={colors.danger} />
                <Text style={styles.clearLinkText}>Gỡ bỏ liên kết này</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* List of Candidates */}
          <FlatList
            data={filteredPersons}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const isSelected = item.id === currentSelectedId;
              const relation = item.customRelationToMe || item.inferredRelationToMe || getBranchLabel(item.branch);

              return (
                <TouchableOpacity
                  style={[styles.personItem, isSelected && styles.personItemSelected]}
                  activeOpacity={0.7}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}>
                  <Avatar
                    uri={item.avatarUri}
                    name={item.name}
                    gender={item.gender}
                    size="md"
                    isDeceased={item.isDeceased}
                  />

                  <View style={styles.personInfo}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.personName, isSelected && styles.personNameSelected]}>
                        {item.name}
                      </Text>
                      {item.isDeceased ? (
                        <View style={styles.deceasedBadge}>
                          <Text style={styles.deceasedBadgeText}>Đã mất</Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.metaRow}>
                      <Text style={styles.personRelation}>{relation}</Text>
                      {item.birthYear ? (
                        <>
                          <Text style={styles.metaDot}>•</Text>
                          <Text style={styles.metaYear}>Sinh {item.birthYear}</Text>
                        </>
                      ) : null}
                      <Text style={styles.metaDot}>•</Text>
                      <Text style={styles.branchLabel}>{getBranchLabel(item.branch)}</Text>
                    </View>
                  </View>

                  {isSelected ? (
                    <View style={styles.checkBadge}>
                      <Icon name="check-circle" size={20} color={colors.primary} />
                    </View>
                  ) : (
                    <Icon name="chevron-right" size={18} color={colors.border} />
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="account-search-outline" size={44} color={colors.textMuted} />
                <Text style={[typography.subtitle2, styles.emptyTitle]}>
                  {loading ? 'Đang tải danh sách...' : 'Không tìm thấy người thân'}
                </Text>
                <Text style={[typography.caption, styles.emptyText]}>
                  {searchQuery
                    ? `Không có ai khớp với "${searchQuery}". Thử từ khóa khác hoặc chuyển nhánh họ hàng.`
                    : 'Chưa có thành viên nào trong danh mục này.'}
                </Text>
              </View>
            }
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '85%',
    minHeight: '60%',
    paddingTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    color: colors.text,
    fontWeight: '700',
  },
  subtitleText: {
    color: colors.textSecondary,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    height: 42,
    color: colors.text,
    ...typography.body2,
  },
  clearSearchBtn: {
    padding: spacing.xs,
  },
  branchTabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  branchTab: {
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  branchTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  branchTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  branchTabTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  clearLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: radius.sm,
    backgroundColor: '#FEE2E2',
  },
  clearLinkText: {
    fontSize: 12,
    color: colors.danger,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  personItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  personItemSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  personInfo: {
    flex: 1,
    marginLeft: spacing.sm,
    marginRight: spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  personName: {
    ...typography.subtitle2,
    color: colors.text,
    fontWeight: '600',
  },
  personNameSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  deceasedBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.sm,
  },
  deceasedBadgeText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    flexWrap: 'wrap',
  },
  personRelation: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  metaDot: {
    fontSize: 10,
    color: colors.border,
    marginHorizontal: 4,
  },
  metaYear: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  branchLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  checkBadge: {
    paddingLeft: spacing.xs,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.xs,
  },
  emptyTitle: {
    color: colors.text,
    marginTop: spacing.sm,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
