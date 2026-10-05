import React, { useState, useEffect } from 'react';
import { Megaphone, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { announcementApi } from '../../services/api';

export const AnnouncementsCard = ({ title = 'Announcements', className = '' }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnnouncements = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await announcementApi.getAll();
      setAnnouncements(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  return (
    <div className={`card-panel announcements-card ${className}`}>
      <div className="card-header announcements-header">
        <span className="card-title announcements-title">
          <Megaphone size={18} color="var(--arctic-blue)" />
          {title}
        </span>
        <button
          onClick={fetchAnnouncements}
          disabled={loading}
          className="announcements-refresh-btn"
          title="Refresh Announcements"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {loading && (
        <div className="announcements-loading">
          Loading announcements...
        </div>
      )}

      {error && !loading && (
        <div className="announcements-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && announcements.length === 0 && (
        <div className="announcements-empty">
          No announcements available at this time.
        </div>
      )}

      {!loading && !error && announcements.length > 0 && (
        <div className="announcements-list">
          {announcements.map((item) => (
            <div
              key={item.id}
              className="announcement-item"
            >
              <div
                className={`announcement-icon-badge ${item.type === 'EVENT' ? 'event' : 'notice'}`}
              >
                {item.type === 'EVENT' ? (
                  <Megaphone size={17} color="var(--arctic-blue)" />
                ) : (
                  <Clock size={17} color="var(--success)" />
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-center gap-sm announcement-meta-row">
                  <span className="announcement-item-title">
                    {item.title}
                  </span>
                  <span className="announcement-item-date">
                    {item.date || 'Campus Notice'}
                  </span>
                </div>
                <p className="announcement-item-content">
                  {item.content}
                </p>
                {item.type && (
                  <span
                    className={`announcement-tag ${item.type.toLowerCase()}`}
                  >
                    {item.type}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnnouncementsCard;
