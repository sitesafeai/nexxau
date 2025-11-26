import { Button } from "./ui/button";

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a1628]/90 backdrop-blur-sm border-b border-white/10">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/10 border border-white/20" />
            <span className="text-xl tracking-tight text-white">NEXXAU</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <a href="#home" className="text-[#8b9bb1] hover:text-white transition-colors">
              Home
            </a>
            <a href="#features" className="text-[#8b9bb1] hover:text-white transition-colors">
              Features
            </a>
            <a href="#industries" className="text-[#8b9bb1] hover:text-white transition-colors">
              Industries
            </a>
            <a href="#insurance" className="text-[#8b9bb1] hover:text-white transition-colors">
              For Insurance
            </a>
            <a href="#about" className="text-[#8b9bb1] hover:text-white transition-colors">
              About
            </a>
            <a href="#contact" className="text-[#8b9bb1] hover:text-white transition-colors">
              Contact
            </a>
          </nav>
          
          <Button className="bg-white text-[#0a1628] hover:bg-white/90">
            Request Demo
          </Button>
        </div>
      </div>
    </header>
  );
}