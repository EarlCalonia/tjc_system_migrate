import React, { useState, useEffect } from 'react'
import {
  CContainer, CSpinner, CFormInput, CBadge
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSearch, cilUser, cilFilter } from '@coreui/icons'
import { activityLogsAPI } from '../../utils/api'
import AppPagination from '../../components/AppPagination'
import '../../styles/Admin.css'

const ActivityLogsPage = () => {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const res = await activityLogsAPI.getAll({ page, search })
      if (res.success) {
        setLogs(res.data)
        setTotalPages(res.pagination.totalPages)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(() => { fetchLogs() }, 300)
    return () => clearTimeout(t)
  }, [page, search])

  // Helper to distinguish "Risk Levels" based on action keywords
  const getActionStyle = (action) => {
      const act = action ? action.toUpperCase() : '';
      if (act.includes('DELETE') || act.includes('REMOVE')) return { color: 'danger', icon: '⚠️' };
      if (act.includes('CREATE') || act.includes('ADD')) return { color: 'success', icon: '✚' };
      if (act.includes('UPDATE') || act.includes('EDIT')) return { color: 'warning', icon: '✎' };
      if (act.includes('LOGIN') || act.includes('LOGOUT')) return { color: 'info', icon: '●' };
      return { color: 'secondary', icon: '•' };
  }

  return (
    <CContainer fluid className="px-4 py-4">
      {/* --- HEADER --- */}
      <div className="d-flex justify-content-between align-items-end mb-4">
        <div>
           <h2 className="fw-bold text-brand-navy mb-1" style={{fontFamily: 'Oswald', letterSpacing: '1px'}}>
             SYSTEM AUDIT LOGS
           </h2>
           <div className="text-muted small">
             Secure record of system activities, changes, and access.
           </div>
        </div>
        <div style={{width: '320px'}}>
            <div className="input-group shadow-sm">
                <span className="input-group-text bg-white border-end-0 text-muted">
                    <CIcon icon={cilSearch}/>
                </span>
                <CFormInput 
                  className="border-start-0 ps-0" 
                  placeholder="Search logs..." 
                  value={search} 
                  onChange={e => { setSearch(e.target.value); setPage(1); }} 
                />
            </div>
        </div>
      </div>

      {/* --- TABLE --- */}
      <div className="admin-table-container bg-white">
        <table className="table admin-table table-hover mb-0">
          <thead>
            <tr>
              <th className="ps-4" style={{width:'180px'}}>Timestamp</th>
              <th style={{width:'200px'}}>User</th>
              <th style={{width:'150px'}}>Action Type</th>
              <th>Description</th>
              <th className="text-end pe-4" style={{width:'140px'}}>Source IP</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
                <tr><td colSpan="5" className="text-center py-5"><CSpinner color="primary"/></td></tr>
            ) : logs.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-5 text-muted fst-italic">No records found matching criteria.</td></tr>
            ) : (
                logs.map(log => {
                    const style = getActionStyle(log.action);
                    return (
                        <tr key={log.id}>
                            <td className="ps-4 text-secondary small">
                                <div className="fw-bold text-dark">
                                    {new Date(log.created_at).toLocaleDateString()}
                                </div>
                                <div className="text-muted" style={{fontSize: '0.8rem'}}>
                                    {new Date(log.created_at).toLocaleTimeString()}
                                </div>
                            </td>
                            <td>
                                <div className="d-flex align-items-center">
                                    <div className="bg-light border rounded-circle p-1 me-2 d-flex justify-content-center align-items-center" 
                                         style={{width:'32px', height:'32px'}}>
                                        <CIcon icon={cilUser} size="sm" className="text-secondary"/>
                                    </div>
                                    <div>
                                        <div className="fw-bold text-brand-navy small">{log.username || 'System'}</div>
                                        {/* Optional: Add Role here if available in future */}
                                    </div>
                                </div>
                            </td>
                            <td>
                                <CBadge color={style.color} shape="rounded-pill" 
                                        className="px-3 py-1 text-uppercase d-inline-flex align-items-center gap-2" 
                                        style={{fontSize: '0.7rem', letterSpacing: '0.5px', minWidth: '100px', justifyContent: 'center'}}>
                                    <span>{style.icon}</span> {log.action}
                                </CBadge>
                            </td>
                            <td className="text-dark">
                                <span style={{fontSize: '0.9rem', lineHeight: '1.4', display: 'block'}}>
                                    {log.details}
                                </span>
                            </td>
                            <td className="text-end pe-4">
                                <code className="text-muted bg-light px-2 py-1 rounded small border">
                                    {log.ip_address}
                                </code>
                            </td>
                        </tr>
                    )
                })
            )}
          </tbody>
        </table>
      </div>

      {/* --- PAGINATION --- */}
      <div className="mt-3 d-flex justify-content-end">
          <AppPagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </CContainer>
  )
}

export default ActivityLogsPage