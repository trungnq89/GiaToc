import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { createMemorialEvent } from '../../db/repositories/eventRepository';
import { listPersons } from '../../db/repositories/personRepository';
import { PersonSummary, MemorialEvent } from '../../types';
import { colors, radius, spacing, typography } from '../../theme';
import { Avatar, ScreenHeader, AppButton, useToast } from '../../components';
import { SafeAreaView } from 'react-native-safe-area-context';

type ScreenRouteProp = RouteProp<RootStackParamList, 'EventForm'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function EventFormScreen() {
  const route = useRoute<ScreenRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const toast = useToast();

  const { defaultPersonId } = route.params || {};

  const [persons, setPersons] = useState<PersonSummary[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string>(defaultPersonId || '');
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState<MemorialEvent['eventType']>('death_anniversary');
  const [lunarDay, setLunarDay] = useState('');
  const [lunarMonth, setLunarMonth] = useState('');
  const [solarDate, setSolarDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listPersons().then(data => {
      setPersons(data);
      if (!selectedPersonId && data.length > 0) {
        setSelectedPersonId(data[0].id);
      }
    });
  }, [selectedPersonId]);

  const handleSelectPerson = (p: PersonSummary) => {
    setSelectedPersonId(p.id);
    if (!title) {
      setTitle(
        eventType === 'death_anniversary'
          ? `Ngày giỗ ${p.customRelationToMe || p.name}`
          : `Sinh nhật ${p.name}`,
      );
    }
  };

  const handleSave = async () => {
    if (!selectedPersonId) {
      Alert.alert('Chưa chọn người thân', 'Vui lòng chọn người thân gắn với sự kiện này.');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Vui lòng nhập tiêu đề', 'Ví dụ: Ngày giỗ Cụ Cả, Giỗ Bà nội...');
      return;
    }

    try {
      setSaving(true);
      const parsedDay = lunarDay ? parseInt(lunarDay.trim(), 10) : undefined;
      const parsedMonth = lunarMonth ? parseInt(lunarMonth.trim(), 10) : undefined;

      await createMemorialEvent({
        personId: selectedPersonId,
        title: title.trim(),
        eventType,
        lunarDay: isNaN(parsedDay as number) ? undefined : parsedDay,
        lunarMonth: isNaN(parsedMonth as number) ? undefined : parsedMonth,
        solarDate: solarDate.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      toast.show('Đã lưu ngày giỗ thành công', 'success');
      navigation.goBack();
    } catch (e) {
      console.error('Save event error:', e);
      Alert.alert('Lỗi', 'Không thể lưu ngày giỗ.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title="Thêm Ngày Giỗ / Sự Kiện"
        canGoBack
        onGoBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Chọn người thân */}
        <View style={styles.card}>
          <Text style={[typography.subtitle1, styles.cardTitle]}>Chọn Người Thân *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.personScroll}>
            {persons.map(p => {
              const isSelected = selectedPersonId === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.personChip, isSelected && styles.personChipActive]}
                  onPress={() => handleSelectPerson(p)}>
                  <Avatar uri={p.avatarUri} name={p.name} gender={p.gender} size="sm" isDeceased={p.isDeceased} />
                  <View>
                    <Text style={[styles.personName, isSelected && styles.personNameActive]}>
                      {p.name}
                    </Text>
                    <Text style={styles.personRel}>
                      {p.customRelationToMe || p.inferredRelationToMe || 'Họ hàng'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Thông tin sự kiện */}
        <View style={styles.card}>
          <Text style={[typography.subtitle1, styles.cardTitle]}>Thông Tin Ngày Giỗ</Text>

          <Text style={[typography.subtitle2, styles.label]}>Loại sự kiện *</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[styles.typeBtn, eventType === 'death_anniversary' && styles.typeBtnActive]}
              onPress={() => setEventType('death_anniversary')}>
              <Text style={[styles.typeText, eventType === 'death_anniversary' && styles.typeTextActive]}>
                Ngày Giỗ (Âm lịch)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeBtn, eventType === 'birthday' && styles.typeBtnActive]}
              onPress={() => setEventType('birthday')}>
              <Text style={[styles.typeText, eventType === 'birthday' && styles.typeTextActive]}>
                Sinh Nhật
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[typography.subtitle2, styles.label]}>Tiêu đề sự kiện *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ví dụ: Ngày giỗ Bà nội, Giỗ Bác Cả..."
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />

          {eventType === 'death_anniversary' ? (
            <View style={styles.lunarRow}>
              <View style={styles.lunarCol}>
                <Text style={[typography.subtitle2, styles.label]}>Ngày (Âm lịch)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ví dụ: 15"
                  placeholderTextColor={colors.textMuted}
                  value={lunarDay}
                  onChangeText={setLunarDay}
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>

              <View style={styles.lunarCol}>
                <Text style={[typography.subtitle2, styles.label]}>Tháng (Âm lịch)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ví dụ: 7"
                  placeholderTextColor={colors.textMuted}
                  value={lunarMonth}
                  onChangeText={setLunarMonth}
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>
            </View>
          ) : (
            <View>
              <Text style={[typography.subtitle2, styles.label]}>Ngày dương lịch (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ví dụ: 1990-10-25"
                placeholderTextColor={colors.textMuted}
                value={solarDate}
                onChangeText={setSolarDate}
              />
            </View>
          )}

          <Text style={[typography.subtitle2, styles.label]}>Ghi chú & Địa điểm</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Ví dụ: Làm giỗ tại nhà thờ họ ở quê, người đứng cỗ: Bác Cả..."
            placeholderTextColor={colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        <AppButton
          title="Lưu ngày giỗ"
          onPress={handleSave}
          loading={saving}
          icon="calendar-check"
          size="lg"
        />
      </ScrollView>
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
    paddingBottom: spacing.xxxl + 16,
    gap: spacing.lg,
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
  personScroll: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  personChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  personChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  personName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  personNameActive: {
    color: colors.primaryDark,
  },
  personRel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  label: {
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 4,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  typeBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  typeTextActive: {
    color: colors.textInverse,
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
  lunarRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  lunarCol: {
    flex: 1,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
