import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import Modal from '../components/Modal';
import PageLoading from '../components/PageLoading';
import type { Member, MemberHistoryEntry } from '../types';
import { formatDate, formatRole } from '../utils/format';

const EXPERIENCE_LABELS: Record<string, string> = {
  new: 'New Reader',
  regular: 'Regular Reader',
  experienced: 'Experienced Reader',
};

export default function Readers() {
  const [readers, setReaders] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [historyReader, setHistoryReader] = useState<Member | null>(null);
  const [history, setHistory] = useState<MemberHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReaders = () =>
    api.getMembers().then(setReaders).finally(() => setLoading(false));

  useEffect(() => {
    loadReaders();
  }, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return readers;
    return readers.filter(
      (m) =>
        m.name.toLowerCase().includes(term) ||
        (m.phone && m.phone.includes(term))
    );
  }, [readers, search]);

  const handleAdd = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await api.createMember({
      name: String(form.get('name')),
      phone: String(form.get('phone') || ''),
      email: String(form.get('email') || ''),
    });
    setShowAdd(false);
    loadReaders();
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
    loadReaders();
  };

  const openHistory = async (reader: Member) => {
    setHistoryReader(reader);
    setHistory(await api.getMemberHistory(reader.id));
  };

  if (loading) return <PageLoading />;

  return (
    <>
      <div className="page-header">
        <h2 className="page-title">Readers</h2>
        <p className="page-subtitle">Manage the reader database for liturgy assignments</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            All Readers <span className="count-badge">{readers.length}</span>
          </h3>
          <button type="button" className="btn btn-primary" onClick={() => setShowAdd(true)}>
            Add Reader
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
                      <p>No readers found</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((reader) => (
                    <tr key={reader.id}>
                      <td>{reader.name}</td>
                      <td>{reader.phone || '-'}</td>
                      <td style={{ textAlign: 'center' }}>{reader.reading_count ?? 0}</td>
                      <td style={{ textAlign: 'center' }}>
                        {reader.experience_level
                          ? EXPERIENCE_LABELS[reader.experience_level] || reader.experience_level
                          : 'Auto'}
                      </td>
                      <td>
                        {reader.roles.length
                          ? reader.roles.map((r) => (
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
                            onClick={() => setEditing(reader)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => openHistory(reader)}
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

      <Modal title="Add Reader" isOpen={showAdd} onClose={() => setShowAdd(false)}>
        <form id="add-reader-form" onSubmit={handleAdd}>
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
          <button type="submit" form="add-reader-form" className="btn btn-primary">
            Save Reader
          </button>
        </div>
      </Modal>

      <Modal title="Edit Reader" isOpen={!!editing} onClose={() => setEditing(null)}>
        {editing && (
          <>
            <form id="edit-reader-form" onSubmit={handleEdit}>
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
              <button type="submit" form="edit-reader-form" className="btn btn-primary">
                Update Reader
              </button>
            </div>
          </>
        )}
      </Modal>

      <Modal
        title={historyReader ? `Reading History — ${historyReader.name}` : 'History'}
        isOpen={!!historyReader}
        onClose={() => setHistoryReader(null)}
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
