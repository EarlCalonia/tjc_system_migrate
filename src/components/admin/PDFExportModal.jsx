import React, { useState, useEffect } from 'react';
import { 
  CModal, 
  CModalHeader, 
  CModalTitle, 
  CModalBody, 
  CModalFooter, 
  CButton, 
  CFormInput, 
  CRow, 
  CCol 
} from '@coreui/react';

const PDFExportModal = ({ isOpen, onClose, onExport, onPreview, previewUrl, reportType }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStartDate('');
      setEndDate('');
    }
  }, [isOpen]);

  return (
    <CModal visible={isOpen} onClose={onClose} size="xl">
      <CModalHeader onClose={() => onClose()}>
        <CModalTitle>Export {reportType} Report</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <CRow className="mb-4">
          <CCol md={6}>
            <CFormInput
              type="date"
              label="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </CCol>
          <CCol md={6}>
            <CFormInput
              type="date"
              label="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </CCol>
        </CRow>

        {previewUrl ? (
          <div className="border rounded p-2" style={{ height: '500px', backgroundColor: '#f5f5f5' }}>
            <iframe
              src={previewUrl}
              width="100%"
              height="100%"
              title="PDF Preview"
              style={{ border: 'none' }}
            />
          </div>
        ) : (
          <div className="text-center p-5 text-muted border rounded" style={{ backgroundColor: '#f8f9fa' }}>
            Select dates and click "Generate Preview" to see the report here.
          </div>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={onClose}>
          Close
        </CButton>
        <CButton 
          color="info" 
          className="text-white" 
          onClick={() => onPreview(startDate, endDate)}
          disabled={!startDate && !endDate}
        >
          Generate Preview
        </CButton>
        <CButton 
          color="primary" 
          onClick={() => onExport(startDate, endDate)}
          disabled={!startDate && !endDate}
        >
          Download PDF
        </CButton>
      </CModalFooter>
    </CModal>
  );
};

export default PDFExportModal;