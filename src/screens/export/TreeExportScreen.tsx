import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  useWindowDimensions,
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
  extraSpouses?: PersonSummary[];
  childIds: string[];
}

export interface FamilyTreeNode {
  id: string;
  unit: FamilyUnit;
  generation: number;
  children: FamilyTreeNode[];
  subtreeWidth: number;
}

export interface GenerationMetadata {
  generation: number;
  orderText: string;
  romanNumeral: string;
  rankTitle: string;
  description: string;
}

export const CARD_WIDTH = 132;
export const CARD_HEIGHT = 180;
export const MARITAL_GAP = 54;
export const SIBLING_GAP = 28;
export const ROOT_GAP = 64;
export const STEM_DROP = 26;
export const STEM_BRANCH = 24;
export const ROW_HEIGHT = CARD_HEIGHT + STEM_DROP + STEM_BRANCH; // 230

export function getFamilyUnitWidth(unit: FamilyUnit): number {
  let w = CARD_WIDTH;
  if (unit.spouse) {
    w += MARITAL_GAP + CARD_WIDTH;
  }
  if (unit.extraSpouses && unit.extraSpouses.length > 0) {
    w += unit.extraSpouses.length * (MARITAL_GAP + CARD_WIDTH);
  }
  return w;
}

export const GENERATION_DEFS: Record<number, GenerationMetadata> = {
  4: {
    generation: 4,
    orderText: 'ĐỜI THỨ NHẤT',
    romanNumeral: 'ĐỜI I',
    rankTitle: 'BẬC CAO TỔ (KHỞI TỔ)',
    description: 'Cụ Kỵ Khởi Tổ, Cao Tổ Phụ, Cao Tổ Mẫu',
  },
  3: {
    generation: 3,
    orderText: 'ĐỜI THỨ HAI',
    romanNumeral: 'ĐỜI II',
    rankTitle: 'BẬC TẰNG TỔ (CỤ CỐ)',
    description: 'Cụ Cố, Cụ Bác, Cụ Chú, Cụ Cô',
  },
  2: {
    generation: 2,
    orderText: 'ĐỜI THỨ BA',
    romanNumeral: 'ĐỜI III',
    rankTitle: 'BẬC ÔNG BÀ (TIỀN BỐI)',
    description: 'Ông Bà Nội, Ông Bà Ngoại, Ông Bác, Bà Cô',
  },
  1: {
    generation: 1,
    orderText: 'ĐỜI THỨ TƯ',
    romanNumeral: 'ĐỜI IV',
    rankTitle: 'BẬC CHA CHÚ (CÔ DÌ BÁC)',
    description: 'Bố, Mẹ, Bác Cả, Chú Ba, Cô Tư, Cậu Út',
  },
  0: {
    generation: 0,
    orderText: 'ĐỜI THỨ NĂM',
    romanNumeral: 'ĐỜI V',
    rankTitle: 'THẾ HỆ TÔI & ANH CHỊ EM',
    description: 'Tôi, Vợ/Chồng, Anh Chị Em ruột & Họ hàng',
  },
  '-1': {
    generation: -1,
    orderText: 'ĐỜI THỨ SÁU',
    romanNumeral: 'ĐỜI VI',
    rankTitle: 'BẬC CON CHÁU KẾ TỤC',
    description: 'Con trai cả, Con gái út, Cháu chắt đời mới',
  },
};

export function getGenerationMeta(gen: number): GenerationMetadata {
  if (GENERATION_DEFS[gen]) return GENERATION_DEFS[gen];
  return {
    generation: gen,
    orderText: `THẾ HỆ ${gen > 0 ? `+${gen}` : gen}`,
    romanNumeral: `GEN ${gen}`,
    rankTitle: gen > 0 ? `BẬC TIỀN NHÂN (${gen})` : `BẬC HẬU DUỆ (${gen})`,
    description: 'Thành viên gia tộc',
  };
}

function buildTreeNode(
  unit: FamilyUnit,
  personToUnitMap: Map<string, FamilyUnit>,
  unitChildrenMap: Map<string, FamilyUnit[]>,
  visitedUnits: Set<string>,
): FamilyTreeNode {
  visitedUnits.add(unit.id);

  const rawChildren = unitChildrenMap.get(unit.id) || [];
  const validChildren = rawChildren.filter(cu => !visitedUnits.has(cu.id));

  // Sắp xếp con theo năm sinh tăng dần, rồi đến tên
  validChildren.sort((a, b) => {
    const yA = a.primary.birthYear ?? 9999;
    const yB = b.primary.birthYear ?? 9999;
    if (yA !== yB) return yA - yB;
    return a.primary.name.localeCompare(b.primary.name);
  });

  const childrenNodes = validChildren.map(cu =>
    buildTreeNode(cu, personToUnitMap, unitChildrenMap, visitedUnits),
  );

  const unitWidth = getFamilyUnitWidth(unit);
  let subtreeWidth = unitWidth;

  if (childrenNodes.length > 0) {
    const childrenTotalWidth =
      childrenNodes.reduce((sum, c) => sum + c.subtreeWidth, 0) +
      (childrenNodes.length - 1) * SIBLING_GAP;
    subtreeWidth = Math.max(unitWidth, childrenTotalWidth);
  }

  return {
    id: unit.id,
    unit,
    generation: unit.primary.generation,
    children: childrenNodes,
    subtreeWidth,
  };
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
  const [rootTreeNodes, setRootTreeNodes] = useState<FamilyTreeNode[]>([]);
  const [generationList, setGenerationList] = useState<number[]>([]);
  const [maxGen, setMaxGen] = useState<number>(4);
  const [totalCount, setTotalCount] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [lastExportedUri, setLastExportedUri] = useState<string | null>(null);

  const { width: windowWidth } = useWindowDimensions();
  const [zoomLevel, setZoomLevel] = useState<number>(0.65);
  const [canvasHeight, setCanvasHeight] = useState<number>(2400);

  const canvasRef = useRef<any>(null);

  // Dynamic Canvas Width calculation based on the subtrees and right-side legend
  const canvasWidth = useMemo(() => {
    if (rootTreeNodes.length === 0) return 1480;

    const rootTreesTotalWidth =
      rootTreeNodes.reduce((sum, r) => sum + r.subtreeWidth, 0) +
      Math.max(0, rootTreeNodes.length - 1) * ROOT_GAP;

    const legendWidth = 240;
    const padding = 160;

    return Math.max(1400, Math.round(rootTreesTotalWidth + legendWidth + padding));
  }, [rootTreeNodes]);

  const fitZoom = useMemo(() => {
    if (!canvasWidth || !windowWidth) return 0.35;
    return Math.min(0.85, Math.max(0.12, Number(((windowWidth - 28) / canvasWidth).toFixed(2))));
  }, [canvasWidth, windowWidth]);

  useEffect(() => {
    if (fitZoom > 0) {
      setZoomLevel(fitZoom);
    }
  }, [fitZoom]);

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(1.8, Math.round((prev + 0.15) * 100) / 100));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(0.12, Math.round((prev - 0.15) * 100) / 100));
  };

  const handleResetZoom = () => {
    setZoomLevel(1.0);
  };

  const handleToggleFit = () => {
    setZoomLevel(prev => (Math.abs(prev - fitZoom) < 0.05 ? 1.0 : fitZoom));
  };

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
      const spouseMap = new Map<string, string[]>();
      const childrenMap = new Map<string, string[]>();
      const parentsMap = new Map<string, string[]>();

      for (const r of relRows) {
        if (r.relation_type === 'spouse') {
          const l1 = spouseMap.get(r.person_id) || [];
          if (!l1.includes(r.related_person_id)) l1.push(r.related_person_id);
          spouseMap.set(r.person_id, l1);

          const l2 = spouseMap.get(r.related_person_id) || [];
          if (!l2.includes(r.person_id)) l2.push(r.person_id);
          spouseMap.set(r.related_person_id, l2);
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

      // Sắp xếp danh sách thành viên theo thế hệ giảm dần, năm sinh tăng dần
      const sortedPersons = [...all].sort((a, b) => {
        if (b.generation !== a.generation) return b.generation - a.generation;
        const yA = a.birthYear ?? 9999;
        const yB = b.birthYear ?? 9999;
        return yA - yB;
      });

      // Nhóm thành các đơn vị gia đình FamilyUnit (Đơn thân hoặc Cặp vợ chồng)
      const visited = new Set<string>();
      const allUnits: FamilyUnit[] = [];

      for (const p of sortedPersons) {
        if (visited.has(p.id)) continue;
        visited.add(p.id);

        const spouseIds = spouseMap.get(p.id) || [];
        const matchedSpouses = spouseIds
          .map(id => personMap.get(id))
          .filter((sp): sp is PersonSummary => !!sp && all.some(ap => ap.id === sp.id));

        if (matchedSpouses.length > 0) {
          matchedSpouses.forEach(sp => visited.add(sp.id));

          let primary = p;
          let spouses = matchedSpouses;
          if (p.gender === 'female' && matchedSpouses.some(sp => sp.gender === 'male')) {
            const maleSp = matchedSpouses.find(sp => sp.gender === 'male')!;
            primary = maleSp;
            spouses = [p, ...matchedSpouses.filter(sp => sp.id !== maleSp.id)];
          }

          const allSpouseIds = spouses.map(s => s.id);
          const combinedChildren = Array.from(
            new Set([
              ...(childrenMap.get(primary.id) || []),
              ...spouses.flatMap(s => childrenMap.get(s.id) || []),
            ]),
          ).filter(cid => personMap.has(cid));

          allUnits.push({
            id: `unit_${primary.id}_${allSpouseIds.join('_')}`,
            primary,
            spouse: spouses[0],
            extraSpouses: spouses.slice(1),
            childIds: combinedChildren,
          });
        } else {
          // Người độc thân (chưa lập gia đình hoặc không có vợ/chồng trong danh sách)
          const childIds = (childrenMap.get(p.id) || []).filter(cid => personMap.has(cid));
          allUnits.push({
            id: `unit_${p.id}`,
            primary: p,
            childIds,
          });
        }
      }

      // Bản đồ ánh xạ từng cá nhân tới FamilyUnit chứa cá nhân đó
      const personToUnitMap = new Map<string, FamilyUnit>();
      for (const u of allUnits) {
        personToUnitMap.set(u.primary.id, u);
        if (u.spouse) personToUnitMap.set(u.spouse.id, u);
        u.extraSpouses?.forEach(sp => personToUnitMap.set(sp.id, u));
      }

      // Xác định quan hệ cha mẹ - con cái giữa các FamilyUnit
      const unitChildrenMap = new Map<string, FamilyUnit[]>();
      const unitParentMap = new Map<string, string>(); // childUnitId -> parentUnitId

      for (const u of allUnits) {
        const childUnitList: FamilyUnit[] = [];
        const seenUnits = new Set<string>();

        for (const cid of u.childIds) {
          const cu = personToUnitMap.get(cid);
          if (cu && cu.id !== u.id && !seenUnits.has(cu.id)) {
            if (!unitParentMap.has(cu.id)) {
              seenUnits.add(cu.id);
              childUnitList.push(cu);
              unitParentMap.set(cu.id, u.id);
            }
          }
        }
        unitChildrenMap.set(u.id, childUnitList);
      }

      // Đơn vị gốc (Roots) là các đơn vị không có đơn vị cha mẹ trong bộ lọc hiện tại
      const rootUnits = allUnits.filter(u => !unitParentMap.has(u.id));
      rootUnits.sort((a, b) => {
        if (b.primary.generation !== a.primary.generation) {
          return b.primary.generation - a.primary.generation;
        }
        const yA = a.primary.birthYear ?? 9999;
        const yB = b.primary.birthYear ?? 9999;
        return yA - yB;
      });

      // Xây dựng cây phân cấp đệ quy
      const visitedInTree = new Set<string>();
      const treeNodes: FamilyTreeNode[] = [];

      for (const ru of rootUnits) {
        if (!visitedInTree.has(ru.id)) {
          treeNodes.push(buildTreeNode(ru, personToUnitMap, unitChildrenMap, visitedInTree));
        }
      }

      // Bổ sung các cụm nhánh cô lập (nếu có)
      for (const u of allUnits) {
        if (!visitedInTree.has(u.id)) {
          treeNodes.push(buildTreeNode(u, personToUnitMap, unitChildrenMap, visitedInTree));
        }
      }

      const allGens = Array.from(new Set(all.map(p => p.generation))).sort((a, b) => b - a);
      const maximumGen = allGens.length > 0 ? allGens[0] : 4;
      const minimumGen = allGens.length > 0 ? allGens[allGens.length - 1] : 0;

      const genRange: number[] = [];
      for (let g = maximumGen; g >= minimumGen; g--) {
        genRange.push(g);
      }

      setRootTreeNodes(treeNodes);
      setMaxGen(maximumGen);
      setGenerationList(genRange);
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
    const previousZoom = zoomLevel;
    // Always export at 100% full crisp resolution
    if (previousZoom !== 1.0) {
      setZoomLevel(1.0);
      await new Promise(resolve => setTimeout(() => resolve(undefined), 80));
    }
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
    } finally {
      if (previousZoom !== 1.0) {
        setZoomLevel(previousZoom);
      }
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

          {/* Extra Spouses (Vợ hai / Kế thất) */}
          {unit.extraSpouses?.map(sp => (
            <React.Fragment key={sp.id}>
              <View style={styles.maritalConnector}>
                <View style={[styles.maritalLine, { backgroundColor: themeColors.connector }]} />
                <View
                  style={[
                    styles.maritalBadge,
                    { backgroundColor: themeColors.badgeBg, borderColor: themeColors.border },
                  ]}>
                  <Text style={[styles.maritalIcon, { color: themeColors.border }]}>⚭</Text>
                  <Text style={[styles.maritalLabel, { color: themeColors.badgeText }]}>
                    Kế Thất
                  </Text>
                </View>
                <View style={[styles.maritalLine, { backgroundColor: themeColors.connector }]} />
              </View>
              {renderPersonCard(sp)}
            </React.Fragment>
          ))}
        </View>
      </View>
    );
  };

  // Helper render recursive FamilyTreeNode
  // 1. Đôi vợ chồng có con: con ở đời sau ngay dưới bố mẹ, kết nối liền mạch
  // 2. Người độc thân không có con (hoặc vợ chồng chưa có con): cây dừng lại ở người đấy
  const renderTreeNode = (node: FamilyTreeNode) => {
    const hasChildren = node.children.length > 0;

    return (
      <View key={node.id} style={[styles.treeNodeContainer, { width: node.subtreeWidth }]}>
        {/* Family Unit Card (Cặp vợ chồng hoặc Người độc thân) được căn giữa trên subtreeWidth */}
        <View style={[styles.treeNodeUnitRow, { width: node.subtreeWidth }]}>
          {renderFamilyUnit(node.unit)}
        </View>

        {/* Nhánh đường nối và hàng con ở thế hệ kế tiếp */}
        {hasChildren ? (
          <View style={[styles.treeBranchesWrapper, { width: node.subtreeWidth }]}>
            {/* Trường hợp chỉ có 1 con: 1 đường thả thẳng đứng từ giữa bố mẹ xuống con */}
            {node.children.length === 1 ? (
              <View style={[styles.singleChildDropContainer, { width: node.subtreeWidth }]}>
                <View
                  style={[
                    styles.singleStemLine,
                    {
                      height: STEM_DROP,
                      backgroundColor: themeColors.connector,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.treeStemKnot,
                    {
                      backgroundColor: themeColors.border,
                    },
                  ]}>
                  <Text style={styles.treeStemKnotText}>❖</Text>
                </View>
                <View
                  style={[
                    styles.singleStemLine,
                    {
                      height: STEM_BRANCH,
                      backgroundColor: themeColors.connector,
                    },
                  ]}
                />
              </View>
            ) : (
              /* Trường hợp nhiều con: đường rẽ nhánh ngang và các nhánh thả xuống từng con */
              <View
                style={[
                  styles.multiBranchesContainer,
                  { width: node.subtreeWidth, height: STEM_DROP + STEM_BRANCH },
                ]}>
                {/* Đường thả dọc từ trung tâm bố mẹ xuống thanh ngang */}
                <View
                  style={[
                    styles.parentStemLine,
                    {
                      left: node.subtreeWidth / 2 - 1,
                      height: STEM_DROP,
                      backgroundColor: themeColors.connector,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.parentStemKnot,
                    {
                      left: node.subtreeWidth / 2 - 6,
                      top: STEM_DROP - 5,
                      backgroundColor: themeColors.border,
                    },
                  ]}>
                  <Text style={styles.treeStemKnotText}>❖</Text>
                </View>

                {/* Tính toán tọa độ trung tâm từng người con để vẽ thanh ngang và đường nối */}
                {(() => {
                  const childrenW =
                    node.children.reduce((sum, c) => sum + c.subtreeWidth, 0) +
                    (node.children.length - 1) * SIBLING_GAP;
                  const leftPadding = (node.subtreeWidth - childrenW) / 2;

                  let runningX = leftPadding;
                  const centers: number[] = [];
                  node.children.forEach(c => {
                    centers.push(runningX + c.subtreeWidth / 2);
                    runningX += c.subtreeWidth + SIBLING_GAP;
                  });

                  const firstCenter = centers[0];
                  const lastCenter = centers[centers.length - 1];
                  const barWidth = lastCenter - firstCenter;

                  return (
                    <View style={StyleSheet.absoluteFill} pointerEvents="none">
                      {/* Thanh ngang nối các nhánh con */}
                      <View
                        style={[
                          styles.horizontalCrossbar,
                          {
                            top: STEM_DROP,
                            left: firstCenter,
                            width: barWidth,
                            backgroundColor: themeColors.connector,
                          },
                        ]}
                      />

                      {/* Đường dọc thả vào đỉnh thẻ của từng người con */}
                      {centers.map((cx, idx) => (
                        <View
                          key={`drop_${idx}`}
                          style={[
                            styles.childDropStem,
                            {
                              top: STEM_DROP,
                              left: cx - 1,
                              height: STEM_BRANCH,
                              backgroundColor: themeColors.connector,
                            },
                          ]}
                        />
                      ))}
                    </View>
                  );
                })()}
              </View>
            )}

            {/* Danh sách các nhánh con thế hệ sau nằm ngay dưới bố mẹ */}
            <View style={[styles.childrenRow, { width: node.subtreeWidth }]}>
              {node.children.map((childNode, cIdx) => (
                <View
                  key={childNode.id}
                  style={[
                    { width: childNode.subtreeWidth },
                    cIdx > 0 && { marginLeft: SIBLING_GAP },
                  ]}>
                  {renderTreeNode(childNode)}
                </View>
              ))}
            </View>
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

          <View style={styles.separator} />

          {/* Quick Zoom Presets */}
          <Chip
            label={`🔍 Toàn cảnh (${Math.round(fitZoom * 100)}%)`}
            selected={Math.abs(zoomLevel - fitZoom) < 0.04}
            onPress={() => setZoomLevel(fitZoom)}
          />
          <Chip
            label="🔍 50%"
            selected={Math.abs(zoomLevel - 0.5) < 0.04}
            onPress={() => setZoomLevel(0.5)}
          />
          <Chip
            label="🔍 Chuẩn (100%)"
            selected={Math.abs(zoomLevel - 1.0) < 0.04}
            onPress={() => setZoomLevel(1.0)}
          />
          <Chip
            label="🔍 Phóng to (150%)"
            selected={Math.abs(zoomLevel - 1.5) < 0.04}
            onPress={() => setZoomLevel(1.5)}
          />
        </ScrollView>
      </View>

      {/* Main Preview Canvas with Two-Way Pan & Zoom */}
      <View style={styles.previewContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={[
            styles.horizontalScrollContent,
            { minWidth: Math.max(windowWidth, Math.round(canvasWidth * zoomLevel + 32)) },
          ]}>
          <ScrollView
            showsVerticalScrollIndicator={true}
            contentContainerStyle={[
              styles.verticalScrollContent,
              { minHeight: Math.round(canvasHeight * zoomLevel + 60) },
            ]}>
            {/* Scaled Canvas Container */}
            <View
              style={{
                width: Math.round(canvasWidth * zoomLevel),
                height: Math.round(canvasHeight * zoomLevel),
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
              }}>
              {/* The Actual Poster to Capture */}
              <View
                ref={canvasRef}
                collapsable={false}
                onLayout={e => {
                  const h = e.nativeEvent.layout.height;
                  if (h > 400 && Math.abs(h - canvasHeight) > 20) {
                    setCanvasHeight(h);
                  }
                }}
                style={[
                  styles.posterCanvas,
                  {
                    width: canvasWidth,
                    backgroundColor: themeColors.bg,
                    borderColor: themeColors.border,
                    transform: [{ scale: zoomLevel }],
                    transformOrigin: ['0%', '0%', 0],
                  } as any,
                ]}>
                {/* Inner Decorative Golden Border */}
                <View style={[styles.innerBorder, { borderColor: themeColors.border }]}>
                {/* Traditional Vietnamese Hoành Phi Header */}
                <View style={styles.posterHeader}>
                  <View style={styles.headerDecorativeLineWrap}>
                    <View style={[styles.headerLine, { backgroundColor: themeColors.border }]} />
                    <View
                      style={[
                        styles.headerEmblem,
                        { borderColor: themeColors.border, backgroundColor: themeColors.badgeBg },
                      ]}>
                      <Text style={[styles.headerEmblemIcon, { color: themeColors.title }]}>❖</Text>
                      <Text style={[styles.headerEmblemText, { color: themeColors.title }]}>
                        {selectedBranch === 'noi'
                          ? 'CÂY GIA PHẢ BÊN NỘI'
                          : selectedBranch === 'ngoai'
                          ? 'CÂY GIA PHẢ BÊN NGOẠI'
                          : selectedBranch === 'vo_chong'
                          ? 'CÂY GIA PHẢ BÊN VỢ/CHỒNG'
                          : 'CÂY GIA PHẢ TOÀN GIA TỘC'}
                      </Text>
                      <Text style={[styles.headerEmblemIcon, { color: themeColors.title }]}>❖</Text>
                    </View>
                    <View style={[styles.headerLine, { backgroundColor: themeColors.border }]} />
                  </View>

                  <Text style={[styles.posterTitle, { color: themeColors.title }]}>
                    BẢN ĐỒ GIA PHẢ TRỰC HỆ
                  </Text>
                  <Text style={[styles.posterSubtitle, { color: themeColors.subtitle }]}>
                    "Cây có cội mới trổ cành xanh ngọn • Nước có nguồn mới tỏa nhánh muôn sông"
                  </Text>

                  <View style={styles.headerDividerStrip}>
                    <View style={[styles.headerLine, { backgroundColor: themeColors.border }]} />
                    <Text style={[styles.ornamentSymbol, { color: themeColors.border }]}>♦ ❖ ♦</Text>
                    <View style={[styles.headerLine, { backgroundColor: themeColors.border }]} />
                  </View>
                </View>

                {/* Main Tree Flow & Right-Hand Generation Annotation Column */}
                <View style={styles.posterBodyRow}>
                  {/* The Seamless Tree Canvas Area */}
                  <View style={styles.treeArea}>
                    {rootTreeNodes.map((rootNode, rIdx) => (
                      <View
                        key={rootNode.id}
                        style={[
                          styles.rootTreeContainer,
                          { width: rootNode.subtreeWidth },
                          rIdx > 0 && { marginLeft: ROOT_GAP },
                          { marginTop: Math.max(0, (maxGen - rootNode.generation) * ROW_HEIGHT) },
                        ]}>
                        {renderTreeNode(rootNode)}
                      </View>
                    ))}
                  </View>

                  {/* Right Side Generation Annotation Column (Chú giải thế hệ ở bên phải) */}
                  <View style={[styles.rightLegendColumn, { borderLeftColor: themeColors.border }]}>
                    {/* Header: CHÚ GIẢI THẾ HỆ */}
                    <View
                      style={[
                        styles.legendColumnHeader,
                        { backgroundColor: themeColors.badgeBg, borderColor: themeColors.border },
                      ]}>
                      <Icon name="bookmark-multiple-outline" size={15} color={themeColors.title} />
                      <Text style={[styles.legendColumnTitle, { color: themeColors.title }]}>
                        CHÚ GIẢI THẾ HỆ
                      </Text>
                    </View>

                    {/* Generation Slots aligned with generation rows */}
                    <View style={styles.legendSlotsContainer}>
                      {generationList.map((genNum, idx) => {
                        const meta = getGenerationMeta(genNum);

                        return (
                          <View key={genNum} style={[styles.legendSlot, { height: ROW_HEIGHT }]}>
                            {/* Generational knot indicator pointing towards tree row */}
                            <View
                              style={[
                                styles.legendKnot,
                                {
                                  backgroundColor: themeColors.badgeBg,
                                  borderColor: themeColors.border,
                                },
                              ]}>
                              <Text style={[styles.legendKnotText, { color: themeColors.title }]}>
                                {meta.romanNumeral}
                              </Text>
                            </View>

                            {/* The Legend Card for this Generation */}
                            <View
                              style={[
                                styles.legendCard,
                                {
                                  backgroundColor: themeColors.cardBg,
                                  borderColor: themeColors.border,
                                },
                              ]}>
                              <View style={styles.legendCardHeader}>
                                <View
                                  style={[
                                    styles.legendOrderPill,
                                    {
                                      backgroundColor: themeColors.badgeBg,
                                      borderColor: themeColors.border,
                                    },
                                  ]}>
                                  <Text style={[styles.legendOrderText, { color: themeColors.title }]}>
                                    {meta.orderText}
                                  </Text>
                                </View>
                              </View>

                              <Text
                                style={[styles.legendRankTitle, { color: themeColors.title }]}
                                numberOfLines={2}>
                                {meta.rankTitle}
                              </Text>

                              <Text
                                style={[styles.legendDescription, { color: themeColors.subtitle }]}
                                numberOfLines={2}>
                                {meta.description}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </View>

                {/* Poster Footer Stamp */}
                <View style={styles.posterFooter}>
                  <View style={styles.footerDecorativeLineWrap}>
                    <View style={[styles.headerLine, { backgroundColor: themeColors.border }]} />
                    <View style={[styles.sealBox, { borderColor: themeColors.border, backgroundColor: themeColors.badgeBg }]}>
                      <Text style={[styles.sealText, { color: themeColors.title }]}>
                        ❖ GIA TỘC TRƯỜNG TỒN • PHÚC ĐỨC LƯU TRUYỀN ❖
                      </Text>
                      <Text style={[styles.sealSub, { color: themeColors.subtitle }]}>
                        Ứng Dụng Sổ Họ Hàng Gia Tộc • Lưu Giữ Bản Sắc Cội Nguồn
                      </Text>
                    </View>
                    <View style={[styles.headerLine, { backgroundColor: themeColors.border }]} />
                  </View>

                  {/* Export Date anchored to bottom right */}
                  <View style={styles.exportDateBottomRight}>
                    <Icon name="calendar-check-outline" size={13} color={themeColors.subtitle} />
                    <Text style={[styles.exportDateText, { color: themeColors.subtitle }]}>
                      Ngày kết xuất: <Text style={{ fontWeight: '700' }}>{new Date().toLocaleDateString('vi-VN')}</Text>
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            </View>
          </ScrollView>
        </ScrollView>

        {/* Floating Zoom Action Controls Overlay */}
        <View style={styles.floatingZoomWidget}>
          <TouchableOpacity
            style={[styles.zoomBtn, zoomLevel >= 1.8 && styles.zoomBtnDisabled]}
            activeOpacity={0.7}
            onPress={handleZoomIn}
            disabled={zoomLevel >= 1.8}>
            <Icon name="plus" size={20} color={zoomLevel >= 1.8 ? '#94A3B8' : '#FFFFFF'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.zoomLevelBadge}
            activeOpacity={0.7}
            onPress={handleResetZoom}>
            <Text style={styles.zoomLevelText}>{Math.round(zoomLevel * 100)}%</Text>
            <Text style={styles.zoomSubText}>Gốc</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.zoomBtn, zoomLevel <= 0.3 && styles.zoomBtnDisabled]}
            activeOpacity={0.7}
            onPress={handleZoomOut}
            disabled={zoomLevel <= 0.3}>
            <Icon name="minus" size={20} color={zoomLevel <= 0.3 ? '#94A3B8' : '#FFFFFF'} />
          </TouchableOpacity>

          <View style={styles.zoomDivider} />

          <TouchableOpacity
            style={[styles.zoomFitBtn, zoomLevel <= 0.45 && styles.zoomFitBtnActive]}
            activeOpacity={0.7}
            onPress={handleToggleFit}>
            <Icon
              name={zoomLevel <= 0.45 ? 'arrow-expand-all' : 'fit-to-screen-outline'}
              size={18}
              color={zoomLevel <= 0.45 ? '#F59E0B' : '#FFFFFF'}
            />
            <Text
              style={[
                styles.zoomFitText,
                zoomLevel <= 0.45 && { color: '#F59E0B', fontWeight: '700' },
              ]}>
              {zoomLevel <= 0.45 ? '100%' : 'Toàn cảnh'}
            </Text>
          </TouchableOpacity>
        </View>
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
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    alignItems: 'center',
  },
  innerBorder: {
    borderWidth: 1.5,
    borderStyle: 'solid',
    padding: 24,
    borderRadius: radius.md,
    width: '100%',
    alignItems: 'center',
  },
  posterHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    width: '100%',
  },
  headerDecorativeLineWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  headerLine: {
    flex: 1,
    height: 1.5,
    opacity: 0.85,
  },
  headerEmblem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  headerEmblemIcon: {
    fontSize: 12,
  },
  headerEmblemText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
  },
  headerDividerStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  ornamentSymbol: {
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
  posterBodyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    width: '100%',
    marginTop: spacing.md,
  },
  treeArea: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 48,
  },
  rootTreeContainer: {
    alignItems: 'center',
  },
  treeNodeContainer: {
    alignItems: 'center',
  },
  treeNodeUnitRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  treeBranchesWrapper: {
    alignItems: 'center',
  },
  singleChildDropContainer: {
    alignItems: 'center',
    height: 50,
  },
  singleStemLine: {
    width: 2,
  },
  multiBranchesContainer: {
    position: 'relative',
    height: 50,
  },
  parentStemLine: {
    position: 'absolute',
    top: 0,
    width: 2,
  },
  parentStemKnot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  horizontalCrossbar: {
    position: 'absolute',
    height: 2,
  },
  childDropStem: {
    position: 'absolute',
    width: 2,
  },
  treeStemKnot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 1,
  },
  treeStemKnotText: {
    fontSize: 7,
    color: '#FFF',
    fontWeight: '900',
  },
  childrenRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  rightLegendColumn: {
    width: 240,
    paddingLeft: 28,
    borderLeftWidth: 2,
    marginLeft: 32,
  },
  legendColumnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    marginBottom: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: 8,
  },
  legendColumnTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  legendSlotsContainer: {
    flexDirection: 'column',
  },
  legendSlot: {
    position: 'relative',
    justifyContent: 'flex-start',
  },
  legendKnot: {
    position: 'absolute',
    left: -39,
    top: 14,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  legendKnotText: {
    fontSize: 8,
    fontWeight: '900',
  },
  legendCard: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 12,
    height: 180,
    justifyContent: 'center',
  },
  legendCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  legendOrderPill: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  legendOrderText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  legendRankTitle: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
    lineHeight: 16,
  },
  legendDescription: {
    fontSize: 10,
    lineHeight: 14,
    fontStyle: 'italic',
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
  memberCard: {
    width: 132,
    height: 180,
    padding: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    position: 'relative',
    justifyContent: 'center',
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
  posterFooter: {
    alignItems: 'center',
    marginTop: spacing.xl,
    width: '100%',
  },
  footerDecorativeLineWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: spacing.sm,
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
  exportDateBottomRight: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.md,
    paddingRight: spacing.md,
  },
  exportDateText: {
    fontSize: 11,
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
  floatingZoomWidget: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: radius.xl,
    padding: 6,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#C59B27',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    gap: 4,
    zIndex: 100,
  },
  zoomBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBtnDisabled: {
    opacity: 0.35,
  },
  zoomLevelBadge: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  zoomLevelText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FDFBF7',
  },
  zoomSubText: {
    fontSize: 9,
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  zoomDivider: {
    width: 28,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: 2,
  },
  zoomFitBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  zoomFitBtnActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  zoomFitText: {
    fontSize: 10,
    color: '#E2E8F0',
    fontWeight: '600',
  },
});
