import React, { useState } from 'react';
import { BsX, BsDownload } from 'react-icons/bs';

const PDFExportModal = ({ isOpen, onClose, onExport, reportType }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleExport = async () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates');
      return;
    }

    setIsGenerating(true);
    try {
      await onExport(startDate, endDate);
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    if (!isGenerating) {
      setStartDate('');
      setEndDate('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Export {reportType === 'sales' ? 'Sales' : 'Inventory'} Report</h3>
          <button
            onClick={handleClose}
            className="modal-close-btn"
            disabled={isGenerating}
          >
            <BsX />
          </button>
        </div>

        <div className="modal-body">
          <div className="date-range-section">
            <h4>Select Date Range</h4>
            <div className="date-inputs">
              <div className="date-input-group">
                <label htmlFor="start-date">From:</label>
                <input
                  type="date"
                  id="start-date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={isGenerating}
                  className="date-input"
                />
              </div>
              <div className="date-input-group">
                <label htmlFor="end-date">To:</label>
                <input
                  type="date"
                  id="end-date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={isGenerating}
                  className="date-input"
                />
              </div>
            </div>
          </div>

          <div className="export-preview">
            <p>
              <strong>Report Type:</strong> {reportType === 'sales' ? 'Sales Report' : 'Inventory Report'}
            </p>
            <p>
              <strong>Date Range:</strong> {startDate && endDate ? `${startDate} to ${endDate}` : 'Not selected'}
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button
            onClick={handleClose}
            className="btn btn-secondary"
            disabled={isGenerating}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="btn btn-primary"
            disabled={isGenerating || !startDate || !endDate}
          >
            {isGenerating ? (
              <>
                <span className="spinner"></span>
                Generating...
              </>
            ) : (
              <>
                <BsDownload className="btn-icon" />
                Export PDF
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 8px;
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e9ecef;
        }

        .modal-header h3 {
          margin: 0;
          color: #333;
        }

        .modal-close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }

        .modal-close-btn:hover {
          background-color: #f8f9fa;
        }

        .modal-body {
          padding: 24px;
        }

        .date-range-section h4 {
          margin: 0 0 16px 0;
          color: #333;
          font-size: 16px;
        }

        .date-inputs {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
        }

        .date-input-group {
          flex: 1;
        }

        .date-input-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #555;
        }

        .date-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .date-input:disabled {
          background-color: #f8f9fa;
          cursor: not-allowed;
        }

        .export-preview {
          background-color: #f8f9fa;
          padding: 16px;
          border-radius: 4px;
          border: 1px solid #e9ecef;
        }

        .export-preview p {
          margin: 8px 0;
          font-size: 14px;
          color: #555;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 20px 24px;
          border-top: 1px solid #e9ecef;
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: background-color 0.2s;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background-color: #007bff;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #0056b3;
        }

        .btn-secondary {
          background-color: #6c757d;
          color: white;
        }

        .btn-secondary:hover:not(:disabled) {
          background-color: #545b62;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #ffffff;
          border-top: 2px solid transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .btn-icon {
          font-size: 16px;
        }
      `}</style>
    </div>
  );
};

export default PDFExportModal;
