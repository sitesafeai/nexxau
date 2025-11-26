import { motion } from "motion/react";
import { CheckCircle, XCircle, Eye, AlertTriangle } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export function VisualEvidenceSection() {
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
            <div className="inline-flex items-center gap-2 text-[#22c55e] mb-4">
              <Eye className="h-5 w-5" />
              <span className="text-sm uppercase tracking-wider">Visual Evidence</span>
            </div>
            <h2 className="text-4xl md:text-5xl text-white mb-4">
              See the difference in real time
            </h2>
            <p className="text-xl text-[#8b9bb1] max-w-3xl mx-auto">
              Every detection is captured, logged, and archived with visual proof that stands up to audits and insurance reviews.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Before/After Compliance */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="group"
            >
              <div className="bg-gradient-to-br from-[#1e3a5f] to-[#0a1628] border border-white/10 rounded-lg overflow-hidden hover:border-[#fbbf24] transition-all duration-300">
                <div className="aspect-[4/3] relative overflow-hidden">
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1636790921342-cbdc4b783de6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25zdHJ1Y3Rpb24lMjBzaXRlJTIwd29ya2Vyc3xlbnwxfHx8fDE3NjM2MDcwNzB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                    alt="Construction compliance"
                    className="w-full h-full object-cover blur-sm opacity-50"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628] via-transparent to-transparent" />
                  
                  {/* Split overlay */}
                  <div className="absolute inset-0 grid grid-cols-2">
                    <div className="bg-[#ef4444]/20 flex items-center justify-center">
                      <div className="text-center">
                        <XCircle className="h-12 w-12 text-[#ef4444] mx-auto mb-2" />
                        <div className="text-white">Before</div>
                        <div className="text-3xl text-[#ef4444]">61%</div>
                      </div>
                    </div>
                    <div className="bg-[#22c55e]/20 flex items-center justify-center border-l-2 border-white">
                      <div className="text-center">
                        <CheckCircle className="h-12 w-12 text-[#22c55e] mx-auto mb-2" />
                        <div className="text-white">After</div>
                        <div className="text-3xl text-[#22c55e]">97%</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-white mb-2">Before/After Compliance</h3>
                  <p className="text-sm text-[#8b9bb1]">
                    Measurable improvement in PPE compliance rates within 30 days of deployment.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Worker Detection */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="group"
            >
              <div className="bg-gradient-to-br from-[#1e3a5f] to-[#0a1628] border border-white/10 rounded-lg overflow-hidden hover:border-[#fbbf24] transition-all duration-300">
                <div className="aspect-[4/3] relative overflow-hidden bg-gradient-to-br from-[#1e3a5f] to-[#0a1628]">
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1757861235381-27e8890f7a56?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmR1c3RyaWFsJTIwY29uc3RydWN0aW9uJTIwaGFyZGhhdHxlbnwxfHx8fDE3NjM2MTM4NjV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                    alt="Worker detection"
                    className="w-full h-full object-cover blur-sm opacity-40"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    {/* Detection box */}
                    <div className="relative">
                      <div className="w-32 h-40 border-2 border-[#22c55e] rounded relative">
                        <div className="absolute -top-6 left-0 text-xs text-[#22c55e] bg-[#0a1628] px-2 py-1 rounded">
                          WORKER DETECTED
                        </div>
                        {/* Corner markers */}
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#22c55e]" />
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#22c55e]" />
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#22c55e]" />
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#22c55e]" />
                        
                        {/* PPE indicators */}
                        <div className="absolute -right-24 top-4 space-y-2">
                          <div className="flex items-center gap-2 bg-[#0a1628]/90 px-2 py-1 rounded border border-[#22c55e]">
                            <CheckCircle className="h-3 w-3 text-[#22c55e]" />
                            <span className="text-xs text-white">HARDHAT</span>
                          </div>
                          <div className="flex items-center gap-2 bg-[#0a1628]/90 px-2 py-1 rounded border border-[#22c55e]">
                            <CheckCircle className="h-3 w-3 text-[#22c55e]" />
                            <span className="text-xs text-white">VEST</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-white mb-2">Real-Time Detection</h3>
                  <p className="text-sm text-[#8b9bb1]">
                    Every worker is tracked with instant PPE compliance verification and alerts.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Live Camera Feed */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="group"
            >
              <div className="bg-gradient-to-br from-[#1e3a5f] to-[#0a1628] border border-white/10 rounded-lg overflow-hidden hover:border-[#fbbf24] transition-all duration-300">
                <div className="aspect-[4/3] relative overflow-hidden">
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1751054579530-1481ddd4b753?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25zdHJ1Y3Rpb24lMjBzYWZldHklMjBlcXVpcG1lbnR8ZW58MXx8fHwxNzYzNjA5ODY5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                    alt="Live camera feed"
                    className="w-full h-full object-cover blur-md opacity-30"
                  />
                  <div className="absolute inset-0 bg-[#0a1628]/60" />
                  
                  {/* HUD overlay */}
                  <div className="absolute inset-0 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-[#ef4444] rounded-full animate-pulse" />
                        <span className="text-xs text-white/80 font-mono">REC</span>
                      </div>
                      <span className="text-xs text-white/60 font-mono">15:42:33</span>
                    </div>
                    
                    {/* Violation alerts */}
                    <div className="absolute bottom-4 left-4 right-4 space-y-2">
                      <div className="bg-[#ef4444]/90 backdrop-blur-sm border border-[#ef4444] rounded p-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-white" />
                          <span className="text-xs text-white">PPE VIOLATION: No hardhat detected</span>
                        </div>
                      </div>
                      <div className="bg-[#fbbf24]/90 backdrop-blur-sm border border-[#fbbf24] rounded p-2">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-white" />
                          <span className="text-xs text-white">Alert sent to site manager</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-white mb-2">Live Monitoring Feed</h3>
                  <p className="text-sm text-[#8b9bb1]">
                    Continuous analysis with automatic logging and instant alert dispatch.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}