import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { listAllMemorialEvents, deleteMemorialEvent } from '../../db/repositories/eventRepository';
import { MemorialEvent } from '../../types';
import { colors, radius, spacing, typography } from '../../theme';
import { EmptyState, Icon, useToast } from '../../components';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function EventsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const toast = useToast();
  const [events, setEvents] = useState<MemorialEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await listAllMemorialEvents();
      setEvents(data);
    } catch (e) {
      console.warn('Load events failed:', e);
    }
  }, []);

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

  const handleDelete = (id: string, title: string) => {
    Alert.alert('Xóa sự kiện', `Bạn có chắc muốn xóa "${title}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          await deleteMemorialEvent(id);
          toast.show('Đã xóa sự kiện', 'info');
          loadData();
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: MemorialEvent }) => {
    const isDeath = item.eventType === 'death_anniversary';
    return (
      <View style={styles.eventCard}>
        <View style={[styles.iconContainer, isDeath ? styles.iconDeath : styles.iconBirth]}>
          <Icon
            name={isDeath ? 'candle' : 'cake-variant'}
            size={24}
            color={isDeath ? colors.primary : colors.female}
          />
        </View>

        <View style={styles.cardContent}>
          <Text style={[typography.subtitle1, styles.eventTitle]}>{item.title}</Text>
          <Text style={[typography.caption, styles.personName]}>
            Người thân: {item.personName}
          </Text>

          {item.lunarDay && item.lunarMonth ? (
            <View style={styles.dateBadge}>
              <Icon name="calendar-month-outline" size={14} color={colors.primary} />
              <Text style={styles.dateText}>
                Ngày {item.lunarDay} tháng {item.lunarMonth} (Âm lịch)
              </Text>
            </View>
          ) : item.solarDate ? (
            <View style={styles.dateBadge}>
              <Icon name="calendar-outline" size={14} color={colors.secondary} />
              <Text style={styles.dateText}>{item.solarDate} (Dương lịch)</Text>
            </View>
          ) : null}

          {item.notes ? (
            <Text style={[typography.body2, styles.notesText]}>{item.notes}</Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id, item.title)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="trash-can-outline" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={[typography.h2, styles.headerTitle]}>Ngày Giỗ & Sự Kiện</Text>
          <Text style={[typography.caption, styles.headerSubtitle]}>
            Ghi nhớ ngày giỗ âm lịch và kỷ niệm họ hàng để luôn trọn đạo hiếu
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('EventForm', {})}>
          <Icon name="plus" size={18} color="#FFF" />
          <Text style={styles.addButtonText}>Thêm ngày giỗ</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={events}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="calendar-heart"
            title="Chưa có ngày giỗ hay sự kiện"
            description="Lưu lại ngày giỗ âm lịch của ông bà, tổ tiên hoặc sinh nhật của người thân trong dòng họ."
            actionTitle="Thêm sự kiện mới"
            onAction={() => navigation.navigate('EventForm', {})}
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
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    color: colors.text,
  },
  headerSubtitle: {
    color: colors.textSecondary,
    maxWidth: 240,
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
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.sm,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconDeath: {
    backgroundColor: colors.primarySoft,
  },
  iconBirth: {
    backgroundColor: colors.femaleBg,
  },
  cardContent: {
    flex: 1,
  },
  eventTitle: {
    color: colors.text,
  },
  personName: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    marginTop: 6,
    alignSelf: 'flex-start',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  notesText: {
    color: colors.textSecondary,
    marginTop: 6,
    fontStyle: 'italic',
  },
  deleteButton: {
    padding: spacing.xs,
  },
});
