import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../api';
import PageLoading from '../components/PageLoading';
import type { Mass, MassType, Stats } from '../types';
import { formatDate } from '../utils/format';

function splitMassesByDate(masses: Mass[]) {
  const today = new Date().toISOString().split('T')[0];
  const upcoming = masses.filter((m) => m.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const recent = masses.filter((m) => m.date < today).sort((a, b) => b.date.localeCompare(a.date));
  return { upcoming, recent };
}

export default function Dashboard() {
  const location = useLocation();
  const [stats, setStats] = useState<Stats | null>(null);
  const [massTypes, setMassTypes] = useState<MassType[]>([]);
  const [upcoming, setUpcoming] = useState<Mass[]>([]);
  const [recent, setRecent] = useState<Mass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (retriesLeft = 2) => {
    const results = await Promise.allSettled([
      api.getStats(),
      api.getMassTypes(),
      api.getMasses(),
    ]);

    const [statsResult, typesResult, massesResult] = results;
    if (statsResult.status === 'fulfilled') setStats(statsResult.value);
    if (typesResult.status === 'fulfilled') setMassTypes(typesResult.value);
    if (massesResult.status === 'fulfilled') {
      const { upcoming: upcomingData, recent: pastData } = splitMassesByDate(massesResult.value);
      setUpcoming(upcomingData);
      setRecent(pastData);
    }

    const failed = results.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
    if (failed) {
      if (retriesLeft > 0) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return load(retriesLeft - 1);
      }
      setError(failed.reason?.message || 'Failed to load dashboard');
      return;
    }
    setError(null);
  }, []);

  useEffect(() => {
    if (location.pathname !== '/') return;
    let cancelled = false;
    setLoading(true);
    load().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [location.pathname, load]);

  const specialCount = massTypes.filter((mt) => mt.is_special_event).length;

  if (loading) return <PageLoading />;

  return (
    <>
      {error && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body empty-state">
            <p>{error}</p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setLoading(true);
                load().finally(() => setLoading(false));
              }}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <div className="page-header">
        <h2 className="page-title">Welcome to Liturgia</h2>
        <p className="page-subtitle">Reader roster and liturgy assignment management</p>
      </div>

      <div className="grid grid-4 stats-row">
        <div className="stat-card">
          <div className="stat-icon gold">👥</div>
          <div>
            <div className="stat-value">{stats?.total_members ?? 0}</div>
            <div className="stat-label">Active Readers</div>
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
            <h3 className="card-title">Top Readers</h3>
            <Link to="/readers" className="btn btn-primary btn-sm">
              All Readers
            </Link>
          </div>
          <div className="card-body volunteer-list">
            {(stats?.top_volunteers || []).length === 0 ? (
              <div className="empty-state">
                <p>No readers yet</p>
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
