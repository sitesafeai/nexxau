import { motion } from "motion/react";
import { Eye, AlertCircle, TrendingDown } from "lucide-react";

export function ProblemSection() {
  return (
    <section className="relative py-24 bg-[#0a1628] border-t border-white/10">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 text-[#ef4444] mb-4">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm uppercase tracking-wider">The Problem</span>
            </div>

            <h2 className="text-4xl md:text-5xl text-white">
              Human audits miss 70% of PPE violations.
            </h2>

            <p className="text-xl text-[#8b9bb1]">
              Fatigue, distraction, and limited visibility create blind spots that lead to injuries, fines, delays, and claims.
            </p>

            <div className="relative py-8 my-8 border-y border-white/10">
              <p className="text-2xl text-white">
                Your cameras see everything — but no one is watching them.
              </p>
            </div>

            {/* Impact visualization */}
            <div className="grid md:grid-cols-3 gap-6 pt-8">
              <div className="bg-[#1e3a5f]/50 border border-white/10 rounded-lg p-6">
                <Eye className="h-8 w-8 text-[#ef4444] mb-4" />
                <div className="text-2xl text-white mb-2">70%</div>
                <div className="text-sm text-[#8b9bb1]">Violations go undetected by human observers</div>
              </div>
              
              <div className="bg-[#1e3a5f]/50 border border-white/10 rounded-lg p-6">
                <TrendingDown className="h-8 w-8 text-[#fbbf24] mb-4" />
                <div className="text-2xl text-white mb-2">4x</div>
                <div className="text-sm text-[#8b9bb1]">Higher injury rates on under-monitored sites</div>
              </div>
              
              <div className="bg-[#1e3a5f]/50 border border-white/10 rounded-lg p-6">
                <AlertCircle className="h-8 w-8 text-[#ef4444] mb-4" />
                <div className="text-2xl text-white mb-2">$1.2M</div>
                <div className="text-sm text-[#8b9bb1]">Average cost of a serious safety incident</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
