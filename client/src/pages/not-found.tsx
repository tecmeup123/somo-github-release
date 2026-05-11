import { Link } from "wouter";
import { Home, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-[#FFBDFC]/5 blur-[100px] rounded-full" />
      </div>

      <div className="text-center relative z-10 px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div
            className="text-[8rem] md:text-[12rem] font-bold leading-none tabular-nums select-none"
            style={{
              fontFamily: "var(--font-display)",
              background: "linear-gradient(135deg, #09D3FF 0%, #FFBDFC 50%, #DBAB00 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 40px rgba(9,211,255,0.25))",
            }}
          >
            404
          </div>

          <div className="flex items-center justify-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-primary" />
            <h1
              className="text-xl md:text-2xl font-bold text-foreground"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Pixel Not Found
            </h1>
          </div>

          <p className="text-muted-foreground mb-8 max-w-sm mx-auto text-sm md:text-base">
            This coordinate doesn't exist on the canvas. Looks like you wandered off the grid.
          </p>

          <Link href="/">
            <button
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200"
              style={{
                background: "rgba(9,211,255,0.10)",
                border: "1px solid rgba(9,211,255,0.35)",
                color: "#09D3FF",
                boxShadow: "0 0 20px rgba(9,211,255,0.12)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(9,211,255,0.18)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 30px rgba(9,211,255,0.28)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(9,211,255,0.10)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 20px rgba(9,211,255,0.12)";
              }}
            >
              <Home className="w-4 h-4" />
              Back to Canvas
            </button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
