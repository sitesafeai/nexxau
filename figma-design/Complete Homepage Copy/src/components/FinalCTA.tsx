import { motion } from "motion/react";
import { Button } from "./ui/button";
import { ArrowRight, Shield } from "lucide-react";

export function FinalCTA() {
  return (
    <section className="relative py-32 bg-gradient-to-b from-[#0a1628] to-[#1e3a5f] border-t border-white/10 overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#fbbf24]/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <div className="mb-8">
            <div className="inline-flex p-4 bg-white/5 rounded-full mb-6">
              <Shield className="h-12 w-12 text-[#fbbf24]" />
            </div>
            
            <h2 className="text-5xl md:text-6xl text-white mb-6">
              Stop reacting to accidents.
              <br />
              Start preventing them.
            </h2>
            
            <p className="text-xl text-[#8b9bb1] mb-12 max-w-2xl mx-auto">
              Request a live demo today and see how Nexxau eliminates PPE violations before they become incidents.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button size="lg" className="bg-white text-[#0a1628] hover:bg-white/90 group">
              Request a Live Demo
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-white/20 text-white hover:bg-white/10 hover:text-white"
            >
              Talk to Sales
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap justify-center items-center gap-8 pt-12 border-t border-white/10">
            <div className="flex items-center gap-2 text-[#8b9bb1]">
              <div className="w-2 h-2 bg-[#22c55e] rounded-full" />
              <span className="text-sm">No hardware installation</span>
            </div>
            <div className="flex items-center gap-2 text-[#8b9bb1]">
              <div className="w-2 h-2 bg-[#22c55e] rounded-full" />
              <span className="text-sm">Deploy in 48 hours</span>
            </div>
            <div className="flex items-center gap-2 text-[#8b9bb1]">
              <div className="w-2 h-2 bg-[#22c55e] rounded-full" />
              <span className="text-sm">90-day ROI guarantee</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
