'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  Bell,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Cpu,
  Database,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Radio,
  Shield,
  Smartphone,
  Zap,
} from 'lucide-react';

const PIPELINE_COLOR = '#34d399'; // emerald-400 — single fill color

const steps = [
  {
    id: 'capture',
    title: 'Camera ingest',
    subtitle: 'RTSP frames · timestamped · zoned',
    body: 'Frames are sampled from your IP cameras and tied to worksite and zone so every downstream event stays traceable.',
    icon: Camera,
    accent: 'from-cyan-500/20 to-blue-600/10',
    border: 'border-cyan-500/30',
    glow: 'shadow-[0_0_28px_-10px_rgba(34,211,238,0.35)]',
  },
  {
    id: 'infer',
    title: 'AI detection',
    subtitle: 'PPE & zone models',
    body: 'Models classify hardhats, vests, proximity, and your custom rules. Low-confidence detections can route to review instead of alerting.',
    icon: Cpu,
    accent: 'from-violet-500/20 to-indigo-600/10',
    border: 'border-violet-500/35',
    glow: 'shadow-[0_0_28px_-10px_rgba(139,92,246,0.35)]',
  },
  {
    id: 'violation',
    title: 'Violation classified',
    subtitle: 'Severity + evidence + policy',
    body: 'The event gets severity, clip evidence, and policy context. Cooldowns and deduplication prevent alert storms.',
    icon: AlertTriangle,
    accent: 'from-amber-500/25 to-orange-600/10',
    border: 'border-amber-400/40',
    glow: 'shadow-[0_0_32px_-10px_rgba(251,191,36,0.4)]',
  },
  {
    id: 'notify',
    title: 'Notifications',
    subtitle: 'Email · SMS · WhatsApp',
    body: 'Contacts receive the right channel for their role — supervisors, safety leads, after-hours rosters — per your escalation rules.',
    icon: Bell,
    accent: 'from-emerald-500/20 to-teal-600/10',
    border: 'border-emerald-400/35',
    glow: 'shadow-[0_0_28px_-10px_rgba(52,211,153,0.35)]',
  },
  {
    id: 'audit',
    title: 'Audit log',
    subtitle: 'Immutable trail',
    body: 'State changes — open, acknowledged, resolved — are stored with actor and timestamp for OSHA, insurers, and investigations.',
    icon: Database,
    accent: 'from-sky-500/15 to-slate-600/10',
    border: 'border-sky-400/30',
    glow: 'shadow-[0_0_24px_-10px_rgba(56,189,248,0.28)]',
  },
  {
    id: 'dashboard',
    title: 'Live dashboard',
    subtitle: 'Console & assignment',
    body: 'Alerts surface with video context and zone tags. Open items stay visible so nothing dies in an inbox.',
    icon: LayoutDashboard,
    accent: 'from-blue-500/20 to-cyan-600/10',
    border: 'border-blue-400/35',
    glow: 'shadow-[0_0_28px_-10px_rgba(96,165,250,0.35)]',
  },
  {
    id: 'resolve',
    title: 'Acknowledge & resolve',
    subtitle: 'Close the loop',
    body: 'Operators document corrective action and resolve when safe. Metrics roll up to site and portfolio views.',
    icon: ClipboardCheck,
    accent: 'from-green-500/25 to-emerald-700/10',
    border: 'border-green-400/40',
    glow: 'shadow-[0_0_30px_-10px_rgba(74,222,128,0.38)]',
  },
];

export default function DetectionFlowDemo() {
  const pipelineRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: pipelineRef,
    offset: ['start 0.85', 'end 0.12'],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 28,
    restDelta: 0.001,
  });

  const fillHeight = useTransform(smoothProgress, [0, 1], ['0%', '100%']);

  return (
    <div className="min-h-screen bg-[#0a1628] text-white pt-20 pb-20 relative overflow-hidden scroll-smooth">
      <div className="pointer-events-none fixed inset-0 opacity-[0.28]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(ellipse 70% 45% at 50% -15%, rgba(52,211,153,0.08), transparent), radial-gradient(ellipse 50% 35% at 100% 40%, rgba(34,211,238,0.05), transparent)',
          }}
        />
      </div>
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="container mx-auto px-4 sm:px-6 relative z-10 max-w-4xl">
        <motion.header
          className="text-center mb-12 md:mb-14 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <p className="text-emerald-400/90 text-xs font-semibold tracking-wide uppercase mb-2">
            Detection → resolution
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white mb-3">
            From{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-emerald-300">
              frame to closure
            </span>
          </h1>
          <p className="text-[#8b9bb1] text-sm md:text-base leading-relaxed">
            Scroll the pipeline — the spine fills as you move through each stage.{' '}
            <span className="text-white/40">(Illustrative)</span>
          </p>
        </motion.header>

        {/* Hero — full width above pipeline */}
        <motion.div
          className="grid md:grid-cols-2 gap-5 mb-14 md:mb-16"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
        >
          <div className="relative rounded-xl overflow-hidden border border-white/10 bg-[#0d1f35] h-52 md:h-56">
            <Image
              src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80"
              alt="Construction site"
              fill
              className="object-cover opacity-90"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628] via-transparent to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 text-[10px] font-mono text-white/95 bg-black/45 px-2 py-1.5 rounded-md border border-white/10">
              <Radio className="h-3 w-3 text-emerald-400 shrink-0 animate-pulse" />
              <span className="truncate">CAM-04 · Zone B · live ingest</span>
            </div>
          </div>
          <div className="rounded-xl border border-amber-500/30 bg-[#1e3a5f]/70 p-5 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-amber-300 text-sm font-semibold mb-3">
              <Zap className="h-4 w-4" />
              Simulated detection
            </div>
            <div className="relative h-28 rounded-lg bg-[#0a1628] border border-white/10 overflow-hidden mb-3">
              <div className="absolute inset-[10%] border-2 border-dashed border-amber-400/85 rounded-md">
                <span className="absolute -top-6 left-0 text-[10px] font-mono text-amber-200 bg-black/70 px-1.5 py-0.5 rounded">
                  NO HIGH-VIS VEST — 94%
                </span>
              </div>
            </div>
            <p className="text-sm text-[#8b9bb1] leading-relaxed">
              The steps below follow one violation from camera to resolution — connected by the pipeline on the left.
            </p>
          </div>
        </motion.div>

        {/* Scroll-driven pipeline */}
        <div ref={pipelineRef} className="relative">
          {/* Mobile: horizontal step jumpers */}
          <div className="md:hidden -mx-1 mb-8 overflow-x-auto pb-1">
            <div className="flex gap-2 min-w-min px-1">
              {steps.map((step, i) => (
                <a
                  key={step.id}
                  href={`#${step.id}`}
                  className="shrink-0 px-3 py-2 rounded-full text-[11px] font-medium bg-[#1e3a5f]/80 border border-white/10 text-[#8b9bb1] hover:text-white hover:border-emerald-400/40 transition-colors"
                >
                  {i + 1}. {step.title}
                </a>
              ))}
            </div>
          </div>

          {/* Spine: dim track + same-color fill grows with scroll */}
          <div
            className="absolute left-[27px] top-0 bottom-0 w-1 rounded-full bg-white/[0.09] overflow-hidden z-0"
            aria-hidden
          >
            <motion.div
              className="absolute left-0 top-0 w-full rounded-full will-change-[height]"
              style={{
                height: fillHeight,
                backgroundColor: PIPELINE_COLOR,
                boxShadow: `0 0 24px ${PIPELINE_COLOR}55`,
              }}
            />
          </div>

          <div className="relative z-[1] space-y-0">
            {steps.map((step, i) => {
              const Icon = step.icon;
              const isLast = i === steps.length - 1;
              return (
                <section
                  key={step.id}
                  id={step.id}
                  className={`relative pl-[4.25rem] sm:pl-[4.5rem] scroll-mt-28 ${isLast ? 'pb-4' : 'pb-14 md:pb-20'}`}
                >
                  {/* Node — centered on spine (spine center ~29px, node 36px → left 11px) */}
                  <div
                    className={`absolute left-[11px] top-1 w-9 h-9 rounded-full border-2 flex items-center justify-center z-[2] bg-[#0a1628] ${
                      step.id === 'violation'
                        ? 'border-amber-400/70 shadow-[0_0_20px_rgba(251,191,36,0.25)]'
                        : 'border-white/25 shadow-[0_0_16px_rgba(52,211,153,0.15)]'
                    }`}
                  >
                    <Icon className="h-4 w-4 text-white/95" />
                  </div>

                  {/* Step index label */}
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/80 mb-1.5 pl-0.5">
                    Stage {i + 1} of {steps.length}
                  </p>

                  <div
                    className={`rounded-2xl border ${step.border} bg-gradient-to-br ${step.accent} p-5 md:p-6 ${step.glow}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg md:text-xl font-bold text-white mb-1">{step.title}</h2>
                        <p className="text-emerald-400/90 text-sm font-medium mb-3">{step.subtitle}</p>
                        <p className="text-[#8b9bb1] text-sm leading-relaxed">{step.body}</p>
                      </div>
                      <div className="sm:w-[220px] md:w-[240px] shrink-0">
                        <StepIllustration stepId={step.id} />
                      </div>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        </div>

        <motion.footer
          className="mt-10 rounded-2xl border border-white/10 bg-[#0d1f35]/90 px-6 py-8 md:px-8 md:py-9"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div className="flex items-start gap-4">
              <div
                className="w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0"
                style={{ borderColor: PIPELINE_COLOR, boxShadow: `0 0 18px ${PIPELINE_COLOR}44` }}
              >
                <Shield className="h-5 w-5 text-emerald-300" />
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-bold text-white">One connected pipeline</h2>
                <p className="text-[#8b9bb1] text-sm mt-1.5 max-w-lg leading-relaxed">
                  Detection, notification, audit, and resolution stay on one spine — not handoffs between disconnected tools.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/5 border border-white/10 text-[#8b9bb1] text-xs">
                <Activity className="h-3.5 w-3.5" style={{ color: PIPELINE_COLOR }} />
                Scroll-linked flow
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/5 border border-white/10 text-[#8b9bb1] text-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                Audit-ready
              </span>
            </div>
          </div>
        </motion.footer>
      </div>
    </div>
  );
}

function StepIllustration({ stepId }: { stepId: string }) {
  switch (stepId) {
    case 'capture':
      return (
        <div className="rounded-xl border border-white/10 bg-[#1e3a5f]/50 p-3 font-mono text-[10px] text-cyan-200/90 leading-relaxed">
          <pre className="whitespace-pre-wrap">{`{
  "cameraId": "cam_04",
  "zone": "crane_B",
  "frameId": "f_8a2c91"
}`}</pre>
        </div>
      );
    case 'infer':
      return (
        <div className="flex flex-wrap gap-1.5">
          {['hardhat', 'vest', 'person', 'ppe'].map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 rounded-md bg-violet-500/15 border border-violet-400/30 text-violet-200 text-[10px]"
            >
              {tag}
            </span>
          ))}
        </div>
      );
    case 'violation':
      return (
        <div className="rounded-xl border border-amber-500/40 bg-amber-950/25 p-3">
          <div className="flex items-center gap-2 text-amber-200 font-semibold text-xs mb-2">
            <AlertTriangle className="h-4 w-4" />
            OPEN · HIGH
          </div>
          <p className="text-white text-xs">PPE missing — vest (Zone B)</p>
          <p className="text-[10px] text-[#8b9bb1] mt-1">Evidence retained · cooldown 120s</p>
        </div>
      );
    case 'notify':
      return (
        <div className="grid grid-cols-3 gap-2">
          <Ch icon={Mail} label="Email" />
          <Ch icon={Smartphone} label="SMS" />
          <Ch icon={MessageSquare} label="WhatsApp" />
        </div>
      );
    case 'audit':
      return (
        <div className="rounded-xl border border-sky-500/25 bg-[#0a1628] p-3 font-mono text-[10px] text-sky-300/95 leading-relaxed">
          audit.events → state, actor, timestamp
        </div>
      );
    case 'dashboard':
      return (
        <div className="rounded-xl border border-white/12 bg-[#1e3a5f]/60 overflow-hidden">
          <div className="px-2.5 py-1.5 border-b border-white/10 text-[10px] text-[#8b9bb1]">app.nexxau.com / alerts</div>
          <div className="p-3">
            <div className="rounded-lg bg-[#0a1628] border border-amber-500/30 px-2.5 py-2 text-[10px]">
              <span className="text-amber-300 font-semibold">NEW</span>
              <span className="text-white ml-2">Zone B · vest violation</span>
            </div>
          </div>
        </div>
      );
    case 'resolve':
      return (
        <div className="rounded-xl border border-green-500/35 bg-green-950/25 p-3 flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-green-400 shrink-0" />
          <div>
            <p className="text-white text-sm font-semibold">Resolved</p>
            <p className="text-[10px] text-[#8b9bb1]">Metrics & safety score updated</p>
          </div>
        </div>
      );
    default:
      return null;
  }
}

function Ch({ icon: Icon, label }: { icon: typeof Mail; label: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#1e3a5f]/70 py-2 px-1 text-center">
      <Icon className="h-4 w-4 mx-auto text-emerald-300/90 mb-1" />
      <span className="text-[9px] text-[#8b9bb1]">{label}</span>
    </div>
  );
}
