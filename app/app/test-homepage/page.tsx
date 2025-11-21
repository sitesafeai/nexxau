'use client';

import { useState, useEffect } from 'react';
import { Play, BarChart3, AlertTriangle, Eye, AlertCircle, TrendingDown, Shield, Bell, FileText, Activity, HardHat, Flame, Warehouse, Camera, Brain, FileCheck, Database, Zap, Quote, TrendingUp, CheckCircle, DollarSign, ArrowRight, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { ImageWithFallback } from '../components/ImageWithFallback';

interface Detection {
  id: number;
  type: string;
  x: number;
  y: number;
}

export default function TestHomepage() {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Update time on client only to avoid hydration mismatch
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString());
    };
    
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
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
    <div className="min-h-screen bg-[#0a1628]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a1628]/90 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/10 border border-white/20 rounded" />
              <span className="text-xl tracking-tight text-white font-bold">NEXXAU</span>
            </div>
            
            <nav className="hidden md:flex items-center gap-8">
              <a href="#home" className="text-[#8b9bb1] hover:text-white transition-colors text-sm">Home</a>
              <a href="#features" className="text-[#8b9bb1] hover:text-white transition-colors text-sm">Features</a>
              <a href="#industries" className="text-[#8b9bb1] hover:text-white transition-colors text-sm">Industries</a>
              <a href="#insurance" className="text-[#8b9bb1] hover:text-white transition-colors text-sm">For Insurance</a>
              <a href="#about" className="text-[#8b9bb1] hover:text-white transition-colors text-sm">About</a>
              <a href="#contact" className="text-[#8b9bb1] hover:text-white transition-colors text-sm">Contact</a>
            </nav>
            
            <button className="px-4 py-1.5 bg-white text-[#0a1628] hover:bg-white/90 rounded-lg transition-colors font-semibold text-sm">
              Request Demo
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center overflow-hidden bg-[#0a1628] pt-20">
          <div className="scanline-effect absolute inset-0" />
          
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
                className="space-y-6"
              >
                <div className="space-y-3">
                  <h1 className="text-4xl md:text-5xl lg:text-6xl tracking-tight text-white leading-[1.1]">
                    Real-Time Safety Enforcement.<br />
                    Zero Blind Spots.<br />
                    Zero Excuses.
                  </h1>
                  <p className="text-lg text-[#8b9bb1] max-w-2xl">
                    Your cameras become a 24/7 compliance officer that prevents PPE violations before they turn into accidents.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button className="px-5 py-2.5 bg-white text-[#0a1628] hover:bg-white/90 rounded-lg transition-colors font-semibold text-sm">
                    Request a Demo
                  </button>
                  <button className="px-5 py-2.5 border border-white/20 text-white hover:bg-white/10 hover:text-white rounded-lg transition-colors font-semibold text-sm flex items-center gap-2">
                    <Play className="h-3.5 w-3.5" />
                    See Live Enforcement Feed
                  </button>
                  <button className="px-5 py-2.5 border border-white/20 text-white hover:bg-white/10 hover:text-white rounded-lg transition-colors font-semibold text-sm flex items-center gap-2">
                    <BarChart3 className="h-3.5 w-3.5" />
                    Calculate Your Savings
                  </button>
                </div>

                {/* Metrics - Smaller */}
                <div className="grid grid-cols-3 gap-4 pt-6">
                  <motion.div 
                    className="relative group cursor-pointer"
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className="absolute inset-0 bg-[#fbbf24] opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300" />
                    <div className="relative bg-[#1e3a5f] border-2 border-[#fbbf24]/30 rounded-lg p-3 group-hover:border-[#fbbf24] transition-colors">
                      <div className="text-2xl text-white mb-1">
                        <AnimatedCounter end={2847} duration={2000} />
                      </div>
                      <div className="text-xs text-[#8b9bb1] mb-0.5">Violations Prevented</div>
                      <div className="text-[10px] text-[#fbbf24]/60">Updated weekly</div>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    className="relative group cursor-pointer"
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className="absolute inset-0 bg-[#22c55e] opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300" />
                    <div className="relative bg-[#1e3a5f] border-2 border-[#22c55e]/30 rounded-lg p-3 group-hover:border-[#22c55e] transition-colors">
                      <div className="text-2xl text-white mb-1">
                        <AnimatedCounter end={73} duration={2000} suffix="%" />
                      </div>
                      <div className="text-xs text-[#8b9bb1] mb-0.5">Incident Risk Reduced</div>
                      <div className="text-[10px] text-[#22c55e]/60">Updated weekly</div>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    className="relative group cursor-pointer"
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className="absolute inset-0 bg-[#3b82f6] opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300" />
                    <div className="relative bg-[#1e3a5f] border-2 border-[#3b82f6]/30 rounded-lg p-3 group-hover:border-[#3b82f6] transition-colors">
                      <div className="text-2xl text-white mb-1">
                        <AnimatedCounter end={97} duration={2000} suffix="%" />
                      </div>
                      <div className="text-xs text-[#8b9bb1] mb-0.5">Compliance Score</div>
                      <div className="text-[10px] text-[#3b82f6]/60">Updated weekly</div>
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
                  <div className="absolute inset-0 bg-gradient-to-br from-[#1e3a5f] to-[#0a1628]">
                    <div className="absolute inset-0 opacity-20">
                      <img 
                        src="https://images.unsplash.com/photo-1636790921342-cbdc4b783de6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25zdHJ1Y3Rpb24lMjBzaXRlJTIwd29ya2Vyc3xlbnwxfHx8fDE3NjM2MDcwNzB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                        alt=""
                        className="w-full h-full object-cover blur-sm"
                      />
                    </div>
                  </div>

                  <div className="absolute inset-0 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-[#22c55e] rounded-full animate-pulse" />
                        <span className="text-xs text-white/60">LIVE ENFORCEMENT</span>
                      </div>
                      <span className="text-xs text-white/60 font-mono">
                        {currentTime || '--:--:-- --'}
                      </span>
                    </div>

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

        {/* Problem Section */}
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

        {/* Visual Evidence Section */}
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
                      
                      <div className="absolute inset-0 grid grid-cols-2">
                        <div className="bg-[#ef4444]/20 flex items-center justify-center">
                          <div className="text-center">
                            <AlertCircle className="h-12 w-12 text-[#ef4444] mx-auto mb-2" />
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
                        <div className="relative">
                          <div className="w-32 h-40 border-2 border-[#22c55e] rounded relative">
                            <div className="absolute -top-6 left-0 text-xs text-[#22c55e] bg-[#0a1628] px-2 py-1 rounded">
                              WORKER DETECTED
                            </div>
                            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#22c55e]" />
                            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#22c55e]" />
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#22c55e]" />
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#22c55e]" />
                            
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
                      
                      <div className="absolute inset-0 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-[#ef4444] rounded-full animate-pulse" />
                            <span className="text-xs text-white/80 font-mono">REC</span>
                          </div>
                          <span className="text-xs text-white/60 font-mono">15:42:33</span>
                        </div>
                        
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

        {/* Feature Diagram Section */}
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

              <div className="hidden lg:flex items-center justify-between relative">
                {[
                  { icon: Camera, label: "Camera Feed", color: "#8b9bb1" },
                  { icon: Brain, label: "AI Detection", color: "#fbbf24" },
                  { icon: Shield, label: "Enforcement", color: "#ef4444" },
                  { icon: FileText, label: "Reports", color: "#22c55e" },
                  { icon: Building2, label: "Insurance Portal", color: "#3b82f6" },
                ].map((feature, index) => (
                  <div key={feature.label} className="flex items-center">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: index * 0.2 }}
                      viewport={{ once: true }}
                      className="relative group"
                    >
                      <div 
                        className="absolute inset-0 opacity-0 group-hover:opacity-30 blur-2xl transition-opacity duration-500"
                        style={{ backgroundColor: feature.color }}
                      />
                      
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

                    {index < 4 && (
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.2 + 0.3 }}
                        viewport={{ once: true }}
                        className="mx-4"
                      >
                        <ArrowRight className="h-6 w-6 text-white/40" />
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>

              <div className="lg:hidden space-y-6">
                {[
                  { icon: Camera, label: "Camera Feed", color: "#8b9bb1" },
                  { icon: Brain, label: "AI Detection", color: "#fbbf24" },
                  { icon: Shield, label: "Enforcement", color: "#ef4444" },
                  { icon: FileText, label: "Reports", color: "#22c55e" },
                  { icon: Building2, label: "Insurance Portal", color: "#3b82f6" },
                ].map((feature, index) => (
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
                    
                    {index < 4 && (
                      <div className="flex justify-center my-2">
                        <ArrowRight 
                          className="h-6 w-6 rotate-90 text-white/40" 
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

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

        {/* What We Do Section */}
        <section id="capabilities" className="relative py-24 bg-gradient-to-b from-[#0a1628] to-[#1e3a5f] border-t border-white/10">
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
                  <Shield className="h-5 w-5" />
                  <span className="text-sm uppercase tracking-wider">Autonomous Enforcement Engine</span>
                </div>
                <h2 className="text-4xl md:text-5xl text-white mb-4">
                  Real-time identification and enforcement
                </h2>
                <p className="text-xl text-[#8b9bb1] max-w-3xl mx-auto">
                  Nexxau analyzes every camera feed in real time to identify violations and enforce compliance automatically.
                </p>
              </div>

              <div className="mb-16">
                <h3 className="text-2xl text-white mb-8 text-center">We Identify</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { icon: HardHat, title: "Hardhat non-compliance", description: "Instant detection and logging" },
                    { icon: Shield, title: "High-visibility vest issues", description: "Real-time vest monitoring" },
                    { icon: Activity, title: "Entrance/exit compliance", description: "Full perimeter coverage" },
                    { icon: AlertTriangle, title: "Near-misses and risky behaviors", description: "Proactive risk identification" },
                  ].map((item, index) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      className="bg-[#0a1628] border border-white/20 rounded-lg p-6 hover:border-[#fbbf24] transition-colors"
                    >
                      <item.icon className="h-8 w-8 text-[#fbbf24] mb-4" />
                      <h4 className="text-white mb-2">{item.title}</h4>
                      <p className="text-sm text-[#8b9bb1]">{item.description}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="mb-12">
                <h3 className="text-2xl text-white mb-8 text-center">Every violation triggers</h3>
                <div className="grid md:grid-cols-3 gap-6">
                  {[
                    { icon: Bell, title: "Instant alerts", description: "Real-time notifications to site managers" },
                    { icon: FileText, title: "Logged incident timelines", description: "Automatic violation documentation" },
                    { icon: FileText, title: "Automated compliance reports", description: "Daily/weekly summaries delivered" },
                  ].map((item, index) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      className="bg-[#1e3a5f]/50 border border-white/10 rounded-lg p-6"
                    >
                      <div className="flex items-start gap-4">
                        <div className="bg-white/10 rounded p-2">
                          <item.icon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h4 className="text-white mb-1">{item.title}</h4>
                          <p className="text-sm text-[#8b9bb1]">{item.description}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="text-center border-t border-white/10 pt-12">
                <p className="text-2xl text-white">
                  No manual reviews. No guesswork. No excuses.
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Industry Selector Section */}
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
                {[
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
                ].map((industry, index) => (
                  <motion.div
                    key={industry.title}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="group relative"
                  >
                    <div 
                      className="absolute inset-0 opacity-0 group-hover:opacity-20 blur-3xl transition-opacity duration-500"
                      style={{ backgroundColor: industry.color }}
                    />
                    
                    <div className="relative bg-gradient-to-br from-[#1e3a5f] to-[#0a1628] border-2 border-white/10 rounded-lg p-8 h-full group-hover:border-white/30 transition-all duration-300">
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

                      <h3 className="text-2xl text-white mb-4">{industry.title}</h3>

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

                      <div className="absolute bottom-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{ background: `linear-gradient(to right, transparent, ${industry.color}, transparent)` }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>

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

        {/* Insurance Section */}
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
                {[
                  { icon: TrendingDown, title: "Lower premiums", description: "Proven risk reduction that insurers reward with premium discounts up to 30%" },
                  { icon: FileCheck, title: "Audit-ready documentation", description: "Every incident time-stamped and archived with visual evidence" },
                  { icon: Database, title: "Direct API integration", description: "Real-time data feeds to your insurance portal for instant verification" },
                  { icon: Shield, title: "Claims defense", description: "Irrefutable evidence to dispute fraudulent or exaggerated claims" },
                ].map((benefit, index) => (
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

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                viewport={{ once: true }}
                className="text-center mt-12"
              >
                <button className="px-6 py-3 bg-[#3b82f6] text-white hover:bg-[#3b82f6]/90 rounded-lg transition-colors font-semibold">
                  Partner with Nexxau
                </button>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Why It Matters Section */}
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
                {[
                  { icon: TrendingDown, title: "Reduce incidents", description: "Fewer violations → fewer injuries → lower claim exposure.", highlight: "73% reduction in safety incidents" },
                  { icon: Shield, title: "Reduce insurance premiums", description: "Insurers reward sites that eliminate risk. We give them the data they trust.", highlight: "Up to 30% premium reduction" },
                  { icon: FileCheck, title: "OSHA-proof documentation", description: "Every violation is time-stamped, captured, and archived automatically.", highlight: "100% audit-ready" },
                  { icon: Zap, title: "Zero operational friction", description: "No hardware swaps. No on-site installation headaches. Use the cameras you already have.", highlight: "Deploy in under 48 hours" },
                ].map((benefit, index) => (
                  <motion.div
                    key={benefit.title}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="group relative bg-gradient-to-br from-[#1e3a5f] to-[#0a1628] border border-white/10 rounded-lg p-8 hover:border-[#fbbf24] transition-all duration-300"
                  >
                    <div className="mb-6">
                      <div className="inline-flex p-3 bg-white/5 rounded-lg">
                        <benefit.icon className="h-8 w-8 text-[#fbbf24]" />
                      </div>
                    </div>

                    <h3 className="text-2xl text-white mb-3">{benefit.title}</h3>
                    <p className="text-[#8b9bb1] mb-4 leading-relaxed">
                      {benefit.description}
                    </p>

                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#fbbf24]/10 border border-[#fbbf24]/20 rounded">
                      <div className="w-1.5 h-1.5 bg-[#fbbf24] rounded-full" />
                      <span className="text-sm text-[#fbbf24]">{benefit.highlight}</span>
                    </div>

                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#fbbf24] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Proof Section */}
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

                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true }}
                  className="space-y-8"
                >
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

                  <div className="space-y-4 pt-8 border-t border-white/10">
                    {[
                      { label: "PPE Compliance Increase", value: "61% → 97%" },
                      { label: "Near-Miss Frequency Drop", value: "23%" },
                      { label: "Time to Full Compliance", value: "30 days" },
                    ].map((metric, index) => (
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

        {/* Pricing Section */}
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

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="bg-gradient-to-br from-[#1e3a5f] to-[#0a1628] border-2 border-[#fbbf24] rounded-lg p-12 relative overflow-hidden"
              >
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

                  <button className="px-6 py-3 bg-white text-[#0a1628] hover:bg-white/90 rounded-lg transition-colors font-semibold">
                    Get Custom Quote
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="relative py-32 bg-gradient-to-b from-[#0a1628] to-[#1e3a5f] border-t border-white/10 overflow-hidden">
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
                <button className="px-6 py-3 bg-white text-[#0a1628] hover:bg-white/90 rounded-lg transition-colors font-semibold flex items-center gap-2 group">
                  Request a Live Demo
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <button className="px-6 py-3 border border-white/20 text-white hover:bg-white/10 hover:text-white rounded-lg transition-colors font-semibold">
                  Talk to Sales
                </button>
              </div>

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
      </main>

      {/* Footer */}
      <footer className="bg-[#0a1628] border-t border-white/10 py-12">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/10 border border-white/20 rounded" />
                <span className="text-xl tracking-tight text-white font-bold">NEXXAU</span>
              </div>
              <p className="text-sm text-[#8b9bb1]">
                Autonomous Safety Enforcement for construction sites.
              </p>
            </div>

            <div>
              <h4 className="text-white mb-4">Product</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-[#8b9bb1] hover:text-white transition-colors">Capabilities</a></li>
                <li><a href="#" className="text-sm text-[#8b9bb1] hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="text-sm text-[#8b9bb1] hover:text-white transition-colors">Integration</a></li>
                <li><a href="#" className="text-sm text-[#8b9bb1] hover:text-white transition-colors">API</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-[#8b9bb1] hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="text-sm text-[#8b9bb1] hover:text-white transition-colors">Case Studies</a></li>
                <li><a href="#" className="text-sm text-[#8b9bb1] hover:text-white transition-colors">Partners</a></li>
                <li><a href="#" className="text-sm text-[#8b9bb1] hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white mb-4">Resources</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-[#8b9bb1] hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="text-sm text-[#8b9bb1] hover:text-white transition-colors">Support</a></li>
                <li><a href="#" className="text-sm text-[#8b9bb1] hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-sm text-[#8b9bb1] hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-[#8b9bb1]">
                © 2024 Nexxau. All rights reserved.
              </p>
              <p className="text-xs text-[#8b9bb1]">
                Autonomous Safety Enforcement™ is a registered trademark of Nexxau, Inc.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
