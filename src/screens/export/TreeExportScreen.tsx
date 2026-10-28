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
import { query } from '../../db/database';
import { PersonSummary, FamilyBranch } from '../../types';
import { colors, radius, spacing, typography } from '../../theme';
import { Chip, Icon, ScreenHeader, useToast, Avatar } from '../../components';
import { SafeAreaView } from 'react-native-safe-area-context';

type ScreenRouteProp = RouteProp<RootStackParamList, 'TreeExport'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type ThemeStyle = 'heritage' | 'jade' | 'modern';

interface RelationshipRow {
  person_id: string;
  related_person_id: string;
  relation_type: string;
}

export interface FamilyUnit {
  id: string;
  primary: PersonSummary;
  spouse?: PersonSummary;
  childIds: string[];
}

export interface FamilyBranchGroup {
  branchKey: string;
  parentLabel?: string;
  units: FamilyUnit[];
}

export interface GenerationTier {
  generation: number;
  label: string;
  subLabel: string;
  branchGroups: FamilyBranchGroup[];
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

      // Load all relationships to connect spouses and parent-child hierarchy
      const relRows = await query<RelationshipRow>(
        'SELECT person_id, related_person_id, relation_type FROM relationships;'
      );

      const personMap = new Map<string, PersonSummary>();
      all.forEach(p => personMap.set(p.id, p));

      // Build indexing maps
      const spouseMap = new Map<string, string>();
      const childrenMap = new Map<string, string[]>();
      const parentsMap = new Map<string, string[]>();

      for (const r of relRows) {
        if (r.relation_type === 'spouse') {
          spouseMap.set(r.person_id, r.related_person_id);
        } else if (r.relation_type === 'parent') {
          // person_id has parent related_person_id
          const pList = parentsMap.get(r.person_id) || [];
          if (!pList.includes(r.related_person_id)) pList.push(r.related_person_id);
          parentsMap.set(r.person_id, pList);

          // related_person_id has child person_id
          const cList = childrenMap.get(r.related_person_id) || [];
          if (!cList.includes(r.person_id)) cList.push(r.person_id);
          childrenMap.set(r.related_person_id, cList);
        } else if (r.relation_type === 'child') {
          const cList = childrenMap.get(r.person_id) || [];
          if (!cList.includes(r.related_person_id)) cList.push(r.related_person_id);
          childrenMap.set(r.person_id, cList);

          const pList = parentsMap.get(r.related_person_id) || [];
          if (!pList.includes(r.person_id)) pList.push(r.person_id);
          parentsMap.set(r.related_person_id, pList);
        }
      }

      // Helper to build a generation tier
      const buildTier = (
        genNum: number,
        label: string,
        subLabel: string,
      ): GenerationTier | null => {
        const genPersons = all.filter(p =>
          genNum === 4
            ? p.generation >= 4
            : genNum === -1
            ? p.generation <= -1
            : p.generation === genNum,
        );
        if (genPersons.length === 0) return null;

        // Group into FamilyUnits (Couples or Singles)
        const visited = new Set<string>();
        const rawUnits: FamilyUnit[] = [];

        for (const p of genPersons) {
          if (visited.has(p.id)) continue;
          visited.add(p.id);

          const spouseId = spouseMap.get(p.id);
          const spouse = spouseId ? personMap.get(spouseId) : undefined;

          if (spouse && genPersons.some(gp => gp.id === spouseId)) {
            visited.add(spouse.id);

            // Put male or blood relative first if applicable
            const [primary, sp] =
              p.gender === 'female' && spouse.gender === 'male'
                ? [spouse, p]
                : [p, spouse];

            const combinedChildren = Array.from(
              new Set([
                ...(childrenMap.get(primary.id) || []),
                ...(childrenMap.get(sp.id) || []),
              ]),
            );

            rawUnits.push({
              id: `couple_${primary.id}_${sp.id}`,
              primary,
              spouse: sp,
              childIds: combinedChildren,
            });
          } else {
            rawUnits.push({
              id: `single_${p.id}`,
              primary: p,
              childIds: childrenMap.get(p.id) || [],
            });
          }
        }

        // Group rawUnits by parent branch origin
        const branchMap = new Map<string, FamilyUnit[]>();
        for (const unit of rawUnits) {
          const parentIds = parentsMap.get(unit.primary.id) || [];
          const key = parentIds.length > 0 ? parentIds.sort().join('_') : 'root';
          const list = branchMap.get(key) || [];
          list.push(unit);
          branchMap.set(key, list);
        }

        const branchGroups: FamilyBranchGroup[] = [];
        branchMap.forEach((units, key) => {
          let parentLabel: string | undefined = undefined;
          if (key !== 'root') {
            const pIds = key.split('_');
            const parentNames = pIds
              .map(pid => {
                const parent = personMap.get(pid);
                return parent?.nickname || parent?.name;
              })
              .filter(Boolean);
            if (parentNames.length > 0) {
              parentLabel = `Chi con của ${parentNames.join(' & ')}`;
            }
          }
          branchGroups.push({
            branchKey: key,
            parentLabel,
            units,
          });
        });

        return {
          generation: genNum,
          label,
          subLabel,
          branchGroups,
        };
      };

      const list: GenerationTier[] = [];
      const t4 = buildTier(4, 'ĐỜI THỨ NHẤT: BẬC CAO TỔ (KHỞI TỔ)', 'Cụ Kỵ Khởi Tổ, Cao Tổ Phụ, Cao Tổ Mẫu');
      if (t4) list.push(t4);

      const t3 = buildTier(3, 'ĐỜI THỨ HAI: BẬC TẰNG TỔ (CỤ CỐ)', 'Cụ Cố, Cụ Bác, Cụ Chú, Cụ Cô');
      if (t3) list.push(t3);

      const t2 = buildTier(2, 'ĐỜI THỨ BA: BẬC ÔNG BÀ (TIỀN BỐI)', 'Ông Nội, Bà Nội, Ông Bác, Bà Cô');
      if (t2) list.push(t2);

      const t1 = buildTier(1, 'ĐỜI THỨ TƯ: BẬC CHA CHÚ (CÔ DÌ BÁC)', 'Bố, Mẹ, Bác Cả, Chú Ba, Cô Tư, Chú Út');
      if (t1) list.push(t1);

      const t0 = buildTier(0, 'ĐỜI THỨ NĂM: THẾ HỆ CỦA TÔI & ANH CHỊ EM', 'Tôi, Vợ, Anh Chị Em ruột và Anh Chị Em họ');
      if (t0) list.push(t0);

      const tm1 = buildTier(-1, 'ĐỜI THỨ SÁU: BẬC CON CHÁU ĐỜI MỚI', 'Con trai cả, Con gái út, Các cháu đời kế tục');
      if (tm1) list.push(tm1);

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
        title: 'Cây Gia Phả Gia Tộc',
        message: 'Cây Gia Phả Gia Tộc độ nét cao lưu giữ bản sắc cội nguồn.',
        url: uriToShare,
      });
    } catch (e) {
      console.warn('Share error:', e);
    } finally {
      setIsExporting(false);
    }
  };

  // Helper render a single Person Card
  const renderPersonCard = (person: PersonSummary) => {
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
            size={42}
            isDeceased={person.isDeceased}
          />
        </View>

        {/* Name */}
        <Text style={[styles.memberName, { color: themeColors.text }]} numberOfLines={1}>
          {person.name}
        </Text>

        {/* Nickname */}
        {person.nickname ? (
          <Text style={[styles.memberNickname, { color: themeColors.subtitle }]}>
            ({person.nickname})
          </Text>
        ) : null}

        {/* Relation to me */}
        <View style={[styles.relationBadge, { borderColor: branchBadgeColor }]}>
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
  };

  // Helper render a FamilyUnit (Single person OR Married Couple with marital connector line)
  const renderFamilyUnit = (unit: FamilyUnit) => {
    return (
      <View key={unit.id} style={styles.familyUnitWrapper}>
        <View style={styles.coupleRow}>
          {/* Husband / Primary Person Card */}
          {renderPersonCard(unit.primary)}

          {/* Marital Connector Line if spouse exists */}
          {unit.spouse ? (
            <View style={styles.maritalConnector}>
              <View style={[styles.maritalLine, { backgroundColor: themeColors.connector }]} />
              <View
                style={[
                  styles.maritalBadge,
                  { backgroundColor: themeColors.badgeBg, borderColor: themeColors.border },
                ]}>
                <Text style={[styles.maritalIcon, { color: themeColors.border }]}>⚭</Text>
                <Text style={[styles.maritalLabel, { color: themeColors.badgeText }]}>
                  Phu Thê
                </Text>
              </View>
              <View style={[styles.maritalLine, { backgroundColor: themeColors.connector }]} />
            </View>
          ) : null}

          {/* Wife / Spouse Card if spouse exists */}
          {unit.spouse ? renderPersonCard(unit.spouse) : null}
        </View>

        {/* Downward stem descending from parents to children if they have descendants */}
        {unit.childIds.length > 0 ? (
          <View style={styles.parentStemWrapper}>
            <View style={[styles.stemLine, { backgroundColor: themeColors.connector }]} />
            <View style={[styles.stemKnot, { backgroundColor: themeColors.border }]}>
              <Text style={styles.stemKnotText}>▼</Text>
            </View>
            <View style={[styles.stemLine, { backgroundColor: themeColors.connector }]} />
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title="Xuất Cây Gia Phả"
        rightAction={{
          icon: 'share-variant',
          onPress: () => handleShareFile(),
        }}
      />

      {/* Filter and Theme Selectors */}
      <View style={styles.controlsBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}>
          <Chip
            label="Tất cả các nhánh"
            selected={selectedBranch === 'all'}
            onPress={() => setSelectedBranch('all')}
          />
          <Chip
            label="Bên Nội"
            selected={selectedBranch === 'noi'}
            onPress={() => setSelectedBranch('noi')}
          />
          <Chip
            label="Bên Ngoại"
            selected={selectedBranch === 'ngoai'}
            onPress={() => setSelectedBranch('ngoai')}
          />
          <Chip
            label="Bên Vợ/Chồng"
            selected={selectedBranch === 'vo_chong'}
            onPress={() => setSelectedBranch('vo_chong')}
          />

          <View style={styles.separator} />

          {/* Themes */}
          <Chip
            label="📜 Hoàng gia"
            selected={theme === 'heritage'}
            onPress={() => setTheme('heritage')}
          />
          <Chip
            label="🌿 Ngọc bích"
            selected={theme === 'jade'}
            onPress={() => setTheme('jade')}
          />
          <Chip
            label="🏛️ Hiện đại"
            selected={theme === 'modern'}
            onPress={() => setTheme('modern')}
          />
        </ScrollView>
      </View>

      {/* Main Preview Canvas with Two-Way Pan & Zoom */}
      <View style={styles.previewContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={styles.horizontalScrollContent}>
          <ScrollView
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.verticalScrollContent}>
            {/* The Actual Poster to Capture */}
            <View
              ref={canvasRef}
              collapsable={false}
              style={[
                styles.posterCanvas,
                { backgroundColor: themeColors.bg, borderColor: themeColors.border },
              ]}>
              {/* Inner Decorative Golden Border */}
              <View style={[styles.innerBorder, { borderColor: themeColors.border }]}>
                {/* Traditional Vietnamese Hoành Phi Header */}
                <View style={styles.posterHeader}>
                  <View style={styles.ornamentRow}>
                    <Text style={[styles.ornamentText, { color: themeColors.border }]}>
                      ❖ ======================== ❖ ======================== ❖
                    </Text>
                  </View>
                  <Text style={[styles.posterTitle, { color: themeColors.title }]}>
                    CÂY GIA PHẢ GIA TỘC
                  </Text>
                  <Text style={[styles.posterSubtitle, { color: themeColors.subtitle }]}>
                    "Cây có cội mới trổ cành xanh ngọn • Nước có nguồn mới tỏa nhánh muôn sông"
                  </Text>
                  <View style={styles.metaRow}>
                    <Text style={[styles.metaText, { color: themeColors.subtitle }]}>
                      Chủ hộ: <Text style={{ fontWeight: '700' }}>{user?.name || 'Tôi'}</Text>
                    </Text>
                    <Text style={[styles.metaDot, { color: themeColors.border }]}>•</Text>
                    <Text style={[styles.metaText, { color: themeColors.subtitle }]}>
                      Quy mô: <Text style={{ fontWeight: '700' }}>{tiers.length} Thế hệ ({totalCount} Nhân khẩu)</Text>
                    </Text>
                    <Text style={[styles.metaDot, { color: themeColors.border }]}>•</Text>
                    <Text style={[styles.metaText, { color: themeColors.subtitle }]}>
                      Ngày kết xuất: <Text style={{ fontWeight: '700' }}>{new Date().toLocaleDateString('vi-VN')}</Text>
                    </Text>
                  </View>

                  <View style={styles.ornamentRow}>
                    <Text style={[styles.ornamentText, { color: themeColors.border }]}>
                      ───────────────────────────────────────────────────────
                    </Text>
                  </View>
                </View>

                {/* Generational Tiers Hierarchy */}
                <View style={styles.tiersContainer}>
                  {tiers.map((tier, tierIdx) => (
                    <View key={tier.generation} style={styles.tierSection}>
                      {/* Generational Banner */}
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

                      {/* Branch Groups inside this generation */}
                      <View style={styles.branchGroupsWrapper}>
                        {tier.branchGroups.map(branchGroup => {
                          const hasMultipleUnits = branchGroup.units.length > 1;

                          return (
                            <View key={branchGroup.branchKey} style={styles.branchContainer}>
                              {/* Branch Parent Badge if applicable */}
                              {branchGroup.parentLabel ? (
                                <View style={styles.branchHeaderRow}>
                                  <View style={[styles.branchTopStem, { backgroundColor: themeColors.connector }]} />
                                  <View
                                    style={[
                                      styles.branchBadge,
                                      { backgroundColor: themeColors.badgeBg, borderColor: themeColors.border },
                                    ]}>
                                    <Text style={[styles.branchBadgeText, { color: themeColors.badgeText }]}>
                                      🌿 {branchGroup.parentLabel}
                                    </Text>
                                  </View>
                                </View>
                              ) : null}

                              {/* Sibling branching crossbar & unit columns */}
                              {hasMultipleUnits ? (
                                <View style={styles.branchCrossbarRow}>
                                  {branchGroup.units.map((unit, uIdx) => (
                                    <View key={unit.id} style={styles.branchUnitCol}>
                                      {/* Horizontal Crossbar across siblings */}
                                      <View style={styles.crossbarLineRow}>
                                        <View
                                          style={[
                                            styles.halfBar,
                                            {
                                              backgroundColor:
                                                uIdx === 0 ? 'transparent' : themeColors.connector,
                                            },
                                          ]}
                                        />
                                        <View
                                          style={[
                                            styles.halfBar,
                                            {
                                              backgroundColor:
                                                uIdx === branchGroup.units.length - 1
                                                  ? 'transparent'
                                                  : themeColors.connector,
                                            },
                                          ]}
                                        />
                                      </View>
                                      {/* Vertical drop line down into child unit */}
                                      <View
                                        style={[
                                          styles.dropLine,
                                          { backgroundColor: themeColors.connector },
                                        ]}
                                      />
                                      {renderFamilyUnit(unit)}
                                    </View>
                                  ))}
                                </View>
                              ) : (
                                <View style={styles.singleUnitCol}>
                                  {branchGroup.parentLabel ? (
                                    <View
                                      style={[
                                        styles.dropLine,
                                        { backgroundColor: themeColors.connector },
                                      ]}
                                    />
                                  ) : null}
                                  {renderFamilyUnit(branchGroup.units[0])}
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </View>

                      {/* Generational Trunk Link to next generation */}
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
      </View>

      {/* Floating Bottom Action Bar */}
      <View style={styles.bottomBar}>
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
    backgroundColor: '#374151',
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
    minWidth: 1480,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  innerBorder: {
    borderWidth: 1.5,
    borderStyle: 'solid',
    padding: 24,
    borderRadius: radius.md,
  },
  posterHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  ornamentRow: {
    marginBottom: spacing.xs,
  },
  ornamentText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
  },
  posterTitle: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 4,
    marginTop: spacing.xs,
    textTransform: 'uppercase',
  },
  posterSubtitle: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: spacing.xs,
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
    gap: spacing.xl,
  },
  tierSection: {
    alignItems: 'center',
    width: '100%',
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
  branchGroupsWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    width: '100%',
  },
  branchContainer: {
    alignItems: 'center',
    marginVertical: 4,
  },
  branchHeaderRow: {
    alignItems: 'center',
    marginBottom: 2,
  },
  branchTopStem: {
    width: 2,
    height: 12,
    marginBottom: 2,
  },
  branchBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    marginBottom: 4,
  },
  branchBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  branchCrossbarRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 12,
  },
  branchUnitCol: {
    alignItems: 'center',
  },
  singleUnitCol: {
    alignItems: 'center',
  },
  crossbarLineRow: {
    flexDirection: 'row',
    width: '100%',
    height: 2,
  },
  halfBar: {
    flex: 1,
    height: 2,
  },
  dropLine: {
    width: 2,
    height: 14,
  },
  familyUnitWrapper: {
    alignItems: 'center',
    marginHorizontal: 4,
  },
  coupleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  maritalConnector: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 54,
  },
  maritalLine: {
    height: 2,
    width: '100%',
  },
  maritalBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    marginVertical: 3,
  },
  maritalIcon: {
    fontSize: 11,
    fontWeight: '800',
  },
  maritalLabel: {
    fontSize: 8,
    fontWeight: '700',
  },
  parentStemWrapper: {
    alignItems: 'center',
    marginTop: 6,
  },
  stemLine: {
    width: 2,
    height: 10,
  },
  stemKnot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stemKnotText: {
    fontSize: 7,
    color: '#FFF',
    fontWeight: '900',
  },
  memberCard: {
    width: 132,
    padding: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    position: 'relative',
    minHeight: 175,
  },
  avatarWrap: {
    marginTop: 6,
    marginBottom: 4,
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
    fontSize: 8,
    color: '#6B7280',
    fontWeight: '600',
  },
  memberName: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
  },
  memberNickname: {
    fontSize: 10,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 1,
  },
  relationBadge: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
    backgroundColor: 'transparent',
  },
  relationText: {
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
  memberBirth: {
    fontSize: 10,
    marginTop: 4,
  },
  connectorWrapper: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  verticalLine: {
    width: 2,
    height: 18,
  },
  connectorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginVertical: 2,
  },
  posterFooter: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  sealBox: {
    borderWidth: 2,
    borderStyle: 'solid',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  sealText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  sealSub: {
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },
  bottomBar: {
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  saveBtn: {
    backgroundColor: colors.primary,
  },
  saveBtnText: {
    ...typography.subtitle2,
    color: '#FFF',
    fontWeight: '700',
  },
  shareBtn: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  shareBtnText: {
    ...typography.subtitle2,
    color: colors.primary,
    fontWeight: '700',
  },
});
