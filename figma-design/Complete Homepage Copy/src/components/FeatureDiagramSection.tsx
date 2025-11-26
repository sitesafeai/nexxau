import { motion } from "motion/react";
import { Camera, Brain, Shield, FileText, Building2, ArrowRight } from "lucide-react";

export function FeatureDiagramSection() {
  const features = [
    { icon: Camera, label: "Camera Feed", color: "#8b9bb1" },
    { icon: Brain, label: "AI Detection", color: "#fbbf24" },
    { icon: Shield, label: "Enforcement", color: "#ef4444" },
    { icon: FileText, label: "Reports", color: "#22c55e" },
    { icon: Building2, label: "Insurance Portal", color: "#3b82f6" },
  ];

  return (
    <section id="features" className="relative py-24 bg-gradient-to-b from-[#1e3a5f] to-[#0a1628] border-t border-white/10 overflow-hidden">
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
              <span className="text-sm uppercase tracking-wider">Autonomous Enforcement Engine</span>
            </div>
            <h2 className="text-4xl md:text-5xl text-white mb-4">
              From detection to action in milliseconds
            </h2>
            <p className="text-xl text-[#8b9bb1] max-w-3xl mx-auto">
              A complete enforcement pipeline that never sleeps, never misses, and always documents.
            </p>
          </div>

          {/* Flow Diagram */}
          <div className="relative">
            {/* Desktop view */}
            <div className="hidden lg:flex items-center justify-between relative">
              {features.map((feature, index) => (
                <div key={feature.label} className="flex items-center">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: index * 0.2 }}
                    viewport={{ once: true }}
                    className="relative group"
                  >
                    {/* Glow effect */}
                    <div 
                      className="absolute inset-0 opacity-0 group-hover:opacity-30 blur-2xl transition-opacity duration-500"
                      style={{ backgroundColor: feature.color }}
                    />
                    
                    {/* Card */}
                    <div className="relative bg-[#0a1628] border-2 rounded-lg p-6 w-40 transition-all duration-300 group-hover:scale-110"
                      style={{ borderColor: `${feature.color}40` }}
                    >
                      <feature.icon 
                        className="h-10 w-10 mx-auto mb-3" 
                        style={{ color: feature.color }}
                      />
                      <div className="text-white text-center text-sm">{feature.label}</div>
                    </div>
                  </motion.div>

                  {/* Arrow */}
                  {index < features.length - 1 && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.2 + 0.3 }}
                      viewport={{ once: true }}
                      className="mx-4"
                    >
                      <svg width="60" height="20" className="overflow-visible">
                        <defs>
                          <linearGradient id={`gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" style={{ stopColor: features[index].color, stopOpacity: 0.6 }} />
                            <stop offset="100%" style={{ stopColor: features[index + 1].color, stopOpacity: 0.6 }} />
                          </linearGradient>
                        </defs>
                        
                        {/* Animated line */}
                        <motion.line
                          x1="0"
                          y1="10"
                          x2="60"
                          y2="10"
                          stroke={`url(#gradient-${index})`}
                          strokeWidth="2"
                          initial={{ pathLength: 0 }}
                          whileInView={{ pathLength: 1 }}
                          transition={{ duration: 0.8, delay: index * 0.2 + 0.5 }}
                          viewport={{ once: true }}
                        />
                        
                        {/* Arrow head */}
                        <motion.polygon
                          points="55,5 60,10 55,15"
                          fill={features[index + 1].color}
                          opacity="0.6"
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 0.6 }}
                          transition={{ duration: 0.3, delay: index * 0.2 + 1 }}
                          viewport={{ once: true }}
                        />
                      </svg>
                    </motion.div>
                  )}
                </div>
              ))}
            </div>

            {/* Mobile view */}
            <div className="lg:hidden space-y-6">
              {features.map((feature, index) => (
                <div key={feature.label}>
                  <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="relative"
                  >
                    <div 
                      className="bg-[#0a1628] border-2 rounded-lg p-6 flex items-center gap-4"
                      style={{ borderColor: `${feature.color}40` }}
                    >
                      <div 
                        className="p-3 rounded-lg"
                        style={{ backgroundColor: `${feature.color}20` }}
                      >
                        <feature.icon 
                          className="h-8 w-8" 
                          style={{ color: feature.color }}
                        />
                      </div>
                      <div className="text-white">{feature.label}</div>
                    </div>
                  </motion.div>
                  
                  {index < features.length - 1 && (
                    <div className="flex justify-center my-2">
                      <ArrowRight 
                        className="h-6 w-6 rotate-90" 
                        style={{ color: feature.color }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom description */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1 }}
            viewport={{ once: true }}
            className="mt-16 text-center"
          >
            <p className="text-lg text-[#8b9bb1] max-w-3xl mx-auto">
              Every step is automated, logged, and traceable. From the moment a violation occurs to the insurance claim documentation, zero human intervention required.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
