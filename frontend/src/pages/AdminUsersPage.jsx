import { useState, useEffect } from 'react';
import api from '../api';
import { useToast } from '../context/ToastContext';
import { Users, CheckCircle, XCircle, Search, Filter } from 'lucide-react';

export default function AdminUsersPage() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ role: '', isVerified: '', search: '' });
  const [loading, setLoading] = useState(true);

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filters.role) params.role = filters.role;
      if (filters.isVerified !== '') params.isVerified = filters.isVerified;
      if (filters.search) params.search = filters.search;
      const data = await api.adminGetUsers(params);
      setUsers(data.data || []);
      setPagination(data.pagination || { page: 1, pages: 1, total: 0 });
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const verify = async (id, approved) => {
    try {
      await api.adminVerifyUser(id, { approved });
      toast.success(approved ? 'User account approved and activated.' : 'User account registration rejected.');
      load(pagination.page);
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div className="page container fade-in">
      <div className="page-header">
        <h1 className="page-title">User Management</h1>
        <p className="page-subtitle">Total: {pagination.total} registered users</p>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 240px' }}>
          <label className="form-label">Search Users</label>
          <div style={{ position: 'relative' }}>
            <input 
              className="form-input" 
              placeholder="Search by name, email, or registration number..." 
              value={filters.search}
              onChange={e => setFilters({ ...filters, search: e.target.value })} 
              style={{ paddingLeft: '2.5rem' }} 
            />
            <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>
        </div>
        <div style={{ flex: '0 0 160px' }}>
          <label className="form-label">Filter Role</label>
          <select className="form-input form-select" value={filters.role} onChange={e => setFilters({ ...filters, role: e.target.value })}>
            <option value="">All Roles</option>
            <option value="STUDENT">Student</option>
            <option value="FACULTY">Faculty</option>
            <option value="ALUMNI">Alumni</option>
            <option value="TRAINER">Trainer</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={() => load()}>
          <Filter size={14} /> Filter
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
                <th>Full Name</th>
                <th>Identifier / Email</th>
                <th>Role Badge</th>
                <th>Status</th>
                <th>Department</th>
                <th>Joined Date</th>
                <th>Administrative Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.full_name}</td>
                  <td style={{ fontFamily: !u.email ? 'var(--font-mono)' : 'var(--font-body)', fontSize: '0.8125rem' }}>
                    {u.email || u.registration_number}
                  </td>
                  <td><span className="badge badge-info">{u.role}</span></td>
                  <td>
                    {u.is_verified ? (
                      <span className="badge badge-active">Active</span>
                    ) : (
                      <span className="badge badge-pending">Pending Approval</span>
                    )}
                  </td>
                  <td>{u.department || '—'}</td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    {!u.is_verified && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-primary btn-sm" onClick={() => verify(u.id, true)} title="Approve User">
                          <CheckCircle size={13} /> Approve
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => verify(u.id, false)} title="Reject User">
                          <XCircle size={13} /> Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
          {Array.from({ length: pagination.pages }, (_, i) => (
            <button 
              key={i} 
              className={`btn btn-sm ${i + 1 === pagination.page ? 'btn-primary' : 'btn-secondary'}`} 
              onClick={() => load(i + 1)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
