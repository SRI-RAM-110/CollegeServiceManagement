import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Send,
  RotateCcw,
  Info,
  PackageCheck,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
} from 'lucide-react';
import { stationeryApi } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { QuickCalendar } from '../../components/calendar/QuickCalendar';
import { Modal } from '../../components/common/Modal';
import { RequestDetailsModal } from '../../components/common/RequestDetailsModal';
import { ServiceDateRangeViewer } from '../../components/common/ServiceDateRangeViewer';
import confetti from 'canvas-confetti';
import { getTodayStr } from '../../utils/dateUtils';

const formatDateDisplay = (dateVal) => {
  if (!dateVal) return '-';
  if (typeof dateVal === 'string') return dateVal.substring(0, 10);
  if (Array.isArray(dateVal)) {
    const [y, m, d] = dateVal;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return String(dateVal).substring(0, 10);
};

export const Stationery = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [items, setItems] = useState([]);
  const [requests, setRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Request Cart state: [{ itemId, name, quantity, unit, description }]
  const [cart, setCart] = useState([]);
  const [purpose, setPurpose] = useState('Departmental Use');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedReqModal, setSelectedReqModal] = useState(null);
  const [calendarDate, setCalendarDate] = useState(getTodayStr());

  useEffect(() => {
    loadData();
  }, [user?.userId]);

  const loadData = async () => {
    try {
      const [itemsRes, reqsRes] = await Promise.all([
        stationeryApi.getItems(),
        stationeryApi.getRequests(),
      ]);
      if (itemsRes.data) setItems(itemsRes.data);
      if (reqsRes.data) setRequests(reqsRes.data);
    } catch (e) {
      showToast('Failed to load stationery items', 'error');
    }
  };

  const handleAddToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.itemId === item.itemId);
      if (existing) {
        return prev.map((c) =>
          c.itemId === item.itemId ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [
        ...prev,
        {
          itemId: item.itemId,
          name: item.name,
          quantity: 1,
          unit: item.unit || 'units',
        },
      ];
    });
    showToast(`Added ${item.name} to request`, 'info');
  };

  const handleUpdateQuantity = (itemId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.itemId === itemId) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const handleSetQuantity = (itemId, val) => {
    const parsed = parseInt(val, 10);
    const qty = isNaN(parsed) || parsed < 1 ? 1 : parsed;
    setCart((prev) =>
      prev.map((item) =>
        item.itemId === itemId ? { ...item, quantity: qty } : item
      )
    );
  };

  const handleRemoveItem = (itemId) => {
    setCart((prev) => prev.filter((i) => i.itemId !== itemId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      showToast('Your request cart is empty! Add items first.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await stationeryApi.createRequest({
        items: cart.map((c) => ({ itemId: c.itemId, quantity: c.quantity })),
        purpose,
        additionalNotes,
      });

      if (res.success) {
        showToast('Stationery request submitted successfully!', 'success');
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        setCart([]);
        setAdditionalNotes('');
        loadData();
      }
    } catch (err) {
      showToast(err.message || 'Failed to submit stationery request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    const name = (item.name || '').toLowerCase();
    const desc = (item.description || '').toLowerCase();
    const cat = (item.category || '').toLowerCase();
    const id = (item.itemId || '').toLowerCase();
    const matchesSearch = !q || name.includes(q) || desc.includes(q) || cat.includes(q) || id.includes(q);
    const matchesCategory =
      categoryFilter === 'ALL' || cat === categoryFilter.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;

  const fetchStationeryRequests = async ({ fromDate, toDate }) => {
    const res = await stationeryApi.getRequests({ fromDate, toDate });
    return res.data || [];
  };

  return (
    <div className="page-stack">
      {/* Banner */}
      <div className="page-banner">
        <div className="page-banner-glow" />
        <div>
          <h1 className="page-banner-title">
            Stationery Request
          </h1>
          <p className="page-banner-subtitle">
            Request stationery items for your departmental academic and administrative needs.
          </p>
        </div>
        <div className="banner-tagline">
          “Small Supplies<br />Big Progress”
        </div>
      </div>

      {/* Date Range Stationery Requests Viewer */}
      <ServiceDateRangeViewer
        title="View Stationery Requests in Date Range"
        buttonLabel="Show Requests"
        countLabel="Total Requests"
        loadingMessage="Loading stationery requests..."
        errorMessage="Unable to load stationery requests. Please try again."
        emptyMessage="No stationery requests found for the selected date range."
        onFetch={fetchStationeryRequests}
        renderResults={(records) => (
          <table className="custom-table">
            <thead>
              <tr>
                <th>Request Date</th>
                <th>Request ID</th>
                <th>Department</th>
                <th>Requested Items</th>
                <th>Requested Quantities</th>
                <th>Purpose</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((s, idx) => {
                const reqDate = s.createdAt ? formatDateDisplay(s.createdAt) : '-';
                const itemsList = s.itemsRequested || [];
                const itemNames = itemsList.map((i) => i.name).join(', ') || '-';
                const itemQtys = itemsList.map((i) => `${i.name}: ${i.quantity}`).join(', ') || '-';

                return (
                  <tr key={s.id || s.requestId || idx}>
                    <td className="table-cell-date">{reqDate}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.requestId}</td>
                    <td>{s.department}</td>
                    <td>{itemNames}</td>
                    <td style={{ color: 'var(--arctic-blue)', fontWeight: 600 }}>{itemQtys}</td>
                    <td>{s.purpose || '-'}</td>
                    <td>
                      <StatusBadge status={s.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      />

      {/* 4 Stat Cards */}
      <div className="stat-grid-4">
        <StatCard
          icon={PackageCheck}
          value={items.length}
          subtitle="Available Items"
          color="blue"
        />
        <StatCard
          icon={Clock}
          value={pendingCount}
          subtitle="Pending Requests"
          color="amber"
        />
        <StatCard
          icon={CheckCircle}
          value={approvedCount}
          subtitle="Approved This Month"
          color="emerald"
        />
        <StatCard
          icon={XCircle}
          value={rejectedCount}
          subtitle="Rejected"
          color="rose"
        />
      </div>

      {/* Main Grid: Left Catalog, Right Shopping Cart */}
      <div className="two-column-layout balanced">
        {/* Left Column: Items Catalog */}
        <div className="card-panel">
          <div className="card-header flex-wrap gap-sm">
            <span className="card-title">Available Stationery Items</span>

            <div className="filter-group">
              <div className="filter-search-box">
                <Search
                  size={15}
                  className="filter-search-icon"
                />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="filter-search-input"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="filter-select"
              >
                <option value="ALL">All Categories</option>
                <option value="Paper">Paper</option>
                <option value="Writing">Writing</option>
                <option value="Filing">Filing</option>
                <option value="Office Tools">Office Tools</option>
              </select>
            </div>
          </div>

          {/* Items Grid */}
          <div className="stationery-grid">
            {filteredItems.length === 0 ? (
              <div className="empty-state-branded" style={{ gridColumn: '1 / -1', padding: '32px' }}>
                <PackageCheck size={32} className="text-muted" />
                <span>No stationery items match your search.</span>
              </div>
            ) : (
              filteredItems.map((item) => (
              <div
                key={item.itemId}
                className="stationery-item-card"
              >
                <div className="stationery-icon-box">
                  <FileText size={20} className="text-arctic-blue" />
                </div>

                <div className="stationery-item-name">
                  {item.name}
                </div>
                <div className="stationery-unit-text">
                  {item.description || item.unit || 'Standard Item'}
                </div>

                <button
                  type="button"
                  onClick={() => handleAddToCart(item)}
                  className="btn btn-primary btn-sm w-full mt-2"
                >
                  <Plus size={13} /> Add to Request
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Request Cart Form */}
        <div className="column-stack">
          <div className="card-panel">
            <div className="card-header">
              <span className="card-title">
                <ShoppingCart size={18} className="text-arctic-blue" />
                Your Request Cart ({cart.length})
              </span>
            </div>

            <form onSubmit={handleSubmit} className="form-column">
              {/* Cart Items Table */}
              <div className="cart-items-scroll">
                {cart.length === 0 ? (
                  <div className="table-empty-cell">
                    Cart is empty. Click "Add to Request" on stationery items.
                  </div>
                ) : (
                  <div className="cart-list">
                    {cart.map((c) => (
                      <div
                        key={c.itemId}
                        className="cart-item-row"
                      >
                        <div className="flex-1">
                          <div className="cart-item-name">
                            {c.name}
                          </div>
                          <div className="cart-item-sub">
                            Unit: {c.unit || 'units'}
                          </div>
                        </div>

                        {/* Quantity controls */}
                        <div className="cart-qty-controls">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(c.itemId, -1)}
                            className="cart-qty-btn"
                          >
                            <Minus size={12} />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={c.quantity}
                            onChange={(e) => handleSetQuantity(c.itemId, e.target.value)}
                            className="cart-qty-number"
                            style={{ width: '68px', textAlign: 'center', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)' }}
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(c.itemId, 1)}
                            className="cart-qty-btn"
                          >
                            <Plus size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(c.itemId)}
                            className="cart-remove-btn"
                            aria-label="Remove item"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  Purpose of Request *
                </label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                >
                  <option value="Departmental Use">Departmental Use</option>
                  <option value="Workshop / Seminar">Workshop / Seminar</option>
                  <option value="Academic Examination">Academic Examination</option>
                  <option value="Accreditation / Inspection">Accreditation / Inspection</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Other Requirements / Additional Notes
                </label>
                <textarea
                  rows="3"
                  placeholder="e.g. Need blue and black markers for the faculty workshop."
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                />
              </div>

              <div className="form-actions-row">
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="btn btn-outline btn-flex-1"
                  disabled={cart.length === 0}
                >
                  <RotateCcw size={15} /> Clear Cart
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-flex-2"
                  disabled={submitting || cart.length === 0}
                >
                  <Send size={15} /> {submitting ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>

          {/* Stationery Guidelines */}
          <div className="guidelines-card">
            <div className="guidelines-header">
              <Info size={18} className="text-arctic-blue" />
              <span className="guidelines-title">Stationery Guidelines</span>
            </div>
            <ul className="guidelines-list">
              <li>Requests are subject to administrative review and approval.</li>
              <li>Specify exact required quantities and purpose clearly.</li>
              <li>Request at least 3 working days in advance.</li>
              <li>Items are for official academic and administrative use only.</li>
            </ul>
          </div>

          {/* Quick Calendar */}
          <QuickCalendar
            selectedDate={calendarDate}
            onSelectDate={(newDate) => setCalendarDate(newDate)}
            events={requests.map((r) => ({
              id: r.id || r.requestId,
              date: formatDateDisplay(r.createdAt),
              title: `${r.itemsRequested?.length || 1} items - ${r.purpose}`,
              status: r.status,
              department: r.department,
            }))}
          />
        </div>
      </div>

      {/* Recent Stationery Requests Section */}
      <div className="card-panel">
        <div className="card-header">
          <span className="card-title">Recent Stationery Requests</span>
        </div>

        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Request ID</th>
                <th>Items Requested</th>
                <th>Purpose</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan="6" className="table-empty-cell">
                    No stationery requests submitted yet.
                  </td>
                </tr>
              ) : (
                requests.map((r) => {
                  const itemsSummary = r.itemsRequested
                    ? r.itemsRequested.map((i) => `${i.name} (x${i.quantity})`).join(', ')
                    : 'Stationery Items';

                  return (
                    <tr key={r.id || r.requestId}>
                      <td className="table-cell-date">{formatDateDisplay(r.createdAt)}</td>
                      <td className="font-mono text-arctic-blue">{r.requestId}</td>
                      <td className="table-cell-purpose-truncate">
                        {itemsSummary}
                      </td>
                      <td>{r.purpose}</td>
                      <td>
                        <StatusBadge status={r.status} />
                      </td>
                      <td>
                        <button
                          onClick={() => setSelectedReqModal(r)}
                          className="action-view-btn"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enhanced Official Request Details Modal with PDF Preview & Download */}
      {selectedReqModal && (
        <RequestDetailsModal
          isOpen={!!selectedReqModal}
          onClose={() => setSelectedReqModal(null)}
          request={{
            ...selectedReqModal,
            service: 'Stationery',
            serviceCategory: 'STATIONERY',
          }}
        />
      )}
    </div>
  );
};

export default Stationery;
