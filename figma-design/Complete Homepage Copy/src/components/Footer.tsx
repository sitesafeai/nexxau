export function Footer() {
  return (
    <footer className="bg-[#0a1628] border-t border-white/10 py-12">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/10 border border-white/20" />
              <span className="text-xl tracking-tight text-white">NEXXAU</span>
            </div>
            <p className="text-sm text-[#8b9bb1]">
              Autonomous Safety Enforcement for construction sites.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-white mb-4">Product</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-[#8b9bb1] hover:text-white transition-colors">
                  Capabilities
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-[#8b9bb1] hover:text-white transition-colors">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-[#8b9bb1] hover:text-white transition-colors">
                  Integration
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-[#8b9bb1] hover:text-white transition-colors">
                  API
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white mb-4">Company</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-[#8b9bb1] hover:text-white transition-colors">
                  About
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-[#8b9bb1] hover:text-white transition-colors">
                  Case Studies
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-[#8b9bb1] hover:text-white transition-colors">
                  Partners
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-[#8b9bb1] hover:text-white transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-white mb-4">Resources</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-[#8b9bb1] hover:text-white transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-[#8b9bb1] hover:text-white transition-colors">
                  Support
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-[#8b9bb1] hover:text-white transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-[#8b9bb1] hover:text-white transition-colors">
                  Terms of Service
                </a>
              </li>
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
  );
}
