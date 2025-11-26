import { motion } from "motion/react";
import { Shield, Bell, FileText, Activity, AlertTriangle, HardHat } from "lucide-react";

export function WhatWeDoSection() {
  const capabilities = [
    {
      icon: HardHat,
      title: "Hardhat non-compliance",
      description: "Instant detection and logging"
    },
    {
      icon: Shield,
      title: "High-visibility vest issues",
      description: "Real-time vest monitoring"
    },
    {
      icon: Activity,
      title: "Entrance/exit compliance",
      description: "Full perimeter coverage"
    },
    {
      icon: AlertTriangle,
      title: "Near-misses and risky behaviors",
      description: "Proactive risk identification"
    }
  ];

  const triggers = [
    {
      icon: Bell,
      title: "Instant alerts",
      description: "Real-time notifications to site managers"
    },
    {
      icon: FileText,
      title: "Logged incident timelines",
      description: "Automatic violation documentation"
    },
    {
      icon: FileText,
      title: "Automated compliance reports",
      description: "Daily/weekly summaries delivered"
    }
  ];

  return (
    <section id="capabilities" className="relative py-24 bg-gradient-to-b from-[#0a1628] to-[#1e3a5f] border-t border-white/10">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="max-w-6xl mx-auto"
        >
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-[#22c55e] mb-4">
              <Shield className="h-5 w-5" />
              <span className="text-sm uppercase tracking-wider">Autonomous Enforcement Engine</span>
            </div>
            <h2 className="text-4xl md:text-5xl text-white mb-4">
              Real-time identification and enforcement
            </h2>
            <p className="text-xl text-[#8b9bb1] max-w-3xl mx-auto">
              Nexxau analyzes every camera feed in real time to identify violations and enforce compliance automatically.
            </p>
          </div>

          {/* Capabilities Grid */}
          <div className="mb-16">
            <h3 className="text-2xl text-white mb-8 text-center">We Identify</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {capabilities.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-[#0a1628] border border-white/20 rounded-lg p-6 hover:border-[#fbbf24] transition-colors"
                >
                  <item.icon className="h-8 w-8 text-[#fbbf24] mb-4" />
                  <h4 className="text-white mb-2">{item.title}</h4>
                  <p className="text-sm text-[#8b9bb1]">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Triggers */}
          <div className="mb-12">
            <h3 className="text-2xl text-white mb-8 text-center">Every violation triggers</h3>
            <div className="grid md:grid-cols-3 gap-6">
              {triggers.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-[#1e3a5f]/50 border border-white/10 rounded-lg p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="bg-white/10 rounded p-2">
                      <item.icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-white mb-1">{item.title}</h4>
                      <p className="text-sm text-[#8b9bb1]">{item.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Bottom statement */}
          <div className="text-center border-t border-white/10 pt-12">
            <p className="text-2xl text-white">
              No manual reviews. No guesswork. No excuses.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}