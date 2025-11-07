import { motion, useScroll, useSpring, useTransform, useInView } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { ccc } from "@ckb-ccc/connector-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Sparkles, Lock, Gift, Globe, Coins, AlertTriangle, 
  Flame, ShoppingCart, Send, Calendar, Zap, Vote, 
  DollarSign, Building2, TrendingDown, Users, Cpu, 
  Rocket, ChevronDown, ExternalLink, HelpCircle, Trophy, Palette, Menu, X
} from "lucide-react";
import { getTierColor, getContrastingTextColor, type PixelTier } from "@shared/canvas-utils";
import { formatCKB } from "@/utils/formatting";
import { useLocation } from "wouter";
import ckbEcoFundLogo from "@assets/rkDnocbU_400x400_1760975756377.jpg";

// Sticky Navigation Component
function StickyNav() {
  const [activeSection, setActiveSection] = useState("hero");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const sections = [
    { id: "hero", label: "Home" },
    { id: "story", label: "Story" },
    { id: "how-it-works", label: "How It Works" },
    { id: "critical-notice", label: "Notice" },
    { id: "faq", label: "FAQ" },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100;
      const orderedSections = [...sections].reverse();

      let foundSection = false;
      for (const section of orderedSections) {
        const element = document.getElementById(section.id);
        if (element && element.offsetTop <= scrollPosition) {
          setActiveSection(section.id);
          foundSection = true;
          break;
        }
      }

      // Default to first section if scrolled to top
      if (!foundSection) {
        setActiveSection(sections[0].id);
      }
    };

    handleScroll(); // Set initial active section on mount
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: elementPosition - offset,
        behavior: "smooth"
      });
      setIsMenuOpen(false);
    }
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:block fixed top-4 left-1/2 -translate-x-1/2 z-40 bg-black/80 backdrop-blur-md border border-white/10 rounded-full px-6 py-3">
        <div className="flex gap-6">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={`text-sm font-medium transition-colors relative ${
                activeSection === section.id
                  ? "text-[#DBAB00]"
                  : "text-gray-400 hover:text-white"
              }`}
              data-testid={`nav-link-${section.id}`}
            >
              {section.label}
              {activeSection === section.id && (
                <motion.div
                  layoutId="activeSection"
                  className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#DBAB00]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed top-4 right-4 z-40">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="bg-black/80 backdrop-blur-md border border-white/10 rounded-full p-3"
          data-testid="button-mobile-menu"
        >
          {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="md:hidden fixed top-16 right-4 z-40 bg-black/95 backdrop-blur-md border border-white/10 rounded-2xl p-4 min-w-[200px]"
        >
          <div className="flex flex-col gap-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`text-left px-4 py-2 rounded-lg transition-colors ${
                  activeSection === section.id
                    ? "bg-[#DBAB00]/20 text-[#DBAB00]"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
                data-testid={`nav-mobile-link-${section.id}`}
              >
                {section.label}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </>
  );
}

export default function Landing() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black text-white">
      {/* Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#DBAB00] via-[#FFBDFC] to-[#09D3FF] z-50"
        style={{ scaleX, transformOrigin: "0%" }}
      />

      {/* Sticky Navigation */}
      <StickyNav />

      {/* Hero Section */}
      <HeroSection />

      {/* Founder Story Section */}
      <FounderStorySection />

      {/* How It Works (Consolidated) */}
      <HowItWorksSection />

      {/* Critical Notice */}
      <CriticalNoticeSection />

      {/* FAQ */}
      <FAQSection />

      {/* Final CTA */}
      <FinalCTASection />
    </div>
  );
}

// Hero Section Component
function HeroSection() {
  const ref = useRef(null);
  const [mintedCount, setMintedCount] = useState(0);
  const [ckbLocked, setCkbLocked] = useState(0);
  const [activeFounders, setActiveFounders] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const { open } = ccc.useCcc();
  const signer = ccc.useSigner();
  const [, setLocation] = useLocation();
  
  const { data: stats } = useQuery<{ 
    claimedPixels: number;
    totalCKBLocked: number;
    activeFounders: number;
  }>({
    queryKey: ['/api/stats'],
  });

  useEffect(() => {
    if (stats) {
      setMintedCount(stats.claimedPixels || 0);
      setCkbLocked(stats.totalCKBLocked || 0);
      setActiveFounders(stats.activeFounders || 0);
    }
  }, [stats]);

  // Auto-navigate to /app when wallet connects
  useEffect(() => {
    if (signer && isConnecting) {
      setIsConnecting(false);
      setLocation('/app');
    }
  }, [signer, isConnecting, setLocation]);

  // Reset connecting state if user dismisses modal without connecting
  useEffect(() => {
    if (isConnecting && !signer) {
      const timeout = setTimeout(() => {
        setIsConnecting(false);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [isConnecting, signer]);

  const handleConnectAndNavigate = async () => {
    if (signer) {
      // Already connected, go straight to app
      setLocation('/app');
    } else {
      // Not connected, trigger wallet connection
      setIsConnecting(true);
      open();
    }
  };

  return (
    <section 
      id="hero"
      ref={ref}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      data-testid="section-hero"
    >
      {/* Animated Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808033_1px,transparent_1px),linear-gradient(to_bottom,#80808033_1px,transparent_1px)] bg-[size:24px_24px]" />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black" />

      {/* Floating Particles */}
      <FloatingParticles />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.h1 
            className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4 md:mb-6 bg-clip-text text-transparent bg-gradient-to-r from-[#DBAB00] via-[#FFBDFC] to-[#09D3FF]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Be One of 2,500 Founders
          </motion.h1>

          <motion.p 
            className="text-lg md:text-xl lg:text-2xl text-gray-300 mb-3 md:mb-4 max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Claim Territory → Participate → Govern → Build Community
          </motion.p>

          <motion.p
            className="text-base md:text-lg text-gray-400 mb-8 md:mb-12 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Claim your pixel and earn governance power to shape the future together
          </motion.p>

          {/* Live Stats */}
          <motion.div
            className="flex flex-wrap justify-center gap-1.5 sm:gap-2 md:gap-4 mb-6 md:mb-8 px-2"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 }}
          >
            {/* Pixels Minted */}
            <div className="inline-flex items-center gap-1 sm:gap-1.5 md:gap-3 px-2 sm:px-3 md:px-6 py-1.5 sm:py-2 md:py-3 bg-white/5 backdrop-blur-sm rounded-full border border-white/10">
              <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-5 md:w-5 text-[#DBAB00] flex-shrink-0" />
              <span className="text-sm sm:text-base md:text-2xl font-bold whitespace-nowrap" data-testid="text-minted-count">
                {mintedCount} / 2,500
              </span>
              <span className="text-[9px] sm:text-xs md:text-base text-gray-400">Minted</span>
            </div>

            {/* Total CKB Locked */}
            <div className="inline-flex items-center gap-1 sm:gap-1.5 md:gap-3 px-2 sm:px-3 md:px-6 py-1.5 sm:py-2 md:py-3 bg-white/5 backdrop-blur-sm rounded-full border border-white/10">
              <Lock className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-5 md:w-5 text-[#FFBDFC] flex-shrink-0" />
              <span className="text-sm sm:text-base md:text-2xl font-bold whitespace-nowrap" data-testid="text-ckb-locked">
                {formatCKB(ckbLocked)}
              </span>
              <span className="text-[9px] sm:text-xs md:text-base text-gray-400">Locked</span>
            </div>

            {/* Active Founders */}
            <div className="inline-flex items-center gap-1 sm:gap-1.5 md:gap-3 px-2 sm:px-3 md:px-6 py-1.5 sm:py-2 md:py-3 bg-white/5 backdrop-blur-sm rounded-full border border-white/10">
              <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-5 md:w-5 text-[#09D3FF] flex-shrink-0" />
              <span className="text-sm sm:text-base md:text-2xl font-bold whitespace-nowrap" data-testid="text-active-founders">
                {activeFounders}
              </span>
              <span className="text-[9px] sm:text-xs md:text-base text-gray-400">Founders</span>
            </div>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
          >
            <Button
              size="lg"
              onClick={handleConnectAndNavigate}
              disabled={isConnecting}
              className="bg-gradient-to-r from-[#DBAB00] to-[#FFBDFC] hover:opacity-90 text-black font-bold px-6 md:px-8 py-5 md:py-6 text-base md:text-lg rounded-xl shadow-lg shadow-[#DBAB00]/50 hover:shadow-[#DBAB00]/70 transition-all disabled:opacity-50"
              data-testid="button-hero-cta"
            >
              <Rocket className="mr-2 h-4 w-4 md:h-5 md:w-5" />
              {isConnecting ? 'Connecting...' : signer ? 'Go to App' : 'Connect & Start'}
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="border-white/20 hover:bg-white/10 px-6 md:px-8 py-5 md:py-6 text-base md:text-lg rounded-xl"
              data-testid="button-learn-more"
              onClick={() => {
                document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Learn More
              <ChevronDown className="ml-2 h-4 w-4 md:h-5 md:w-5" />
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// Floating Particles Component
function FloatingParticles() {
  const particles = Array.from({ length: 20 });
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-gradient-to-r from-[#DBAB00] to-[#09D3FF] rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, Math.random() * 20 - 10, 0],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}
    </div>
  );
}

// Founder Story Section - Creation Myth
function FounderStorySection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="story" ref={ref} className="py-16 md:py-32 relative overflow-hidden bg-gradient-to-b from-black via-gray-950/50 to-black">
      {/* Subtle Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="max-w-4xl mx-auto"
        >
          {/* The Myth */}
          <div className="space-y-8 md:space-y-10">
            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1 }}
              className="text-center mb-8 md:mb-12"
            >
              <h2 className="text-3xl md:text-5xl font-bold mb-3 leading-tight">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#DBAB00] via-[#FFBDFC] to-[#09D3FF]">
                  The Legend of Eternal Land
                </span>
              </h2>
              <p className="text-base md:text-lg text-gray-400 italic mt-4">An allegory of governance and covenant</p>
            </motion.div>

            {/* The Beginning */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <p className="text-xl md:text-2xl text-gray-300 leading-relaxed font-light">
                <span className="text-[#DBAB00] font-semibold">In the beginning</span>, there was Eternal Land:
                <br />
                a grid of <span className="text-white">2,500 coordinates</span> waiting in the void.
              </p>
            </motion.div>

            {/* The Covenant */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.3 }}
              className="p-6 md:p-8 bg-gradient-to-br from-white/5 to-transparent border-l-4 border-[#FFBDFC] rounded-r-lg"
            >
              <p className="text-base md:text-lg text-gray-300 leading-relaxed mb-4">
                The Architects spoke:
              </p>
              <div className="space-y-3 text-base md:text-lg text-gray-200 italic pl-4 border-l-2 border-white/20">
                <p className="leading-relaxed">"Let there be 2,500 pixels, and no more."</p>
                <p className="leading-relaxed">"Each who claims a coordinate must lock their value within it."</p>
                <p className="leading-relaxed">"Those who commit shall govern what emerges from this land."</p>
                <p className="leading-relaxed">"And let the land be divided into four sacred tiers: Legendary, Epic, Rare, and Common."</p>
              </div>
            </motion.div>

            {/* The Rules */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.4 }}
              className="p-6 md:p-8 bg-gradient-to-br from-[#09D3FF]/10 to-transparent border border-white/10 rounded-lg"
            >
              <p className="text-lg md:text-xl text-white font-semibold mb-4 text-center">The Sacred Laws</p>
              <div className="space-y-3 text-base md:text-lg text-gray-300">
                <p className="leading-relaxed">
                  ⚡ <span className="text-white font-medium">One soul, one pixel.</span> No matter how mighty or humble, each may claim but a single coordinate.
                </p>
                <p className="leading-relaxed">
                  ⚡ <span className="text-white font-medium">Value must be locked.</span> True commitment requires CKB to be bound to the coordinate until it is released.
                </p>
                <p className="leading-relaxed">
                  ⚡ <span className="text-white font-medium">Early founders are rewarded.</span> Those who arrive in winter earn twice what those in spring shall receive.
                </p>
                <p className="leading-relaxed">
                  ⚡ <span className="text-white font-medium">Only founders govern.</span> The tokens granted are not for trade, but for voice in what shall be built.
                </p>
              </div>
            </motion.div>

            {/* The Snapshot */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.6 }}
              className="p-6 md:p-8 bg-gradient-to-br from-[#DBAB00]/10 via-transparent to-[#09D3FF]/10 border-2 border-[#DBAB00]/30 rounded-lg"
            >
              <p className="text-lg md:text-xl text-white font-semibold mb-3 text-center">
                The Day of Reckoning
              </p>
              <p className="text-base md:text-lg text-gray-300 leading-relaxed text-center">
                On <span className="text-[#DBAB00] font-semibold">March 31, 2026, at the final hour</span>, the ledger shall freeze.
                <br />
                Those who committed shall be counted. Those who waited shall be forgotten.
                <br />
                <span className="text-white font-medium">2,500 founders. No more. No less.</span>
              </p>
            </motion.div>

            {/* The Call */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.7 }}
              className="text-center pt-8 border-t border-white/10 mt-8"
            >
              <p className="text-lg md:text-xl text-[#FFBDFC] font-semibold mb-4">
                This story is still being written.
              </p>
              <p className="text-xl md:text-2xl text-[#DBAB00] font-bold">
                Will you be one of the 2,500?
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// How It Works - Consolidated Section
function HowItWorksSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const tiers = [
    { name: "Legendary", count: 85, price: "100,000", multiplier: "4.0x", color: "#DBAB00" },
    { name: "Epic", count: 228, price: "50,000", multiplier: "2.5x", color: "#FFBDFC" },
    { name: "Rare", count: 528, price: "25,000", multiplier: "1.5x", color: "#09D3FF" },
    { name: "Common", count: 1659, price: "5,000", multiplier: "1.0x", color: "#FFFFFF" }
  ];

  return (
    <section id="how-it-works" ref={ref} className="py-16 md:py-32 bg-gradient-to-b from-black to-gray-950" data-testid="section-how-it-works">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-12 md:mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-3 md:mb-4">How It Works</h2>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
            Mint pixels, earn governance power, shape the future
          </p>
        </motion.div>

        {/* Three Core Concepts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 h-full">
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 rounded-full bg-[#DBAB00]/20 border-2 border-[#DBAB00] flex items-center justify-center mx-auto mb-3">
                  <Lock className="h-6 w-6 text-[#DBAB00]" />
                </div>
                <h3 className="text-lg font-bold mb-2">Mint Your Pixel</h3>
                <p className="text-sm text-gray-400">Choose a coordinate, lock CKB, mint as Spore NFT. One pixel per wallet.</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 h-full">
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 rounded-full bg-[#FFBDFC]/20 border-2 border-[#FFBDFC] flex items-center justify-center mx-auto mb-3">
                  <Vote className="h-6 w-6 text-[#FFBDFC]" />
                </div>
                <h3 className="text-lg font-bold mb-2">Earn Governance Power</h3>
                <p className="text-sm text-gray-400">Points accumulate daily until March 31, 2026 snapshot. Early minters earn 2x.</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 h-full">
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 rounded-full bg-[#09D3FF]/20 border-2 border-[#09D3FF] flex items-center justify-center mx-auto mb-3">
                  <Users className="h-6 w-6 text-[#09D3FF]" />
                </div>
                <h3 className="text-lg font-bold mb-2">Shape the Future</h3>
                <p className="text-sm text-gray-400">Join 2,500 founders to vote on features, partnerships, and Territory Wars.</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Four Tiers */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.4 }}
          className="max-w-4xl mx-auto"
        >
          <h3 className="text-2xl font-bold text-center mb-8">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#DBAB00] via-[#FFBDFC] to-[#09D3FF]">
              Four Tiers, Four Strategies
            </span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tiers.map((tier, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.5 + index * 0.1 }}
              >
                <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-lg font-bold" style={{ color: tier.color }}>{tier.name}</h4>
                      <span className="text-sm font-semibold text-gray-400">{tier.count} pixels</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-400">
                      <span>{tier.price} CKB</span>
                      <span className="font-semibold" style={{ color: tier.color }}>{tier.multiplier} points</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-400 mt-6">
            Higher tiers = more governance power. Center pixels cost more, earn more influence.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

// Critical Notice - Condensed Section  
function CriticalNoticeSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="critical-notice" ref={ref} className="py-16 md:py-24 relative" data-testid="section-critical-notice">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="max-w-4xl mx-auto"
        >
          <Card className="bg-gradient-to-br from-red-500/10 via-yellow-500/5 to-transparent border-2 border-yellow-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-6">
                <AlertTriangle className="h-8 w-8 text-yellow-500 flex-shrink-0" />
                <h2 className="text-2xl md:text-3xl font-bold">Important Information</h2>
              </div>
              
              <div className="space-y-4 text-sm md:text-base">
                <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <Flame className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-400 mb-1">Melting Removes Governance Power</p>
                    <p className="text-gray-300">Melting your pixel permanently removes all accumulated governance points and airdrop eligibility.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <ShoppingCart className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-400 mb-1">Secondary Holders Earn 25% Points</p>
                    <p className="text-gray-300">Buying pixels on secondary markets grants ownership but only 25% governance points (vs 100% for original minters).</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <DollarSign className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-yellow-400 mb-1">Governance Tokens = Voting Power Only</p>
                    <p className="text-gray-300">Governance tokens are NOT investment vehicles. Team has no DEX listing plans. They grant voting power for protocol decisions.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}

// FAQ Section
function FAQSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [openCategory, setOpenCategory] = useState<string | null>("getting-started");
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);

  const faqCategories = [
    {
      id: "getting-started",
      title: "Getting Started",
      icon: HelpCircle,
      color: "#09D3FF",
      faqs: [
        {
          id: "wallets",
          q: "What wallets are supported?",
          a: "You can connect using JoyID, MetaMask, or UTXOGlobal wallets."
        },
        {
          id: "blockchain",
          q: "What blockchain is this on?",
          a: "SoMo is built on Nervos CKB blockchain using the Spore Protocol for NFTs. All pixels are DOB/0 compliant digital collectibles."
        },
        {
          id: "tier-counts",
          q: "How many total pixels exist for each tier?",
          a: "There are 85 Legendary pixels, 228 Epic pixels, 528 Rare pixels, and 1,659 Common pixels (2,500 total)."
        },
        {
          id: "key-dates",
          q: "What are the key dates?",
          a: "Minting Opens: December 1, 2025. Snapshot Date: March 31, 2026 at 11:59 PM UTC (point accumulation stops). Governance Token Launch & Airdrop: Q1 2026. Territory Wars Launch: Q2 2026."
        }
      ]
    },
    {
      id: "governance-tokens",
      title: "Governance & Tokens",
      icon: Trophy,
      color: "#DBAB00",
      faqs: [
        {
          id: "points-calculation",
          q: "How are points calculated?",
          a: "Points accumulate daily based on three multipliers: Base Points × Monthly Multiplier × Tier Multiplier. Your tier (Legendary 4x, Epic 2.5x, Rare 1.5x, Common 1x) and mint month determine your daily earnings."
        },
        {
          id: "conversion-rate",
          q: "What's the points-to-token conversion?",
          a: "Every 4 points equals 1 governance token. The total pool is 1.4 billion points for 350 million tokens."
        },
        {
          id: "influence-score",
          q: "What is Influence Score and how is it calculated?",
          a: "Influence Score is separate from governance points and represents your strategic power on the canvas. It's calculated as: (Locked CKB ÷ 1,000) × Location Multiplier × (1 + Territory Bonus) + Color Bonus. Location multipliers: Legendary 1.5x, Epic 1.4x, Rare 1.2x, Common 1.0x. Territory bonus: +10% for each adjacent pixel you own (max +80% for 8 neighbors). Epic pixels get +5 bonus points for their rare color. Example: A Legendary pixel (100,000 CKB) with 3 adjacent pixels = 195 influence. Currently used for Leaderboard rankings, and will power Territory Wars gameplay launching Q2 2026."
        },
        {
          id: "monthly-multipliers",
          q: "How do the monthly multipliers work?",
          a: "Points earned per day are multiplied by the month you're minting in. Earlier participation earns more: December 2025 (2.0x), January 2026 (1.5x), February 2026 (1.25x), March 2026 (1.0x). Example: A Common pixel minted in December earns ~4,756 points/day, while the same pixel minted in March earns ~2,378 points/day."
        },
        {
          id: "token-trading",
          q: "Can the governance token be traded on exchanges?",
          a: "The team has no plans to list the governance token on DEX for now. The token is designed for governance participation."
        },
        {
          id: "snapshot",
          q: "What's the snapshot date?",
          a: "March 31, 2026 at 11:59 PM UTC. After this, point accumulation stops and tokens are distributed shortly after."
        },
        {
          id: "after-snapshot",
          q: "What happens after the snapshot?",
          a: "Phase 2 introduces Citizen Cards with unlimited supply and dynamic pricing. Revenue goes to the Treasury with an 80/20 split: 80% distributed proportionally to founders based on governance tokens held (higher tier = more tokens = larger share), and 20% distributed equally among all Citizen Card holders. This creates perpetual passive income for everyone - founders earn the lion's share through their governance tokens, while citizens participate with equal rewards. Your pixel becomes a long-term income-generating governance position, not just a one-time NFT."
        },
        {
          id: "territory-wars",
          q: "What exactly are Territory Wars?",
          a: "Territory Wars is the upcoming Phase 2 gameplay feature launching Q2 2026. It will use your Influence Score to enable strategic competition on the canvas. Players with higher influence (from more locked CKB, better locations, adjacent pixels, and rare colors) will have strategic advantages. The exact mechanics will be revealed closer to launch, but expect territorial control challenges, alliance formation, and rewards based on your canvas dominance. Your Influence Score visible on the Leaderboard today gives you a preview of your competitive power."
        }
      ]
    },
    {
      id: "minting-ownership",
      title: "Minting & Ownership",
      icon: Palette,
      color: "#FFBDFC",
      faqs: [
        {
          id: "multiple-pixels",
          q: "Can I mint multiple pixels?",
          a: "No - each wallet can only mint ONE pixel total to ensure maximum decentralization (2,500 unique founders). Choose your tier wisely! You can still own multiple pixels through transfers."
        },
        {
          id: "secondary-markets",
          q: "Can I buy pixels on secondary markets?",
          a: "Yes! Secondary market holders earn 25% governance points (vs 100% for founders) while they own the pixel, plus tier-based holder benefits like badges and platform recognition. While founders have the advantage, holders still earn meaningful rewards."
        },
        {
          id: "transfer-pixel",
          q: "What happens if I transfer my pixel to someone else?",
          a: "You lose founder status and stop earning all points (0%) the moment you transfer. The new owner earns at the 25% holder rate UNLESS they're the original minter reacquiring their pixel (then they earn at 100% founder rate). Your previously accumulated points are preserved but you no longer earn new points."
        },
        {
          id: "minter-vs-holder",
          q: "What's the difference between minters and holders?",
          a: "Only founders (original minters who currently own their pixel) earn 100% governance points. If you mint a pixel but transfer it away, you lose founder status and earn 0% until you reacquire it. Secondary market buyers who aren't the original minter earn 25% governance points. If you reacquire your originally-minted pixel, you regain founder status and earn at 100% again."
        },
        {
          id: "melt-pixel",
          q: "What happens if I melt my pixel?",
          a: "Melting permanently destroys the NFT and you lose all accumulated governance points forever. You also lose founder status and airdrop eligibility for that pixel. However, you recover the locked CKB (minus a 150 CKB network fee). After melting, you can mint a new pixel in a different tier if desired."
        },
        {
          id: "airdrop-date",
          q: "When is the token airdrop?",
          a: "The governance token launch and airdrop will occur after the March 31, 2026 snapshot. Distribution will be proportional to points accumulated by founders (original minters)."
        },
        {
          id: "platform-fees",
          q: "Are there any platform fees?",
          a: "Yes. Platform fees are tier-based for minting: Common (500 CKB), Rare (1,000 CKB), Epic (2,500 CKB), Legendary (5,000 CKB). The locked CKB for each pixel is fully recoverable by melting - only the platform fee is non-refundable. Transferring or melting pixels costs 150 CKB each. These fees support ongoing development and platform sustainability."
        },
        {
          id: "network-fees",
          q: "What are the CKB network transaction fees?",
          a: "CKB network transaction fees are separate from platform fees and vary based on network congestion. They're typically very low (usually under 1 CKB per transaction). These fees go to CKB miners, not to SoMo. You'll see the exact network fee in your wallet before confirming any transaction (minting, transferring, or melting)."
        },
        {
          id: "founder-reacquisition",
          q: "If I transfer my pixel and buy it back later, am I still a founder?",
          a: "Yes, but only when you own it! You lose founder status the moment you transfer your pixel (becoming a non-founder in statistics and earning 0 points). When you reacquire your originally-minted pixel, your founder status is immediately restored and you resume earning at the full 100% rate. While someone else owns it, they earn at the 25% holder rate. Your accumulated points from before the transfer are preserved and you continue accumulating from where you left off once you own it again."
        }
      ]
    }
  ];

  const toggleCategory = (categoryId: string) => {
    if (openCategory === categoryId) {
      setOpenCategory(null);
      setOpenQuestion(null);
    } else {
      setOpenCategory(categoryId);
      setOpenQuestion(null);
    }
  };

  const toggleQuestion = (questionId: string) => {
    setOpenQuestion(openQuestion === questionId ? null : questionId);
  };

  return (
    <section id="faq" ref={ref} className="py-16 md:py-32" data-testid="section-faq">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-12 md:mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-3 md:mb-4">Frequently Asked Questions</h2>
          <p className="text-lg md:text-xl text-gray-400">Everything you need to know</p>
        </motion.div>

        <div className="max-w-4xl mx-auto space-y-6">
          {faqCategories.map((category, categoryIndex) => {
            const Icon = category.icon;
            const isCategoryOpen = openCategory === category.id;
            
            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: categoryIndex * 0.1 }}
              >
                <Card className="bg-white/5 backdrop-blur-sm border-white/10 overflow-hidden">
                  <div
                    className="cursor-pointer hover:bg-white/5 transition-all"
                    onClick={() => toggleCategory(category.id)}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="p-2 rounded-lg"
                            style={{ backgroundColor: `${category.color}20` }}
                          >
                            <Icon className="h-6 w-6" style={{ color: category.color }} />
                          </div>
                          <CardTitle className="text-xl">{category.title}</CardTitle>
                          <span className="text-sm text-gray-500">({category.faqs.length})</span>
                        </div>
                        <motion.div
                          animate={{ rotate: isCategoryOpen ? 180 : 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        </motion.div>
                      </div>
                    </CardHeader>
                  </div>

                  <motion.div
                    initial={false}
                    animate={{
                      height: isCategoryOpen ? 'auto' : 0,
                      opacity: isCategoryOpen ? 1 : 0
                    }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <CardContent className="pt-0 space-y-3">
                      {category.faqs.map((faq) => {
                        const isQuestionOpen = openQuestion === faq.id;
                        
                        return (
                          <div
                            key={faq.id}
                            className="border border-white/5 rounded-lg bg-black/20 hover:bg-white/5 transition-all cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleQuestion(faq.id);
                            }}
                          >
                            <div className="p-4">
                              <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold pr-4">{faq.q}</h3>
                                <motion.div
                                  animate={{ rotate: isQuestionOpen ? 180 : 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                </motion.div>
                              </div>

                              <motion.div
                                initial={false}
                                animate={{
                                  height: isQuestionOpen ? 'auto' : 0,
                                  opacity: isQuestionOpen ? 1 : 0,
                                  marginTop: isQuestionOpen ? 12 : 0
                                }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <p className="text-sm text-gray-400">{faq.a}</p>
                              </motion.div>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </motion.div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Final CTA Section
function FinalCTASection() {
  const ref = useRef(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const { open } = ccc.useCcc();
  const signer = ccc.useSigner();
  const [, setLocation] = useLocation();
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [50, -50]);

  // Auto-navigate to /app when wallet connects
  useEffect(() => {
    if (signer && isConnecting) {
      setIsConnecting(false);
      setLocation('/app');
    }
  }, [signer, isConnecting, setLocation]);

  // Reset connecting state if user dismisses modal without connecting
  useEffect(() => {
    if (isConnecting && !signer) {
      const timeout = setTimeout(() => {
        setIsConnecting(false);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [isConnecting, signer]);

  const handleConnectAndNavigate = async () => {
    if (signer) {
      // Already connected, go straight to app
      setLocation('/app');
    } else {
      // Not connected, trigger wallet connection
      setIsConnecting(true);
      open();
    }
  };

  return (
    <section 
      ref={ref}
      className="relative py-16 md:py-32 overflow-hidden"
      data-testid="section-final-cta"
    >
      {/* Parallax Background */}
      <motion.div 
        style={{ y }}
        className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

      <div className="relative z-10 container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6">
            Only 2,500 Founders.
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#DBAB00] via-[#FFBDFC] to-[#09D3FF]">
              Only Founders Govern.
            </span>
          </h2>

          <p className="text-lg md:text-xl lg:text-2xl text-gray-300 mb-8 md:mb-12 max-w-2xl mx-auto">
            Will you help shape the future?
          </p>

          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Button
              size="lg"
              onClick={handleConnectAndNavigate}
              disabled={isConnecting}
              className="bg-gradient-to-r from-[#DBAB00] via-[#FFBDFC] to-[#09D3FF] hover:opacity-90 text-black font-bold px-8 md:px-12 py-6 md:py-8 text-lg md:text-2xl rounded-xl md:rounded-2xl shadow-2xl shadow-[#DBAB00]/50 hover:shadow-[#DBAB00]/70 transition-all disabled:opacity-50"
              data-testid="button-final-cta"
            >
              <Rocket className="mr-2 md:mr-3 h-6 w-6 md:h-8 md:w-8" />
              {isConnecting ? 'Connecting...' : signer ? 'Go to App' : 'Connect Wallet & Join'}
            </Button>
          </motion.div>

          <p className="text-sm text-gray-500 mt-8">
            {signer ? 'You\'re connected! Click to start minting' : 'Connect your wallet to earn governance power'}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
