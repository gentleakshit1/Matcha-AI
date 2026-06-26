import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth, SignIn, SignUp } from '@clerk/clerk-react';
import axios from 'axios';
import {
  Users, Briefcase, ChevronRight, X, Sparkles, Zap, Shield,
  BarChart3, Globe, Lock, MessageSquare, ArrowRight, CheckCircle2,
  Brain, Target, Layers, TrendingUp, Star, ChevronDown, Menu,
  Cpu, FileSearch, Award, Clock, Search, PlayCircle, Building2,
  Rocket, HeartHandshake, PieChart, Code2, PenTool
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  useInView — lightweight intersection observer for scroll reveals  */
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
      { threshold: 0.12, ...options }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, inView];
}

/* ------------------------------------------------------------------ */
/*  Reusable animated section wrapper                                  */
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
/*  FAQ Accordion Item                                                 */
/* ------------------------------------------------------------------ */
function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-200/80 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-6 text-left group"
      >
        <span className="text-base md:text-lg font-semibold text-slate-800 group-hover:text-matcha-700 transition-colors pr-4">
          {question}
        </span>
        <ChevronDown
          size={20}
          className={`text-slate-400 flex-shrink-0 transition-transform duration-300 ${
            open ? 'rotate-180 text-matcha-500' : ''
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          open ? 'max-h-96 opacity-100 pb-6' : 'max-h-0 opacity-0'
        }`}
      >
        <p className="text-slate-500 leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN LANDING PAGE                                                  */
/* ------------------------------------------------------------------ */
export default function LandingPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const [showModal, setShowModal] = useState(false);
  const [role, setRole] = useState(null);
  const [authMode, setAuthMode] = useState('signIn');
  const [statusMessage, setStatusMessage] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  /* ---- Scroll listener for navbar glass effect ---- */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ---- Original useEffect: sync + routing ---- */
  useEffect(() => {
    if (isSignedIn && user && !isSyncing) {
      const syncAndNavigate = async () => {
        setIsSyncing(true);
        setStatusMessage('Syncing your profile...');

        const effectiveRole = role || user.publicMetadata?.role;

        try {
          const res = await axios
            .get(`http://127.0.0.1:8000/api/get-user/${user.id}/`)
            .catch(() => null);

          if (res && res.data) {
            if (effectiveRole && effectiveRole !== res.data.role) {
              const syncRes = await axios.post('http://127.0.0.1:8000/api/sync-user/', {
                clerk_id: user.id,
                email: user.primaryEmailAddress?.emailAddress,
                role: effectiveRole,
              });
              handleRouting(syncRes.data.role, syncRes.data.is_hr_approved);
            } else {
              handleRouting(res.data.role, res.data.is_hr_approved);
            }
          } else {
            if (!effectiveRole) {
              setShowModal(true);
              setIsSyncing(false);
              return;
            }
            const syncRes = await axios.post('http://127.0.0.1:8000/api/sync-user/', {
              clerk_id: user.id,
              email: user.primaryEmailAddress?.emailAddress,
              role: effectiveRole,
            });
            handleRouting(syncRes.data.role, syncRes.data.is_hr_approved);
          }
        } catch (err) {
          console.error('Sync error:', err);
          setStatusMessage('Error syncing profile. Please try again.');
          setIsSyncing(false);
        }
      };
      syncAndNavigate();
    }
  }, [isSignedIn, user, role]);

  const handleRouting = (userRole, isHrApproved) => {
    if (userRole === 'hr') {
      if (isHrApproved) {
        navigate('/hr');
      } else {
        setStatusMessage('Your HR account is pending admin validation. Please wait.');
        setIsSyncing(false);
      }
    } else {
      navigate('/candidate');
    }
  };

  const handleSignOut = () => {
    signOut();
    setRole(null);
    setStatusMessage('');
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setMobileMenuOpen(false);
    }
  };

  /* ---- Loading state (preserved) ---- */
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-matcha-600" />
          <p className="text-slate-500 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  /* ================================================================== */
  /*  RENDER                                                            */
  /* ================================================================== */
  return (
    <div className="min-h-screen bg-cream-50 flex flex-col relative overflow-x-hidden">
      {/* ============================================================= */}
      {/*  NAVBAR                                                        */}
      {/* ============================================================= */}
      <nav
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          scrolled
            ? 'bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-soft'
            : 'bg-transparent'
        }`}
      >
        <div className="container-tight px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-2.5 group"
            >
              <div className="w-9 h-9 brand-gradient-bg rounded-xl flex items-center justify-center text-white shadow-glow-brand">
                <Sparkles size={18} />
              </div>
              <span className="text-xl font-bold text-slate-900 tracking-tight">
                Matcha
              </span>
            </button>

            {/* Desktop Links */}
            <div className="hidden md:flex items-center gap-8">
              {[
                { label: 'Features', id: 'features' },
                { label: 'How It Works', id: 'how-it-works' },
                { label: 'AI Process', id: 'ai-process' },
                { label: 'FAQ', id: 'faq' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-3">
              {isSignedIn ? (
                <button onClick={handleSignOut} className="btn-ghost btn-sm">
                  Sign Out
                </button>
              ) : (
                <button
                  onClick={() => setShowModal(true)}
                  className="btn-primary btn-sm"
                >
                  Get Started
                  <ArrowRight size={14} />
                </button>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur-xl border-b border-slate-200/60 px-4 pb-4 animate-fade-in-down">
            <div className="flex flex-col gap-1 pt-2">
              {[
                { label: 'Features', id: 'features' },
                { label: 'How It Works', id: 'how-it-works' },
                { label: 'AI Process', id: 'ai-process' },
                { label: 'FAQ', id: 'faq' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="text-left px-3 py-2.5 text-sm font-medium text-slate-600 hover:text-matcha-700 hover:bg-matcha-50/50 rounded-lg transition-colors"
                >
                  {item.label}
                </button>
              ))}
              <div className="pt-2 border-t border-slate-100 mt-1">
                {isSignedIn ? (
                  <button
                    onClick={() => {
                      handleSignOut();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Sign Out
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowModal(true);
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2.5 text-sm font-semibold text-matcha-700 hover:bg-matcha-50 rounded-lg transition-colors"
                  >
                    Get Started
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* ============================================================= */}
      {/*  HERO SECTION — Full screen, animated mesh, premium type       */}
      {/* ============================================================= */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated mesh background */}
        <div className="absolute inset-0 bg-mesh" />
        <div className="absolute inset-0 bg-grid-slate opacity-50" />

        {/* Floating blobs */}
        <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-matcha-300/20 rounded-full mix-blend-multiply filter blur-[100px] animate-blob" />
        <div className="absolute top-1/3 -right-32 w-[500px] h-[500px] bg-emerald-300/20 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-2000" />
        <div className="absolute -bottom-32 left-1/3 w-[600px] h-[600px] bg-matcha-200/20 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-4000" />

        {/* Content */}
        <div className="relative z-10 text-center max-w-5xl px-4 sm:px-6 pt-20">
          <AnimatedSection delay={0}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-matcha-100/80 border border-matcha-200/50 text-matcha-700 text-xs font-bold uppercase tracking-widest mb-8">
              <Sparkles size={14} />
              AI-Powered Hiring Platform
            </div>
          </AnimatedSection>

          <AnimatedSection delay={150}>
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold text-slate-900 mb-6 tracking-tight text-balance leading-[1.05]">
              Welcome to{' '}
              <span className="brand-gradient-text">Matcha</span>
            </h1>
          </AnimatedSection>

          <AnimatedSection delay={300}>
            <p className="text-lg sm:text-xl md:text-2xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed text-balance font-light">
              The ultimate platform bridging top talent with exceptional
              companies through AI-powered evaluations and streamlined hiring
              pipelines.
            </p>
          </AnimatedSection>

          {statusMessage && (
            <AnimatedSection delay={400}>
              <div className="mb-8 inline-flex items-center gap-3 px-6 py-3.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-2xl font-semibold shadow-soft">
                <Clock size={18} className="animate-pulse-soft" />
                {statusMessage}
              </div>
            </AnimatedSection>
          )}

          <AnimatedSection delay={450}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {!isSignedIn ? (
                <>
                  <button
                    onClick={() => setShowModal(true)}
                    className="btn-primary btn-lg rounded-2xl shadow-glow-brand group"
                  >
                    <span>Get Started Free</span>
                    <ArrowRight
                      size={18}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </button>
                  <button
                    onClick={() => scrollToSection('how-it-works')}
                    className="btn-secondary btn-lg rounded-2xl"
                  >
                    <PlayCircle size={18} />
                    See How It Works
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-matcha-600" />
                  <p className="text-slate-500 font-semibold text-lg animate-pulse-soft">
                    Taking you to your workspace...
                  </p>
                </div>
              )}
            </div>
          </AnimatedSection>

          {/* Hero stats / social proof strip */}
          <AnimatedSection delay={700} className="mt-20">
            <div className="glass rounded-2xl px-6 py-5 inline-flex flex-wrap items-center justify-center gap-6 md:gap-10">
              {[
                { value: '10K+', label: 'Candidates' },
                { value: '500+', label: 'Companies' },
                { value: '98%', label: 'Satisfaction' },
                { value: '3x', label: 'Faster Hiring' },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-xl md:text-2xl font-bold text-slate-900">
                    {stat.value}
                  </div>
                  <div className="text-xs text-slate-400 font-medium mt-0.5">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce opacity-40">
          <ChevronDown size={24} className="text-slate-400" />
        </div>
      </section>

      {/* ============================================================= */}
      {/*  FEATURES SECTION                                               */}
      {/* ============================================================= */}
      <section id="features" className="section-padding bg-white">
        <div className="container-tight">
          <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
            <span className="label-eyebrow mb-4 block">Features</span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-5 text-balance">
              Everything you need to{' '}
              <span className="brand-gradient-text">hire smarter</span>
            </h2>
            <p className="text-lg text-slate-500 leading-relaxed">
              From AI-driven candidate screening to collaborative pipeline
              management, Matcha equips your team with modern tools for modern
              hiring.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Brain size={24} />,
                title: 'AI-Powered Screening',
                desc: 'Our LLM engine evaluates resumes, code samples, and written responses against job requirements with human-level nuance.',
                color: 'bg-matcha-100 text-matcha-700',
              },
              {
                icon: <Zap size={24} />,
                title: 'Instant Evaluation',
                desc: 'Receive detailed candidate scores and feedback within minutes, not days. Accelerate your time-to-hire dramatically.',
                color: 'bg-amber-100 text-amber-700',
              },
              {
                icon: <Shield size={24} />,
                title: 'Bias Mitigation',
                desc: 'Structured, anonymized evaluations reduce unconscious bias and promote fair, equitable hiring decisions across teams.',
                color: 'bg-blue-100 text-blue-700',
              },
              {
                icon: <BarChart3 size={24} />,
                title: 'Rich Analytics',
                desc: 'Track pipeline health, source effectiveness, and team velocity with beautiful dashboards and exportable reports.',
                color: 'bg-indigo-100 text-indigo-700',
              },
              {
                icon: <Globe size={24} />,
                title: 'Global Talent Pool',
                desc: 'Connect with candidates across borders. Multi-language support and timezone-aware scheduling included.',
                color: 'bg-emerald-100 text-emerald-700',
              },
              {
                icon: <Lock size={24} />,
                title: 'Enterprise Security',
                desc: 'SOC 2 Type II certified, GDPR compliant, with role-based access controls and full audit trails.',
                color: 'bg-slate-100 text-slate-700',
              },
            ].map((feature, i) => (
              <AnimatedSection key={feature.title} delay={i * 100}>
                <div className="card card-interactive p-7 h-full">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${feature.color}`}
                  >
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2.5">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================= */}
      {/*  HOW IT WORKS                                                   */}
      {/* ============================================================= */}
      <section id="how-it-works" className="section-padding bg-cream-50">
        <div className="container-tight">
          <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
            <span className="label-eyebrow mb-4 block">How It Works</span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-5 text-balance">
              Three steps to{' '}
              <span className="brand-gradient-text">better hires</span>
            </h2>
            <p className="text-lg text-slate-500 leading-relaxed">
              We have stripped away the complexity. Post a role, let AI handle
              the heavy lifting, and make confident decisions.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connector line (desktop) */}
            <div className="hidden md:block absolute top-24 left-[16.66%] right-[16.66%] h-0.5 bg-gradient-to-r from-matcha-200 via-matcha-300 to-matcha-200" />

            {[
              {
                step: '01',
                icon: <FileSearch size={28} />,
                title: 'Post Your Role',
                desc: 'Define the position, required skills, and evaluation criteria. Our AI parses the description and builds a tailored assessment rubric automatically.',
              },
              {
                step: '02',
                icon: <Cpu size={28} />,
                title: 'AI Evaluates',
                desc: 'Candidates apply and complete structured assessments. Matcha\'s engine scores each submission across technical, cultural, and communication dimensions.',
              },
              {
                step: '03',
                icon: <Award size={28} />,
                title: 'Hire with Confidence',
                desc: 'Review ranked, annotated candidate profiles. Schedule interviews, collaborate with your team, and extend offers—all inside Matcha.',
              },
            ].map((item, i) => (
              <AnimatedSection key={item.step} delay={i * 150}>
                <div className="relative flex flex-col items-center text-center">
                  <div className="relative z-10 w-20 h-20 bg-white rounded-3xl shadow-soft border border-matcha-100 flex items-center justify-center text-matcha-600 mb-6">
                    {item.icon}
                  </div>
                  <span className="text-xs font-bold text-matcha-400 uppercase tracking-widest mb-3">
                    Step {item.step}
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
                    {item.desc}
                  </p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================= */}
      {/*  WHY CHOOSE MATCHA                                              */}
      {/* ============================================================= */}
      <section className="section-padding bg-white">
        <div className="container-tight">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <AnimatedSection>
              <span className="label-eyebrow mb-4 block">Why Matcha</span>
              <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-6 text-balance leading-tight">
                Built for teams who refuse to{' '}
                <span className="brand-gradient-text">compromise</span> on
                talent
              </h2>
              <p className="text-lg text-slate-500 leading-relaxed mb-8">
                Traditional hiring is slow, subjective, and expensive. Matcha
                replaces gut feelings with structured intelligence—so you build
                the team you actually need.
              </p>

              <div className="space-y-5">
                {[
                  'Reduce time-to-hire by up to 70%',
                  'Eliminate screening bottlenecks',
                  'Improve candidate experience scores',
                  'Data-driven diversity insights',
                ].map((point) => (
                  <div key={point} className="flex items-start gap-3.5">
                    <div className="w-6 h-6 rounded-full bg-matcha-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 size={14} className="text-matcha-600" />
                    </div>
                    <span className="text-slate-700 font-medium">{point}</span>
                  </div>
                ))}
              </div>
            </AnimatedSection>

            <AnimatedSection delay={200}>
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-tr from-matcha-200/40 to-emerald-200/40 rounded-[2.5rem] blur-2xl" />
                <div className="relative card p-8 md:p-10 space-y-6">
                  {[
                    {
                      icon: <TrendingUp size={20} />,
                      title: 'Faster Pipelines',
                      desc: 'Automated screening means your team only reviews pre-qualified candidates.',
                      stat: '3x faster',
                    },
                    {
                      icon: <Target size={20} />,
                      title: 'Higher Accuracy',
                      desc: 'AI rubrics calibrated on thousands of successful placements.',
                      stat: '94% accuracy',
                    },
                    {
                      icon: <HeartHandshake size={20} />,
                      title: 'Better Experience',
                      desc: 'Candidates receive transparent feedback, regardless of outcome.',
                      stat: '4.9/5 rating',
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="flex items-start gap-4 p-4 rounded-2xl bg-cream-50/80 border border-matcha-100/50"
                    >
                      <div className="w-10 h-10 rounded-xl bg-matcha-100 flex items-center justify-center text-matcha-600 flex-shrink-0">
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-bold text-slate-900 text-sm">
                            {item.title}
                          </h4>
                          <span className="text-xs font-bold text-matcha-600 bg-matcha-50 px-2 py-1 rounded-full">
                            {item.stat}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ============================================================= */}
      {/*  AI EVALUATION PROCESS                                          */}
      {/* ============================================================= */}
      <section id="ai-process" className="section-padding bg-matcha-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white opacity-20" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-matcha-500/10 rounded-full filter blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/10 rounded-full filter blur-[100px]" />

        <div className="container-tight relative z-10">
          <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-matcha-300 mb-4">
              AI Evaluation Process
            </span>
            <h2 className="text-3xl md:text-5xl font-extrabold mb-5 text-balance">
              How our AI thinks about{' '}
              <span className="text-matcha-300">candidates</span>
            </h2>
            <p className="text-lg text-matcha-100/70 leading-relaxed">
              Transparent, multi-dimensional scoring that hiring teams can trust
              and candidates can understand.
            </p>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: <Search size={22} />,
                title: 'Document Parsing',
                desc: 'Resumes, portfolios, and code repositories are parsed into structured skill and experience vectors.',
              },
              {
                icon: <Layers size={22} />,
                title: 'Skill Mapping',
                desc: 'Mapped against role rubrics built from your job description and industry benchmarks.',
              },
              {
                icon: <MessageSquare size={22} />,
                title: 'Communication Analysis',
                desc: 'Written responses and transcripts evaluated for clarity, empathy, and cultural alignment.',
              },
              {
                icon: <BarChart3 size={22} />,
                title: 'Scored & Ranked',
                desc: 'Composite scores with explainable breakdowns delivered instantly to your dashboard.',
              },
            ].map((step, i) => (
              <AnimatedSection key={step.title} delay={i * 120}>
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 h-full hover:bg-white/10 transition-colors duration-300 group">
                  <div className="w-12 h-12 rounded-xl bg-matcha-500/20 border border-matcha-400/30 flex items-center justify-center text-matcha-300 mb-5 group-hover:scale-110 transition-transform duration-300">
                    {step.icon}
                  </div>
                  <h3 className="text-lg font-bold mb-2.5">{step.title}</h3>
                  <p className="text-sm text-matcha-100/60 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================= */}
      {/*  TRUSTED BY COMPANIES                                           */}
      {/* ============================================================= */}
      <section className="py-16 md:py-24 bg-white border-b border-slate-100">
        <div className="container-tight">
          <AnimatedSection className="text-center mb-12">
            <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest">
              Trusted by forward-thinking teams
            </p>
          </AnimatedSection>

          <AnimatedSection delay={100}>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-8 md:gap-x-16 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
              {[
                'Acme Corp',
                'Vertex Labs',
                'Nebula AI',
                'Prism Data',
                'Horizon Tech',
                'Catalyst',
              ].map((name) => (
                <div
                  key={name}
                  className="flex items-center gap-2 text-xl md:text-2xl font-bold text-slate-800 hover:text-matcha-700 transition-colors"
                >
                  <Building2 size={22} />
                  {name}
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ============================================================= */}
      {/*  TESTIMONIALS                                                   */}
      {/* ============================================================= */}
      <section className="section-padding bg-cream-50">
        <div className="container-tight">
          <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
            <span className="label-eyebrow mb-4 block">Testimonials</span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-5 text-balance">
              Loved by hiring teams{' '}
              <span className="brand-gradient-text">worldwide</span>
            </h2>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote:
                  'Matcha cut our screening time by 80%. The quality of candidates making it to interview has never been higher.',
                author: 'Sarah Chen',
                role: 'Head of Talent, Vertex Labs',
                rating: 5,
              },
              {
                quote:
                  'Finally, an AI tool that actually understands engineering roles. The code evaluation is scarily accurate.',
                author: 'Marcus Johnson',
                role: 'CTO, Nebula AI',
                rating: 5,
              },
              {
                quote:
                  'Our candidates love the transparency. Even those who do not make it forward appreciate the detailed feedback.',
                author: 'Elena Rodriguez',
                role: 'VP People, Prism Data',
                rating: 5,
              },
            ].map((t, i) => (
              <AnimatedSection key={t.author} delay={i * 120}>
                <div className="card p-7 h-full flex flex-col">
                  <div className="flex gap-1 mb-5">
                    {Array.from({ length: t.rating }).map((_, idx) => (
                      <Star
                        key={idx}
                        size={16}
                        className="text-amber-400 fill-amber-400"
                      />
                    ))}
                  </div>
                  <p className="text-slate-600 leading-relaxed mb-6 flex-1 text-[15px]">
                    "{t.quote}"
                  </p>
                  <div className="flex items-center gap-3 pt-5 border-t border-slate-100">
                    <div className="w-10 h-10 rounded-full bg-matcha-100 flex items-center justify-center text-matcha-700 font-bold text-sm">
                      {t.author
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        {t.author}
                      </div>
                      <div className="text-xs text-slate-400">{t.role}</div>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================= */}
      {/*  STATISTICS                                                     */}
      {/* ============================================================= */}
      <section className="py-20 md:py-28 bg-white">
        <div className="container-tight">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
            {[
              { value: '10,000+', label: 'Candidates Assessed', icon: <Users size={20} /> },
              { value: '500+', label: 'Partner Companies', icon: <Building2 size={20} /> },
              { value: '94%', label: 'Client Retention', icon: <TrendingUp size={20} /> },
              { value: '3x', label: 'Faster Time-to-Hire', icon: <Clock size={20} /> },
            ].map((stat, i) => (
              <AnimatedSection key={stat.label} delay={i * 100}>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-matcha-50 text-matcha-600 mb-4">
                    {stat.icon}
                  </div>
                  <div className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-slate-400 font-medium">
                    {stat.label}
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================= */}
      {/*  FAQ                                                            */}
      {/* ============================================================= */}
      <section id="faq" className="section-padding bg-cream-50">
        <div className="container-narrow">
          <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
            <span className="label-eyebrow mb-4 block">FAQ</span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-5 text-balance">
              Questions?{' '}
              <span className="brand-gradient-text">Answers.</span>
            </h2>
          </AnimatedSection>

          <AnimatedSection>
            <div className="card p-6 md:p-10">
              {[
                {
                  q: 'How does the AI evaluation actually work?',
                  a: 'Matcha uses a fine-tuned large language model combined with structured rubrics specific to each role. It analyzes resumes, code, and written responses across multiple dimensions—technical skill, communication, problem-solving, and cultural fit—then produces scored, annotated profiles for your team to review.',
                },
                {
                  q: 'Is candidate data secure and compliant?',
                  a: 'Absolutely. Matcha is SOC 2 Type II certified and fully GDPR compliant. All data is encrypted at rest and in transit. We never use candidate data to train our models without explicit consent, and full audit trails are maintained for every evaluation.',
                },
                {
                  q: 'Can we customize the evaluation criteria?',
                  a: 'Yes. You can define custom rubrics, weight different skills, and even upload your own benchmark responses. The AI adapts its scoring to reflect your team\'s specific standards and priorities.',
                },
                {
                  q: 'What roles does Matcha work best for?',
                  a: 'Matcha excels for technical roles—software engineering, data science, product management, and design. However, our platform is flexible enough to support a wide range of positions across industries.',
                },
                {
                  q: 'How long does setup take?',
                  a: 'Most teams are up and running within 30 minutes. Connect your account, create your first job posting, and start receiving AI-evaluated candidates the same day.',
                },
                {
                  q: 'Do candidates need to create accounts?',
                  a: 'Candidates can apply with a simple email link. No account creation is required unless they want to track multiple applications or receive personalized job recommendations.',
                },
              ].map((faq) => (
                <FaqItem key={faq.q} question={faq.q} answer={faq.a} />
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ============================================================= */}
      {/*  CALL TO ACTION                                                 */}
      {/* ============================================================= */}
      <section className="py-24 md:py-32 px-4 relative overflow-hidden">
        <div className="absolute inset-0 brand-gradient-bg" />
        <div className="absolute inset-0 bg-grid-white opacity-10" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full filter blur-[100px] animate-blob-slow" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-300/20 rounded-full filter blur-[100px] animate-blob-slow animation-delay-4000" />

        <div className="container-narrow relative z-10 text-center">
          <AnimatedSection>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 text-balance leading-tight">
              Ready to transform your hiring?
            </h2>
          </AnimatedSection>
          <AnimatedSection delay={150}>
            <p className="text-lg md:text-xl text-white/80 mb-10 max-w-2xl mx-auto leading-relaxed">
              Join thousands of companies using Matcha to find exceptional
              talent faster, fairer, and with less effort.
            </p>
          </AnimatedSection>
          <AnimatedSection delay={300}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {!isSignedIn ? (
                <>
                  <button
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-matcha-700 rounded-2xl text-base font-bold shadow-soft-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group"
                  >
                    Get Started Free
                    <ArrowRight
                      size={18}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </button>
                  <button
                    onClick={() => scrollToSection('features')}
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 text-white border border-white/20 rounded-2xl text-base font-semibold hover:bg-white/20 transition-all duration-300"
                  >
                    Explore Features
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-white/30 border-t-white" />
                  <p className="text-white/80 font-medium animate-pulse-soft">
                    Redirecting...
                  </p>
                </div>
              )}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ============================================================= */}
      {/*  FOOTER                                                         */}
      {/* ============================================================= */}
      <footer className="bg-slate-900 text-slate-300 py-16 md:py-20 px-4">
        <div className="container-tight">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 mb-16">
            {/* Brand */}
            <div className="col-span-2 md:col-span-4 lg:col-span-1 lg:col-span-2">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-9 h-9 brand-gradient-bg rounded-xl flex items-center justify-center text-white">
                  <Sparkles size={18} />
                </div>
                <span className="text-xl font-bold text-white tracking-tight">
                  Matcha
                </span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed max-w-xs mb-6">
                Bridging top talent with exceptional companies through
                AI-powered evaluations and streamlined hiring pipelines.
              </p>
              <div className="flex items-center gap-3">
                {[
                  { icon: <Globe size={16} />, label: 'Web' },
                  { icon: <MessageSquare size={16} />, label: 'Chat' },
                  { icon: <Code2 size={16} />, label: 'API' },
                ].map((s) => (
                  <button
                    key={s.label}
                    className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-matcha-600 flex items-center justify-center text-slate-400 hover:text-white transition-all duration-200"
                    aria-label={s.label}
                  >
                    {s.icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-5">
                Product
              </h4>
              <ul className="space-y-3.5">
                {['Features', 'AI Evaluation', 'Pricing', 'Integrations', 'API'].map(
                  (item) => (
                    <li key={item}>
                      <button className="text-sm text-slate-400 hover:text-matcha-300 transition-colors">
                        {item}
                      </button>
                    </li>
                  )
                )}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-5">
                Company
              </h4>
              <ul className="space-y-3.5">
                {['About', 'Blog', 'Careers', 'Press', 'Contact'].map((item) => (
                  <li key={item}>
                    <button className="text-sm text-slate-400 hover:text-matcha-300 transition-colors">
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-5">
                Resources
              </h4>
              <ul className="space-y-3.5">
                {['Documentation', 'Help Center', 'Privacy', 'Terms', 'Security'].map(
                  (item) => (
                    <li key={item}>
                      <button className="text-sm text-slate-400 hover:text-matcha-300 transition-colors">
                        {item}
                      </button>
                    </li>
                  )
                )}
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} Matcha AI, Inc. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <button className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                Privacy Policy
              </button>
              <button className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                Terms of Service
              </button>
              <button className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                Cookies
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* ============================================================= */}
      {/*  AUTH & ROLE SELECTION MODAL  (ORIGINAL LOGIC PRESERVED)       */}
      {/* ============================================================= */}
      {showModal && !isSignedIn && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-panel max-w-md rounded-3xl overflow-hidden relative">
            <button
              onClick={() => {
                setShowModal(false);
                setRole(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 z-10 bg-slate-100 hover:bg-slate-200 rounded-full p-1.5 transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>

            {!role ? (
              <div className="p-8">
                <h2 className="text-2xl font-extrabold text-center text-slate-900 mb-2">
                  Join Matcha
                </h2>
                <p className="text-center text-slate-500 mb-8">
                  How would you like to use the platform?
                </p>

                <div className="space-y-4">
                  <button
                    onClick={() => setRole('candidate')}
                    className="w-full flex items-center p-4 border-2 border-slate-100 rounded-2xl hover:border-matcha-500 hover:bg-matcha-50/50 transition-all group"
                  >
                    <div className="bg-slate-100 p-3 rounded-xl group-hover:bg-white group-hover:shadow-soft transition-all">
                      <Users className="text-slate-600 group-hover:text-matcha-600" />
                    </div>
                    <div className="ml-4 text-left">
                      <h3 className="font-extrabold text-slate-900">
                        I am a Candidate
                      </h3>
                      <p className="text-sm text-slate-500">
                        Find jobs and get AI feedback
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => setRole('hr')}
                    className="w-full flex items-center p-4 border-2 border-slate-100 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50/50 transition-all group"
                  >
                    <div className="bg-slate-100 p-3 rounded-xl group-hover:bg-white group-hover:shadow-soft transition-all">
                      <Briefcase className="text-slate-600 group-hover:text-indigo-600" />
                    </div>
                    <div className="ml-4 text-left">
                      <h3 className="font-extrabold text-slate-900">
                        I am an HR Manager
                      </h3>
                      <p className="text-sm text-slate-500">
                        Evaluate and manage candidates
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 flex justify-center">
                {authMode === 'signIn' ? (
                  <div className="w-full">
                    <SignIn routing="virtual" />
                    <button
                      onClick={() => setAuthMode('signUp')}
                      className="mt-4 text-sm text-matcha-600 font-bold hover:underline w-full text-center"
                    >
                      Need an account? Sign Up
                    </button>
                  </div>
                ) : (
                  <div className="w-full">
                    <SignUp routing="virtual" />
                    <button
                      onClick={() => setAuthMode('signIn')}
                      className="mt-4 text-sm text-matcha-600 font-bold hover:underline w-full text-center"
                    >
                      Already have an account? Sign In
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/*  ROLE COLLECTION MODAL for signed-in users  (ORIGINAL)         */}
      {/* ============================================================= */}
      {showModal && isSignedIn && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-panel max-w-md p-8 rounded-3xl relative">
            <h2 className="text-2xl font-extrabold text-center text-slate-900 mb-2">
              Complete your profile
            </h2>
            <p className="text-center text-slate-500 mb-8">
              Please select your primary role to continue.
            </p>
            <div className="space-y-4">
              <button
                onClick={() => setRole('candidate')}
                className="w-full flex items-center p-4 border-2 border-slate-100 rounded-2xl hover:border-matcha-500 hover:bg-matcha-50/50 transition-all group"
              >
                <div className="bg-slate-100 p-3 rounded-xl group-hover:bg-white group-hover:shadow-soft transition-all">
                  <Users className="text-slate-600 group-hover:text-matcha-600" />
                </div>
                <div className="ml-4 text-left">
                  <h3 className="font-extrabold text-slate-900">
                    I am a Candidate
                  </h3>
                </div>
              </button>
              <button
                onClick={() => setRole('hr')}
                className="w-full flex items-center p-4 border-2 border-slate-100 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50/50 transition-all group"
              >
                <div className="bg-slate-100 p-3 rounded-xl group-hover:bg-white group-hover:shadow-soft transition-all">
                  <Briefcase className="text-slate-600 group-hover:text-indigo-600" />
                </div>
                <div className="ml-4 text-left">
                  <h3 className="font-extrabold text-slate-900">
                    I am an HR Manager
                  </h3>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
