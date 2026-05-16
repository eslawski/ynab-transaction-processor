export function SessionLoading() {
  return (
    <div className="flex flex-col gap-6 py-10" style={{ animation: "fadeIn 0.3s ease-out" }}>
      <div className="glass flex flex-col gap-3 rounded-xl px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1.5">
            <Shimmer className="h-3 w-32" />
            <Shimmer className="h-5 w-48" />
          </div>
          <div className="flex gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col items-end gap-1.5">
                <Shimmer className="h-5 w-6" />
                <Shimmer className="h-3 w-12" />
              </div>
            ))}
          </div>
        </div>
        <Shimmer className="h-1 w-full rounded-full" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[0, 1].map((col) => (
          <div key={col} className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5 px-1">
              <Shimmer className="h-7 w-7 rounded-lg" />
              <div className="flex flex-col gap-1.5">
                <Shimmer className="h-3.5 w-40" />
                <Shimmer className="h-2.5 w-20" />
              </div>
            </div>
            {[0, 1, 2, 3].map((i) => (
              <Shimmer key={i} className="h-[88px] w-full rounded-xl" />
            ))}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <span className="h-1 w-1 rounded-full bg-[oklch(0.84_0.165_168)] animate-pulse" />
        Loading transactions and emails
        <span className="h-1 w-1 rounded-full bg-[oklch(0.84_0.165_168)] animate-pulse" />
      </div>
    </div>
  );
}

function Shimmer({ className }: { className: string }) {
  return (
    <div
      className={`relative overflow-hidden bg-surface/60 ${className}`}
      style={{
        backgroundImage:
          "linear-gradient(90deg, transparent 0%, oklch(1 0 0 / 0.06) 50%, transparent 100%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 2.5s linear infinite",
        borderRadius: 6,
      }}
    />
  );
}
