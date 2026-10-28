import uuid from 'react-native-uuid';
import { KinshipRelation, AtomicRelationType, Person } from '../../types';
import { execute, query } from '../database';
import { getPersonById } from './personRepository';

interface RelationshipRow {
  id: string;
  person_id: string;
  related_person_id: string;
  relation_type: string;
  order_index: number | null;
  created_at: number;
  updated_at: number;
}

function mapRow(row: RelationshipRow): KinshipRelation {
  return {
    id: row.id,
    personId: row.person_id,
    relatedPersonId: row.related_person_id,
    relationType: row.relation_type as AtomicRelationType,
    orderIndex: row.order_index ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface RelativeWithDetails {
  relationId: string;
  relationType: AtomicRelationType;
  person: Person;
  orderIndex?: number;
}

export async function getDirectRelatives(personId: string): Promise<{
  parents: Person[];
  spouses: Person[];
  children: Person[];
  siblings: Person[];
}> {
  const rows = await query<RelationshipRow>(
    `SELECT * FROM relationships WHERE person_id = ?;`,
    [personId],
  );

  const parents: Person[] = [];
  const spouses: Person[] = [];
  const children: Person[] = [];
  const siblings: Person[] = [];

  for (const row of rows) {
    const rel = mapRow(row);
    const relatedPerson = await getPersonById(rel.relatedPersonId);
    if (!relatedPerson) continue;

    if (rel.relationType === 'parent') {
      parents.push(relatedPerson);
    } else if (rel.relationType === 'spouse') {
      spouses.push(relatedPerson);
    } else if (rel.relationType === 'child') {
      children.push(relatedPerson);
    } else if (rel.relationType === 'sibling') {
      siblings.push(relatedPerson);
    }
  }

  return { parents, spouses, children, siblings };
}

/**
 * Thêm quan hệ 2 chiều giữa 2 người:
 * Ví dụ: personId là 'parent' của relatedPersonId -> đồng thời relatedPersonId là 'child' của personId
 */
export async function linkRelatives(
  personId: string,
  relatedPersonId: string,
  relationType: AtomicRelationType,
  orderIndex?: number,
): Promise<void> {
  const now = Date.now();
  const id1 = uuid.v4() as string;
  const id2 = uuid.v4() as string;

  // Lệnh 1: personId -> relatedPersonId
  await execute(
    `INSERT INTO relationships (id, person_id, related_person_id, relation_type, order_index, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [id1, personId, relatedPersonId, relationType, orderIndex ?? null, now, now],
  );

  // Quan hệ đối ứng tự động
  let reciprocalType: AtomicRelationType | null = null;
  if (relationType === 'parent') reciprocalType = 'child';
  else if (relationType === 'child') reciprocalType = 'parent';
  else if (relationType === 'spouse') reciprocalType = 'spouse';
  else if (relationType === 'sibling') reciprocalType = 'sibling';

  if (reciprocalType) {
    await execute(
      `INSERT INTO relationships (id, person_id, related_person_id, relation_type, order_index, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [id2, relatedPersonId, personId, reciprocalType, orderIndex ?? null, now, now],
    );
  }
}

export async function removeRelationship(personId: string, relatedPersonId: string): Promise<void> {
  await execute(
    `DELETE FROM relationships 
     WHERE (person_id = ? AND related_person_id = ?) 
        OR (person_id = ? AND related_person_id = ?);`,
    [personId, relatedPersonId, relatedPersonId, personId],
  );
}
