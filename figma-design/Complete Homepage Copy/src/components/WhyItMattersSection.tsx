import { motion } from "motion/react";
import { TrendingDown, Shield, FileCheck, Zap } from "lucide-react";

export function WhyItMattersSection() {
  const benefits = [
    {
      icon: TrendingDown,
      title: "Reduce incidents",
      description: "Fewer violations → fewer injuries → lower claim exposure.",
      highlight: "73% reduction in safety incidents"
    },
    {
      icon: Shield,
      title: "Reduce insurance premiums",
      description: "Insurers reward sites that eliminate risk. We give them the data they trust.",
      highlight: "Up to 30% premium reduction"
    },
    {
      icon: FileCheck,
      title: "OSHA-proof documentation",
      description: "Every violation is time-stamped, captured, and archived automatically.",
      highlight: "100% audit-ready"
    },
    {
      icon: Zap,
      title: "Zero operational friction",
      description: "No hardware swaps. No on-site installation headaches. Use the cameras you already have.",
      highlight: "Deploy in under 48 hours"
    }
  ];

  return (
    <section className="relative py-24 bg-[#0a1628] border-t border-white/10">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="max-w-6xl mx-auto"
        >
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-[#fbbf24] mb-4">
              <Shield className="h-5 w-5" />
              <span className="text-sm uppercase tracking-wider">Why It Matters</span>
            </div>
            <h2 className="text-4xl md:text-5xl text-white">
              Real impact. Measurable results.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group relative bg-gradient-to-br from-[#1e3a5f] to-[#0a1628] border border-white/10 rounded-lg p-8 hover:border-[#fbbf24] transition-all duration-300"
              >
                {/* Icon */}
                <div className="mb-6">
                  <div className="inline-flex p-3 bg-white/5 rounded-lg">
                    <benefit.icon className="h-8 w-8 text-[#fbbf24]" />
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-2xl text-white mb-3">{benefit.title}</h3>
                <p className="text-[#8b9bb1] mb-4 leading-relaxed">
                  {benefit.description}
                </p>

                {/* Highlight metric */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#fbbf24]/10 border border-[#fbbf24]/20 rounded">
                  <div className="w-1.5 h-1.5 bg-[#fbbf24] rounded-full" />
                  <span className="text-sm text-[#fbbf24]">{benefit.highlight}</span>
                </div>

                {/* Hover accent */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#fbbf24] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
