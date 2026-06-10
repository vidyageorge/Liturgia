import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import Modal from '../components/Modal';
import type { Member, MemberHistoryEntry } from '../types';
import { formatDate, formatRole } from '../utils/format';

const EXPERIENCE_LABELS: Record<string, string> = {
  new: 'New Reader',
  regular: 'Regular Reader',
  experienced: 'Experienced Reader',
};

export default function Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [historyMember, setHistoryMember] = useState<Member | null>(null);
  const [history, setHistory] = useState<MemberHistoryEntry[]>([]);

  const loadMembers = () => api.getMembers().then(setMembers);

  useEffect(() => {
    loadMembers();
  }, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(term) ||
        (m.phone && m.phone.includes(term))
    );
  }, [members, search]);

  const handleAdd = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await api.createMember({
      name: String(form.get('name')),
      phone: String(form.get('phone') || ''),
      email: String(form.get('email') || ''),
    });
    setShowAdd(false);
    loadMembers();
  };

  const handleEdit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing) return;
    const form = new FormData(e.currentTarget);
    await api.updateMember(editing.id, {
      name: String(form.get('name')),
      phone: String(form.get('phone') || ''),
      email: String(form.get('email') || ''),
      experience_level: String(form.get('experience_level') || '') || null,
      years_of_service: form.get('years_of_service')
        ? Number(form.get('years_of_service'))
        : null,
    });
    setEditing(null);
    loadMembers();
  };

  const openHistory = async (member: Member) => {
    setHistoryMember(member);
    setHistory(await api.getMemberHistory(member.id));
  };

  return (
    <>
      <div className="page-header">
        <h2 className="page-title">Community Members</h2>
        <p className="page-subtitle">Manage readers and liturgy participants</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            All Members <span className="count-badge">{members.length}</span>
          </h3>
          <button type="button" className="btn btn-primary" onClick={() => setShowAdd(true)}>
            Add Member
          </button>
        </div>
        <div className="card-body">
          <div className="toolbar">
            <input
              type="text"
              className="form-input search-input"
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="toolbar-note">
              Reading count shows total assignments ({new Date().getFullYear()})
            </span>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Readings</th>
                  <th>Experience</th>
                  <th>Community Roles</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty-state">
                      <p>No members found</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((member) => (
                    <tr key={member.id}>
                      <td>{member.name}</td>
                      <td>{member.phone || '-'}</td>
                      <td style={{ textAlign: 'center' }}>{member.reading_count ?? 0}</td>
                      <td style={{ textAlign: 'center' }}>
                        {member.experience_level
                          ? EXPERIENCE_LABELS[member.experience_level] || member.experience_level
                          : 'Auto'}
                      </td>
                      <td>
                        {member.roles.length
                          ? member.roles.map((r) => (
                              <span key={r} className="badge badge-burgundy badge-inline">
                                {r}
                              </span>
                            ))
                          : '-'}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => setEditing(member)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => openHistory(member)}
                          >
                            History
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal title="Add Member" isOpen={showAdd} onClose={() => setShowAdd(false)}>
        <form id="add-member-form" onSubmit={handleAdd}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input className="form-input" name="name" required />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-input" name="phone" type="tel" />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" name="email" type="email" />
          </div>
        </form>
        <div className="modal-footer-inline">
          <button type="button" className="btn btn-outline" onClick={() => setShowAdd(false)}>
            Cancel
          </button>
          <button type="submit" form="add-member-form" className="btn btn-primary">
            Save Member
          </button>
        </div>
      </Modal>

      <Modal title="Edit Member" isOpen={!!editing} onClose={() => setEditing(null)}>
        {editing && (
          <>
            <form id="edit-member-form" onSubmit={handleEdit}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-input" name="name" defaultValue={editing.name} required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" name="phone" defaultValue={editing.phone || ''} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" name="email" defaultValue={editing.email || ''} />
              </div>
              <div className="form-panel">
                <label className="form-label">Experience Level</label>
                <div className="grid grid-2">
                  <select
                    className="form-select"
                    name="experience_level"
                    defaultValue={editing.experience_level || ''}
                  >
                    <option value="">Auto (calculate)</option>
                    <option value="new">New Reader</option>
                    <option value="regular">Regular Reader</option>
                    <option value="experienced">Experienced Reader</option>
                  </select>
                  <input
                    className="form-input"
                    name="years_of_service"
                    type="number"
                    min={0}
                    placeholder="Years of service"
                    defaultValue={editing.years_of_service ?? ''}
                  />
                </div>
              </div>
            </form>
            <div className="modal-footer-inline">
              <button type="button" className="btn btn-outline" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="submit" form="edit-member-form" className="btn btn-primary">
                Update Member
              </button>
            </div>
          </>
        )}
      </Modal>

      <Modal
        title={historyMember ? `Reading History — ${historyMember.name}` : 'History'}
        isOpen={!!historyMember}
        onClose={() => setHistoryMember(null)}
        wide
      >
        {history.length === 0 ? (
          <div className="empty-state">
            <p>No reading history yet</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Mass Type</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry, i) => (
                <tr key={`${entry.date}-${entry.role}-${i}`}>
                  <td>{formatDate(entry.date)}</td>
                  <td>{entry.mass_type}</td>
                  <td>{formatRole(entry.role)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>
    </>
  );
}
