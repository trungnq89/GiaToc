jest.mock('@dr.pogodin/react-native-fs', () => ({
  DocumentDirectoryPath: '/mock/docs',
  DownloadDirectoryPath: '/mock/downloads',
  exists: jest.fn(),
  mkdir: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  readDir: jest.fn(),
  stat: jest.fn(),
  unlink: jest.fn(),
  scanFile: jest.fn(),
  pickFile: jest.fn(),
}));

jest.mock('../../db/database', () => ({
  query: jest.fn(),
  execute: jest.fn(),
}));

import { formatFileSize, BackupManifest } from '../backupService';
import JSZip from 'jszip';

describe('backupService', () => {
  describe('formatFileSize', () => {
    it('formats 0 bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(-10)).toBe('0 B');
    });

    it('formats bytes, KB, MB correctly', () => {
      expect(formatFileSize(500)).toBe('500.0 B');
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1024 * 1024 * 2.5)).toBe('2.5 MB');
    });
  });

  describe('JSZip packaging & manifest integrity', () => {
    it('creates a valid zip package and reads back manifest & data correctly', async () => {
      const zip = new JSZip();

      const manifest: BackupManifest = {
        appName: 'giatoc',
        appVersion: '1.0.0',
        backupVersion: 1,
        createdAt: new Date().toISOString(),
        createdTimestamp: Date.now(),
        deviceOS: 'android',
        stats: {
          personsCount: 2,
          relationshipsCount: 1,
          memorialEventsCount: 1,
          avatarsCount: 1,
          userName: 'Nguyễn Quang Trung',
        },
      };

      zip.file('manifest.json', JSON.stringify(manifest, null, 2));

      const dataFolder = zip.folder('data')!;
      dataFolder.file(
        'persons.json',
        JSON.stringify([
          { id: 'p1', name: 'Nguyễn Văn A', branch: 'noi', generation: 1 },
          { id: 'p2', name: 'Trần Thị B', branch: 'noi', generation: 1 },
        ]),
      );
      dataFolder.file(
        'relationships.json',
        JSON.stringify([
          { id: 'r1', person_id: 'p1', related_person_id: 'p2', relation_type: 'spouse' },
        ]),
      );

      const avatarsFolder = zip.folder('avatars')!;
      const sampleBase64Image =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      avatarsFolder.file('avatar_p1.jpg', sampleBase64Image, { base64: true });

      // Generate base64 zip
      const zipBase64 = await zip.generateAsync({
        type: 'base64',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      expect(typeof zipBase64).toBe('string');
      expect(zipBase64.length).toBeGreaterThan(0);

      // Read back and inspect
      const loadedZip = await JSZip.loadAsync(zipBase64, { base64: true });
      const readManifestFile = loadedZip.file('manifest.json');
      expect(readManifestFile).not.toBeNull();

      const readManifest: BackupManifest = JSON.parse(await readManifestFile!.async('text'));
      expect(readManifest.appName).toBe('giatoc');
      expect(readManifest.stats.personsCount).toBe(2);
      expect(readManifest.stats.userName).toBe('Nguyễn Quang Trung');

      const readPersonsFile = loadedZip.file('data/persons.json');
      expect(readPersonsFile).not.toBeNull();
      const readPersons = JSON.parse(await readPersonsFile!.async('text'));
      expect(readPersons).toHaveLength(2);
      expect(readPersons[0].name).toBe('Nguyễn Văn A');

      // Verify avatar file in zip
      const avatarFile = loadedZip.file('avatars/avatar_p1.jpg');
      expect(avatarFile).not.toBeNull();
      const extractedAvatarBase64 = await avatarFile!.async('base64');
      expect(extractedAvatarBase64).toBe(sampleBase64Image);
    });
  });
});
