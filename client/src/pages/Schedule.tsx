import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import MemberSelect from '../components/MemberSelect';
import Modal from '../components/Modal';
import type { AssignmentInput, Mass, MassType, Member, Priest } from '../types';
import { APOSTLE_NAMES, ROLE_LABELS, formatDate } from '../utils/format';

type RoleAssignment = { memberId?: number | null; name: string };

export default function Schedule() {
  const [massTypes, setMassTypes] = useState<MassType[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [priests, setPriests] = useState<Priest[]>([]);
  const [upcoming, setUpcoming] = useState<Mass[]>([]);

  const [massTypeId, setMassTypeId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('');
  const [celebrant, setCelebrant] = useState('');
  const [notes, setNotes] = useState('');
  const [assignments, setAssignments] = useState<Record<string, RoleAssignment[]>>({});
  const [apostles, setApostles] = useState<Record<string, RoleAssignment>>({});
  const [saving, setSaving] = useState(false);

  const [editingMass, setEditingMass] = useState<Mass | null>(null);
  const [editReason, setEditReason] = useState('');
  const [editAssignments, setEditAssignments] = useState<Record<string, RoleAssignment[]>>({});

  const selectedType = useMemo(
    () => massTypes.find((mt) => mt.id === Number(massTypeId)) || null,
    [massTypes, massTypeId]
  );

  const load = () =>
    Promise.all([
      api.getMassTypes(),
      api.getMembers(),
      api.getPriests(),
      api.getUpcomingMasses(),
    ]).then(([types, membersData, priestsData, upcomingData]) => {
      setMassTypes(types);
      setMembers(membersData);
      setPriests(priestsData);
      setUpcoming(upcomingData);
    });

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!selectedType) return;
    setTime(selectedType.default_time || '');
    const next: Record<string, RoleAssignment[]> = {};
    for (const role of selectedType.required_roles) {
      next[role] = assignments[role] || [];
    }
    if (selectedType.has_mc_reader) next.mc_reader = assignments.mc_reader || [];
    if (selectedType.has_gospel_narration) {
      next.gospel_narrator = assignments.gospel_narrator || [];
    }
    setAssignments(next);
    if (selectedType.has_apostles) {
      const nextApostles: Record<string, RoleAssignment> = {};
      for (const name of APOSTLE_NAMES) {
        nextApostles[name] = apostles[name] || { name: '' };
      }
      setApostles(nextApostles);
    }
  }, [selectedType?.id]);

  const addReader = (role: string, value: RoleAssignment, isEdit = false) => {
    if (!value.name) return;
    const setter = isEdit ? setEditAssignments : setAssignments;
    setter((prev) => ({
      ...prev,
      [role]: [...(prev[role] || []), value],
    }));
  };

  const removeReader = (role: string, index: number, isEdit = false) => {
    const setter = isEdit ? setEditAssignments : setAssignments;
    setter((prev) => ({
      ...prev,
      [role]: (prev[role] || []).filter((_, i) => i !== index),
    }));
  };

  const buildAssignmentPayload = (map: Record<string, RoleAssignment[]>): AssignmentInput[] => {
    const result: AssignmentInput[] = [];
    for (const [role, readers] of Object.entries(map)) {
      for (const reader of readers) {
        if (!reader.name) continue;
        result.push({
          role,
          member_id: reader.memberId || null,
          member_name: reader.name,
        });
      }
    }
    return result;
  };

  const handleSaveNew = async () => {
    if (!selectedType || !date) return;
    setSaving(true);
    try {
      const mass = await api.createMass({
        mass_type_id: selectedType.id,
        date,
        time,
        celebrant,
        notes,
      });
      const payload = buildAssignmentPayload(assignments);
      if (payload.length > 0) {
        await api.bulkUpdateAssignments(mass.id, payload, 'Initial schedule');
      }
      if (selectedType.has_apostles) {
        for (const [apostleName, reader] of Object.entries(apostles)) {
          if (!reader.name) continue;
          await api.addApostle(mass.id, {
            apostle_name: apostleName,
            member_id: reader.memberId || undefined,
            member_name_override: reader.memberId ? undefined : reader.name,
          });
        }
      }
      setMassTypeId('');
      setAssignments({});
      setApostles({});
      setCelebrant('');
      setNotes('');
      load();
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (mass: Mass) => {
    setEditingMass(mass);
    setEditReason('');
    const map: Record<string, RoleAssignment[]> = {};
    for (const a of mass.assignments) {
      if (!map[a.role]) map[a.role] = [];
      map[a.role].push({
        memberId: a.member_id,
        name: a.member_name || '',
      });
    }
    setEditAssignments(map);
  };

  const handleSaveEdit = async () => {
    if (!editingMass || !editReason.trim()) return;
    setSaving(true);
    try {
      await api.updateMass(editingMass.id, {
        mass_type_id: editingMass.mass_type?.id,
        date: editingMass.date,
        time: editingMass.time,
        celebrant: editingMass.celebrant,
        notes: editingMass.notes,
        change_reason: editReason.trim(),
      });
      await api.bulkUpdateAssignments(
        editingMass.id,
        buildAssignmentPayload(editAssignments),
        editReason.trim()
      );
      setEditingMass(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingMass) return;
    if (!window.confirm('Delete this mass?')) return;
    await api.deleteMass(editingMass.id);
    setEditingMass(null);
    load();
  };

  const renderRoleBlock = (
    role: string,
    map: Record<string, RoleAssignment[]>,
    isEdit: boolean
  ) => (
    <div key={role} className="role-assignment">
      <div className="role-assignment-header">
        <span className="role-name">{ROLE_LABELS[role] || role}</span>
      </div>
      <MemberSelect
        members={members}
        value={{ name: '' }}
        onChange={(value) => addReader(role, value, isEdit)}
        placeholder={`Add ${ROLE_LABELS[role] || role}...`}
      />
      <div className="reader-chips">
        {(map[role] || []).map((reader, index) => (
          <span key={`${role}-${reader.name}-${index}`} className="selected-reader">
            {reader.name}
            <button
              type="button"
              className="remove-selection"
              onClick={() => removeReader(role, index, isEdit)}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );

  const rolesToRender = (type: MassType | null) => {
    if (!type) return [];
    const roles = [...type.required_roles];
    if (type.has_mc_reader && !roles.includes('mc_reader')) roles.push('mc_reader');
    if (type.has_gospel_narration && !roles.includes('gospel_narrator')) {
      roles.push('gospel_narrator');
    }
    return roles;
  };

  return (
    <>
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-header">
          <h3 className="card-title">Upcoming Masses</h3>
        </div>
        <div className="card-body">
          {upcoming.length === 0 ? (
            <div className="empty-state">
              <p>No upcoming masses</p>
            </div>
          ) : (
            upcoming.map((mass) => (
              <div key={mass.id} className="upcoming-mass-card">
                <div className="upcoming-mass-info">
                  <h4>{mass.mass_type?.name}</h4>
                  <p>
                    {formatDate(mass.date)}
                    {mass.time ? ` · ${mass.time}` : ''}
                  </p>
                </div>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => openEdit(mass)}>
                  Edit
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="page-header">
        <h2 className="page-title">Schedule New Mass</h2>
        <p className="page-subtitle">Assign readers and participants for upcoming mass</p>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Mass Details</h3>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Mass Type *</label>
              <select
                className="form-select"
                value={massTypeId}
                onChange={(e) => setMassTypeId(e.target.value)}
              >
                <option value="">Select mass type</option>
                {massTypes.map((mt) => (
                  <option key={mt.id} value={mt.id}>
                    {mt.name}
                    {mt.is_special_event ? ' ⭐' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date *</label>
              <input
                className="form-input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Time</label>
              <input
                className="form-input"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="e.g., 7:15 AM"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Celebrant</label>
              <input
                className="form-input"
                list="priest-list"
                value={celebrant}
                onChange={(e) => setCelebrant(e.target.value)}
                placeholder="Priest name"
              />
              <datalist id="priest-list">
                {priests.map((p) => (
                  <option key={p.id} value={p.full_name} />
                ))}
              </datalist>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                className="form-textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Mass Type Details</h3>
          </div>
          <div className="card-body">
            {!selectedType ? (
              <div className="empty-state">
                <p>Select a mass type to see details</p>
              </div>
            ) : (
              <>
                <p>{selectedType.description}</p>
                <ul className="feature-list">
                  {selectedType.has_carols && <li>Includes carols</li>}
                  {selectedType.has_thanksgiving && <li>Thanksgiving mass</li>}
                  {selectedType.has_apostles && <li>12 Apostles ceremony</li>}
                  {selectedType.has_morning_adoration && <li>Morning adoration</li>}
                  {selectedType.has_departed_souls_reader && <li>Departed souls remembrance</li>}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>

      {selectedType && (
        <div className="card assignments-card" style={{ marginTop: '2rem' }}>
          <div className="card-header">
            <h3 className="card-title">Reader Assignments</h3>
          </div>
          <div className="card-body">
            {rolesToRender(selectedType).map((role) => renderRoleBlock(role, assignments, false))}
          </div>
        </div>
      )}

      {selectedType?.has_apostles && (
        <div className="card" style={{ marginTop: '2rem' }}>
          <div className="card-header">
            <h3 className="card-title">Twelve Apostles</h3>
          </div>
          <div className="card-body apostle-grid">
            {APOSTLE_NAMES.map((name) => (
              <div key={name} className="apostle-item">
                <div className="apostle-name">{name}</div>
                <MemberSelect
                  members={members}
                  value={apostles[name] || { name: '' }}
                  onChange={(value) =>
                    setApostles((prev) => ({ ...prev, [name]: value }))
                  }
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="save-row">
        <button
          type="button"
          className="btn btn-primary"
          disabled={!selectedType || !date || saving}
          onClick={handleSaveNew}
        >
          {saving ? 'Saving...' : 'Save Mass & Assignments'}
        </button>
      </div>

      <Modal
        title={editingMass ? `Edit Mass — ${editingMass.mass_type?.name}` : 'Edit Mass'}
        isOpen={!!editingMass}
        onClose={() => setEditingMass(null)}
        wide
      >
        {editingMass && (
          <>
            <div className="form-panel">
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input
                    className="form-input"
                    type="date"
                    value={editingMass.date}
                    onChange={(e) =>
                      setEditingMass({ ...editingMass, date: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Time</label>
                  <input
                    className="form-input"
                    value={editingMass.time}
                    onChange={(e) =>
                      setEditingMass({ ...editingMass, time: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Celebrant</label>
                <input
                  className="form-input"
                  value={editingMass.celebrant}
                  onChange={(e) =>
                    setEditingMass({ ...editingMass, celebrant: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label reason-label">Reason for Change *</label>
                <textarea
                  className="form-textarea reason-input"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  required
                />
              </div>
            </div>
            {rolesToRender(editingMass.mass_type).map((role) =>
              renderRoleBlock(role, editAssignments, true)
            )}
            <div className="modal-footer-inline">
              <button type="button" className="btn btn-danger" onClick={handleDelete}>
                Delete
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setEditingMass(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!editReason.trim() || saving}
                onClick={handleSaveEdit}
              >
                Save Changes
              </button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
