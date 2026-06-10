import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import Modal from '../components/Modal';
import type { CommunityRole, Member } from '../types';

const CATEGORY_META: Record<string, { label: string; className: string }> = {
  liturgy: { label: 'Liturgy Ministry', className: 'liturgy' },
  choir: { label: 'Choir Ministry', className: 'choir' },
  catechism: { label: 'Catechism Ministry', className: 'catechism' },
  volunteers: { label: 'Volunteers', className: 'volunteers' },
  executive: { label: 'Executive Committee', className: 'executive' },
};

export default function Community() {
  const [roles, setRoles] = useState<CommunityRole[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [showAddRole, setShowAddRole] = useState(false);
  const [assignRole, setAssignRole] = useState<CommunityRole | null>(null);

  const load = () =>
    Promise.all([api.getRoles(), api.getMembers()]).then(([rolesData, membersData]) => {
      setRoles(rolesData);
      setMembers(membersData);
    });

  useEffect(() => {
    load();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, CommunityRole[]>();
    for (const role of roles) {
      const category = role.category || 'other';
      if (!map.has(category)) map.set(category, []);
      map.get(category)!.push(role);
    }
    return map;
  }, [roles]);

  const handleAddRole = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await api.createRole({
      name: String(form.get('name')),
      category: String(form.get('category')),
      description: String(form.get('description') || ''),
    });
    setShowAddRole(false);
    load();
  };

  const handleAssign = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!assignRole) return;
    const memberId = Number(new FormData(e.currentTarget).get('member_id'));
    await api.addMemberRole(memberId, assignRole.id);
    setAssignRole(null);
    load();
  };

  const handleRemoveMember = async (role: CommunityRole, memberName: string) => {
    const member = members.find((m) => m.name === memberName);
    if (!member) return;
    await api.removeMemberRole(member.id, role.id);
    load();
  };

  return (
    <>
      <div className="page-header">
        <h2 className="page-title">Community Structure</h2>
        <p className="page-subtitle">Liturgy, choir, catechism, and volunteer teams</p>
      </div>

      <div className="page-actions">
        <button type="button" className="btn btn-primary" onClick={() => setShowAddRole(true)}>
          Add Role
        </button>
      </div>

      <div className="community-structure">
        {[...grouped.entries()].map(([category, categoryRoles]) => {
          const meta = CATEGORY_META[category] || {
            label: category,
            className: 'executive',
          };
          return (
            <div key={category} className="ministry-card">
              <div className={`ministry-header ${meta.className}`}>
                <h3 className="ministry-title">{meta.label}</h3>
              </div>
              <div className="ministry-body">
                {categoryRoles.map((role) => (
                  <div key={role.id} className="role-section">
                    <div className="role-title-row">
                      <h4 className="role-title">{role.name}</h4>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => setAssignRole(role)}
                      >
                        Assign Reader
                      </button>
                    </div>
                    {role.description && (
                      <p className="role-description">{role.description}</p>
                    )}
                    <div className="member-chips">
                      {role.members.length === 0 ? (
                        <span className="text-muted">No readers assigned</span>
                      ) : (
                        role.members.map((name) => (
                          <span key={name} className="member-chip">
                            {name}
                            <button
                              type="button"
                              className="chip-remove"
                              onClick={() => handleRemoveMember(role, name)}
                              aria-label={`Remove ${name}`}
                            >
                              ×
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Modal title="Add Community Role" isOpen={showAddRole} onClose={() => setShowAddRole(false)}>
        <form id="add-role-form" onSubmit={handleAddRole}>
          <div className="form-group">
            <label className="form-label">Role Name *</label>
            <input className="form-input" name="name" required />
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-select" name="category" defaultValue="liturgy">
              {Object.entries(CATEGORY_META).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" name="description" />
          </div>
        </form>
        <div className="modal-footer-inline">
          <button type="button" className="btn btn-outline" onClick={() => setShowAddRole(false)}>
            Cancel
          </button>
          <button type="submit" form="add-role-form" className="btn btn-primary">
            Save Role
          </button>
        </div>
      </Modal>

      <Modal
        title={assignRole ? `Assign Reader — ${assignRole.name}` : 'Assign'}
        isOpen={!!assignRole}
        onClose={() => setAssignRole(null)}
      >
        <form id="assign-role-form" onSubmit={handleAssign}>
          <div className="form-group">
            <label className="form-label">Reader</label>
            <select className="form-select" name="member_id" required>
              <option value="">Select reader</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </form>
        <div className="modal-footer-inline">
          <button type="button" className="btn btn-outline" onClick={() => setAssignRole(null)}>
            Cancel
          </button>
          <button type="submit" form="assign-role-form" className="btn btn-primary">
            Assign
          </button>
        </div>
      </Modal>
    </>
  );
}
