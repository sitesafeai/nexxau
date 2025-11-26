import { Button } from "./ui/button";
import { Play, AlertTriangle, BarChart3 } from "lucide-react";
import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { AnimatedCounter } from "./AnimatedCounter";

export function Hero() {
  const [detections, setDetections] = useState<Array<{ id: number; type: string; x: number; y: number }>>([]);

  useEffect(() => {
    // Simulate random detections appearing
    const interval = setInterval(() => {
      const newDetection = {
        id: Date.now(),
        type: Math.random() > 0.5 ? 'hardhat' : 'vest',
        x: Math.random() * 80 + 10,
        y: Math.random() * 80 + 10,
      };
      
      setDetections(prev => [...prev.slice(-3), newDetection]);
      
      setTimeout(() => {
        setDetections(prev => prev.filter(d => d.id !== newDetection.id));
      }, 2000);
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-[#0a1628] pt-20">
      {/* Scanline effect */}
      <div className="scanline-effect absolute inset-0" />
      
      {/* Grid background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl lg:text-7xl tracking-tight text-white leading-[1.1]">
                Real-Time Safety Enforcement.<br />
                Zero Blind Spots.<br />
                Zero Excuses.
              </h1>
              <p className="text-xl text-[#8b9bb1] max-w-2xl">
                Your cameras become a 24/7 compliance officer that prevents PPE violations before they turn into accidents.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="bg-white text-[#0a1628] hover:bg-white/90">
                Request a Demo
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white/20 text-white hover:bg-white/10 hover:text-white"
              >
                <Play className="mr-2 h-4 w-4" />
                See Live Enforcement Feed
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white/20 text-white hover:bg-white/10 hover:text-white"
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Calculate Your Savings
              </Button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-6 pt-8">
              <motion.div 
                className="relative group cursor-pointer"
                whileHover={{ scale: 1.05 }}
              >
                <div className="absolute inset-0 bg-[#fbbf24] opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300" />
                <div className="relative bg-[#1e3a5f] border-2 border-[#fbbf24]/30 rounded-lg p-4 group-hover:border-[#fbbf24] transition-colors">
                  <div className="text-3xl text-white mb-1">
                    <AnimatedCounter end={2847} duration={2000} />
                  </div>
                  <div className="text-sm text-[#8b9bb1] mb-1">Violations Prevented</div>
                  <div className="text-xs text-[#fbbf24]/60">Updated weekly</div>
                </div>
              </motion.div>
              
              <motion.div 
                className="relative group cursor-pointer"
                whileHover={{ scale: 1.05 }}
              >
                <div className="absolute inset-0 bg-[#22c55e] opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300" />
                <div className="relative bg-[#1e3a5f] border-2 border-[#22c55e]/30 rounded-lg p-4 group-hover:border-[#22c55e] transition-colors">
                  <div className="text-3xl text-white mb-1">
                    <AnimatedCounter end={73} duration={2000} suffix="%" />
                  </div>
                  <div className="text-sm text-[#8b9bb1] mb-1">Incident Risk Reduced</div>
                  <div className="text-xs text-[#22c55e]/60">Updated weekly</div>
                </div>
              </motion.div>
              
              <motion.div 
                className="relative group cursor-pointer"
                whileHover={{ scale: 1.05 }}
              >
                <div className="absolute inset-0 bg-[#3b82f6] opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300" />
                <div className="relative bg-[#1e3a5f] border-2 border-[#3b82f6]/30 rounded-lg p-4 group-hover:border-[#3b82f6] transition-colors">
                  <div className="text-3xl text-white mb-1">
                    <AnimatedCounter end={97} duration={2000} suffix="%" />
                  </div>
                  <div className="text-sm text-[#8b9bb1] mb-1">Compliance Score</div>
                  <div className="text-xs text-[#3b82f6]/60">Updated weekly</div>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Right: Live Detection Demo */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="relative aspect-[4/3] bg-[#1e3a5f] rounded-lg overflow-hidden border border-white/20">
              {/* Camera feed simulation */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#1e3a5f] to-[#0a1628]">
                <div className="absolute inset-0 opacity-20">
                  <img 
                    src="https://images.unsplash.com/photo-1636790921342-cbdc4b783de6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25zdHJ1Y3Rpb24lMjBzaXRlJTIwd29ya2Vyc3xlbnwxfHx8fDE3NjM2MDcwNzB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                    alt=""
                    className="w-full h-full object-cover blur-sm"
                  />
                </div>
              </div>

              {/* HUD Overlay */}
              <div className="absolute inset-0 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#22c55e] rounded-full animate-pulse" />
                    <span className="text-xs text-white/60">LIVE ENFORCEMENT</span>
                  </div>
                  <span className="text-xs text-white/60 font-mono">
                    {new Date().toLocaleTimeString()}
                  </span>
                </div>

                {/* Detection boxes */}
                {detections.map((detection) => (
                  <motion.div
                    key={detection.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute"
                    style={{
                      left: `${detection.x}%`,
                      top: `${detection.y}%`,
                    }}
                  >
                    <div className="relative">
                      <div className={`w-20 h-20 ${detection.type === 'hardhat' ? 'border-[#fbbf24]' : 'border-[#ef4444]'} border-2 rounded`}>
                        <div className={`absolute -top-6 left-0 text-xs ${detection.type === 'hardhat' ? 'text-[#fbbf24]' : 'text-[#ef4444]'} whitespace-nowrap`}>
                          {detection.type === 'hardhat' ? 'NO HARDHAT' : 'NO VEST'}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Alert banner */}
              <motion.div
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.5, delay: 1 }}
                className="absolute bottom-0 left-0 right-0 bg-[#ef4444]/90 backdrop-blur-sm p-3"
              >
                <div className="flex items-center gap-2 text-white">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">ALERT DETECTED • 2 PPE violations identified • Enforcement triggered</span>
                </div>
              </motion.div>
            </div>

            {/* Status indicators */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-[#1e3a5f] border border-white/10 rounded p-3">
                <div className="text-[#22c55e] text-sm mb-1">ACTIVE</div>
                <div className="text-white text-xs">12 Cameras Online</div>
              </div>
              <div className="bg-[#1e3a5f] border border-white/10 rounded p-3">
                <div className="text-[#fbbf24] text-sm mb-1">MONITORING</div>
                <div className="text-white text-xs">47 Workers Tracked</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}