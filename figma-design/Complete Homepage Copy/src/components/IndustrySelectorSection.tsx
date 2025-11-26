import { motion } from "motion/react";
import { HardHat, Flame, Warehouse } from "lucide-react";

export function IndustrySelectorSection() {
  const industries = [
    {
      icon: HardHat,
      title: "Construction",
      features: ["PPE enforcement", "High-risk operations", "Multi-site coordination", "OSHA compliance"],
      color: "#fbbf24"
    },
    {
      icon: Flame,
      title: "Oil & Gas",
      features: ["Hazardous zone monitoring", "Flame-resistant PPE", "Confined space tracking", "Emergency response"],
      color: "#ef4444"
    },
    {
      icon: Warehouse,
      title: "Warehousing",
      features: ["Forklift proximity alerts", "Loading zone risk", "High-visibility requirements", "Traffic flow analysis"],
      color: "#22c55e"
    }
  ];

  return (
    <section id="industries" className="relative py-24 bg-[#0a1628] border-t border-white/10">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="max-w-6xl mx-auto"
        >
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-[#8b9bb1] mb-4">
              <HardHat className="h-5 w-5" />
              <span className="text-sm uppercase tracking-wider">Industries</span>
            </div>
            <h2 className="text-4xl md:text-5xl text-white mb-4">
              Built for high-risk environments
            </h2>
            <p className="text-xl text-[#8b9bb1] max-w-3xl mx-auto">
              Tailored enforcement for the industries where safety isn't optional—it's survival.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {industries.map((industry, index) => (
              <motion.div
                key={industry.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group relative"
              >
                {/* Glow effect on hover */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-20 blur-3xl transition-opacity duration-500"
                  style={{ backgroundColor: industry.color }}
                />
                
                {/* Card */}
                <div className="relative bg-gradient-to-br from-[#1e3a5f] to-[#0a1628] border-2 border-white/10 rounded-lg p-8 h-full group-hover:border-white/30 transition-all duration-300">
                  {/* Icon */}
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ duration: 0.3 }}
                    className="mb-6"
                  >
                    <div 
                      className="inline-flex p-4 rounded-lg"
                      style={{ backgroundColor: `${industry.color}20` }}
                    >
                      <industry.icon 
                        className="h-12 w-12" 
                        style={{ color: industry.color }}
                      />
                    </div>
                  </motion.div>

                  {/* Title */}
                  <h3 className="text-2xl text-white mb-4">{industry.title}</h3>

                  {/* Features */}
                  <ul className="space-y-3">
                    {industry.features.map((feature, idx) => (
                      <motion.li
                        key={feature}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 + idx * 0.05 }}
                        viewport={{ once: true }}
                        className="flex items-start gap-3"
                      >
                        <div 
                          className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
                          style={{ backgroundColor: industry.color }}
                        />
                        <span className="text-[#8b9bb1]">{feature}</span>
                      </motion.li>
                    ))}
                  </ul>

                  {/* Bottom accent line */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: `linear-gradient(to right, transparent, ${industry.color}, transparent)` }}
                  />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Call to action */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
            className="mt-16 text-center"
          >
            <p className="text-lg text-[#8b9bb1] mb-6">
              Don't see your industry? Nexxau adapts to any high-risk environment.
            </p>
            <a href="#contact" className="text-white hover:text-[#fbbf24] transition-colors underline">
              Talk to our team about your specific needs →
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
