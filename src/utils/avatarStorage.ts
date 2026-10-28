import { Platform } from 'react-native';
import * as FS from '@dr.pogodin/react-native-fs';
import uuid from 'react-native-uuid';

const AVATAR_DIR = `${FS.DocumentDirectoryPath}/avatars`;

/** Đảm bảo thư mục lưu avatar cục bộ luôn sẵn sàng */
export async function ensureAvatarDirectory(): Promise<string> {
  const exists = await FS.exists(AVATAR_DIR);
  if (!exists) {
    await FS.mkdir(AVATAR_DIR);
  }
  return AVATAR_DIR;
}

/**
 * Lưu ảnh được chọn/chụp vào thư mục avatar cục bộ vĩnh viễn trên máy
 */
export async function persistAvatarImage(sourceUri: string): Promise<string> {
  try {
    await ensureAvatarDirectory();
    const fileExt = sourceUri.includes('.png') ? 'png' : 'jpg';
    const filename = `avatar_${uuid.v4()}.${fileExt}`;
    const destinationPath = `${AVATAR_DIR}/${filename}`;

    // Chuẩn hóa path cho iOS & Android
    let cleanSourceUri = sourceUri;
    if (Platform.OS === 'ios' && cleanSourceUri.startsWith('file://')) {
      cleanSourceUri = cleanSourceUri.replace('file://', '');
    }

    await FS.copyFile(cleanSourceUri, destinationPath);
    return `file://${destinationPath}`;
  } catch (error) {
    console.warn('Lỗi khi lưu avatar cục bộ, dùng uri gốc:', error);
    return sourceUri;
  }
}
