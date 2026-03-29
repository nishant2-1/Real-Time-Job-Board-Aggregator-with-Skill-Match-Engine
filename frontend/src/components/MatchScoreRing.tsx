export default function MatchScoreRing({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const angle = (clamped / 100) * 360;

  return (
    <div
      className="relative h-36 w-36 rounded-full"
      style={{
        background: `conic-gradient(#1f8a4c ${angle}deg, #e7efe9 ${angle}deg 360deg)`,
      }}
    >
      <div className="absolute inset-3 grid place-items-center rounded-full bg-white text-center">
        <span className="font-display text-3xl font-bold">{Math.round(clamped)}%</span>
        <span className="text-xs uppercase tracking-wide text-radar-700">Match</span>
      </div>
    </div>
  );
}
