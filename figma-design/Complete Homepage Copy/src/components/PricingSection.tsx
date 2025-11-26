import { motion } from "motion/react";
import { DollarSign, CheckCircle } from "lucide-react";
import { Button } from "./ui/button";

export function PricingSection() {
  return (
    <section id="pricing" className="relative py-24 bg-[#0a1628] border-t border-white/10">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 text-[#22c55e] mb-4">
            <DollarSign className="h-5 w-5" />
            <span className="text-sm uppercase tracking-wider">Pricing</span>
          </div>

          <h2 className="text-4xl md:text-5xl text-white mb-6">
            Simple, scalable, guaranteed
          </h2>

          <p className="text-xl text-[#8b9bb1] mb-12">
            Simple, scalable subscription based on worksites and cameras.
          </p>

          {/* Pricing Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-[#1e3a5f] to-[#0a1628] border-2 border-[#fbbf24] rounded-lg p-12 relative overflow-hidden"
          >
            {/* Accent corner */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#fbbf24]/10 blur-3xl" />
            
            <div className="relative z-10">
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-full mb-6">
                  <CheckCircle className="h-4 w-4 text-[#22c55e]" />
                  <span className="text-sm text-[#22c55e]">ROI Guarantee</span>
                </div>
                
                <h3 className="text-3xl text-white mb-4">
                  ROI guaranteed in 90 days — or you don't pay.
                </h3>
                
                <p className="text-[#8b9bb1] max-w-2xl mx-auto">
                  We're confident in our impact. If you don't see measurable ROI in the first 90 days, you owe us nothing.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="text-left p-6 bg-white/5 rounded-lg border border-white/10">
                  <div className="text-white mb-2">Transparent Scaling</div>
                  <p className="text-sm text-[#8b9bb1]">Enterprise pricing with predictable scaling based on your site requirements</p>
                </div>
                
                <div className="text-left p-6 bg-white/5 rounded-lg border border-white/10">
                  <div className="text-white mb-2">No Hidden Fees</div>
                  <p className="text-sm text-[#8b9bb1]">Complete pricing transparency. No installation costs.</p>
                </div>
                
                <div className="text-left p-6 bg-white/5 rounded-lg border border-white/10">
                  <div className="text-white mb-2">Enterprise Support</div>
                  <p className="text-sm text-[#8b9bb1]">Dedicated success team and 24/7 technical support</p>
                </div>
              </div>

              <Button size="lg" className="bg-white text-[#0a1628] hover:bg-white/90">
                Get Custom Quote
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}