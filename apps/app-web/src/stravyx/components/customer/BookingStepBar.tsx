import { CheckCircle2 } from "lucide-react";
import { STEPS, StepId } from "./bookingData";

export function StepBar({ current }: { current: StepId }) {
  const idx = STEPS.findIndex((s) => s.id === current);
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] transition-all"
                style={{
                  backgroundColor: done ? "#5cb89c" : active ? "#2d2d2d" : "#e8e8e8",
                  color: done || active ? "#fff" : "#b0b0b0",
                  fontFamily: "DM Sans, sans-serif",
                  fontWeight: 700,
                }}
              >
                {done ? <CheckCircle2 size={14} strokeWidth={2.5} /> : i + 1}
              </div>
              <span
                className="text-[10px] mt-1 whitespace-nowrap hidden sm:block"
                style={{ fontFamily: "DM Sans, sans-serif", fontWeight: active ? 600 : 400, color: active ? "#2d2d2d" : "#b0b0b0" }}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="w-8 sm:w-12 h-px mx-1 mb-4" style={{ backgroundColor: i < idx ? "#5cb89c" : "#e8e8e8" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
