import uuid from 'react-native-uuid';
import { MemorialEvent } from '../../types';
import { execute, query } from '../database';

interface EventRow {
  id: string;
  person_id: string;
  person_name: string;
  title: string;
  event_type: string;
  lunar_day: number | null;
  lunar_month: number | null;
  solar_date: string | null;
  notes: string | null;
  created_at: number;
  updated_at: number;
}

function mapRow(row: EventRow): MemorialEvent {
  return {
    id: row.id,
    personId: row.person_id,
    personName: row.person_name,
    title: row.title,
    eventType: row.event_type as MemorialEvent['eventType'],
    lunarDay: row.lunar_day ?? undefined,
    lunarMonth: row.lunar_month ?? undefined,
    solarDate: row.solar_date ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listAllMemorialEvents(): Promise<MemorialEvent[]> {
  const sql = `
    SELECT e.*, p.name as person_name
    FROM memorial_events e
    INNER JOIN persons p ON e.person_id = p.id
    ORDER BY e.lunar_month ASC, e.lunar_day ASC;
  `;
  const rows = await query<EventRow>(sql);
  return rows.map(mapRow);
}

export async function createMemorialEvent(
  event: Omit<MemorialEvent, 'id' | 'personName' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const id = uuid.v4() as string;
  const now = Date.now();

  await execute(
    `INSERT INTO memorial_events (
      id, person_id, title, event_type, lunar_day, lunar_month, solar_date, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      event.personId,
      event.title,
      event.eventType,
      event.lunarDay ?? null,
      event.lunarMonth ?? null,
      event.solarDate ?? null,
      event.notes ?? null,
      now,
      now,
    ],
  );

  return id;
}

export async function deleteMemorialEvent(id: string): Promise<void> {
  await execute('DELETE FROM memorial_events WHERE id = ?;', [id]);
}
