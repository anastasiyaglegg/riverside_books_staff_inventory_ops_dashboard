import { useMemo } from "react";
import { evaluatePassword, type PasswordScore } from "@/lib/password";

// Filled-segment color per score. 0-1 read as danger, 2 as caution, 3-4 as good --
// mirroring the loyalty progress-bar look elsewhere in the app.
const SEGMENT_COLORS: Record<PasswordScore, string> = {
  0: "bg-rose-500",
  1: "bg-rose-500",
  2: "bg-amber-500",
  3: "bg-brand-500",
  4: "bg-emerald-600",
};

const TEXT_COLORS: Record<PasswordScore, string> = {
  0: "text-rose-600",
  1: "text-rose-600",
  2: "text-amber-600",
  3: "text-brand-700",
  4: "text-emerald-700",
};

export function PasswordStrengthMeter({ password }: { password: string }) {
  const strength = useMemo(() => evaluatePassword(password), [password]);

  if (!password) {
    return null;
  }

  // 4 segments; the number lit equals the score (score 0 lights the first as a red hint).
  const litSegments = Math.max(strength.score, 1);

  return (
    <div className="flex flex-col gap-1" aria-live="polite">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              index < litSegments ? SEGMENT_COLORS[strength.score] : "bg-stone-200"
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${TEXT_COLORS[strength.score]}`}>
        {strength.label}
        {strength.suggestion && (
          <span className="font-normal text-stone-500"> — {strength.suggestion}</span>
        )}
      </p>
    </div>
  );
}
