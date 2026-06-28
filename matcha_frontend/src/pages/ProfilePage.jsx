import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useUser, UserButton, useAuth } from '@clerk/clerk-react';
import DashboardLayout from '../components/DashboardLayout';
import {
  CheckCircle2, Clock, XCircle, ChevronRight, FileText,
  Trash2, AlertTriangle, Sparkles, User, Mail, Calendar,
  TrendingUp, Award
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  useInView — lightweight intersection observer for scroll reveals   */
/* ------------------------------------------------------------------ */
function useInView(options = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1, ...options }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, inView];
}

/* ------------------------------------------------------------------ */
/*  Animated section wrapper                                           */
/* ------------------------------------------------------------------ */
function AnimatedSection({ children, className = '', delay = 0 }) {
  const [ref, inView] = useInView();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${className} ${
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Status badge helper                                                */
/* ------------------------------------------------------------------ */
function StatusBadge({ status }) {
  if (status === 'Rejected') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-100">
        <XCircle size={13} />
        {status}
      </span>
    );
  }
  if (status === 'Offer' || status === 'Shortlisted') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-matcha-100 text-matcha-700 border border-matcha-200/60">
        <CheckCircle2 size={13} />
        {status}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
      <Clock size={13} />
      {status}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN PROFILE PAGE                                                  */
/* ------------------------------------------------------------------ */
export default function ProfilePage() {
  const { user } = useUser();
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revokingId, setRevokingId] = useState(null);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const { getToken } = useAuth();

  // We assume the user's role is stored in backend, but we'll fetch apps based on email
  useEffect(() => {
    if (user?.primaryEmailAddress?.emailAddress) {
      const fetchApps = async () => {
        try {
          const res = await axios.get(
            `http://127.0.0.1:8000/api/get-my-applications/?email=${encodeURIComponent(
              user.primaryEmailAddress.emailAddress
            )}`
          );
          setApplications(res.data);
        } catch (err) {
          console.error('Failed to fetch applications:', err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchApps();
    }
  }, [user]);

  const handleRevokeClick = (id) => {
    setRevokingId(id);
    setShowRevokeModal(true);
  };

  const confirmRevoke = async () => {
    try {
      const token = await getToken();
      await axios.delete(`http://127.0.0.1:8000/api/revoke-application/${revokingId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setApplications((prev) => prev.filter((app) => app.id !== revokingId));
      setShowRevokeModal(false);
      setRevokingId(null);
    } catch (err) {
      console.error('Failed to revoke application:', err);
      alert('Failed to revoke application. Please try again.');
    }
  };

  /* ---- Derived stats (display only, no new logic) ---- */
  const totalApps = applications.length;
  const activeApps = applications.filter(
    (a) => a.status !== 'Rejected' && a.status !== 'Offer'
  ).length;
  const offersCount = applications.filter((a) => a.status === 'Offer').length;

  return (
    <>
      <DashboardLayout>
        <div className="max-w-4xl mx-auto py-6 px-2 sm:px-0">

          {/* ── Page header ─────────────────────────────────────────── */}
          <AnimatedSection delay={0}>
            <div className="mb-10">
              <p className="label-eyebrow mb-2">Account</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                My Profile
              </h2>
              <p className="text-slate-500 mt-1.5 text-sm font-medium">
                Manage your account and track your applications.
              </p>
            </div>
          </AnimatedSection>

          {/* ── Profile card ────────────────────────────────────────── */}
          <AnimatedSection delay={80}>
            <div className="card p-8 mb-6 relative overflow-hidden">
              {/* Subtle mesh accent */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-matcha-50 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-emerald-50/60 to-transparent rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

              <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-matcha-100 flex items-center justify-center ring-4 ring-white shadow-soft overflow-hidden">
                    <div className="scale-[2.2] origin-center">
                      <UserButton
                        appearance={{
                          elements: { userButtonAvatarBox: 'w-10 h-10' },
                        }}
                      />
                    </div>
                  </div>
                  {/* Online indicator */}
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-matcha-500 rounded-full border-2 border-white shadow-sm" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight truncate">
                    {user?.fullName || 'Candidate'}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <span className="inline-flex items-center gap-1.5 text-sm text-slate-500 font-medium">
                      <Mail size={14} className="text-slate-400" />
                      {user?.primaryEmailAddress?.emailAddress}
                    </span>
                  </div>
                  <div className="mt-3">
                    <span className="badge-green">
                      <Sparkles size={11} />
                      Active Candidate
                    </span>
                  </div>
                </div>

                {/* Quick stats */}
                <div className="flex gap-6 sm:gap-8 shrink-0 mt-2 sm:mt-0">
                  <div className="text-center">
                    <p className="text-2xl font-extrabold text-slate-900">{totalApps}</p>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                      Applied
                    </p>
                  </div>
                  <div className="w-px bg-slate-100" />
                  <div className="text-center">
                    <p className="text-2xl font-extrabold text-matcha-600">{activeApps}</p>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                      Active
                    </p>
                  </div>
                  <div className="w-px bg-slate-100" />
                  <div className="text-center">
                    <p className="text-2xl font-extrabold text-emerald-600">{offersCount}</p>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                      Offers
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* ── Application history section ──────────────────────────── */}
          <AnimatedSection delay={160}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2.5">
                <div className="w-8 h-8 bg-matcha-100 text-matcha-700 rounded-xl flex items-center justify-center">
                  <FileText size={16} />
                </div>
                Application History
              </h3>
              {!isLoading && applications.length > 0 && (
                <span className="badge-slate">
                  {applications.length}{' '}
                  {applications.length === 1 ? 'application' : 'applications'}
                </span>
              )}
            </div>
          </AnimatedSection>

          {/* ── Loading state ──────────────────────────────────────── */}
          {isLoading ? (
            <AnimatedSection delay={200}>
              <div className="card p-16 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-100 border-t-matcha-600" />
                    <div className="absolute inset-0 animate-ping rounded-full h-10 w-10 border-2 border-matcha-300/30" />
                  </div>
                  <p className="text-slate-400 font-semibold text-sm">
                    Loading your applications…
                  </p>
                </div>
              </div>
            </AnimatedSection>
          ) : applications.length === 0 ? (
            /* ── Empty state ─────────────────────────────────────── */
            <AnimatedSection delay={200}>
              <div className="card p-16 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
                <div className="relative">
                  <div className="w-16 h-16 bg-matcha-100 text-matcha-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-soft">
                    <Award size={28} />
                  </div>
                  <h4 className="text-lg font-extrabold text-slate-900 mb-2">
                    No applications yet
                  </h4>
                  <p className="text-slate-500 text-sm mb-6 max-w-xs mx-auto leading-relaxed">
                    Explore open roles and submit your first application to get
                    started.
                  </p>
                  <a
                    href="/careers"
                    className="btn-primary btn-md rounded-xl inline-flex items-center gap-2 shadow-glow-brand"
                  >
                    Browse Open Roles
                    <ChevronRight size={16} />
                  </a>
                </div>
              </div>
            </AnimatedSection>
          ) : (
            /* ── Applications table ──────────────────────────────── */
            <AnimatedSection delay={200}>
              <div className="card overflow-hidden">
                {/* Desktop table */}
                <div className="hidden sm:block">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="px-6 py-4 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400">
                          Role
                        </th>
                        <th className="px-6 py-4 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400">
                          Applied
                        </th>
                        <th className="px-6 py-4 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400 text-center">
                          Status
                        </th>
                        <th className="px-6 py-4 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400 text-right">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {applications.map((app, i) => (
                        <tr
                          key={app.id}
                          className="border-b border-slate-50 last:border-0 hover:bg-matcha-50/30 transition-colors group"
                          style={{ animationDelay: `${i * 50}ms` }}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-matcha-100 group-hover:text-matcha-700 text-slate-500 flex items-center justify-center transition-colors shrink-0">
                                <FileText size={14} />
                              </div>
                              <span className="font-bold text-slate-900 text-sm">
                                {app.role}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
                              <Calendar size={13} className="text-slate-300" />
                              {app.applied_on
                                ? new Date(app.applied_on).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })
                                : 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <StatusBadge status={app.status} />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleRevokeClick(app.id)}
                              className="btn-danger-soft btn-sm rounded-lg inline-flex items-center gap-1.5 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                            >
                              <Trash2 size={13} />
                              Revoke
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="sm:hidden divide-y divide-slate-50">
                  {applications.map((app) => (
                    <div key={app.id} className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="font-bold text-slate-900 text-sm leading-tight">
                            {app.role}
                          </p>
                          <p className="text-xs text-slate-400 font-medium mt-1 flex items-center gap-1">
                            <Calendar size={11} />
                            {app.applied_on
                              ? new Date(app.applied_on).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })
                              : 'N/A'}
                          </p>
                        </div>
                        <StatusBadge status={app.status} />
                      </div>
                      <button
                        onClick={() => handleRevokeClick(app.id)}
                        className="btn-danger-soft btn-sm rounded-lg w-full justify-center mt-1"
                      >
                        <Trash2 size={13} />
                        Revoke Application
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </AnimatedSection>
          )}
        </div>
      </DashboardLayout>

      {/* ── Revoke Confirmation Modal ─────────────────────────────────── */}
      {showRevokeModal && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="revoke-title"
        >
          <div className="modal-panel max-w-md p-8 relative overflow-hidden">
            {/* Decorative top accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-400 via-red-500 to-red-400 rounded-t-3xl" />

            <div className="flex flex-col items-center text-center mb-8">
              {/* Icon */}
              <div className="relative mb-5">
                <div className="w-18 h-18 w-[72px] h-[72px] bg-red-50 rounded-2xl flex items-center justify-center shadow-soft">
                  <AlertTriangle size={30} className="text-red-500" />
                </div>
                <div className="absolute -inset-1 bg-red-100/40 rounded-3xl -z-10 animate-pulse" />
              </div>

              <h2
                id="revoke-title"
                className="text-2xl font-extrabold text-slate-900 mb-2 tracking-tight"
              >
                Revoke Application?
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
                This will permanently erase your application data, resume files,
                and AI screening results from our database.{' '}
                <span className="font-semibold text-slate-700">
                  This cannot be undone.
                </span>
              </p>
            </div>

            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowRevokeModal(false)}
                className="btn-secondary btn-md flex-1 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={confirmRevoke}
                className="btn flex-1 btn-md rounded-xl bg-red-600 text-white hover:bg-red-700 shadow-soft hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-8px_rgba(239,68,68,0.45)] transition-all duration-300"
              >
                <Trash2 size={15} />
                Yes, Revoke
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
