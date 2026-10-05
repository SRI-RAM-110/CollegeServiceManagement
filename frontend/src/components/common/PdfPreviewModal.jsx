import React, { useState, useEffect } from 'react';
import { Eye, Download, X, AlertCircle, Loader2 } from 'lucide-react';
import { requestsApi } from '../../services/api';

export const PdfPreviewModal = ({
  isOpen,
  onClose,
  requestId,
  service = 'Service',
  existingBlob = null,
}) => {
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);
  const [pdfBlob, setPdfBlob] = useState(existingBlob);
  const [pdfUrl, setPdfUrl] = useState(null);

  // Generate clean filename matching requirement: <Service>_Request_<RequestID>.pdf
  const getCleanFilename = () => {
    let cleanService = service ? service.replace(/[^a-zA-Z0-9]/g, '_') : 'Service';
    if (cleanService === 'Seminar_Hall') cleanService = 'Seminar';
    if (cleanService.includes('Meals')) cleanService = 'Meals';
    const cleanId = requestId ? requestId.replace(/[^a-zA-Z0-9_-]/g, '_') : 'DOC';
    return `${cleanService}_Request_${cleanId}.pdf`;
  };

  useEffect(() => {
    if (!isOpen || !requestId) {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
      return;
    }

    if (existingBlob) {
      setPdfBlob(existingBlob);
      const url = URL.createObjectURL(existingBlob);
      setPdfUrl(url);
      setLoading(false);
      setError(null);
      return;
    }

    // Fetch PDF blob from backend
    let isCancelled = false;
    const fetchPdf = async () => {
      setLoading(true);
      setError(null);
      try {
        const blob = await requestsApi.getRequestPdfBlob(requestId);
        if (!isCancelled) {
          // Verify valid PDF blob
          const typedBlob = new Blob([blob], { type: 'application/pdf' });
          setPdfBlob(typedBlob);
          const url = URL.createObjectURL(typedBlob);
          setPdfUrl(url);
          setLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Error fetching PDF:', err);
          setError(err.message || 'Unable to generate PDF. Please try again.');
          setLoading(false);
        }
      }
    };

    fetchPdf();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, requestId, existingBlob]);

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);

    try {
      let blobToSave = pdfBlob;
      if (!blobToSave) {
        const fetchedBlob = await requestsApi.getRequestPdfBlob(requestId);
        blobToSave = new Blob([fetchedBlob], { type: 'application/pdf' });
        setPdfBlob(blobToSave);
      }

      const filename = getCleanFilename();
      const downloadUrl = URL.createObjectURL(blobToSave);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } catch (err) {
      console.error('Download error:', err);
      alert('Unable to download PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-dialog pdf-preview-dialog animate-fade-in"
        style={{ '--modal-max-width': '960px', width: '95vw', height: '92vh', maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="pdf-modal-title-wrap">
            <Eye size={18} color="var(--arctic-blue)" />
            <h3 className="modal-title">PDF Preview — {requestId}</h3>
          </div>
          <button
            onClick={onClose}
            className="modal-close-btn"
            aria-label="Close PDF preview"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body / Viewer */}
        <div className="modal-body pdf-preview-modal-body">
          {loading && (
            <div className="pdf-preview-loading">
              <Loader2 className="animate-spin" size={36} color="var(--arctic-blue)" />
              <p className="pdf-loading-text">Preparing PDF preview...</p>
              <span className="text-xs text-muted">Retrieving official approved service document</span>
            </div>
          )}

          {error && !loading && (
            <div className="pdf-preview-error">
              <AlertCircle size={40} color="var(--danger)" />
              <h4>Preview Unavailable</h4>
              <p className="text-sm text-muted">{error}</p>
              <button
                className="btn btn-outline mt-3"
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  requestsApi
                    .getRequestPdfBlob(requestId)
                    .then((blob) => {
                      const typedBlob = new Blob([blob], { type: 'application/pdf' });
                      setPdfBlob(typedBlob);
                      setPdfUrl(URL.createObjectURL(typedBlob));
                      setLoading(false);
                    })
                    .catch((err) => {
                      setError(err.message || 'Unable to generate PDF. Please try again.');
                      setLoading(false);
                    });
                }}
              >
                Retry Loading PDF
              </button>
            </div>
          )}

          {!loading && !error && pdfUrl && (
            <div className="pdf-viewer-viewport">
              <object
                data={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                type="application/pdf"
                className="pdf-embed-object"
                title={`Official PDF - ${requestId}`}
              >
                <iframe
                  src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                  className="pdf-embed-iframe"
                  title={`Official PDF - ${requestId}`}
                >
                  <p className="p-4 text-center">
                    Your browser does not support inline PDF preview.{' '}
                    <button onClick={handleDownload} className="btn btn-primary btn-sm ml-2">
                      Download PDF Document
                    </button>
                  </p>
                </iframe>
              </object>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer pdf-modal-footer">
          <div className="pdf-footer-filename">
            <span className="text-xs text-muted">Document: </span>
            <span className="text-xs font-mono font-medium text-white">{getCleanFilename()}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              disabled={loading || downloading}
              className="btn btn-primary flex items-center gap-2"
              id="btn-download-pdf-preview"
            >
              {downloading ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>Download PDF</span>
                </>
              )}
            </button>
            <button onClick={onClose} className="btn btn-outline" id="btn-close-pdf-preview">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdfPreviewModal;
