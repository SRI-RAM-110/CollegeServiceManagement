import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  BedDouble,
  Bus,
  FileText,
  Coffee,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  ListOrdered,
  Clock,
  Sparkles,
  Building,
  CheckCircle,
} from 'lucide-react';
import { COLLEGE_LOGO } from '../../constants/branding';
import { useAuth } from '../../context/AuthContext';

const SERVICES = [
  {
    id: 'seminar',
    title: 'Seminar Hall Booking',
    shortTitle: 'Seminar Hall',
    icon: CalendarDays,
    color: 'blue',
    iconBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    borderHover: 'hover:border-blue-500/50',
    btnColor: 'bg-blue-600 hover:bg-blue-500',
    description: 'Book air-conditioned seminar halls, audio-visual conference centers, and executive auditoriums for administrative reviews, guest sessions, and institutional programs.',
    features: ['Real-time slot availability', 'Single, multi-day, or recurring', 'Equipment & capacity preview'],
    path: '/seminar-booking',
  },
  {
    id: 'accommodation',
    title: 'Guest Room Accommodation',
    shortTitle: 'Accommodation',
    icon: BedDouble,
    color: 'emerald',
    iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    borderHover: 'hover:border-emerald-500/50',
    btnColor: 'bg-emerald-600 hover:bg-emerald-500',
    description: 'Reserve AC / Non-AC guest suites in Boys and Girls Hostels for visiting examiners, regulatory inspection teams, VIP guests, and official resource persons.',
    features: ['Boys & Girls Hostel selection', 'Attached bath & Wi-Fi amenities', 'Dual-hostel simultaneous booking'],
    path: '/accommodation',
  },
  {
    id: 'transport',
    title: 'Institutional Transport',
    shortTitle: 'Transport',
    icon: Bus,
    color: 'amber',
    iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    borderHover: 'hover:border-amber-500/50',
    btnColor: 'bg-amber-600 hover:bg-amber-500',
    description: 'Requisition college transport vehicles, executive sedans, and institutional buses for official college business, VIP guest pickups, and airport transfers.',
    features: ['One-way and round trip schedules', 'Vehicle fleet allocation', 'Real-time clash detection'],
    path: '/transport',
  },
  {
    id: 'stationery',
    title: 'Stationery Requisition',
    shortTitle: 'Stationery',
    icon: FileText,
    color: 'indigo',
    iconBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    borderHover: 'hover:border-indigo-500/50',
    btnColor: 'bg-indigo-600 hover:bg-indigo-500',
    description: 'Indent office supplies, documentation paper, administrative registers, writing materials, and certificates from the centralized institutional store.',
    features: ['Catalog item picker', 'Itemized requisition cart', 'Direct store delivery routing'],
    path: '/stationery',
  },
  {
    id: 'meals',
    title: 'Snacks & Meals Catering',
    shortTitle: 'Snacks & Meals',
    icon: Coffee,
    color: 'sky',
    iconBg: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    borderHover: 'hover:border-sky-500/50',
    btnColor: 'bg-sky-600 hover:bg-sky-500',
    description: 'Arrange refreshments, executive high-tea, working lunch buffets, and formal banquet catering for statutory meetings and institutional committees.',
    features: ['Breakfast, Lunch, High-Tea & Dinner', 'Dietary requirements & guest counts', 'Dining venue coordination'],
    path: '/snacks-meals',
  },
];

export default function AOCreateRequest() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Quick Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <button
            onClick={() => navigate('/admin/ao')}
            className="hover:text-white transition flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>AO Dashboard</span>
          </button>
          <span>/</span>
          <span className="text-white font-medium">Create Service Request</span>
        </div>

        <button
          onClick={() => navigate('/admin/my-requests')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 text-xs border border-slate-700/60 transition self-start sm:self-auto"
        >
          <ListOrdered className="w-3.5 h-3.5 text-blue-400" />
          <span>View My Submitted Requests</span>
        </button>
      </div>

      {/* Welcome Banner */}
      <div className="welcome-banner relative overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/40 p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>AO Admin Requisition Portal</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Create New Service Request
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Select a facility or service below to submit an official requisition. Requests are recorded under your administrative account (<strong>{user?.name || 'AO Admin'}</strong>) and follow the standard institutional approval workflow.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-slate-500" />
                Department: <strong className="text-slate-200">{user?.department || 'ADMIN'}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Status on Submit: <strong className="text-amber-300 font-mono">PENDING</strong>
              </span>
            </div>
          </div>

          <div className="hidden lg:flex flex-col items-center justify-center p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center w-52 flex-shrink-0">
            <img src={COLLEGE_LOGO} alt="NEC Logo" className="w-14 h-14 object-contain mb-2" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Narasaraopet</span>
            <span className="text-[11px] text-slate-400">Engineering College</span>
          </div>
        </div>
      </div>

      {/* Services Grid (5 Cards) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">Select Campus Service</h2>
            <p className="text-xs text-slate-400">Choose the service you wish to request for official administrative use</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {SERVICES.map((svc) => {
            const Icon = svc.icon;
            return (
              <div
                key={svc.id}
                className={`card-panel p-5 flex flex-col justify-between border border-slate-800/80 ${svc.borderHover} transition-all duration-300 hover:shadow-lg hover:shadow-blue-950/30 group`}
              >
                <div className="space-y-4">
                  {/* Card Header with Icon */}
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-xl border ${svc.iconBg} flex items-center justify-center`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800/80 text-slate-300 border border-slate-700/60">
                      Standard Workflow
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                      {svc.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                      {svc.description}
                    </p>
                  </div>

                  {/* Key Features Bullet List */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                    {svc.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                        <CheckCircle className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Action Button */}
                <div className="pt-5 mt-4 border-t border-slate-800/60">
                  <button
                    onClick={() => navigate(svc.path)}
                    className={`w-full py-2.5 px-4 rounded-lg ${svc.btnColor} text-white text-xs font-semibold flex items-center justify-center gap-2 transition shadow-md`}
                  >
                    <span>Open {svc.shortTitle} Form</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
