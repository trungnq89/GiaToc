import React, { useState, useCallback } from 'react';
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
import { EmptyState, Icon, Avatar, useToast } from '../../components';
import { calculateAnniversaryCountdown, getTodayLunarDate, AnniversaryCountdown } from '../../utils/lunarCalendar';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export interface EnrichedMemorialEvent extends MemorialEvent {
  countdown: AnniversaryCountdown | null;
}

export function EventsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const toast = useToast();
  const [events, setEvents] = useState<EnrichedMemorialEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const todayLunarInfo = getTodayLunarDate();

  const loadData = useCallback(async () => {
    try {
      const data = await listAllMemorialEvents();
      const enriched: EnrichedMemorialEvent[] = data.map(item => ({
        ...item,
        countdown: calculateAnniversaryCountdown({
          lunarDay: item.lunarDay,
          lunarMonth: item.lunarMonth,
          solarDate: item.solarDate,
        }),
      }));

      // Sắp xếp sự kiện: Ngày giỗ gần nhất lên đầu (daysRemaining tăng dần)
      enriched.sort((a, b) => {
        const daysA = a.countdown ? a.countdown.daysRemaining : 9999;
        const daysB = b.countdown ? b.countdown.daysRemaining : 9999;
        return daysA - daysB;
      });

      setEvents(enriched);
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

  const nearestEvent = events.length > 0 && events[0].countdown ? events[0] : null;

  const renderCountdownBadge = (cd: AnniversaryCountdown) => {
    if (cd.isToday) {
      return (
        <View style={[styles.badgeBase, styles.badgeToday]}>
          <Icon name="fire" size={13} color="#FFF" />
          <Text style={styles.badgeTextToday}>{cd.statusBadge}</Text>
        </View>
      );
    }
    if (cd.isTomorrow) {
      return (
        <View style={[styles.badgeBase, styles.badgeTomorrow]}>
          <Icon name="lightning-bolt" size={13} color="#78350F" />
          <Text style={styles.badgeTextTomorrow}>{cd.statusBadge}</Text>
        </View>
      );
    }
    if (cd.isWithinWeek) {
      return (
        <View style={[styles.badgeBase, styles.badgeWeek]}>
          <Icon name="timer-sand" size={13} color="#9A3412" />
          <Text style={styles.badgeTextWeek}>{cd.statusBadge}</Text>
        </View>
      );
    }
    return (
      <View style={[styles.badgeBase, styles.badgeNormal]}>
        <Icon name="calendar-clock" size={13} color={colors.primary} />
        <Text style={styles.badgeTextNormal}>{cd.statusBadge}</Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: EnrichedMemorialEvent }) => {
    const isDeath = item.eventType === 'death_anniversary';
    const cd = item.countdown;

    return (
      <TouchableOpacity
        style={styles.eventCard}
        activeOpacity={0.85}
        onPress={() => {
          if (item.personId) {
            navigation.navigate('PersonDetail', { personId: item.personId });
          }
        }}>
        <View style={styles.avatarWrapper}>
          <Avatar
            uri={item.avatarUri}
            name={item.personName}
            gender={item.gender}
            branch={item.branch}
            size={48}
            isDeceased={isDeath}
          />
        </View>

        <View style={styles.cardContent}>
          <View style={styles.titleRow}>
            <Text style={[typography.subtitle1, styles.eventTitle]} numberOfLines={1}>
              {item.title}
            </Text>
            {cd ? renderCountdownBadge(cd) : null}
          </View>

          <View style={styles.personRow}>
            <Text style={[typography.caption, styles.personName]}>
              {item.personName}
            </Text>
            {item.relationToMe ? (
              <View style={styles.relationTag}>
                <Text style={styles.relationTagText}>{item.relationToMe}</Text>
              </View>
            ) : null}
          </View>

          {/* Ngày âm & Ngày dương tương ứng */}
          <View style={styles.dateMetaContainer}>
            {item.lunarDay && item.lunarMonth ? (
              <View style={styles.dateBadge}>
                <Icon name="moon-waning-crescent" size={13} color={colors.primary} />
                <Text style={styles.dateText}>
                  Ngày {item.lunarDay} tháng {item.lunarMonth} (Âm lịch)
                </Text>
              </View>
            ) : item.solarDate ? (
              <View style={styles.dateBadge}>
                <Icon name="calendar-outline" size={13} color={colors.secondary} />
                <Text style={styles.dateText}>{item.solarDate} (Dương lịch)</Text>
              </View>
            ) : null}

            {cd ? (
              <View style={styles.solarDateBadge}>
                <Icon name="calendar-arrow-right" size={13} color={colors.textSecondary} />
                <Text style={styles.solarDateText}>
                  Dương lịch tới: {cd.formattedNextSolar}
                </Text>
              </View>
            ) : null}
          </View>

          {item.notes ? (
            <Text style={[typography.body2, styles.notesText]} numberOfLines={2}>
              {item.notes}
            </Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id, item.title)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="trash-can-outline" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[typography.h2, styles.headerTitle]}>Ngày Giỗ & Sự Kiện</Text>
          <Text style={[typography.caption, styles.headerSubtitle]}>
            Bộ đếm ngày giỗ âm lịch & kỷ niệm họ hàng để luôn trọn hiếu nghĩa
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('EventForm', {})}>
          <Icon name="plus" size={18} color="#FFF" />
          <Text style={styles.addButtonText}>Thêm</Text>
        </TouchableOpacity>
      </View>

      {/* Banner Hôm Nay (Âm Lịch) */}
      <View style={styles.todayBanner}>
        <View style={styles.todayBannerContent}>
          <Icon name="calendar-today" size={18} color={colors.primary} />
          <Text style={styles.todayBannerText}>
            Hôm nay: <Text style={styles.todayBannerHighlight}>{todayLunarInfo.formatted}</Text>
          </Text>
        </View>
        <Text style={styles.todaySolarText}>
          {new Date().toLocaleDateString('vi-VN', {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </Text>
      </View>

      <FlatList
        data={events}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        ListHeaderComponent={
          nearestEvent && nearestEvent.countdown ? (
            <View style={styles.heroSection}>
              <TouchableOpacity
                style={styles.heroCard}
                activeOpacity={0.9}
                onPress={() => {
                  if (nearestEvent.personId) {
                    navigation.navigate('PersonDetail', { personId: nearestEvent.personId });
                  }
                }}>
                <View style={styles.heroTopRow}>
                  <View style={styles.heroTag}>
                    <Icon name="star" size={14} color="#D97706" />
                    <Text style={styles.heroTagText}>GIỖ GẦN NHẤT</Text>
                  </View>

                  <View
                    style={[
                      styles.heroCountdownPill,
                      nearestEvent.countdown.isToday
                        ? styles.heroPillToday
                        : nearestEvent.countdown.isWithinWeek
                        ? styles.heroPillSoon
                        : styles.heroPillNormal,
                    ]}>
                    <Icon
                      name={
                        nearestEvent.countdown.isToday
                          ? 'fire'
                          : nearestEvent.countdown.isWithinWeek
                          ? 'timer-sand'
                          : 'calendar-clock'
                      }
                      size={15}
                      color={
                        nearestEvent.countdown.isToday
                          ? '#FFFFFF'
                          : nearestEvent.countdown.isWithinWeek
                          ? '#FFFFFF'
                          : colors.primary
                      }
                    />
                    <Text
                      style={[
                        styles.heroCountdownText,
                        nearestEvent.countdown.isToday || nearestEvent.countdown.isWithinWeek
                          ? styles.heroCountdownTextLight
                          : styles.heroCountdownTextDark,
                      ]}>
                      {nearestEvent.countdown.countdownText}
                    </Text>
                  </View>
                </View>

                <View style={styles.heroBody}>
                  <Avatar
                    uri={nearestEvent.avatarUri}
                    name={nearestEvent.personName}
                    gender={nearestEvent.gender}
                    branch={nearestEvent.branch}
                    size={56}
                    isDeceased
                  />

                  <View style={styles.heroDetails}>
                    <Text style={[typography.subtitle1, styles.heroTitle]}>
                      {nearestEvent.title}
                    </Text>

                    <View style={styles.heroPersonRow}>
                      <Text style={styles.heroPersonName}>{nearestEvent.personName}</Text>
                      {nearestEvent.relationToMe ? (
                        <View style={styles.relationTag}>
                          <Text style={styles.relationTagText}>{nearestEvent.relationToMe}</Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.heroDatesRow}>
                      <View style={styles.heroDateItem}>
                        <Icon name="moon-waning-crescent" size={13} color={colors.primary} />
                        <Text style={styles.heroDateItemText}>
                          {nearestEvent.countdown.formattedLunar}
                        </Text>
                      </View>
                      <View style={styles.heroDateItem}>
                        <Icon name="calendar-check" size={13} color="#2563EB" />
                        <Text style={[styles.heroDateItemText, { color: '#1D4ED8' }]}>
                          Dương lịch: {nearestEvent.countdown.formattedNextSolar}
                        </Text>
                      </View>
                    </View>

                    {nearestEvent.notes ? (
                      <Text style={styles.heroNotes} numberOfLines={2}>
                        {nearestEvent.notes}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>

              <Text style={styles.sectionHeading}>
                Tất cả ngày giỗ & sự kiện ({events.length})
              </Text>
            </View>
          ) : undefined
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
  headerLeft: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  headerTitle: {
    color: colors.text,
  },
  headerSubtitle: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.xs + 3,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    gap: 4,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  todayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs + 3,
    borderBottomWidth: 1,
    borderBottomColor: '#FED7AA',
  },
  todayBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  todayBannerText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  todayBannerHighlight: {
    fontWeight: '700',
    color: colors.primary,
  },
  todaySolarText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.sm,
  },
  heroSection: {
    marginBottom: spacing.sm,
  },
  heroCard: {
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    backgroundColor: '#FFFAF5',
    shadowColor: '#B45309',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  heroTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  heroTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.5,
  },
  heroCountdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 4,
    borderRadius: radius.full,
    gap: 5,
  },
  heroPillToday: {
    backgroundColor: '#DC2626',
  },
  heroPillSoon: {
    backgroundColor: '#EA580C',
  },
  heroPillNormal: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  heroCountdownText: {
    fontSize: 12,
    fontWeight: '700',
  },
  heroCountdownTextLight: {
    color: '#FFFFFF',
  },
  heroCountdownTextDark: {
    color: '#92400E',
  },
  heroBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  heroDetails: {
    flex: 1,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  heroPersonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  heroPersonName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  heroDatesRow: {
    flexDirection: 'column',
    gap: 3,
    marginTop: 6,
  },
  heroDateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  heroDateItemText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  heroNotes: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 6,
    lineHeight: 18,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  avatarWrapper: {
    marginRight: spacing.md,
    marginTop: 2,
  },
  cardContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  eventTitle: {
    flex: 1,
    color: colors.text,
    fontWeight: '700',
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  personName: {
    color: colors.textSecondary,
    fontWeight: '500',
  },
  relationTag: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  relationTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
  dateMetaContainer: {
    marginTop: 6,
    gap: 3,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  solarDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  solarDateText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  notesText: {
    color: colors.textSecondary,
    marginTop: 6,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  deleteButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  badgeBase: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  badgeToday: {
    backgroundColor: '#DC2626',
  },
  badgeTextToday: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  badgeTomorrow: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  badgeTextTomorrow: {
    color: '#78350F',
    fontSize: 11,
    fontWeight: '700',
  },
  badgeWeek: {
    backgroundColor: '#FFEDD5',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  badgeTextWeek: {
    color: '#9A3412',
    fontSize: 11,
    fontWeight: '700',
  },
  badgeNormal: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: '#E8D5C4',
  },
  badgeTextNormal: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
});
