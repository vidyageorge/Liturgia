import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import type { Mass, MassType, Stats } from '../types';
import { formatDate } from '../utils/format';

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [massTypes, setMassTypes] = useState<MassType[]>([]);
  const [upcoming, setUpcoming] = useState<Mass[]>([]);
  const [recent, setRecent] = useState<Mass[]>([]);

  useEffect(() => {
    Promise.all([
      api.getStats(),
      api.getMassTypes(),
      api.getUpcomingMasses(),
      api.getPastMasses(),
    ]).then(([statsData, types, upcomingData, pastData]) => {
      setStats(statsData);
      setMassTypes(types);
      setUpcoming(upcomingData);
      setRecent(pastData);
    });
  }, []);

  const specialCount = massTypes.filter((mt) => mt.is_special_event).length;

  return (
    <>
      <div className="page-header">
        <h2 className="page-title">Welcome to Liturgia</h2>
        <p className="page-subtitle">Sacred Ministry Roster Management System</p>
      </div>

      <div className="grid grid-4 stats-row">
        <div className="stat-card">
          <div className="stat-icon gold">👥</div>
          <div>
            <div className="stat-value">{stats?.total_members ?? 0}</div>
            <div className="stat-label">Active Members</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon burgundy">⛪</div>
          <div>
            <div className="stat-value">{stats?.total_masses ?? 0}</div>
            <div className="stat-label">Total Masses</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">📅</div>
          <div>
            <div className="stat-value">{stats?.upcoming_masses ?? 0}</div>
            <div className="stat-label">Upcoming Masses</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">⭐</div>
          <div>
            <div className="stat-value">{specialCount}</div>
            <div className="stat-label">Special Events</div>
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Upcoming Masses</h3>
            <Link to="/schedule" className="btn btn-primary btn-sm">
              Schedule
            </Link>
          </div>
          <div className="card-body">
            {upcoming.length === 0 ? (
              <div className="empty-state">
                <p>No upcoming masses scheduled</p>
              </div>
            ) : (
              upcoming.slice(0, 5).map((mass) => (
                <div key={mass.id} className="list-row">
                  <div>
                    <div className="list-row-title">{mass.mass_type?.name || 'Mass'}</div>
                    <div className="list-row-meta">
                      {formatDate(mass.date)}
                      {mass.time ? ` · ${mass.time}` : ''}
                    </div>
                  </div>
                  <span className="badge badge-blue">{mass.assignments.length} assigned</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Top Volunteers</h3>
            <Link to="/members" className="btn btn-primary btn-sm">
              All Members
            </Link>
          </div>
          <div className="card-body volunteer-list">
            {(stats?.top_volunteers || []).length === 0 ? (
              <div className="empty-state">
                <p>No volunteers yet</p>
              </div>
            ) : (
              stats?.top_volunteers.map((volunteer, index) => (
                <div key={volunteer.id} className={`volunteer-row rank-${index + 1}`}>
                  <div className="volunteer-medal">{['🥇', '🥈', '🥉'][index]}</div>
                  <div className="volunteer-info">
                    <div className="volunteer-name">{volunteer.name}</div>
                    <div className="volunteer-count">
                      {volunteer.reading_count} reading
                      {volunteer.reading_count !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="volunteer-rank">#{index + 1}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '2rem' }}>
        <div className="card-header">
          <h3 className="card-title">Recent Mass Records</h3>
          <Link to="/masses" className="btn btn-primary btn-sm">
            View All
          </Link>
        </div>
        <div className="card-body">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Mass Type</th>
                  <th>Time</th>
                  <th>Celebrant</th>
                  <th>Readers Assigned</th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-state">
                      <p>No mass records yet</p>
                    </td>
                  </tr>
                ) : (
                  recent.slice(0, 5).map((mass) => (
                    <tr key={mass.id}>
                      <td>{formatDate(mass.date)}</td>
                      <td>{mass.mass_type?.name || '-'}</td>
                      <td>{mass.time || '-'}</td>
                      <td>{mass.celebrant || '-'}</td>
                      <td>
                        <span className="badge badge-gold">
                          {mass.assignments.length} readers
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
