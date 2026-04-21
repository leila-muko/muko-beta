"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import IntentLoadingState from "@/components/intent/IntentLoadingState";
import { preloadCriticScores } from "@/lib/concept-studio/preloadCriticScores";
import { useSessionStore } from "@/lib/store/sessionStore";

const MIN_LOADING_MS = 1100;

export default function ConceptPrepPage() {
  const router = useRouter();
  const setCurrentStep = useSessionStore((state) => state.setCurrentStep);
  const setPreloadedCriticScores = useSessionStore((state) => state.setPreloadedCriticScores);

  useEffect(() => {
    setCurrentStep(1);
  }, [setCurrentStep]);

  useEffect(() => {
    let cancelled = false;
    const start = Date.now();

    const run = async () => {
      try {
        const scores = await preloadCriticScores();
        if (!cancelled && Object.keys(scores).length > 0) {
          setPreloadedCriticScores(scores);
        }
      } catch {
        // Fall through to concept even if preloading fails.
      } finally {
        const remaining = Math.max(0, MIN_LOADING_MS - (Date.now() - start));
        window.setTimeout(() => {
          if (!cancelled) {
            router.replace("/concept");
          }
        }, remaining);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [router, setPreloadedCriticScores]);

  return <IntentLoadingState />;
}
