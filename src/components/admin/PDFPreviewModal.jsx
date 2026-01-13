// src/components/admin/PDFPreviewModal.jsx
import React from 'react';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
} from '@coreui/react';
import { CIcon } from '@coreui/icons-react';
import { cilCloudDownload, cilX } from '@coreui/icons';

const PDFPreviewModal = ({ visible, onClose, pdfUrl, onDownload }) => {
  return (
    <CModal visible={visible} onClose={onClose} size="xl">
      <CModalHeader>
        <CModalTitle>Report Preview</CModalTitle>
      </CModalHeader>
      <CModalBody style={{ height: '75vh', padding: 0 }}>
        {pdfUrl ? (
          <iframe
            src={pdfUrl}
            width="100%"
            height="100%"
            style={{ border: 'none' }}
            title="PDF Preview"
          />
        ) : (
          <div className="d-flex justify-content-center align-items-center h-100">
            Generating Preview...
          </div>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={onClose}>
          <CIcon icon={cilX} className="me-2" />
          Close
        </CButton>
        <CButton color="primary" onClick={onDownload}>
          <CIcon icon={cilCloudDownload} className="me-2" />
          Download PDF
        </CButton>
      </CModalFooter>
    </CModal>
  );
};

export default PDFPreviewModal;