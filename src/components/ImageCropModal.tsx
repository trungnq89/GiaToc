import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Image,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import { colors, radius, spacing, typography } from '../theme';
import { Icon } from './Icon';

export interface ImageCropModalProps {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
  onCropDone: (croppedUri: string) => void;
}

export function ImageCropModal({
  visible,
  imageUri,
  onClose,
  onCropDone,
}: ImageCropModalProps) {
  const { width: windowWidth } = useWindowDimensions();
  const cropSize = Math.min(windowWidth - 48, 300);

  const [imgDimensions, setImgDimensions] = useState<{ width: number; height: number }>({
    width: cropSize,
    height: cropSize,
  });

  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  const cropRef = useRef<any>(null);

  // Refs for tracking gestures
  const panRef = useRef(pan);
  panRef.current = pan;

  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  const initialDistanceRef = useRef<number | null>(null);
  const initialScaleRef = useRef<number>(1.0);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Reset transforms whenever a new image is loaded
  useEffect(() => {
    if (visible && imageUri) {
      setPan({ x: 0, y: 0 });
      setScale(1.0);
      setRotation(0);

      Image.getSize(
        imageUri,
        (w, h) => {
          let scaledW = cropSize;
          let scaledH = cropSize;
          if (w > 0 && h > 0) {
            if (w < h) {
              scaledW = cropSize;
              scaledH = (h / w) * cropSize;
            } else {
              scaledH = cropSize;
              scaledW = (w / h) * cropSize;
            }
          }
          setImgDimensions({ width: scaledW, height: scaledH });
        },
        () => {
          setImgDimensions({ width: cropSize, height: cropSize });
        },
      );
    }
  }, [visible, imageUri, cropSize]);

  // PanResponder for 1-finger drag and 2-finger pinch
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: evt => {
          const touches = evt.nativeEvent.touches;
          if (touches.length === 1) {
            dragStartRef.current = {
              x: touches[0].pageX - panRef.current.x,
              y: touches[0].pageY - panRef.current.y,
            };
          } else if (touches.length >= 2) {
            const dx = touches[0].pageX - touches[1].pageX;
            const dy = touches[0].pageY - touches[1].pageY;
            initialDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
            initialScaleRef.current = scaleRef.current;
          }
        },
        onPanResponderMove: evt => {
          const touches = evt.nativeEvent.touches;
          if (touches.length === 1 && !initialDistanceRef.current) {
            const newX = touches[0].pageX - dragStartRef.current.x;
            const newY = touches[0].pageY - dragStartRef.current.y;
            // Limit pan distance to prevent moving completely out of view
            const maxPan = cropSize * 0.8 * scaleRef.current;
            const clampedX = Math.max(-maxPan, Math.min(maxPan, newX));
            const clampedY = Math.max(-maxPan, Math.min(maxPan, newY));
            setPan({ x: clampedX, y: clampedY });
          } else if (touches.length >= 2) {
            const dx = touches[0].pageX - touches[1].pageX;
            const dy = touches[0].pageY - touches[1].pageY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (!initialDistanceRef.current) {
              initialDistanceRef.current = dist;
              initialScaleRef.current = scaleRef.current;
            } else {
              const ratio = dist / initialDistanceRef.current;
              const newScale = Math.min(4.0, Math.max(1.0, initialScaleRef.current * ratio));
              setScale(newScale);
            }
          }
        },
        onPanResponderRelease: () => {
          initialDistanceRef.current = null;
        },
        onPanResponderTerminate: () => {
          initialDistanceRef.current = null;
        },
      }),
    [cropSize],
  );

  const handleZoomIn = () => {
    setScale(prev => Math.min(4.0, Math.round((prev + 0.25) * 100) / 100));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(1.0, Math.round((prev - 0.25) * 100) / 100));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleReset = () => {
    setPan({ x: 0, y: 0 });
    setScale(1.0);
    setRotation(0);
  };

  const handleConfirmCrop = async () => {
    if (!cropRef.current || isCapturing) return;

    try {
      setIsCapturing(true);
      const uri = await captureRef(cropRef, {
        format: 'jpg',
        quality: 0.75,
        width: 320,
        height: 320,
        result: 'tmpfile',
      });

      if (uri) {
        onCropDone(uri);
        onClose();
      }
    } catch (e) {
      console.warn('Lỗi cắt ảnh:', e);
    } finally {
      setIsCapturing(false);
    }
  };

  if (!visible || !imageUri) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
        {/* Modal Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onClose}
            disabled={isCapturing}
            activeOpacity={0.7}>
            <Text style={styles.cancelBtnText}>Hủy</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Cắt ảnh đại diện</Text>

          <TouchableOpacity
            style={styles.applyBtn}
            onPress={handleConfirmCrop}
            disabled={isCapturing}
            activeOpacity={0.7}>
            {isCapturing ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.applyBtnText}>Chọn</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Viewport Center Area */}
        <View style={styles.contentArea}>
          <Text style={styles.instructionText}>
            Dùng 1 ngón tay di chuyển • 2 ngón tay phóng to/thu nhỏ
          </Text>

          {/* Cropping Frame */}
          <View style={[styles.cropFrameWrapper, { width: cropSize, height: cropSize }]}>
            {/* The actual view to capture */}
            <View
              ref={cropRef}
              collapsable={false}
              style={[
                styles.cropInnerBox,
                { width: cropSize, height: cropSize },
              ]}
              {...panResponder.panHandlers}>
              <Image
                source={{ uri: imageUri }}
                style={{
                  width: imgDimensions.width,
                  height: imgDimensions.height,
                  transform: [
                    { translateX: pan.x },
                    { translateY: pan.y },
                    { scale: scale },
                    { rotate: `${rotation}deg` },
                  ],
                }}
                resizeMode="contain"
              />
            </View>

            {/* Circular Avatar Guide Overlay with grid */}
            <View
              style={[
                styles.circularGuideOverlay,
                { width: cropSize, height: cropSize, borderRadius: cropSize / 2 },
              ]}
              pointerEvents="none">
              {/* Rule of thirds horizontal grid */}
              <View style={[styles.gridHLine, { top: cropSize / 3 }]} />
              <View style={[styles.gridHLine, { top: (cropSize * 2) / 3 }]} />
              {/* Rule of thirds vertical grid */}
              <View style={[styles.gridVLine, { left: cropSize / 3 }]} />
              <View style={[styles.gridVLine, { left: (cropSize * 2) / 3 }]} />
            </View>
          </View>

          {/* Quick Transform Toolbar */}
          <View style={styles.toolsBar}>
            <TouchableOpacity
              style={styles.toolBtn}
              onPress={handleZoomOut}
              disabled={scale <= 1.0}
              activeOpacity={0.7}>
              <Icon name="minus" size={22} color={scale <= 1.0 ? '#555' : '#FFF'} />
            </TouchableOpacity>

            <View style={styles.scaleBadge}>
              <Text style={styles.scaleBadgeText}>{Math.round(scale * 100)}%</Text>
            </View>

            <TouchableOpacity
              style={styles.toolBtn}
              onPress={handleZoomIn}
              disabled={scale >= 4.0}
              activeOpacity={0.7}>
              <Icon name="plus" size={22} color={scale >= 4.0 ? '#555' : '#FFF'} />
            </TouchableOpacity>

            <View style={styles.toolDivider} />

            <TouchableOpacity
              style={styles.toolBtn}
              onPress={handleRotate}
              activeOpacity={0.7}>
              <Icon name="rotate-right" size={22} color="#FFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolBtn}
              onPress={handleReset}
              activeOpacity={0.7}>
              <Icon name="refresh" size={20} color="#F59E0B" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  cancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '700',
  },
  applyBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    minWidth: 64,
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  contentArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  instructionText: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 24,
    textAlign: 'center',
  },
  cropFrameWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  cropInnerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  circularGuideOverlay: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#F59E0B',
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  gridHLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  gridVLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  toolsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    marginTop: 32,
    gap: 8,
  },
  toolBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#334155',
  },
  scaleBadge: {
    minWidth: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleBadgeText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  toolDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#475569',
    marginHorizontal: 4,
  },
});
