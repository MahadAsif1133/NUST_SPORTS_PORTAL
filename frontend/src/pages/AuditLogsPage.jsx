import { useState, useEffect } from 'react';
import api from '../api';
import { ClipboardList, Search, Filter } from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ action: '', targetType: '' });
  const [loading, setLoading] = useState(true);

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 50 };
      if (filters.action) params.action = filters.action;
      if (filters.targetType) params.targetType = filters.targetType;
      const data = await api.getAuditLogs(params);
      setLogs(data.data || []);
      setPagination(data.pagination || { page: 1, pages: 1, total: 0 });
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="page container fade-in">
      <div className="page-header">
        <h1 className="page-title">Audit Logs</h1>
        <p className="page-subtitle">Immutable NUST Sports Portal activity logs — {pagination.total} entries</p>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 200px' }}>
          <label className="form-label">Action Category</label>
          <select className="form-input form-select" value={filters.action} onChange={e => setFilters({ ...filters, action: e.target.value })}>
            <option value="">All Actions</option>
            <option value="USER_REGISTERED">User Registered</option>
            <option value="USER_LOGIN">User Login</option>
            <option value="MEMBERSHIP_CREATED">Membership Created</option>
            <option value="MEMBERSHIP_ACTIVATED">Membership Activated</option>
            <option value="PAYMENT_INITIATED">Payment Initiated</option>
            <option value="PAYMENT_VERIFIED">Payment Verified</option>
            <option value="FREEZE_REQUESTED">Freeze Requested</option>
          </select>
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <label className="form-label">Target Resource Type</label>
          <select className="form-input form-select" value={filters.targetType} onChange={e => setFilters({ ...filters, targetType: e.target.value })}>
            <option value="">All</option>
            <option value="USER">User</option>
            <option value="MEMBERSHIP">Membership</option>
            <option value="PAYMENT">Payment</option>
            <option value="CARD">Card</option>
            <option value="FREEZE_REQUEST">Freeze</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={() => load()}>
          <Filter size={14} /> Apply Filter
        </button>
      </div>

      {loading ? (
        <div className="page container">
          <div className="skeleton skeleton-card" style={{ height: 300 }} />
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action Code</th>
                <th>Actor</th>
                <th>Target</th>
                <th>Log Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id}>
                  <td style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>
                    {new Date(l.created_at).toLocaleString()}
                  </td>
                  <td>
                    <span className="badge badge-info" style={{ fontSize: '0.6rem' }}>
                      {l.action}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.8125rem' }}>{l.actor_name}</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{l.actor_role}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{l.target_type}</div>
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.625rem' }}>
                      {l.target_id?.substring(0, 8)}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.75rem', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }} title={l.reason || (l.details ? JSON.stringify(l.details) : '')}>
                    {l.reason || (l.details ? JSON.stringify(l.details) : '—')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
          <button className="btn btn-secondary btn-sm" disabled={pagination.page <= 1} onClick={() => load(pagination.page - 1)}>
            ← Previous
          </button>
          <span style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Page {pagination.page} of {pagination.pages}
          </span>
          <button className="btn btn-secondary btn-sm" disabled={pagination.page >= pagination.pages} onClick={() => load(pagination.page + 1)}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
