import { Platform } from 'react-native';
import * as FS from '@dr.pogodin/react-native-fs';
import JSZip from 'jszip';
import { execute, query } from '../db/database';
import { useSessionStore } from '../store/sessionStore';
import { ensureAvatarDirectory } from '../utils/avatarStorage';

export interface BackupManifest {
  appName: string;
  appVersion: string;
  backupVersion: number;
  createdAt: string;
  createdTimestamp: number;
  deviceOS: string;
  stats: {
    personsCount: number;
    relationshipsCount: number;
    memorialEventsCount: number;
    avatarsCount: number;
    userName?: string;
  };
}

export interface BackupSummary {
  fileName: string;
  filePath: string;
  publicPath?: string;
  fileSizeBytes: number;
  manifest: BackupManifest;
}

export interface BackupFileInfo {
  fileName: string;
  filePath: string;
  fileSizeBytes: number;
  formattedSize: string;
  modifiedTime: Date;
  isPublicDownload: boolean;
}

const BACKUP_DIR = `${FS.DocumentDirectoryPath}/backups`;

/** Đảm bảo thư mục lưu trữ bản sao lưu nội bộ luôn tồn tại */
export async function ensureBackupDirectory(): Promise<string> {
  const exists = await FS.exists(BACKUP_DIR);
  if (!exists) {
    await FS.mkdir(BACKUP_DIR);
  }
  return BACKUP_DIR;
}

/** Format byte size sang KB / MB dễ đọc */
export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

/**
 * 1. TẠO BẢN SAO LƯU FILE ZIP
 * Đóng gói toàn bộ tài khoản: user profile, persons, relationships, memorial events và ảnh đại diện
 */
export async function createBackupZip(): Promise<BackupSummary> {
  await ensureBackupDirectory();

  // 1. Lấy toàn bộ dữ liệu SQLite
  const userProfiles = await query<any>('SELECT * FROM user_profile LIMIT 1;');
  const persons = await query<any>('SELECT * FROM persons;');
  const relationships = await query<any>('SELECT * FROM relationships;');
  const memorialEvents = await query<any>('SELECT * FROM memorial_events;');

  const userProfile = userProfiles.length > 0 ? userProfiles[0] : null;

  // 2. Khởi tạo JSZip
  const zip = new JSZip();
  const avatarsFolder = zip.folder('avatars');

  let avatarsPackedCount = 0;
  const avatarNameMap = new Map<string, string>(); // originalPath -> zipRelativeFileName

  // Helper nén ảnh đại diện vào zip
  const packAvatar = async (rawUri: string | null | undefined, prefix: string): Promise<string | undefined> => {
    if (!rawUri || !avatarsFolder) return undefined;
    let cleanPath = rawUri;
    if (cleanPath.startsWith('file://')) {
      cleanPath = cleanPath.replace('file://', '');
    }

    if (avatarNameMap.has(cleanPath)) {
      return avatarNameMap.get(cleanPath);
    }

    try {
      const fileExists = await FS.exists(cleanPath);
      if (fileExists) {
        const base64Data = await FS.readFile(cleanPath, 'base64');
        const ext = cleanPath.toLowerCase().endsWith('.png') ? 'png' : 'jpg';
        const zipFileName = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${ext}`;
        avatarsFolder.file(zipFileName, base64Data, { base64: true });
        avatarNameMap.set(cleanPath, zipFileName);
        avatarsPackedCount += 1;
        return zipFileName;
      }
    } catch (err) {
      console.warn('Lỗi khi nén avatar vào zip:', cleanPath, err);
    }
    return undefined;
  };

  // Đóng gói avatar của User Profile
  let userAvatarFileName: string | undefined;
  if (userProfile?.avatar_uri) {
    userAvatarFileName = await packAvatar(userProfile.avatar_uri, 'user');
  }

  // Đóng gói avatar của Persons
  const personsWithAvatarRefs = await Promise.all(
    persons.map(async p => {
      let avatarFileName: string | undefined;
      if (p.avatar_uri) {
        avatarFileName = await packAvatar(p.avatar_uri, `p_${p.id}`);
      }
      return {
        ...p,
        _backup_avatar_filename: avatarFileName,
      };
    }),
  );

  const userProfileWithAvatarRef = userProfile
    ? {
        ...userProfile,
        _backup_avatar_filename: userAvatarFileName,
      }
    : null;

  // 3. Manifest metadata
  const manifest: BackupManifest = {
    appName: 'giatoc',
    appVersion: '1.0.0',
    backupVersion: 1,
    createdAt: new Date().toISOString(),
    createdTimestamp: Date.now(),
    deviceOS: Platform.OS,
    stats: {
      personsCount: persons.length,
      relationshipsCount: relationships.length,
      memorialEventsCount: memorialEvents.length,
      avatarsCount: avatarsPackedCount,
      userName: userProfile?.name,
    },
  };

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  const dataFolder = zip.folder('data');
  if (dataFolder) {
    dataFolder.file('user_profile.json', JSON.stringify(userProfileWithAvatarRef, null, 2));
    dataFolder.file('persons.json', JSON.stringify(personsWithAvatarRefs, null, 2));
    dataFolder.file('relationships.json', JSON.stringify(relationships, null, 2));
    dataFolder.file('memorial_events.json', JSON.stringify(memorialEvents, null, 2));
  }

  // 4. Sinh file ZIP Base64
  const zipBase64 = await zip.generateAsync({
    type: 'base64',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `GiaToc_Backup_${timestampStr}.zip`;

  // Lưu bản sao trong thư mục backups nội bộ của app
  const internalPath = `${BACKUP_DIR}/${fileName}`;
  await FS.writeFile(internalPath, zipBase64, 'base64');

  // Lưu thêm bản sao ra thư mục Download (để người dùng dễ quản lý / copy / gửi máy khác)
  let publicPath: string | undefined;
  try {
    const downloadDir =
      Platform.OS === 'android' ? FS.DownloadDirectoryPath : FS.DocumentDirectoryPath;
    publicPath = `${downloadDir}/${fileName}`;
    await FS.writeFile(publicPath, zipBase64, 'base64');

    if (Platform.OS === 'android') {
      try {
        await FS.scanFile(publicPath);
      } catch (scanErr) {
        console.warn('Scan backup zip error:', scanErr);
      }
    }
  } catch (pubErr) {
    console.warn('Không thể ghi bản sao ra thư mục Download công khai:', pubErr);
    publicPath = internalPath;
  }

  const stat = await FS.stat(internalPath);

  return {
    fileName,
    filePath: internalPath,
    publicPath: publicPath || internalPath,
    fileSizeBytes: stat.size,
    manifest,
  };
}

/**
 * 2. KIỂM TRA (INSPECT) TỆP SAO LƯU ZIP TRƯỚC KHI PHỤC HỒI
 */
export async function inspectBackupZip(zipPathOrUri: string): Promise<{
  manifest: BackupManifest;
  fileName: string;
  fileSizeBytes?: number;
}> {
  let cleanUri = zipPathOrUri;
  if (cleanUri.startsWith('file://')) {
    cleanUri = cleanUri.replace('file://', '');
  }

  const base64Data = await FS.readFile(cleanUri, 'base64');
  const zip = await JSZip.loadAsync(base64Data, { base64: true });

  const manifestFile = zip.file('manifest.json');
  if (!manifestFile) {
    throw new Error('Tệp không đúng định dạng: Không tìm thấy manifest.json trong file ZIP.');
  }

  const manifestJsonStr = await manifestFile.async('text');
  const manifest = JSON.parse(manifestJsonStr) as BackupManifest;

  if (manifest.appName !== 'giatoc') {
    throw new Error('Tệp ZIP này không phải là bản sao lưu của ứng dụng Gia Tộc.');
  }

  let size: number | undefined;
  try {
    const s = await FS.stat(cleanUri);
    size = s.size;
  } catch {
    // Với content:// uri stat có thể không đọc trực tiếp size
  }

  const parts = cleanUri.split('/');
  const fileName = parts[parts.length - 1] || 'backup.zip';

  return {
    manifest,
    fileName,
    fileSizeBytes: size,
  };
}

/**
 * 3. PHỤC HỒI DỮ LIỆU TỪ TỆP ZIP
 */
export async function restoreFromBackupZip(zipPathOrUri: string): Promise<{
  personsCount: number;
  relationshipsCount: number;
  memorialEventsCount: number;
  avatarsCount: number;
  restoredUserName?: string;
}> {
  let cleanUri = zipPathOrUri;
  if (cleanUri.startsWith('file://')) {
    cleanUri = cleanUri.replace('file://', '');
  }

  const base64Data = await FS.readFile(cleanUri, 'base64');
  const zip = await JSZip.loadAsync(base64Data, { base64: true });

  // Kiểm tra manifest
  const manifestFile = zip.file('manifest.json');
  if (!manifestFile) {
    throw new Error('File ZIP không hợp lệ: Không tìm thấy manifest.json.');
  }
  const manifest = JSON.parse(await manifestFile.async('text')) as BackupManifest;

  // Đọc các bảng dữ liệu
  const userProfileFile = zip.file('data/user_profile.json');
  const personsFile = zip.file('data/persons.json');
  const relationshipsFile = zip.file('data/relationships.json');
  const memorialEventsFile = zip.file('data/memorial_events.json');

  if (!personsFile || !relationshipsFile || !memorialEventsFile) {
    throw new Error('File ZIP bị thiếu dữ liệu bảng (persons, relationships hoặc memorial_events).');
  }

  const rawUserProfile = userProfileFile ? JSON.parse(await userProfileFile.async('text')) : null;
  const rawPersons: any[] = JSON.parse(await personsFile.async('text'));
  const rawRelationships: any[] = JSON.parse(await relationshipsFile.async('text'));
  const rawMemorialEvents: any[] = JSON.parse(await memorialEventsFile.async('text'));

  // 1. Giải nén tất cả avatar vào thư mục DocumentDirectoryPath/avatars/
  const avatarDir = await ensureAvatarDirectory();
  const extractedAvatarMap = new Map<string, string>(); // zipFilename -> fullLocalPath

  const avatarFiles = Object.keys(zip.files).filter(
    f => f.startsWith('avatars/') && !zip.files[f].dir,
  );

  let restoredAvatarsCount = 0;
  for (const aPath of avatarFiles) {
    try {
      const file = zip.file(aPath);
      if (file) {
        const aBase64 = await file.async('base64');
        const justName = aPath.replace('avatars/', '');
        const targetPath = `${avatarDir}/${justName}`;
        await FS.writeFile(targetPath, aBase64, 'base64');
        extractedAvatarMap.set(justName, `file://${targetPath}`);
        restoredAvatarsCount += 1;
      }
    } catch (aErr) {
      console.warn('Lỗi khi giải nén avatar:', aPath, aErr);
    }
  }

  // 2. Cập nhật đường dẫn avatar_uri cho User Profile
  let restoredUserProfile = rawUserProfile;
  if (restoredUserProfile) {
    if (restoredUserProfile._backup_avatar_filename && extractedAvatarMap.has(restoredUserProfile._backup_avatar_filename)) {
      restoredUserProfile.avatar_uri = extractedAvatarMap.get(restoredUserProfile._backup_avatar_filename);
    }
  }

  // 3. Cập nhật đường dẫn avatar_uri cho Persons
  const restoredPersons = rawPersons.map(p => {
    let finalAvatarUri = p.avatar_uri;
    if (p._backup_avatar_filename && extractedAvatarMap.has(p._backup_avatar_filename)) {
      finalAvatarUri = extractedAvatarMap.get(p._backup_avatar_filename);
    }
    return {
      ...p,
      avatar_uri: finalAvatarUri,
    };
  });

  // 4. Ghi đè toàn bộ dữ liệu SQLite
  await execute('DELETE FROM memorial_events;');
  await execute('DELETE FROM relationships;');
  await execute('DELETE FROM persons;');
  await execute('DELETE FROM user_profile;');

  // Ghi user_profile
  if (restoredUserProfile) {
    await execute(
      `INSERT INTO user_profile (id, name, gender, birth_year, avatar_uri, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [
        restoredUserProfile.id || 'me',
        restoredUserProfile.name,
        restoredUserProfile.gender || 'male',
        restoredUserProfile.birth_year ?? null,
        restoredUserProfile.avatar_uri ?? null,
        restoredUserProfile.created_at || Date.now(),
        Date.now(),
      ],
    );
  }

  // Ghi persons
  for (const p of restoredPersons) {
    await execute(
      `INSERT INTO persons (
        id, name, nickname, gender, avatar_uri, branch,
        custom_relation_to_me, inferred_relation_to_me, how_they_call_me,
        birth_date, birth_year, is_deceased, death_date, death_date_lunar,
        phone, address, notes, generation, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        p.id,
        p.name,
        p.nickname ?? null,
        p.gender,
        p.avatar_uri ?? null,
        p.branch || 'noi',
        p.custom_relation_to_me ?? null,
        p.inferred_relation_to_me ?? null,
        p.how_they_call_me ?? null,
        p.birth_date ?? null,
        p.birth_year ?? null,
        p.is_deceased ? 1 : 0,
        p.death_date ?? null,
        p.death_date_lunar ?? null,
        p.phone ?? null,
        p.address ?? null,
        p.notes ?? null,
        p.generation ?? 0,
        p.created_at || Date.now(),
        p.updated_at || Date.now(),
      ],
    );
  }

  // Ghi relationships
  for (const r of rawRelationships) {
    await execute(
      `INSERT INTO relationships (id, person_id, related_person_id, relation_type, order_index, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [
        r.id,
        r.person_id,
        r.related_person_id,
        r.relation_type,
        r.order_index ?? 0,
        r.created_at || Date.now(),
        r.updated_at || Date.now(),
      ],
    );
  }

  // Ghi memorial_events
  for (const e of rawMemorialEvents) {
    await execute(
      `INSERT INTO memorial_events (
        id, person_id, title, event_type, lunar_day, lunar_month, solar_date, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        e.id,
        e.person_id,
        e.title,
        e.event_type || 'death_anniversary',
        e.lunar_day ?? null,
        e.lunar_month ?? null,
        e.solar_date ?? null,
        e.notes ?? null,
        e.created_at || Date.now(),
        e.updated_at || Date.now(),
      ],
    );
  }

  // 5. Cập nhật Session Store
  if (restoredUserProfile) {
    useSessionStore.getState().completeOnboarding({
      name: restoredUserProfile.name,
      gender: restoredUserProfile.gender || 'male',
      birthYear: restoredUserProfile.birth_year,
      avatarUri: restoredUserProfile.avatar_uri,
    });
  }

  return {
    personsCount: restoredPersons.length,
    relationshipsCount: rawRelationships.length,
    memorialEventsCount: rawMemorialEvents.length,
    avatarsCount: restoredAvatarsCount,
    restoredUserName: restoredUserProfile?.name,
  };
}

/**
 * 4. LIỆT KÊ TẤT CẢ FILE SAO LƯU TRÊN THIẾT BỊ
 */
export async function listAvailableBackups(): Promise<BackupFileInfo[]> {
  const result: BackupFileInfo[] = [];
  const seenPaths = new Set<string>();

  const scanFolder = async (folderPath: string, isPublic: boolean) => {
    try {
      const exists = await FS.exists(folderPath);
      if (!exists) return;
      const items = await FS.readDir(folderPath);

      for (const item of items) {
        if (
          item.isFile() &&
          item.name.toLowerCase().endsWith('.zip') &&
          (item.name.startsWith('GiaToc_Backup_') || item.name.startsWith('HoHang_Backup_'))
        ) {
          if (!seenPaths.has(item.path)) {
            seenPaths.add(item.path);
            result.push({
              fileName: item.name,
              filePath: item.path,
              fileSizeBytes: item.size,
              formattedSize: formatFileSize(item.size),
              modifiedTime: item.mtime || new Date(),
              isPublicDownload: isPublic,
            });
          }
        }
      }
    } catch (e) {
      console.warn('Lỗi quét thư mục sao lưu:', folderPath, e);
    }
  };

  // Quét thư mục nội bộ
  await scanFolder(BACKUP_DIR, false);

  // Quét thư mục Download công khai
  if (Platform.OS === 'android') {
    await scanFolder(FS.DownloadDirectoryPath, true);
  }

  // Sắp xếp bản mới nhất lên trước
  result.sort((a, b) => b.modifiedTime.getTime() - a.modifiedTime.getTime());

  return result;
}

/**
 * 5. XÓA TỆP SAO LƯU
 */
export async function deleteBackupFile(path: string): Promise<void> {
  let clean = path;
  if (clean.startsWith('file://')) {
    clean = clean.replace('file://', '');
  }
  const exists = await FS.exists(clean);
  if (exists) {
    await FS.unlink(clean);
  }
}
