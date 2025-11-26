import { motion } from "motion/react";
import { Quote, TrendingUp, CheckCircle } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export function ProofSection() {
  const metrics = [
    { value: "61% → 97%", label: "PPE Compliance Increase" },
    { value: "23%", label: "Near-Miss Frequency Drop" },
    { value: "30 days", label: "Time to Full Compliance" }
  ];

  return (
    <section id="proof" className="relative py-24 bg-gradient-to-b from-[#1e3a5f] to-[#0a1628] border-t border-white/10">
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
              <TrendingUp className="h-5 w-5" />
              <span className="text-sm uppercase tracking-wider">Proof</span>
            </div>
            <h2 className="text-4xl md:text-5xl text-white">
              Results that speak for themselves
            </h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Image */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="aspect-[4/3] rounded-lg overflow-hidden border border-white/20 relative">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1636790921342-cbdc4b783de6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25zdHJ1Y3Rpb24lMjBzaXRlJTIwd29ya2Vyc3xlbnwxfHx8fDE3NjM2MDcwNzB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                  alt="Construction site"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628] via-transparent to-transparent" />
              </div>
              
              {/* Floating metric card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                viewport={{ once: true }}
                className="absolute -bottom-6 -right-6 bg-[#22c55e] text-white rounded-lg p-6 shadow-2xl"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-8 w-8" />
                  <div>
                    <div className="text-3xl">97%</div>
                    <div className="text-sm opacity-90">Compliance Rate</div>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Testimonial */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              {/* Pilot Stats */}
              <div className="relative">
                <div className="inline-flex items-center gap-2 text-[#22c55e] mb-6">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm uppercase tracking-wider">Verified Pilot Results</span>
                </div>
                <h3 className="text-3xl text-white mb-4">
                  Real data from early deployment sites
                </h3>
                <p className="text-lg text-[#8b9bb1]">
                  Initial pilot programs across 12 construction sites demonstrated significant improvements in PPE compliance and safety incident prevention within the first month of deployment.
                </p>
              </div>

              {/* Metrics */}
              <div className="space-y-4 pt-8 border-t border-white/10">
                {metrics.map((metric, index) => (
                  <motion.div
                    key={metric.label}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 * index }}
                    viewport={{ once: true }}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10"
                  >
                    <span className="text-[#8b9bb1]">{metric.label}</span>
                    <span className="text-xl text-white">{metric.value}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}