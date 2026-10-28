import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Linking,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useSessionStore } from '../../store/sessionStore';
import { listPersons } from '../../db/repositories/personRepository';
import { seed6GenerationsFamily } from '../../db/seed6Generations';
import { PersonSummary, FamilyBranch } from '../../types';
import { colors, radius, spacing, typography } from '../../theme';
import { Avatar, Chip, EmptyState, Icon, useToast } from '../../components';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const toast = useToast();
  const user = useSessionStore(s => s.user);
  const selectedBranch = useSessionStore(s => s.selectedBranch);
  const setSelectedBranch = useSessionStore(s => s.setSelectedBranch);

  const [searchQuery, setSearchQuery] = useState('');
  const [persons, setPersons] = useState<PersonSummary[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await listPersons({
        branch: selectedBranch === 'all' ? undefined : selectedBranch,
        searchQuery,
      });
      setPersons(data);
    } catch (e) {
      console.warn('Load persons failed:', e);
    }
  }, [selectedBranch, searchQuery]);

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

  const handleCall = (phone?: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleSeedSampleData = async () => {
    try {
      setRefreshing(true);
      const res = await seed6GenerationsFamily();
      await loadData();
      toast.show(`Đã nạp thành công gia phả 6 đời (${res.totalCount} người)!`, 'success');
    } catch (e) {
      console.warn('Seed error:', e);
      toast.show('Không thể nạp dữ liệu mẫu', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const renderItem = ({ item }: { item: PersonSummary }) => {
    const relationBadge = item.customRelationToMe || item.inferredRelationToMe || 'Họ hàng';
    const isNoi = item.branch === 'noi';
    const isNgoai = item.branch === 'ngoai';
    const isVoChong = item.branch === 'vo_chong';

    const branchColor = isNoi
      ? colors.branchNoi
      : isNgoai
      ? colors.branchNgoai
      : isVoChong
      ? colors.branchVoChong
      : colors.branchKhac;

    const branchBg = isNoi
      ? colors.branchNoiBg
      : isNgoai
      ? colors.branchNgoaiBg
      : isVoChong
      ? colors.branchVoChongBg
      : colors.branchKhacBg;

    return (
      <TouchableOpacity
        style={styles.personCard}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('PersonDetail', { personId: item.id })}>
        <Avatar
          uri={item.avatarUri}
          name={item.name}
          gender={item.gender}
          branch={item.branch}
          size="md"
          isDeceased={item.isDeceased}
        />

        <View style={styles.cardInfo}>
          <View style={styles.nameRow}>
            <Text style={[typography.subtitle1, styles.personName]} numberOfLines={1}>
              {item.name}
            </Text>
            {item.nickname ? (
              <Text style={[typography.caption, styles.nicknameText]}>
                ({item.nickname})
              </Text>
            ) : null}
          </View>

          <View style={styles.badgeRow}>
            <View style={[styles.relationBadge, { backgroundColor: branchBg }]}>
              <Text style={[typography.caption, { color: branchColor, fontWeight: '700' }]}>
                {relationBadge}
              </Text>
            </View>

            {item.isDeceased && (
              <View style={styles.deceasedBadge}>
                <Text style={styles.deceasedBadgeText}>Đã mất</Text>
              </View>
            )}
          </View>
        </View>

        {item.phone ? (
          <TouchableOpacity
            style={styles.callButton}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => handleCall(item.phone)}>
            <Icon name="phone" size={18} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <Icon name="chevron-right" size={20} color={colors.border} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Banner with "Tôi" shortcut */}
      <View style={styles.header}>
        <View style={styles.headerUser}>
          <Avatar
            uri={user?.avatarUri}
            name={user?.name || 'Tôi'}
            gender={user?.gender}
            size="sm"
          />
          <View>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Sổ Họ Hàng của</Text>
            <Text style={[typography.subtitle1, { color: colors.text }]}>{user?.name || 'Tôi'}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('PersonForm', {})}>
          <Icon name="plus" size={18} color="#FFF" />
          <Text style={[typography.button, styles.addButtonText]}>Thêm người</Text>
        </TouchableOpacity>
      </View>

      {/* Instant Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Icon name="magnify" size={22} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm tên, biệt danh, Bác, Chú, Dì..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Chips by Branch */}
        <View style={styles.chipsRow}>
          <Chip
            label="Tất cả"
            selected={selectedBranch === 'all'}
            onPress={() => setSelectedBranch('all')}
          />
          <Chip
            label="Bên Nội"
            selected={selectedBranch === 'noi'}
            activeColor={colors.branchNoi}
            onPress={() => setSelectedBranch('noi')}
          />
          <Chip
            label="Bên Ngoại"
            selected={selectedBranch === 'ngoai'}
            activeColor={colors.branchNgoai}
            onPress={() => setSelectedBranch('ngoai')}
          />
          <Chip
            label="Bên Vợ / Chồng"
            selected={selectedBranch === 'vo_chong'}
            activeColor={colors.branchVoChong}
            onPress={() => setSelectedBranch('vo_chong')}
          />
        </View>
      </View>

      {/* List */}
      <FlatList
        data={persons}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="account-search-outline"
            title={searchQuery ? 'Không tìm thấy người thân' : 'Chưa có ai trong danh bạ'}
            description={
              searchQuery
                ? `Không có kết quả nào khớp với "${searchQuery}". Hãy thử tìm bằng tên hoặc cách xưng hô khác.`
                : 'Thêm người thân hoặc nạp mẫu gia phả 6 đời chuẩn (35 người, 4-7 con các đời trước, đời gần nhất 2 con).'
            }
            actionTitle={searchQuery ? undefined : 'Nạp mẫu gia phả 6 đời'}
            onAction={searchQuery ? undefined : handleSeedSampleData}
            secondaryActionTitle={searchQuery ? undefined : 'Thêm người thân thủ công'}
            onSecondaryAction={searchQuery ? undefined : () => navigation.navigate('PersonForm', {})}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.card,
  },
  headerUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    gap: 4,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 13,
  },
  searchSection: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  searchInput: {
    flex: 1,
    ...typography.body1,
    color: colors.text,
    paddingVertical: spacing.xs,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.sm,
  },
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  cardInfo: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 4,
  },
  personName: {
    color: colors.text,
  },
  nicknameText: {
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  relationBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  deceasedBadge: {
    backgroundColor: colors.deceasedBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.deceasedBorder,
  },
  deceasedBadgeText: {
    fontSize: 11,
    color: colors.deceased,
    fontWeight: '600',
  },
  callButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
