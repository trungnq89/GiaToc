import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Share,
  Platform,
  Alert,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { captureRef } from 'react-native-view-shot';
import * as FS from '@dr.pogodin/react-native-fs';
import { RootStackParamList } from '../../navigation/types';
import { useSessionStore } from '../../store/sessionStore';
import { listPersons } from '../../db/repositories/personRepository';
import { PersonSummary, FamilyBranch } from '../../types';
import { colors, radius, spacing, typography } from '../../theme';
import { Chip, Icon, ScreenHeader, useToast, Avatar } from '../../components';
import { SafeAreaView } from 'react-native-safe-area-context';

type ScreenRouteProp = RouteProp<RootStackParamList, 'TreeExport'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type ThemeStyle = 'heritage' | 'jade' | 'modern';

interface GenerationTier {
  generation: number;
  label: string;
  subLabel: string;
  persons: PersonSummary[];
}

export function TreeExportScreen() {
  const route = useRoute<ScreenRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const toast = useToast();
  const user = useSessionStore(s => s.user);

  const [selectedBranch, setSelectedBranch] = useState<FamilyBranch | 'all'>(
    route.params?.defaultBranch || 'all',
  );
  const [theme, setTheme] = useState<ThemeStyle>('heritage');
  const [tiers, setTiers] = useState<GenerationTier[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [lastExportedUri, setLastExportedUri] = useState<string | null>(null);

  const canvasRef = useRef<any>(null);

  const loadTreeData = useCallback(async () => {
    try {
      const all = await listPersons({
        branch: selectedBranch === 'all' ? undefined : selectedBranch,
      });
      setTotalCount(all.length);

      // Group into 6 generations (+4, +3, +2, +1, 0, -1)
      const g4 = all.filter(p => p.generation >= 4);
      const g3 = all.filter(p => p.generation === 3);
      const g2 = all.filter(p => p.generation === 2);
      const g1 = all.filter(p => p.generation === 1);
      const g0 = all.filter(p => p.generation === 0);
      const gm1 = all.filter(p => p.generation <= -1);

      const list: GenerationTier[] = [];
      if (g4.length > 0) {
        list.push({
          generation: 4,
          label: 'ĐỜI THỨ NHẤT: BẬC CAO TỔ (KHỞI TỔ)',
          subLabel: 'Cụ Kỵ Khởi Tổ, Cao Tổ Phụ, Cao Tổ Mẫu',
          persons: g4,
        });
      }
      if (g3.length > 0) {
        list.push({
          generation: 3,
          label: 'ĐỜI THỨ HAI: BẬC TẰNG TỔ (CỤ CỐ)',
          subLabel: 'Cụ Cố, Cụ Bác, Cụ Chú, Cụ Cô',
          persons: g3,
        });
      }
      if (g2.length > 0) {
        list.push({
          generation: 2,
          label: 'ĐỜI THỨ BA: BẬC ÔNG BÀ (TIỀN BỐI)',
          subLabel: 'Ông Nội, Bà Nội, Ông Bác, Bà Cô',
          persons: g2,
        });
      }
      if (g1.length > 0) {
        list.push({
          generation: 1,
          label: 'ĐỜI THỨ TƯ: BẬC CHA CHÚ (CÔ DÌ BÁC)',
          subLabel: 'Bố, Mẹ, Bác Cả, Chú Ba, Cô Tư, Chú Út',
          persons: g1,
        });
      }
      if (g0.length > 0) {
        list.push({
          generation: 0,
          label: 'ĐỜI THỨ NĂM: THẾ HỆ CỦA TÔI & ANH CHỊ EM',
          subLabel: 'Tôi, Vợ, Anh Chị Em ruột và Anh Chị Em họ',
          persons: g0,
        });
      }
      if (gm1.length > 0) {
        list.push({
          generation: -1,
          label: 'ĐỜI THỨ SÁU: BẬC CON CHÁU ĐỜI MỚI',
          subLabel: 'Con trai cả, Con gái út, Các cháu đời kế tục',
          persons: gm1,
        });
      }

      setTiers(list);
    } catch (e) {
      console.warn('Load tree export data error:', e);
    }
  }, [selectedBranch]);

  useEffect(() => {
    loadTreeData();
  }, [loadTreeData]);

  // Color schemes for themes
  const themeColors = {
    heritage: {
      bg: '#FDFBF7',
      cardBg: '#FFFDF9',
      border: '#C59B27',
      title: '#5C1D11',
      subtitle: '#8B4513',
      text: '#2C1810',
      badgeBg: '#FCEFD2',
      badgeText: '#854D0E',
      connector: '#D4AF37',
      footer: '#78350F',
    },
    jade: {
      bg: '#F2F8F4',
      cardBg: '#FFFFFF',
      border: '#2E7D32',
      title: '#1B5E20',
      subtitle: '#2E7D32',
      text: '#0D3315',
      badgeBg: '#E8F5E9',
      badgeText: '#1B5E20',
      connector: '#4CAF50',
      footer: '#1B5E20',
    },
    modern: {
      bg: '#F8FAFC',
      cardBg: '#FFFFFF',
      border: '#64748B',
      title: '#0F172A',
      subtitle: '#334155',
      text: '#1E293B',
      badgeBg: '#F1F5F9',
      badgeText: '#475569',
      connector: '#94A3B8',
      footer: '#475569',
    },
  }[theme];

  const captureCanvasImage = async (): Promise<string | null> => {
    if (!canvasRef.current) return null;
    try {
      const uri = await captureRef(canvasRef.current, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      });
      return uri;
    } catch (e) {
      console.warn('Capture tree error:', e);
      return null;
    }
  };

  const handleSaveToDevice = async () => {
    try {
      setIsExporting(true);
      const uri = await captureCanvasImage();
      if (!uri) {
        Alert.alert('Lỗi', 'Không thể chụp ảnh cây gia phả.');
        return;
      }

      // Đường dẫn lưu file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `GiaPha_${timestamp}.png`;

      let targetDir = FS.DownloadDirectoryPath;
      if (Platform.OS === 'ios') {
        targetDir = FS.DocumentDirectoryPath;
      }

      const destPath = `${targetDir}/${filename}`;
      let cleanSource = uri;
      if (cleanSource.startsWith('file://')) {
        cleanSource = cleanSource.replace('file://', '');
      }

      await FS.copyFile(cleanSource, destPath);

      // Cho Android quét file để hiện trong Bộ sưu tập (Gallery)
      if (Platform.OS === 'android') {
        try {
          await FS.scanFile(destPath);
        } catch (scanErr) {
          console.warn('Scan file error:', scanErr);
        }
      }

      setLastExportedUri(destPath);
      toast.show(`Đã lưu ảnh cây gia phả vào máy!\n(${filename})`, 'success');
      Alert.alert(
        'Đã lưu thành công!',
        `Ảnh cây gia phả độ nét cao đã được lưu tại:\n${destPath}\n\nBạn có thể mở Bộ sưu tập (Thư viện ảnh) hoặc thư mục Tải về để xem.`,
        [
          { text: 'Đóng', style: 'default' },
          {
            text: 'Chia sẻ ngay',
            onPress: () => handleShareFile(`file://${destPath}`),
          },
        ],
      );
    } catch (e) {
      console.error(e);
      Alert.alert('Lỗi', 'Không thể lưu ảnh cây gia phả vào thiết bị.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareFile = async (customUri?: string) => {
    try {
      setIsExporting(true);
      let uriToShare = customUri;
      if (!uriToShare) {
        const captured = await captureCanvasImage();
        if (!captured) {
          Alert.alert('Lỗi', 'Không thể tạo ảnh để chia sẻ.');
          return;
        }
        uriToShare = captured.startsWith('file://') ? captured : `file://${captured}`;
      }

      await Share.share({
        title: 'Cây Gia Phả Dòng Họ',
        message: `Cây Gia Phả Dòng Họ - Lập bởi ${user?.name || 'Tôi'} từ ứng dụng Sổ Họ Hàng Gia Tộc.`,
        url: uriToShare,
      });
    } catch (e) {
      console.warn('Share tree error:', e);
    } finally {
      setIsExporting(false);
    }
  };

  const todayStr = new Date().toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title="Xuất Cây Gia Phả"
        canGoBack
        onGoBack={() => navigation.goBack()}
        rightAction={{
          icon: 'share-variant-outline',
          onPress: () => handleShareFile(),
        }}
      />

      {/* Control Filters */}
      <View style={styles.controlsBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          {/* Branch filter */}
          <Chip
            label="Tất cả các nhánh"
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
            label="Bên Vợ/Chồng"
            selected={selectedBranch === 'vo_chong'}
            activeColor={colors.branchVoChong}
            onPress={() => setSelectedBranch('vo_chong')}
          />

          <View style={styles.separator} />

          {/* Theme selector */}
          <Chip
            label="🏛 Hoàng gia"
            selected={theme === 'heritage'}
            activeColor="#B8860B"
            onPress={() => setTheme('heritage')}
          />
          <Chip
            label="🌿 Ngọc bích"
            selected={theme === 'jade'}
            activeColor="#2E7D32"
            onPress={() => setTheme('jade')}
          />
          <Chip
            label="⚡ Hiện đại"
            selected={theme === 'modern'}
            activeColor="#475569"
            onPress={() => setTheme('modern')}
          />
        </ScrollView>
      </View>

      {/* Canvas Scroll Area (Scrollable in both directions for large family trees) */}
      <ScrollView
        style={styles.previewContainer}
        horizontal
        showsHorizontalScrollIndicator
        contentContainerStyle={styles.horizontalScrollContent}>
        <ScrollView
          showsVerticalScrollIndicator
          contentContainerStyle={styles.verticalScrollContent}>
          
          {/* Capture Area */}
          <View
            ref={canvasRef}
            collapsable={false}
            style={[
              styles.posterCanvas,
              { backgroundColor: themeColors.bg, borderColor: themeColors.border },
            ]}>
            {/* Poster Decorative Frame */}
            <View style={[styles.innerBorder, { borderColor: themeColors.border }]}>
              {/* Header Scroll / Hoành Phi */}
              <View style={styles.posterHeader}>
                <View style={styles.ornamentRow}>
                  <Text style={[styles.ornamentText, { color: themeColors.border }]}>❖ ═══════════════ ⚜ ═══════════════ ❖</Text>
                </View>

                <Text style={[styles.posterTitle, { color: themeColors.title }]}>
                  CÂY GIA PHẢ GIA TỘC
                </Text>

                <Text style={[styles.posterProverb, { color: themeColors.subtitle }]}>
                  "Cây có cội mới trổ cành xanh ngọn • Nước có nguồn mới tỏa nhánh muôn sông"
                </Text>

                <View style={styles.metaRow}>
                  <Text style={[styles.metaText, { color: themeColors.text }]}>
                    Chủ hộ: <Text style={{ fontWeight: '700' }}>{user?.name || 'Tôi'}</Text>
                  </Text>
                  <Text style={[styles.metaDot, { color: themeColors.border }]}>•</Text>
                  <Text style={[styles.metaText, { color: themeColors.text }]}>
                    Quy mô: <Text style={{ fontWeight: '700' }}>{tiers.length} Thế hệ ({totalCount} Nhân khẩu)</Text>
                  </Text>
                  <Text style={[styles.metaDot, { color: themeColors.border }]}>•</Text>
                  <Text style={[styles.metaText, { color: themeColors.text }]}>
                    Ngày kết xuất: <Text style={{ fontWeight: '700' }}>{todayStr}</Text>
                  </Text>
                </View>

                <View style={styles.ornamentRow}>
                  <Text style={[styles.ornamentText, { color: themeColors.border }]}>───────────────────────────────────────</Text>
                </View>
              </View>

              {/* Generations Tiers */}
              <View style={styles.tiersContainer}>
                {tiers.map((tier, tierIdx) => (
                  <View key={tier.generation} style={styles.tierSection}>
                    {/* Tier Header Banner */}
                    <View
                      style={[
                        styles.tierHeaderBanner,
                        { backgroundColor: themeColors.badgeBg, borderColor: themeColors.border },
                      ]}>
                      <Icon name="crown-outline" size={16} color={themeColors.title} />
                      <Text style={[styles.tierLabel, { color: themeColors.title }]}>
                        {tier.label}
                      </Text>
                    </View>

                    {/* Member Cards Row */}
                    <View style={styles.membersRow}>
                      {tier.persons.map(person => {
                        const isNoi = person.branch === 'noi';
                        const isNgoai = person.branch === 'ngoai';
                        const isVoChong = person.branch === 'vo_chong';

                        const branchBadgeColor = isNoi
                          ? colors.branchNoi
                          : isNgoai
                          ? colors.branchNgoai
                          : isVoChong
                          ? colors.branchVoChong
                          : colors.branchKhac;

                        return (
                          <View
                            key={person.id}
                            style={[
                              styles.memberCard,
                              { backgroundColor: themeColors.cardBg, borderColor: themeColors.border },
                            ]}>
                            {/* Deceased Ribbon / Lotus Badge */}
                            {person.isDeceased ? (
                              <View style={styles.deceasedMark}>
                                <Text style={styles.deceasedMarkText}>🪷 Đã khuất</Text>
                              </View>
                            ) : null}

                            {/* Avatar Portrait */}
                            <View style={styles.avatarWrap}>
                              <Avatar
                                uri={person.avatarUri}
                                name={person.name}
                                gender={person.gender}
                                branch={person.branch}
                                size={44}
                                isDeceased={person.isDeceased}
                              />
                            </View>

                            {/* Name */}
                            <Text
                              style={[styles.memberName, { color: themeColors.text }]}
                              numberOfLines={1}>
                              {person.name}
                            </Text>

                            {/* Nickname */}
                            {person.nickname ? (
                              <Text style={[styles.memberNickname, { color: themeColors.subtitle }]}>
                                ({person.nickname})
                              </Text>
                            ) : null}

                            {/* Relation to me */}
                            <View
                              style={[
                                styles.relationBadge,
                                { borderColor: branchBadgeColor },
                              ]}>
                              <Text style={[styles.relationText, { color: branchBadgeColor }]}>
                                {person.customRelationToMe || person.inferredRelationToMe || 'Họ hàng'}
                              </Text>
                            </View>

                            {/* Birth Year */}
                            <Text style={[styles.memberBirth, { color: themeColors.subtitle }]}>
                              {person.birthYear ? `Sinh: ${person.birthYear}` : ''}
                            </Text>
                          </View>
                        );
                      })}
                    </View>

                    {/* Connector line to next generation */}
                    {tierIdx < tiers.length - 1 && (
                      <View style={styles.connectorWrapper}>
                        <View style={[styles.verticalLine, { backgroundColor: themeColors.connector }]} />
                        <View style={[styles.connectorDot, { backgroundColor: themeColors.border }]} />
                        <View style={[styles.verticalLine, { backgroundColor: themeColors.connector }]} />
                      </View>
                    )}
                  </View>
                ))}
              </View>

              {/* Poster Footer Stamp */}
              <View style={styles.posterFooter}>
                <View style={[styles.sealBox, { borderColor: themeColors.border }]}>
                  <Text style={[styles.sealText, { color: themeColors.title }]}>
                    ❖ GIA TỘC TRƯỜNG TỒN • PHÚC ĐỨC LƯU TRUYỀN ❖
                  </Text>
                  <Text style={[styles.sealSub, { color: themeColors.subtitle }]}>
                    Ứng Dụng Sổ Họ Hàng Gia Tộc • Lưu Giữ Bản Sắc Cội Nguồn
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </ScrollView>

      {/* Floating Action Buttons */}
      <View style={styles.actionFooter}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.saveBtn]}
          activeOpacity={0.8}
          onPress={handleSaveToDevice}
          disabled={isExporting}>
          {isExporting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Icon name="download" size={20} color="#FFF" />
              <Text style={styles.saveBtnText}>Lưu ảnh vào máy</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.shareBtn]}
          activeOpacity={0.8}
          onPress={() => handleShareFile()}
          disabled={isExporting}>
          <Icon name="share-variant" size={20} color={colors.primary} />
          <Text style={styles.shareBtnText}>Chia sẻ ảnh</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  controlsBar: {
    backgroundColor: colors.card,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chipsScroll: {
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  separator: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#374151', // Dark contrast background behind poster
  },
  horizontalScrollContent: {
    minWidth: '100%',
    padding: spacing.md,
    alignItems: 'center',
  },
  verticalScrollContent: {
    paddingBottom: 80,
  },
  posterCanvas: {
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: 2,
    minWidth: 840,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  innerBorder: {
    borderWidth: 1.5,
    borderStyle: 'solid',
    padding: 20,
    borderRadius: radius.md,
  },
  posterHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  ornamentRow: {
    marginVertical: 4,
  },
  ornamentText: {
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '600',
  },
  posterTitle: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
    marginVertical: spacing.xs,
    textTransform: 'uppercase',
  },
  posterProverb: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  metaText: {
    fontSize: 12,
  },
  metaDot: {
    fontSize: 12,
  },
  tiersContainer: {
    gap: spacing.lg,
  },
  tierSection: {
    alignItems: 'center',
  },
  tierHeaderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  tierLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  membersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    maxWidth: 780,
  },
  memberCard: {
    width: 148,
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    position: 'relative',
    minHeight: 180,
  },
  avatarWrap: {
    marginTop: 8,
    marginBottom: 6,
    alignItems: 'center',
  },
  deceasedMark: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    zIndex: 2,
  },
  deceasedMarkText: {
    fontSize: 9,
    color: '#6B7280',
    fontWeight: '600',
  },
  memberName: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
  },
  memberNickname: {
    fontSize: 11,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 2,
  },
  relationBadge: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 6,
    backgroundColor: '#FFF',
  },
  relationText: {
    fontSize: 10,
    fontWeight: '700',
  },
  memberBirth: {
    fontSize: 10,
    marginTop: 4,
  },
  connectorWrapper: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  verticalLine: {
    width: 2,
    height: 14,
  },
  connectorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginVertical: 1,
  },
  posterFooter: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  sealBox: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  sealText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  sealSub: {
    fontSize: 9.5,
    marginTop: 2,
    fontStyle: 'italic',
  },
  actionFooter: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  saveBtn: {
    backgroundColor: colors.primary,
  },
  saveBtnText: {
    ...typography.button,
    color: '#FFF',
  },
  shareBtn: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  shareBtnText: {
    ...typography.button,
    color: colors.primary,
  },
});
