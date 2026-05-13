export function fireConfetti() {
  if (typeof window === "undefined") return;
  try {
    import("canvas-confetti").then((confetti) => {
      confetti.default({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd"],
      });
    });
  } catch {}
}
