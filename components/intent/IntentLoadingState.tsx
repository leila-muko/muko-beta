"use client";

import { motion } from "framer-motion";

const floatTransition = {
  duration: 8.5,
  repeat: Infinity,
  ease: "easeInOut" as const,
};

const ringTransition = {
  duration: 18,
  repeat: Infinity,
  repeatType: "mirror" as const,
  ease: "easeInOut" as const,
};

export default function IntentLoadingState() {
  return (
    <section
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f7f1e8] px-6"
      style={{
        backgroundImage:
          "radial-gradient(circle at 50% 38%, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0) 36%), radial-gradient(circle at 22% 18%, rgba(197,190,170,0.16) 0%, rgba(197,190,170,0) 32%), radial-gradient(circle at 78% 20%, rgba(214,198,190,0.18) 0%, rgba(214,198,190,0) 30%), linear-gradient(180deg, #fbf7f1 0%, #f4ede2 100%)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.36) 0%, rgba(255,255,255,0) 55%)",
        }}
      />

      <div className="relative flex flex-col items-center justify-center gap-10 sm:gap-12">
        <p
          className="text-center text-[10px] tracking-[0.22em] sm:text-[11px]"
          style={{
            fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
            color: "#4E2F2E",
          }}
        >
          ordering concept recommendations
        </p>

        <motion.div
          className="relative flex h-[220px] w-[220px] items-center justify-center sm:h-[280px] sm:w-[280px]"
          animate={{
            y: [0, -6, 0],
            scale: [0.98, 1.02, 0.98],
          }}
          transition={floatTransition}
        >
          <motion.div
            aria-hidden
            className="absolute h-[238px] w-[238px] rounded-full border border-[#b8b0a51f] sm:h-[304px] sm:w-[304px]"
            animate={{
              rotate: [-4, 4, -4],
              scale: [0.995, 1.01, 0.995],
            }}
            transition={ringTransition}
          />

          <motion.div
            aria-hidden
            className="absolute h-[180px] w-[240px] rounded-full border border-[#b5aea41a] sm:h-[228px] sm:w-[304px]"
            style={{ rotate: "-18deg" }}
            animate={{
              rotate: [-18, -14, -18],
              x: [-3, 3, -3],
            }}
            transition={{
              duration: 22,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
            }}
          />

          <div
            aria-hidden
            className="absolute h-[132px] w-[132px] rounded-full blur-3xl sm:h-[164px] sm:w-[164px]"
            style={{
              background:
                "radial-gradient(circle, rgba(255,255,255,0.66) 0%, rgba(230,224,212,0.28) 48%, rgba(230,224,212,0) 74%)",
            }}
          />

          <motion.div
            className="relative h-[116px] w-[116px] rounded-full sm:h-[144px] sm:w-[144px]"
            style={{
              background:
                "radial-gradient(circle at 34% 30%, rgba(255,255,255,0.9) 0%, rgba(248,245,238,0.68) 22%, rgba(221,232,216,0.48) 50%, rgba(236,216,210,0.42) 70%, rgba(223,212,194,0.28) 100%)",
              boxShadow:
                "0 18px 44px rgba(104,96,82,0.07), inset 0 1px 0 rgba(255,255,255,0.55)",
              filter: "blur(0.2px)",
            }}
            animate={{
              opacity: [0.9, 1, 0.9],
            }}
            transition={{
              duration: 6.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <div
              aria-hidden
              className="absolute inset-[18%] rounded-full blur-xl"
              style={{
                background:
                  "radial-gradient(circle, rgba(255,255,255,0.44) 0%, rgba(255,255,255,0) 72%)",
              }}
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
