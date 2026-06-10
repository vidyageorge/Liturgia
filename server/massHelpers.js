function toDateString(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.split('T')[0];
  if (value instanceof Date) return value.toISOString().split('T')[0];
  return String(value);
}

function parseJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

function mapMassTypeRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    default_time: row.default_time || '',
    description: row.description || '',
    is_special_event: Boolean(row.is_special_event),
    required_roles: parseJsonArray(row.required_roles),
    has_gospel_narration: Boolean(row.has_gospel_narration),
    has_mc_reader: Boolean(row.has_mc_reader),
    has_third_reading: Boolean(row.has_third_reading),
    has_apostles: Boolean(row.has_apostles),
    has_thanksgiving: Boolean(row.has_thanksgiving),
    has_carols: Boolean(row.has_carols),
    has_morning_adoration: Boolean(row.has_morning_adoration),
    has_departed_souls_reader: Boolean(row.has_departed_souls_reader),
  };
}

function mapAssignmentRow(row) {
  return {
    id: row.id,
    mass_id: row.mass_id,
    member_id: row.member_id,
    member_name: row.member_name || row.member_name_override || null,
    role: row.role,
    notes: row.notes || null,
  };
}

function mapApostleRow(row) {
  return {
    id: row.id,
    apostle_name: row.apostle_name,
    member_name: row.member_name || row.member_name_override || null,
  };
}

function mapDepartedSoulRow(row) {
  return {
    id: row.id,
    name: row.name,
    family_name: row.family_name || null,
  };
}

function buildMassResponse(massRow, massType, assignments, apostles, departedSouls) {
  return {
    id: massRow.id,
    mass_type: massType,
    date: toDateString(massRow.date),
    time: massRow.time || '',
    celebrant: massRow.celebrant || '',
    notes: massRow.notes || '',
    assignments: assignments.map(mapAssignmentRow),
    apostles: apostles.map(mapApostleRow),
    departed_souls: departedSouls.map(mapDepartedSoulRow),
  };
}

module.exports = {
  toDateString,
  parseJsonArray,
  mapMassTypeRow,
  mapAssignmentRow,
  mapApostleRow,
  mapDepartedSoulRow,
  buildMassResponse,
};
