import { motion } from "motion/react";
import { Shield, FileCheck, TrendingDown, Database } from "lucide-react";
import { Button } from "./ui/button";

export function InsuranceSection() {
  const benefits = [
    {
      icon: TrendingDown,
      title: "Lower premiums",
      description: "Proven risk reduction that insurers reward with premium discounts up to 30%"
    },
    {
      icon: FileCheck,
      title: "Audit-ready documentation",
      description: "Every incident time-stamped and archived with visual evidence"
    },
    {
      icon: Database,
      title: "Direct API integration",
      description: "Real-time data feeds to your insurance portal for instant verification"
    },
    {
      icon: Shield,
      title: "Claims defense",
      description: "Irrefutable evidence to dispute fraudulent or exaggerated claims"
    }
  ];

  return (
    <section id="insurance" className="relative py-24 bg-gradient-to-b from-[#0a1628] to-[#1e3a5f] border-t border-white/10">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="max-w-6xl mx-auto"
        >
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-[#3b82f6] mb-4">
              <Shield className="h-5 w-5" />
              <span className="text-sm uppercase tracking-wider">For Insurance Providers</span>
            </div>
            <h2 className="text-4xl md:text-5xl text-white mb-4">
              Insurance-grade data you can trust
            </h2>
            <p className="text-xl text-[#8b9bb1] max-w-3xl mx-auto">
              Nexxau provides the granular, verifiable safety data that insurers need to accurately assess risk and reward safety-first operations.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-[#0a1628] border border-white/10 rounded-lg p-8 hover:border-[#3b82f6] transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-[#3b82f6]/10 rounded-lg">
                    <benefit.icon className="h-8 w-8 text-[#3b82f6]" />
                  </div>
                  <div>
                    <h3 className="text-xl text-white mb-2">{benefit.title}</h3>
                    <p className="text-[#8b9bb1]">{benefit.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Stats bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-[#1e3a5f] to-[#0a1628] border-2 border-[#3b82f6]/30 rounded-lg p-8"
          >
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-4xl text-[#3b82f6] mb-2">100%</div>
                <div className="text-sm text-[#8b9bb1]">Incident Documentation</div>
              </div>
              <div>
                <div className="text-4xl text-[#3b82f6] mb-2">Real-time</div>
                <div className="text-sm text-[#8b9bb1]">Risk Visibility</div>
              </div>
              <div>
                <div className="text-4xl text-[#3b82f6] mb-2">API</div>
                <div className="text-sm text-[#8b9bb1]">Direct Integration</div>
              </div>
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <Button size="lg" className="bg-[#3b82f6] text-white hover:bg-[#3b82f6]/90">
              Partner with Nexxau
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
