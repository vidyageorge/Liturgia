import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import type { Mass } from '../types';
import { formatDate, formatRole } from '../utils/format';

type FilterTab = 'all' | 'past' | 'upcoming' | 'special';

export default function Masses() {
  const [masses, setMasses] = useState<Mass[]>([]);
  const [tab, setTab] = useState<FilterTab>('all');
  const [exportYear, setExportYear] = useState(String(new Date().getFullYear()));

  useEffect(() => {
    api.getMasses().then(setMasses);
  }, []);

  const filtered = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    switch (tab) {
      case 'past':
        return masses.filter((m) => m.date < today);
      case 'upcoming':
        return masses.filter((m) => m.date >= today);
      case 'special':
        return masses.filter((m) => m.mass_type?.is_special_event);
      default:
        return masses;
    }
  }, [masses, tab]);

  const groupedByRole = (mass: Mass) => {
    const map = new Map<string, string[]>();
    for (const a of mass.assignments) {
      if (!map.has(a.role)) map.set(a.role, []);
      if (a.member_name) map.get(a.role)!.push(a.member_name);
    }
    return map;
  };

  return (
    <>
      <div className="page-header">
        <h2 className="page-title">Mass History</h2>
        <p className="page-subtitle">Browse past and upcoming mass records</p>
      </div>

      <div className="toolbar export-toolbar">
        <div className="filter-tabs">
          {(['all', 'past', 'upcoming', 'special'] as FilterTab[]).map((value) => (
            <button
              key={value}
              type="button"
              className={`filter-tab${tab === value ? ' active' : ''}`}
              onClick={() => setTab(value)}
            >
              {value === 'all'
                ? 'All'
                : value.charAt(0).toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>
        <div className="export-controls">
          <input
            className="form-input export-year"
            type="number"
            value={exportYear}
            onChange={(e) => setExportYear(e.target.value)}
          />
          <a className="btn btn-secondary" href={api.exportMassesUrl({ year: exportYear })}>
            Export Excel
          </a>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <p>No masses found</p>
          </div>
        </div>
      ) : (
        filtered.map((mass) => {
          const roles = groupedByRole(mass);
          return (
            <div
              key={mass.id}
              className={`mass-card${mass.mass_type?.is_special_event ? ' special' : ''}`}
            >
              <div className="mass-card-header">
                <div>
                  <div className="mass-card-title">{mass.mass_type?.name || 'Mass'}</div>
                  <div className="mass-card-date">
                    {formatDate(mass.date)}
                    {mass.time ? ` · ${mass.time}` : ''}
                  </div>
                </div>
                {mass.celebrant && <span className="badge badge-gold">{mass.celebrant}</span>}
              </div>
              <div className="mass-card-body">
                <div className="assignment-list">
                  {[...roles.entries()].map(([role, names]) => (
                    <div key={role} className="assignment-item">
                      <div className="assignment-role">{formatRole(role)}</div>
                      <div className="assignment-name">{names.join(', ')}</div>
                    </div>
                  ))}
                  {roles.size === 0 && (
                    <div className="empty-state">
                      <p>No readers assigned</p>
                    </div>
                  )}
                </div>
                {mass.apostles.length > 0 && (
                  <div className="apostles-section">
                    <h4>Apostles</h4>
                    <div className="apostle-grid">
                      {mass.apostles.map((a) => (
                        <div key={a.id} className="apostle-item">
                          <div className="apostle-name">{a.apostle_name}</div>
                          <div>{a.member_name || 'Unassigned'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {mass.notes && <p className="mass-notes">{mass.notes}</p>}
              </div>
            </div>
          );
        })
      )}
    </>
  );
}
