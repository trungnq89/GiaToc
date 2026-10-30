import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
  Modal,
  PanResponder,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../navigation/types';
import { useSessionStore } from '../../store/sessionStore';
import { listPersons } from '../../db/repositories/personRepository';
import { query } from '../../db/database';
import { PersonSummary, FamilyBranch } from '../../types';
import { colors, radius, spacing, typography } from '../../theme';
import { Chip, Icon, ScreenHeader, Avatar, AppButton } from '../../components';

type ScreenRouteProp = RouteProp<RootStackParamList, 'InteractiveTree'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

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

export interface InteractiveTreeNode {
  id: string;
  unit: FamilyUnit;
  generation: number;
  children: InteractiveTreeNode[];
  allChildrenCount: number;
  isExpanded: boolean;
  subtreeWidth: number;
}

export interface GenerationMetadata {
  generation: number;
  orderText: string;
  romanNumeral: string;
  rankTitle: string;
  description: string;
}

const CARD_WIDTH = 132;
const CARD_HEIGHT = 180;
const MARITAL_GAP = 52;
const SIBLING_GAP = 28;
const ROOT_GAP = 64;
const STEM_DROP = 26;
const STEM_BRANCH = 24;
const TOGGLE_ROW_HEIGHT = 36;
const ROW_HEIGHT = CARD_HEIGHT + TOGGLE_ROW_HEIGHT + STEM_DROP + STEM_BRANCH; // ~266px

function getFamilyUnitWidth(unit: FamilyUnit): number {
  let w = CARD_WIDTH;
  if (unit.spouse) {
    w += MARITAL_GAP + CARD_WIDTH;
  }
  if (unit.extraSpouses && unit.extraSpouses.length > 0) {
    w += unit.extraSpouses.length * (MARITAL_GAP + CARD_WIDTH);
  }
  return w;
}

const GENERATION_DEFS: Record<number, GenerationMetadata> = {
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

function getGenerationMeta(gen: number): GenerationMetadata {
  if (GENERATION_DEFS[gen]) return GENERATION_DEFS[gen];
  return {
    generation: gen,
    orderText: `THẾ HỆ ${gen > 0 ? `+${gen}` : gen}`,
    romanNumeral: `GEN ${gen}`,
    rankTitle: gen > 0 ? `BẬC TIỀN NHÂN (${gen})` : `BẬC HẬU DUỆ (${gen})`,
    description: 'Thành viên gia tộc',
  };
}

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function InteractiveTreeScreen() {
  const route = useRoute<ScreenRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const user = useSessionStore(s => s.user);
  const userGen = 0; // "Tôi" luôn là thế hệ gốc mốc 0

  const [selectedBranch, setSelectedBranch] = useState<FamilyBranch | 'all'>(
    route.params?.defaultBranch || 'all',
  );
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Raw units and relationships from DB
  const [allUnitsState, setAllUnitsState] = useState<FamilyUnit[]>([]);
  const [unitChildrenMapState, setUnitChildrenMapState] = useState<Map<string, FamilyUnit[]>>(
    new Map(),
  );
  const [unitParentMapState, setUnitParentMapState] = useState<Map<string, string>>(new Map());
  const [rootUnitsState, setRootUnitsState] = useState<FamilyUnit[]>([]);
  const [userUnitIdState, setUserUnitIdState] = useState<string | null>(null);

  // Expanded nodes set
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());

  // Zoom scale state
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  // Selected person modal state
  const [selectedPerson, setSelectedPerson] = useState<PersonSummary | null>(null);

  // Refs for ScrollViews and scroll tracking
  const horizontalScrollRef = useRef<any>(null);
  const verticalScrollRef = useRef<any>(null);
  const currentScrollXRef = useRef<number>(0);
  const currentScrollYRef = useRef<number>(0);

  // Track coordinates of user's node to autofocus
  const userCoordinatesRef = useRef<{ x: number; y: number } | null>(null);

  // Chỉ autofocus vào user 1 lần khi load màn hình / đổi nhánh, không nhảy khi mở/thu gọn node
  const hasFocusedRef = useRef<boolean>(false);
  const pendingFocusUserRef = useRef<boolean>(false);

  // Lưu anchor của node vừa được bấm mở/thu gọn để giữ ổn định vị trí trên màn hình
  const pendingAnchorRef = useRef<{
    unitId: string;
    oldCenterX: number;
    oldScrollX: number;
  } | null>(null);

  // Load tree data from database
  const loadTreeData = useCallback(async () => {
    try {
      setLoading(true);
      const all = await listPersons({
        branch: selectedBranch === 'all' ? undefined : selectedBranch,
      });
      setTotalCount(all.length);

      const relRows = await query<RelationshipRow>(
        'SELECT person_id, related_person_id, relation_type FROM relationships;'
      );

      const personMap = new Map<string, PersonSummary>();
      all.forEach(p => personMap.set(p.id, p));

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
          const pList = parentsMap.get(r.person_id) || [];
          if (!pList.includes(r.related_person_id)) pList.push(r.related_person_id);
          parentsMap.set(r.person_id, pList);

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

      // Sắp xếp theo thế hệ giảm dần, năm sinh tăng dần
      const sortedPersons = [...all].sort((a, b) => {
        if (b.generation !== a.generation) return b.generation - a.generation;
        const yA = a.birthYear ?? 9999;
        const yB = b.birthYear ?? 9999;
        return yA - yB;
      });

      // Nhóm thành các đơn vị gia đình FamilyUnit
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
          const childIds = (childrenMap.get(p.id) || []).filter(cid => personMap.has(cid));
          allUnits.push({
            id: `unit_${p.id}`,
            primary: p,
            childIds,
          });
        }
      }

      const personToUnitMap = new Map<string, FamilyUnit>();
      for (const u of allUnits) {
        personToUnitMap.set(u.primary.id, u);
        if (u.spouse) personToUnitMap.set(u.spouse.id, u);
        u.extraSpouses?.forEach(sp => personToUnitMap.set(sp.id, u));
      }

      const unitChildrenMap = new Map<string, FamilyUnit[]>();
      const unitParentMap = new Map<string, string>();

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

      const rootUnits = allUnits.filter(u => !unitParentMap.has(u.id));
      rootUnits.sort((a, b) => {
        if (b.primary.generation !== a.primary.generation) {
          return b.primary.generation - a.primary.generation;
        }
        const yA = a.primary.birthYear ?? 9999;
        const yB = b.primary.birthYear ?? 9999;
        return yA - yB;
      });

      // QUAN TRỌNG: Mặc định chỉ mở đến đời của chính người dùng (userGen)
      // Các đời tổ tiên (generation > userGen) được mở sẵn
      // Các đời ngang hàng hoặc đời con cháu (generation <= userGen) mặc định đóng
      const defaultExpanded = new Set<string>();
      allUnits.forEach(u => {
        const hasChildren = (unitChildrenMap.get(u.id) || []).length > 0;
        if (hasChildren && u.primary.generation > userGen) {
          defaultExpanded.add(u.id);
        }
      });

      let foundUserUnitId: string | null = null;
      for (const u of allUnits) {
        if (
          user &&
          (u.primary.id === user.id ||
            u.spouse?.id === user.id ||
            u.primary.name === user.name)
        ) {
          foundUserUnitId = u.id;
          break;
        }
      }
      setUserUnitIdState(foundUserUnitId);
      setUnitParentMapState(unitParentMap);
      setAllUnitsState(allUnits);
      setUnitChildrenMapState(unitChildrenMap);
      setRootUnitsState(rootUnits);
      setExpandedNodeIds(defaultExpanded);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu cây tương tác:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedBranch, userGen]);

  useEffect(() => {
    loadTreeData();
  }, [loadTreeData]);

  // Đệ quy xây dựng cây phân cấp với trạng thái đóng/mở từng node
  const buildInteractiveTreeNode = useCallback(
    (
      unit: FamilyUnit,
      visitedUnits: Set<string>,
    ): InteractiveTreeNode => {
      visitedUnits.add(unit.id);
      const rawChildren = unitChildrenMapState.get(unit.id) || [];
      const validChildren = rawChildren.filter(cu => !visitedUnits.has(cu.id));

      validChildren.sort((a, b) => {
        const yA = a.primary.birthYear ?? 9999;
        const yB = b.primary.birthYear ?? 9999;
        if (yA !== yB) return yA - yB;
        return a.primary.name.localeCompare(b.primary.name);
      });

      const isExpanded = expandedNodeIds.has(unit.id);
      const unitWidth = getFamilyUnitWidth(unit);

      let childrenNodes: InteractiveTreeNode[] = [];
      let subtreeWidth = unitWidth;

      if (validChildren.length > 0 && isExpanded) {
        childrenNodes = validChildren.map(cu => buildInteractiveTreeNode(cu, visitedUnits));
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
        allChildrenCount: validChildren.length,
        isExpanded,
        subtreeWidth,
      };
    },
    [unitChildrenMapState, expandedNodeIds],
  );

  // Xây dựng danh sách cây phân cấp từ các gốc
  const { treeRoots, maxGen, minGen } = useMemo(() => {
    const visited = new Set<string>();
    const roots = rootUnitsState.map(ru => buildInteractiveTreeNode(ru, visited));

    let maxG = 4;
    let minG = 0;
    allUnitsState.forEach(u => {
      if (u.primary.generation > maxG) maxG = u.primary.generation;
      if (u.primary.generation < minG) minG = u.primary.generation;
    });

    return { treeRoots: roots, maxGen: maxG, minGen: minG };
  }, [rootUnitsState, allUnitsState, buildInteractiveTreeNode]);

  // Danh sách các thế hệ từ maxGen xuống minGen để vẽ Chú giải
  const generationList = useMemo(() => {
    const list: number[] = [];
    for (let g = maxGen; g >= minGen; g--) {
      list.push(g);
    }
    return list;
  }, [maxGen, minGen]);

  // Chiều rộng tổng thể của cây gia phả
  const treeTotalWidth = useMemo(() => {
    if (treeRoots.length === 0) return 600;
    return (
      treeRoots.reduce((sum, r) => sum + r.subtreeWidth, 0) +
      Math.max(0, treeRoots.length - 1) * ROOT_GAP
    );
  }, [treeRoots]);

  const canvasWidth = useMemo(() => {
    return Math.max(windowWidth, treeTotalWidth + 280); // 280 cho chú giải bên phải + lề
  }, [treeTotalWidth, windowWidth]);

  const canvasHeight = useMemo(() => {
    const totalGenerations = Math.max(generationList.length, 6);
    return Math.max(windowHeight, 220 + totalGenerations * ROW_HEIGHT + 140);
  }, [generationList.length, windowHeight]);

  // Helper tính tọa độ X trung tâm của một FamilyUnit / node trong canvas
  const getNodeCenterX = useCallback(
    (roots: InteractiveTreeNode[], unitId: string): number | null => {
      let runningX = 40;
      for (const root of roots) {
        const searchNode = (node: InteractiveTreeNode, curX: number): number | null => {
          const unitW = getFamilyUnitWidth(node.unit);
          const unitCenterX = curX + (node.subtreeWidth - unitW) / 2 + unitW / 2;
          if (node.id === unitId || node.unit.primary.id === unitId) {
            return unitCenterX;
          }
          if (node.isExpanded && node.children.length > 0) {
            const childrenW =
              node.children.reduce((sum, c) => sum + c.subtreeWidth, 0) +
              (node.children.length - 1) * SIBLING_GAP;
            let childX = curX + (node.subtreeWidth - childrenW) / 2;
            for (const c of node.children) {
              const found = searchNode(c, childX);
              if (found !== null) return found;
              childX += c.subtreeWidth + SIBLING_GAP;
            }
          }
          return null;
        };

        const found = searchNode(root, runningX);
        if (found !== null) return found;
        runningX += root.subtreeWidth + ROOT_GAP;
      }
      return null;
    },
    [],
  );

  // Toggle một node đóng hoặc mở với cơ chế ghi nhớ tọa độ màn hình
  const toggleNode = useCallback(
    (unitId: string) => {
      // Lưu lại tọa độ X của node trước khi cây được tính toán lại
      const oldCenterX = getNodeCenterX(treeRoots, unitId);
      if (oldCenterX !== null) {
        pendingAnchorRef.current = {
          unitId,
          oldCenterX,
          oldScrollX: currentScrollXRef.current,
        };
      }

      LayoutAnimation.configureNext({
        duration: 250,
        create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
        update: { type: LayoutAnimation.Types.easeInEaseOut },
        delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      });

      setExpandedNodeIds(prev => {
        const next = new Set(prev);
        if (next.has(unitId)) {
          next.delete(unitId);
        } else {
          next.add(unitId);
        }
        return next;
      });
    },
    [treeRoots, getNodeCenterX],
  );

  // Giữ nguyên vị trí hiển thị của node vừa được bấm mở/thu gọn, triệt tiêu hoàn toàn hiện tượng nhảy màn hình
  useEffect(() => {
    if (!pendingAnchorRef.current) return;
    const anchor = pendingAnchorRef.current;
    pendingAnchorRef.current = null;

    if (anchor.oldCenterX !== null) {
      const newCenterX = getNodeCenterX(treeRoots, anchor.unitId);
      if (newCenterX !== null) {
        const deltaX = (newCenterX - anchor.oldCenterX) * zoomLevel;
        const targetScrollX = Math.max(0, anchor.oldScrollX + deltaX);
        horizontalScrollRef.current?.scrollTo({ x: targetScrollX, animated: false });
        currentScrollXRef.current = targetScrollX;
      }
    }
  }, [treeRoots, getNodeCenterX, zoomLevel]);

  // Mở rộng toàn bộ cây
  const handleExpandAll = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const allWithChildren = new Set<string>();
    allUnitsState.forEach(u => {
      const c = unitChildrenMapState.get(u.id) || [];
      if (c.length > 0) allWithChildren.add(u.id);
    });
    setExpandedNodeIds(allWithChildren);
  }, [allUnitsState, unitChildrenMapState]);

  // Thu gọn về mặc định: chỉ mở đến đời Tôi
  const handleCollapseToUserGen = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const defaultExpanded = new Set<string>();
    allUnitsState.forEach(u => {
      const c = unitChildrenMapState.get(u.id) || [];
      if (c.length > 0 && u.primary.generation > userGen) {
        defaultExpanded.add(u.id);
      }
    });
    setExpandedNodeIds(defaultExpanded);
  }, [allUnitsState, unitChildrenMapState, userGen]);

  // Hàm tính tọa độ và cuộn focus vào người dùng ("Tôi")
  const focusOnUser = useCallback(
    (animated = true) => {
      if (!user) return;

      // Nếu tổ tiên của Tôi đang bị thu gọn, tự động mở lại các node cha/tổ tiên dẫn đến Tôi
      if (userUnitIdState) {
        let curr = unitParentMapState.get(userUnitIdState);
        const toExpand: string[] = [];
        while (curr) {
          if (!expandedNodeIds.has(curr)) {
            toExpand.push(curr);
          }
          curr = unitParentMapState.get(curr);
        }
        if (toExpand.length > 0) {
          pendingFocusUserRef.current = true;
          setExpandedNodeIds(prev => {
            const next = new Set(prev);
            toExpand.forEach(id => next.add(id));
            return next;
          });
          return;
        }
      }

      // Tìm tọa độ node của user
      const HEADER_Y = 180;
      let targetX = canvasWidth / 2;
      let targetY = HEADER_Y + (maxGen - userGen) * ROW_HEIGHT;

      // Tìm X cụ thể bằng duyệt qua treeRoots
      let runningX = 40; // padding trái
      for (const root of treeRoots) {
        const findUnitX = (node: InteractiveTreeNode, curX: number): number | null => {
          const isUserUnit =
            node.unit.primary.id === user.id ||
            node.unit.spouse?.id === user.id ||
            node.unit.primary.name === user.name;

          const unitW = getFamilyUnitWidth(node.unit);
          const unitCenterX = curX + (node.subtreeWidth - unitW) / 2 + unitW / 2;

          if (isUserUnit) {
            return unitCenterX;
          }

          if (node.isExpanded && node.children.length > 0) {
            const childrenW =
              node.children.reduce((sum, c) => sum + c.subtreeWidth, 0) +
              (node.children.length - 1) * SIBLING_GAP;
            let childX = curX + (node.subtreeWidth - childrenW) / 2;
            for (const c of node.children) {
              const found = findUnitX(c, childX);
              if (found !== null) return found;
              childX += c.subtreeWidth + SIBLING_GAP;
            }
          }
          return null;
        };

        const foundX = findUnitX(root, runningX);
        if (foundX !== null) {
          targetX = foundX;
          break;
        }
        runningX += root.subtreeWidth + ROOT_GAP;
      }

      userCoordinatesRef.current = { x: targetX, y: targetY };

      // Cuộn cả chiều ngang và dọc
      const scrollX = Math.max(0, targetX * zoomLevel - windowWidth / 2);
      const scrollY = Math.max(0, targetY * zoomLevel - windowHeight / 2 + 100);

      currentScrollXRef.current = scrollX;
      currentScrollYRef.current = scrollY;
      horizontalScrollRef.current?.scrollTo({ x: scrollX, animated });
      verticalScrollRef.current?.scrollTo({ y: scrollY, animated });
    },
    [
      user,
      userUnitIdState,
      unitParentMapState,
      expandedNodeIds,
      canvasWidth,
      maxGen,
      userGen,
      treeRoots,
      zoomLevel,
      windowWidth,
      windowHeight,
    ],
  );

  // Cuộn focus vào Tôi sau khi cây đã bung các node tổ tiên
  useEffect(() => {
    if (pendingFocusUserRef.current && treeRoots.length > 0) {
      pendingFocusUserRef.current = false;
      const timer = setTimeout(() => {
        focusOnUser(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [treeRoots, focusOnUser]);

  // Focus vào người dùng DUY NHẤT một lần khi dữ liệu cây ban đầu sẵn sàng
  useEffect(() => {
    if (!loading && treeRoots.length > 0 && !hasFocusedRef.current) {
      hasFocusedRef.current = true;
      const timer = setTimeout(() => {
        focusOnUser(false);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [loading, treeRoots.length, focusOnUser]);

  // Pinch-to-zoom gesture handling
  const initialDistanceRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number>(1.0);

  const pinchPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: evt => evt.nativeEvent.touches.length === 2,
        onMoveShouldSetPanResponder: evt => evt.nativeEvent.touches.length === 2,
        onPanResponderGrant: evt => {
          const touches = evt.nativeEvent.touches;
          if (touches.length === 2) {
            const dx = touches[0].pageX - touches[1].pageX;
            const dy = touches[0].pageY - touches[1].pageY;
            initialDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
            initialZoomRef.current = zoomLevel;
          }
        },
        onPanResponderMove: evt => {
          const touches = evt.nativeEvent.touches;
          if (touches.length === 2 && initialDistanceRef.current) {
            const dx = touches[0].pageX - touches[1].pageX;
            const dy = touches[0].pageY - touches[1].pageY;
            const currentDistance = Math.sqrt(dx * dx + dy * dy);
            const scaleFactor = currentDistance / initialDistanceRef.current;
            const nextZoom = Math.min(Math.max(initialZoomRef.current * scaleFactor, 0.25), 2.2);
            setZoomLevel(nextZoom);
          }
        },
        onPanResponderRelease: () => {
          initialDistanceRef.current = null;
        },
      }),
    [zoomLevel],
  );

  // Render thẻ cá nhân (Tương tác: bấm vào để xem chi tiết / sửa)
  const renderPersonCard = (person: PersonSummary) => {
    const isMe =
      (user && person.id === user.id) ||
      (user && person.name === user.name && person.generation === userGen);

    const branchBadgeColor =
      person.branch === 'noi'
        ? colors.branchNoi
        : person.branch === 'ngoai'
        ? colors.branchNgoai
        : colors.branchVoChong;

    return (
      <TouchableOpacity
        key={person.id}
        activeOpacity={0.85}
        onPress={() => setSelectedPerson(person)}
        style={[
          styles.memberCard,
          isMe && styles.memberCardHighlight,
        ]}>
        {/* Badge "BẠN Ở ĐÂY" cho chính chủ người dùng */}
        {isMe ? (
          <View style={styles.meBadge}>
            <Text style={styles.meBadgeText}>👑 BẠN Ở ĐÂY</Text>
          </View>
        ) : null}

        {/* Deceased Mark */}
        {person.isDeceased ? (
          <View style={styles.deceasedMark}>
            <Text style={styles.deceasedMarkText}>🪷 Đã mất</Text>
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
        <Text style={[styles.memberName, isMe && styles.memberNameHighlight]} numberOfLines={1}>
          {person.name}
        </Text>

        {/* Nickname */}
        {person.nickname ? (
          <Text style={styles.memberNickname} numberOfLines={1}>
            ({person.nickname})
          </Text>
        ) : null}

        {/* Relation to me */}
        <View style={[styles.relationBadge, { borderColor: branchBadgeColor }]}>
          <Text style={[styles.relationText, { color: branchBadgeColor }]} numberOfLines={1}>
            {person.customRelationToMe || person.inferredRelationToMe || (isMe ? 'Tôi' : 'Họ hàng')}
          </Text>
        </View>

        {/* Birth Year */}
        <Text style={styles.memberBirth}>
          {person.birthYear ? `Sinh: ${person.birthYear}` : ''}
        </Text>
      </TouchableOpacity>
    );
  };

  // Render FamilyUnit (Cặp vợ chồng hoặc người độc thân)
  const renderFamilyUnit = (unit: FamilyUnit) => {
    return (
      <View key={unit.id} style={styles.familyUnitWrapper}>
        <View style={styles.coupleRow}>
          {renderPersonCard(unit.primary)}

          {unit.spouse ? (
            <View style={styles.maritalConnector}>
              <View style={styles.maritalLine} />
              <View style={styles.maritalBadge}>
                <Text style={styles.maritalIcon}>⚭</Text>
                <Text style={styles.maritalLabel}>Phu Thê</Text>
              </View>
              <View style={styles.maritalLine} />
            </View>
          ) : null}

          {unit.spouse ? renderPersonCard(unit.spouse) : null}

          {unit.extraSpouses?.map(sp => (
            <React.Fragment key={sp.id}>
              <View style={styles.maritalConnector}>
                <View style={styles.maritalLine} />
                <View style={styles.maritalBadge}>
                  <Text style={styles.maritalIcon}>⚭</Text>
                  <Text style={styles.maritalLabel}>Kế Thất</Text>
                </View>
                <View style={styles.maritalLine} />
              </View>
              {renderPersonCard(sp)}
            </React.Fragment>
          ))}
        </View>
      </View>
    );
  };

  // Đệ quy render từng nhánh cây với nút mở rộng/thu gọn
  const renderTreeNode = (node: InteractiveTreeNode) => {
    const hasChildren = node.allChildrenCount > 0;
    const isExpanded = node.isExpanded;

    return (
      <View key={node.id} style={[styles.treeNodeContainer, { width: node.subtreeWidth }]}>
        {/* Family Unit Card */}
        <View style={[styles.treeNodeUnitRow, { width: node.subtreeWidth }]}>
          {renderFamilyUnit(node.unit)}
        </View>

        {/* NÚT MỞ RỘNG / THU GỌN TƯƠNG TÁC TỪNG NODE */}
        {hasChildren ? (
          <View style={[styles.toggleButtonRow, { width: node.subtreeWidth }]}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.togglePill,
                isExpanded ? styles.togglePillExpanded : styles.togglePillCollapsed,
              ]}
              onPress={() => toggleNode(node.id)}>
              <Icon
                name={isExpanded ? 'minus-circle-outline' : 'plus-circle'}
                size={14}
                color={isExpanded ? colors.textSecondary : '#FFF'}
              />
              <Text
                style={[
                  styles.togglePillText,
                  isExpanded ? styles.togglePillTextExpanded : styles.togglePillTextCollapsed,
                ]}>
                {isExpanded ? `Thu gọn (${node.allChildrenCount})` : `+ ${node.allChildrenCount} con`}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.togglePlaceholder} />
        )}

        {/* Các nhánh con thế hệ sau (chỉ vẽ khi isExpanded) */}
        {hasChildren && isExpanded ? (
          <View style={[styles.treeBranchesWrapper, { width: node.subtreeWidth }]}>
            {node.children.length === 1 ? (
              <View style={[styles.singleChildDropContainer, { width: node.subtreeWidth }]}>
                <View style={[styles.singleStemLine, { height: STEM_DROP }]} />
                <View style={styles.treeStemKnot}>
                  <Text style={styles.treeStemKnotText}>❖</Text>
                </View>
                <View style={[styles.singleStemLine, { height: STEM_BRANCH }]} />
              </View>
            ) : (
              <View
                style={[
                  styles.multiBranchesContainer,
                  { width: node.subtreeWidth, height: STEM_DROP + STEM_BRANCH },
                ]}>
                <View
                  style={[
                    styles.parentStemLine,
                    {
                      left: node.subtreeWidth / 2 - 1,
                      height: STEM_DROP,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.parentStemKnot,
                    {
                      left: node.subtreeWidth / 2 - 6,
                      top: STEM_DROP - 5,
                    },
                  ]}>
                  <Text style={styles.treeStemKnotText}>❖</Text>
                </View>

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
                      <View
                        style={[
                          styles.horizontalCrossbar,
                          {
                            top: STEM_DROP,
                            left: firstCenter,
                            width: barWidth,
                          },
                        ]}
                      />
                      {centers.map((cx, idx) => (
                        <View
                          key={`drop_${idx}`}
                          style={[
                            styles.childDropStem,
                            {
                              top: STEM_DROP,
                              left: cx - 1,
                              height: STEM_BRANCH,
                            },
                          ]}
                        />
                      ))}
                    </View>
                  );
                })()}
              </View>
            )}

            {/* Hàng các nhánh con */}
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
      {/* Top Navigation Header */}
      <ScreenHeader
        title="Xem Cây Gia Phả"
        subtitle={`Chế độ tương tác từng node • ${totalCount} thành viên`}
        canGoBack
        onGoBack={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs' as any))}
        rightAction={{
          icon: 'target',
          color: colors.primary,
          onPress: () => focusOnUser(true),
        }}
      />

      {/* Action Bar: Branch Filter & Interactive Toolbars */}
      <View style={styles.topControlSection}>
        {/* Branch Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}>
          <Chip
            label="Tất cả các nhánh"
            selected={selectedBranch === 'all'}
            onPress={() => {
              hasFocusedRef.current = false;
              setSelectedBranch('all');
            }}
          />
          <Chip
            label="Bên Nội"
            selected={selectedBranch === 'noi'}
            activeColor={colors.branchNoi}
            onPress={() => {
              hasFocusedRef.current = false;
              setSelectedBranch('noi');
            }}
          />
          <Chip
            label="Bên Ngoại"
            selected={selectedBranch === 'ngoai'}
            activeColor={colors.branchNgoai}
            onPress={() => {
              hasFocusedRef.current = false;
              setSelectedBranch('ngoai');
            }}
          />
          <Chip
            label="Bên Vợ / Chồng"
            selected={selectedBranch === 'vo_chong'}
            activeColor={colors.branchVoChong}
            onPress={() => {
              hasFocusedRef.current = false;
              setSelectedBranch('vo_chong');
            }}
          />
        </ScrollView>

        {/* Quick Node Expansion Presets */}
        <View style={styles.expansionPresetRow}>
          <TouchableOpacity
            style={styles.presetBtn}
            activeOpacity={0.7}
            onPress={() => focusOnUser(true)}>
            <Icon name="crosshairs-gps" size={15} color={colors.primary} />
            <Text style={styles.presetBtnTextPrimary}>Về vị trí của Tôi</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.presetBtnSecondary}
            activeOpacity={0.7}
            onPress={handleCollapseToUserGen}>
            <Icon name="arrow-collapse-vertical" size={14} color={colors.textSecondary} />
            <Text style={styles.presetBtnText}>Về đời Tôi</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.presetBtnSecondary}
            activeOpacity={0.7}
            onPress={handleExpandAll}>
            <Icon name="arrow-expand-vertical" size={14} color={colors.textSecondary} />
            <Text style={styles.presetBtnText}>Mở tất cả</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Interactive Canvas */}
      <View style={styles.canvasContainer} {...pinchPanResponder.panHandlers}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[typography.body2, styles.loadingText]}>
              Đang dựng sơ đồ gia phả tương tác...
            </Text>
          </View>
        ) : (
          <ScrollView
            ref={horizontalScrollRef}
            horizontal
            showsHorizontalScrollIndicator={true}
            scrollEventThrottle={16}
            onScroll={e => {
              currentScrollXRef.current = e.nativeEvent.contentOffset.x;
            }}
            contentContainerStyle={{
              width: Math.max(windowWidth, Math.round(canvasWidth * zoomLevel)),
            }}>
            <ScrollView
              ref={verticalScrollRef}
              showsVerticalScrollIndicator={true}
              scrollEventThrottle={16}
              onScroll={e => {
                currentScrollYRef.current = e.nativeEvent.contentOffset.y;
              }}
              contentContainerStyle={{
                height: Math.round(canvasHeight * zoomLevel),
              }}>
              <View
                style={{
                  width: Math.round(canvasWidth * zoomLevel),
                  height: Math.round(canvasHeight * zoomLevel),
                  transform: [{ scale: zoomLevel }],
                  transformOrigin: ['0%', '0%', 0],
                } as any}>
                <View
                  style={[
                    styles.pedigreeCanvas,
                    {
                      width: canvasWidth,
                      minHeight: canvasHeight,
                    },
                  ]}>
                  {/* Decorative Header Banner */}
                  <View style={styles.pedigreeHeader}>
                    <View style={styles.pedigreeHeaderEmblem}>
                      <Text style={styles.emblemIcon}>❖</Text>
                      <Text style={styles.emblemTitle}>
                        {selectedBranch === 'noi'
                          ? 'CÂY GIA PHẢ BÊN NỘI'
                          : selectedBranch === 'ngoai'
                          ? 'CÂY GIA PHẢ BÊN NGOẠI'
                          : selectedBranch === 'vo_chong'
                          ? 'CÂY GIA PHẢ BÊN VỢ / CHỒNG'
                          : 'BẢN ĐỒ GIA PHẢ TRỰC HỆ TOÀN DÒNG HỌ'}
                      </Text>
                      <Text style={styles.emblemIcon}>❖</Text>
                    </View>
                    <Text style={styles.pedigreeSubtitle}>
                      "Cây có cội mới trổ cành xanh ngọn • Nước có nguồn mới tỏa nhánh muôn sông"
                    </Text>
                  </View>

                  {/* Main Grid: Tree Roots on Left & Generation Legend on Right */}
                  <View style={styles.treeAndLegendRow}>
                    {/* Roots and Hierarchical Branches */}
                    <View style={styles.treeBranchesArea}>
                      {treeRoots.map((rootNode, rIdx) => (
                        <View
                          key={rootNode.id}
                          style={[
                            styles.rootNodeBox,
                            { width: rootNode.subtreeWidth },
                            rIdx > 0 && { marginLeft: ROOT_GAP },
                            { marginTop: Math.max(0, (maxGen - rootNode.generation) * ROW_HEIGHT) },
                          ]}>
                          {renderTreeNode(rootNode)}
                        </View>
                      ))}
                    </View>

                    {/* Right-side Legend Annotations */}
                    <View style={styles.rightLegendColumn}>
                      <View style={styles.legendHeaderBadge}>
                        <Icon name="bookmark-multiple-outline" size={15} color="#92400E" />
                        <Text style={styles.legendHeaderText}>CHÚ GIẢI THẾ HỆ</Text>
                      </View>

                      <View style={styles.legendSlotsContainer}>
                        {generationList.map(genNum => {
                          const meta = getGenerationMeta(genNum);
                          const isUserGenRow = genNum === userGen;

                          return (
                            <View key={genNum} style={[styles.legendSlot, { height: ROW_HEIGHT }]}>
                              <View
                                style={[
                                  styles.legendKnot,
                                  isUserGenRow && styles.legendKnotUserGen,
                                ]}>
                                <Text
                                  style={[
                                    styles.legendKnotText,
                                    isUserGenRow && styles.legendKnotTextUserGen,
                                  ]}>
                                  {meta.romanNumeral}
                                </Text>
                              </View>

                              <View
                                style={[
                                  styles.legendCard,
                                  isUserGenRow && styles.legendCardUserGen,
                                ]}>
                                <View style={styles.legendOrderPill}>
                                  <Text style={styles.legendOrderText}>{meta.orderText}</Text>
                                </View>
                                <Text style={styles.legendRankTitle} numberOfLines={2}>
                                  {meta.rankTitle}
                                </Text>
                                <Text style={styles.legendDescription} numberOfLines={2}>
                                  {meta.description}
                                </Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  </View>

                  {/* Footer Seal */}
                  <View style={styles.pedigreeFooter}>
                    <Text style={styles.footerSealText}>
                      ❖ GIA TỘC TRƯỜNG TỒN • PHÚC ĐỨC LƯU TRUYỀN ❖
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </ScrollView>
        )}

        {/* Floating Zoom Controls */}
        <View style={[styles.floatingZoomWidget, { bottom: Math.max(insets.bottom, 16) + 16 }]}>
          <TouchableOpacity
            style={styles.zoomBtn}
            activeOpacity={0.7}
            onPress={() => setZoomLevel(prev => Math.min(prev + 0.15, 2.0))}>
            <Icon name="plus" size={18} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.zoomBadge}
            activeOpacity={0.7}
            onPress={() => setZoomLevel(1.0)}>
            <Text style={styles.zoomBadgeText}>{Math.round(zoomLevel * 100)}%</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.zoomBtn}
            activeOpacity={0.7}
            onPress={() => setZoomLevel(prev => Math.max(prev - 0.15, 0.3))}>
            <Icon name="minus" size={18} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.zoomDivider} />

          <TouchableOpacity
            style={styles.zoomBtn}
            activeOpacity={0.7}
            onPress={() => focusOnUser(true)}>
            <Icon name="target" size={18} color="#F59E0B" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Person Detail Preview Modal when tapping any card */}
      <Modal
        visible={!!selectedPerson}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedPerson(null)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setSelectedPerson(null)}
          />

          {selectedPerson ? (
            <View
              style={[
                styles.modalContent,
                { paddingBottom: Math.max(insets.bottom, 16) + 12 },
              ]}>
              <View style={styles.modalDragHandle} />

              <View style={styles.modalHeaderRow}>
                <Avatar
                  uri={selectedPerson.avatarUri}
                  name={selectedPerson.name}
                  gender={selectedPerson.gender}
                  branch={selectedPerson.branch}
                  size="lg"
                  isDeceased={selectedPerson.isDeceased}
                />
                <View style={styles.modalHeaderTextWrap}>
                  <Text style={styles.modalPersonName}>{selectedPerson.name}</Text>
                  {selectedPerson.nickname ? (
                    <Text style={styles.modalPersonNickname}>({selectedPerson.nickname})</Text>
                  ) : null}
                  <View style={styles.modalBadgeRow}>
                    <View style={styles.modalRelationBadge}>
                      <Text style={styles.modalRelationText}>
                        {selectedPerson.customRelationToMe ||
                          selectedPerson.inferredRelationToMe ||
                          'Họ hàng'}
                      </Text>
                    </View>
                    {selectedPerson.birthYear ? (
                      <Text style={styles.modalBirthText}>Sinh {selectedPerson.birthYear}</Text>
                    ) : null}
                  </View>
                </View>
              </View>

              {selectedPerson.phone ? (
                <View style={styles.modalNoteBox}>
                  <Text style={styles.modalNoteLabel}>Số điện thoại:</Text>
                  <Text style={styles.modalNoteText}>{selectedPerson.phone}</Text>
                </View>
              ) : null}

              <View style={styles.modalActionButtons}>
                <AppButton
                  title="Đóng"
                  variant="outline"
                  onPress={() => setSelectedPerson(null)}
                  style={{ flex: 1 }}
                />
                <AppButton
                  title="Xem hồ sơ chi tiết"
                  variant="primary"
                  icon="account-details"
                  onPress={() => {
                    const id = selectedPerson.id;
                    setSelectedPerson(null);
                    navigation.navigate('PersonDetail', { personId: id });
                  }}
                  style={{ flex: 1.5 }}
                />
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF5EE',
  },
  topControlSection: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  chipsScroll: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  expansionPresetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginTop: 4,
  },
  presetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  presetBtnTextPrimary: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  presetBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetBtnText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  canvasContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#FAF5EE',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.textSecondary,
  },
  pedigreeCanvas: {
    backgroundColor: '#FFFDF9',
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2D9C8',
  },
  pedigreeHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  pedigreeHeaderEmblem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: '#D97706',
  },
  emblemIcon: {
    fontSize: 14,
    color: '#B45309',
    fontWeight: '700',
  },
  emblemTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#78350F',
    letterSpacing: 0.5,
  },
  pedigreeSubtitle: {
    fontSize: 12,
    color: '#92400E',
    marginTop: 6,
    fontStyle: 'italic',
  },
  treeAndLegendRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  treeBranchesArea: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  rootNodeBox: {
    alignItems: 'center',
  },
  treeNodeContainer: {
    alignItems: 'center',
  },
  treeNodeUnitRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  familyUnitWrapper: {
    alignItems: 'center',
  },
  coupleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: '#D4C5B0',
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  memberCardHighlight: {
    borderColor: '#D97706',
    borderWidth: 2.5,
    backgroundColor: '#FFFBEB',
    shadowColor: '#D97706',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  meBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: '#D97706',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    zIndex: 10,
  },
  meBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  deceasedMark: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: radius.sm,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  deceasedMarkText: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
  },
  avatarWrap: {
    marginTop: 4,
    marginBottom: 6,
  },
  memberName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  memberNameHighlight: {
    color: '#92400E',
    fontWeight: '800',
  },
  memberNickname: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  relationBadge: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    backgroundColor: '#FAF5EE',
  },
  relationText: {
    fontSize: 10,
    fontWeight: '600',
  },
  memberBirth: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
  },
  maritalConnector: {
    width: MARITAL_GAP,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  maritalLine: {
    width: '100%',
    height: 1.5,
    backgroundColor: '#B45309',
  },
  maritalBadge: {
    position: 'absolute',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#D97706',
  },
  maritalIcon: {
    fontSize: 10,
    color: '#92400E',
  },
  maritalLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#92400E',
  },
  // Nút mở rộng/thu gọn node
  toggleButtonRow: {
    height: TOGGLE_ROW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  togglePlaceholder: {
    height: TOGGLE_ROW_HEIGHT,
  },
  togglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  togglePillCollapsed: {
    backgroundColor: colors.primary,
  },
  togglePillExpanded: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: colors.border,
  },
  togglePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  togglePillTextCollapsed: {
    color: '#FFFFFF',
  },
  togglePillTextExpanded: {
    color: colors.textSecondary,
  },
  // Nhánh đường nối
  treeBranchesWrapper: {
    alignItems: 'center',
  },
  singleChildDropContainer: {
    alignItems: 'center',
  },
  singleStemLine: {
    width: 2,
    backgroundColor: '#B45309',
  },
  treeStemKnot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
  },
  treeStemKnotText: {
    fontSize: 9,
    color: '#FFF',
    fontWeight: '700',
  },
  multiBranchesContainer: {
    position: 'relative',
  },
  parentStemLine: {
    position: 'absolute',
    top: 0,
    width: 2,
    backgroundColor: '#B45309',
  },
  parentStemKnot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
  },
  horizontalCrossbar: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#B45309',
  },
  childDropStem: {
    position: 'absolute',
    width: 2,
    backgroundColor: '#B45309',
  },
  childrenRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  // Chú giải thế hệ ở bên phải
  rightLegendColumn: {
    marginLeft: 36,
    borderLeftWidth: 2,
    borderLeftColor: '#E2D9C8',
    paddingLeft: 18,
    width: 220,
  },
  legendHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#D97706',
    marginBottom: 12,
  },
  legendHeaderText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#78350F',
    letterSpacing: 0.5,
  },
  legendSlotsContainer: {
    flexDirection: 'column',
  },
  legendSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendKnot: {
    width: 44,
    height: 24,
    borderRadius: radius.sm,
    backgroundColor: '#FAF5EE',
    borderWidth: 1,
    borderColor: '#D4C5B0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendKnotUserGen: {
    backgroundColor: '#D97706',
    borderColor: '#B45309',
  },
  legendKnotText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78350F',
  },
  legendKnotTextUserGen: {
    color: '#FFF',
  },
  legendCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2D9C8',
    padding: 8,
  },
  legendCardUserGen: {
    borderColor: '#D97706',
    borderWidth: 1.5,
    backgroundColor: '#FFFBEB',
  },
  legendOrderPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
    marginBottom: 4,
  },
  legendOrderText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#92400E',
  },
  legendRankTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  legendDescription: {
    fontSize: 10,
    color: '#64748B',
  },
  pedigreeFooter: {
    alignItems: 'center',
    marginTop: 36,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2D9C8',
  },
  footerSealText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#78350F',
    letterSpacing: 0.5,
  },
  // Floating Zoom Widget
  floatingZoomWidget: {
    position: 'absolute',
    right: 16,
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: radius.full,
    paddingVertical: 8,
    paddingHorizontal: 6,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 100,
  },
  zoomBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBadge: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  zoomBadgeText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '700',
  },
  zoomDivider: {
    width: 20,
    height: 1,
    backgroundColor: '#475569',
  },
  // Modal Preview
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  modalDragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.xs,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  modalHeaderTextWrap: {
    flex: 1,
  },
  modalPersonName: {
    ...typography.h2,
    color: colors.text,
  },
  modalPersonNickname: {
    ...typography.body2,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  modalBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 6,
  },
  modalRelationBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  modalRelationText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  modalBirthText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  modalNoteBox: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  modalNoteLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  modalNoteText: {
    ...typography.body2,
    color: colors.text,
  },
  modalActionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
});
