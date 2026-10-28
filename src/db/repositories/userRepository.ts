import { UserProfile, Gender } from '../../types';
import { execute, queryOne } from '../database';

interface UserProfileRow {
  id: string;
  name: string;
  gender: string;
  birth_year: number | null;
  avatar_uri: string | null;
  created_at: number;
  updated_at: number;
}

function mapRow(row: UserProfileRow): UserProfile {
  return {
    id: row.id,
    name: row.name,
    gender: row.gender as Gender,
    birthYear: row.birth_year ?? undefined,
    avatarUri: row.avatar_uri ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const row = await queryOne<UserProfileRow>(
    'SELECT * FROM user_profile WHERE id = ? LIMIT 1;',
    ['me'],
  );
  return row ? mapRow(row) : null;
}

export async function saveUserProfile(profile: {
  name: string;
  gender: Gender;
  birthYear?: number;
  avatarUri?: string;
}): Promise<UserProfile> {
  const now = Date.now();
  const existing = await getUserProfile();

  if (existing) {
    await execute(
      `UPDATE user_profile 
       SET name = ?, gender = ?, birth_year = ?, avatar_uri = ?, updated_at = ?
       WHERE id = ?;`,
      [
        profile.name,
        profile.gender,
        profile.birthYear ?? null,
        profile.avatarUri ?? null,
        now,
        'me',
      ],
    );
  } else {
    await execute(
      `INSERT INTO user_profile (id, name, gender, birth_year, avatar_uri, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [
        'me',
        profile.name,
        profile.gender,
        profile.birthYear ?? null,
        profile.avatarUri ?? null,
        now,
        now,
      ],
    );
  }

  return {
    id: 'me',
    name: profile.name,
    gender: profile.gender,
    birthYear: profile.birthYear,
    avatarUri: profile.avatarUri,
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now,
  };
}
