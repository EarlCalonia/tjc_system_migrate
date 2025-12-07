import React, { useState, useEffect } from 'react'
import {
  CContainer, CCard, CCardBody, CCardHeader, CSpinner, CFormInput, CBadge
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSearch, cilHistory, cilUser, cilDescription } from '@coreui/icons'
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

  const getActionColor = (action) => {
      if (action.includes('DELETE')) return 'danger';
      if (action.includes('CREATE') || action.includes('ADD')) return 'success';
      if (action.includes('UPDATE') || action.includes('EDIT')) return 'warning';
      if (action.includes('LOGIN')) return 'info';
      return 'secondary';
  }

  return (
    <CContainer fluid className="px-4 py-4">
      <div className="d-flex justify-content-between align-items-end mb-4">
        <div>
           <h2 className="fw-bold text-brand-navy mb-1" style={{fontFamily: 'Oswald'}}>SYSTEM AUDIT LOGS</h2>
           <div className="text-muted small">Track all user activities and system events</div>
        </div>
        <div style={{width: '300px'}}>
            <div className="input-group">
                <span className="input-group-text bg-white border-end-0"><CIcon icon={cilSearch}/></span>
                <CFormInput className="border-start-0 ps-0" placeholder="Search user, action or details..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
        </div>
      </div>

      <CCard className="border-0 shadow-sm">
        <CCardBody className="p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="ps-4" style={{width:'15%'}}>Timestamp</th>
                  <th style={{width:'15%'}}>User</th>
                  <th style={{width:'15%'}}>Action</th>
                  <th>Details</th>
                  <th className="text-end pe-4">IP Address</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                    <tr><td colSpan="5" className="text-center py-5"><CSpinner size="sm"/></td></tr>
                ) : logs.length === 0 ? (
                    <tr><td colSpan="5" className="text-center py-5 text-muted">No activity recorded found.</td></tr>
                ) : (
                    logs.map(log => (
                        <tr key={log.id}>
                            <td className="ps-4 text-muted small" style={{whiteSpace:'nowrap'}}>
                                {new Date(log.created_at).toLocaleString()}
                            </td>
                            <td>
                                <div className="d-flex align-items-center">
                                    <div className="bg-light rounded-circle p-1 me-2 d-flex justify-content-center align-items-center" style={{width:'32px', height:'32px'}}>
                                        <CIcon icon={cilUser} size="sm" className="text-secondary"/>
                                    </div>
                                    <span className="fw-bold text-dark">{log.username || 'System'}</span>
                                </div>
                            </td>
                            <td>
                                <CBadge color={getActionColor(log.action)} shape="rounded-pill" className="px-3">
                                    {log.action}
                                </CBadge>
                            </td>
                            <td className="text-dark small">
                                {log.details}
                            </td>
                            <td className="text-end pe-4 font-monospace small text-muted">
                                {log.ip_address}
                            </td>
                        </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-top d-flex justify-content-end">
              <AppPagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </CCardBody>
      </CCard>
    </CContainer>
  )
}

export default ActivityLogsPage