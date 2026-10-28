import uuid from 'react-native-uuid';
import { Person, PersonSummary, Gender, FamilyBranch } from '../../types';
import { execute, query, queryOne } from '../database';
import { matchesVietnameseSearch } from '../../utils/vietnameseSearch';

interface PersonRow {
  id: string;
  name: string;
  nickname: string | null;
  gender: string;
  avatar_uri: string | null;
  branch: string;
  custom_relation_to_me: string | null;
  inferred_relation_to_me: string | null;
  how_they_call_me: string | null;
  birth_date: string | null;
  birth_year: number | null;
  is_deceased: number;
  death_date: string | null;
  death_date_lunar: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  generation: number;
  created_at: number;
  updated_at: number;
}

function mapRow(row: PersonRow): Person {
  return {
    id: row.id,
    name: row.name,
    nickname: row.nickname ?? undefined,
    gender: row.gender as Gender,
    avatarUri: row.avatar_uri ?? undefined,
    branch: row.branch as FamilyBranch,
    customRelationToMe: row.custom_relation_to_me ?? undefined,
    inferredRelationToMe: row.inferred_relation_to_me ?? undefined,
    howTheyCallMe: row.how_they_call_me ?? undefined,
    birthDate: row.birth_date ?? undefined,
    birthYear: row.birth_year ?? undefined,
    isDeceased: row.is_deceased === 1,
    deathDate: row.death_date ?? undefined,
    deathDateLunar: row.death_date_lunar ?? undefined,
    phone: row.phone ?? undefined,
    address: row.address ?? undefined,
    notes: row.notes ?? undefined,
    generation: row.generation ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSummaryRow(row: PersonRow): PersonSummary {
  return {
    id: row.id,
    name: row.name,
    nickname: row.nickname ?? undefined,
    gender: row.gender as Gender,
    avatarUri: row.avatar_uri ?? undefined,
    branch: row.branch as FamilyBranch,
    customRelationToMe: row.custom_relation_to_me ?? undefined,
    inferredRelationToMe: row.inferred_relation_to_me ?? undefined,
    phone: row.phone ?? undefined,
    birthYear: row.birth_year ?? undefined,
    isDeceased: row.is_deceased === 1,
    generation: row.generation ?? 0,
  };
}

export async function listPersons(options?: {
  branch?: FamilyBranch;
  searchQuery?: string;
  generation?: number;
}): Promise<PersonSummary[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options?.branch) {
    conditions.push('branch = ?');
    params.push(options.branch);
  }

  if (options?.generation !== undefined) {
    conditions.push('generation = ?');
    params.push(options.generation);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `
    SELECT id, name, nickname, gender, avatar_uri, branch, custom_relation_to_me, 
           inferred_relation_to_me, birth_year, phone, is_deceased, generation
    FROM persons
    ${whereClause}
    ORDER BY generation DESC, name ASC;
  `;

  const rows = await query<PersonRow>(sql, params);
  let list = rows.map(mapSummaryRow);

  if (options?.searchQuery && options.searchQuery.trim().length > 0) {
    const q = options.searchQuery.trim();
    list = list.filter(
      p =>
        matchesVietnameseSearch(p.name, q) ||
        matchesVietnameseSearch(p.nickname, q) ||
        matchesVietnameseSearch(p.customRelationToMe, q) ||
        matchesVietnameseSearch(p.inferredRelationToMe, q) ||
        matchesVietnameseSearch(p.phone, q),
    );
  }

  return list;
}

export async function getPersonById(id: string): Promise<Person | null> {
  const row = await queryOne<PersonRow>(
    'SELECT * FROM persons WHERE id = ? LIMIT 1;',
    [id],
  );
  return row ? mapRow(row) : null;
}

export async function createPerson(input: Omit<Person, 'id' | 'createdAt' | 'updatedAt'>): Promise<Person> {
  const id = uuid.v4() as string;
  const now = Date.now();

  await execute(
    `INSERT INTO persons (
      id, name, nickname, gender, avatar_uri, branch, custom_relation_to_me,
      inferred_relation_to_me, how_they_call_me, birth_date, birth_year,
      is_deceased, death_date, death_date_lunar, phone, address, notes,
      generation, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      input.name,
      input.nickname ?? null,
      input.gender,
      input.avatarUri ?? null,
      input.branch,
      input.customRelationToMe ?? null,
      input.inferredRelationToMe ?? null,
      input.howTheyCallMe ?? null,
      input.birthDate ?? null,
      input.birthYear ?? null,
      input.isDeceased ? 1 : 0,
      input.deathDate ?? null,
      input.deathDateLunar ?? null,
      input.phone ?? null,
      input.address ?? null,
      input.notes ?? null,
      input.generation,
      now,
      now,
    ],
  );

  return {
    ...input,
    id,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updatePerson(
  id: string,
  input: Partial<Omit<Person, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<Person | null> {
  const existing = await getPersonById(id);
  if (!existing) {
    return null;
  }

  const updated: Person = {
    ...existing,
    ...input,
    updatedAt: Date.now(),
  };

  await execute(
    `UPDATE persons SET
      name = ?, nickname = ?, gender = ?, avatar_uri = ?, branch = ?,
      custom_relation_to_me = ?, inferred_relation_to_me = ?, how_they_call_me = ?,
      birth_date = ?, birth_year = ?, is_deceased = ?, death_date = ?,
      death_date_lunar = ?, phone = ?, address = ?, notes = ?,
      generation = ?, updated_at = ?
    WHERE id = ?;`,
    [
      updated.name,
      updated.nickname ?? null,
      updated.gender,
      updated.avatarUri ?? null,
      updated.branch,
      updated.customRelationToMe ?? null,
      updated.inferredRelationToMe ?? null,
      updated.howTheyCallMe ?? null,
      updated.birthDate ?? null,
      updated.birthYear ?? null,
      updated.isDeceased ? 1 : 0,
      updated.deathDate ?? null,
      updated.deathDateLunar ?? null,
      updated.phone ?? null,
      updated.address ?? null,
      updated.notes ?? null,
      updated.generation,
      updated.updatedAt,
      id,
    ],
  );

  return updated;
}

export async function deletePerson(id: string): Promise<void> {
  await execute('DELETE FROM persons WHERE id = ?;', [id]);
}

export interface FamilyStats {
  total: number;
  branchNoi: number;
  branchNgoai: number;
  branchVoChong: number;
  deceased: number;
}

export async function getFamilyStats(): Promise<FamilyStats> {
  const rows = await query<{ branch: string; is_deceased: number; count: number }>(`
    SELECT branch, is_deceased, COUNT(*) as count 
    FROM persons 
    GROUP BY branch, is_deceased;
  `);

  let total = 0;
  let branchNoi = 0;
  let branchNgoai = 0;
  let branchVoChong = 0;
  let deceased = 0;

  for (const r of rows) {
    total += r.count;
    if (r.branch === 'noi') branchNoi += r.count;
    if (r.branch === 'ngoai') branchNgoai += r.count;
    if (r.branch === 'vo_chong') branchVoChong += r.count;
    if (r.is_deceased === 1) deceased += r.count;
  }

  return { total, branchNoi, branchNgoai, branchVoChong, deceased };
}
