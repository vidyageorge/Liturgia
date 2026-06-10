import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import type { ChangeLogEntry } from '../types';
import { formatDate, formatRole } from '../utils/format';

export default function Changelog() {
  const [changes, setChanges] = useState<ChangeLogEntry[]>([]);
  const [fieldFilter, setFieldFilter] = useState('');
  const [limit, setLimit] = useState('50');

  useEffect(() => {
    const loadLimit = limit === 'all' ? undefined : Number(limit);
    api.getChangelog(loadLimit).then(setChanges);
  }, [limit]);

  const filtered = useMemo(() => {
    if (!fieldFilter) return changes;
    if (fieldFilter === '_reader') {
      return changes.filter((c) => c.field_changed?.includes('_reader'));
    }
    return changes.filter((c) => c.field_changed === fieldFilter);
  }, [changes, fieldFilter]);

  const formatField = (field?: string | null) => {
    if (!field) return '-';
    if (field.includes('_reader')) return formatRole(field.replace('_reader', ''));
    return formatRole(field);
  };

  return (
    <>
      <div className="page-header">
        <h2 className="page-title">Change Log</h2>
        <p className="page-subtitle">Track all modifications to mass records</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            Recent Changes <span className="count-badge">{filtered.length}</span>
          </h3>
          <div className="header-filters">
            <select
              className="form-select"
              value={fieldFilter}
              onChange={(e) => setFieldFilter(e.target.value)}
            >
              <option value="">All Fields</option>
              <optgroup label="Mass Details">
                <option value="mass_type">Mass Type</option>
                <option value="date">Date</option>
                <option value="time">Time</option>
                <option value="celebrant">Celebrant</option>
                <option value="notes">Notes</option>
              </optgroup>
              <option value="_reader">All Reader Changes</option>
            </select>
            <select className="form-select" value={limit} onChange={(e) => setLimit(e.target.value)}>
              <option value="50">Last 50</option>
              <option value="100">Last 100</option>
              <option value="200">Last 200</option>
              <option value="all">All Changes</option>
            </select>
          </div>
        </div>
        <div className="card-body table-card">
          <table className="table">
            <thead>
              <tr>
                <th>Changed At</th>
                <th>Mass Date</th>
                <th>Mass Type</th>
                <th>Field</th>
                <th>Old Value</th>
                <th>New Value</th>
                <th>Changed By</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-state">
                    <p>No changes recorded</p>
                  </td>
                </tr>
              ) : (
                filtered.map((change) => (
                  <tr key={change.id}>
                    <td>{change.changed_at}</td>
                    <td>{change.mass_date ? formatDate(change.mass_date) : '-'}</td>
                    <td>{change.mass_type || '-'}</td>
                    <td>{formatField(change.field_changed)}</td>
                    <td>{change.old_value || '-'}</td>
                    <td>{change.new_value || '-'}</td>
                    <td>{change.changed_by || 'System'}</td>
                    <td>{change.change_reason}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
