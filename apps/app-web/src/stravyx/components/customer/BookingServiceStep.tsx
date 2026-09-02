import { useState, useEffect, useRef } from "react";
import { Send, Sparkles } from "lucide-react";
import {
  DISCOVERY_PHASES, SERVICE_PITCHES, DiscoveryMessage, matchPhase, mapVagueAnswer,
} from "./bookingData";

export function ServiceStep({ onSelect }: { onSelect: (id: string) => void }) {
  const [messages, setMessages] = useState<DiscoveryMessage[]>([]);
  const [phase, setPhase] = useState<number>(-1);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");
  const [recommended, setRecommended] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const push = (msgs: DiscoveryMessage[]) => setMessages((prev) => [...prev, ...msgs]);

  // Opening message on mount
  useEffect(() => {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      push([{ role: "ai", text: "Hey! I'm the Stravyx assistant.\n\nTell me what you're looking to achieve — no need to know the technical terms. I'll help find the right service for you." }]);
      setPhase(0);
    }, 900);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  function handleChip(chip: string) {
    push([{ role: "user", text: chip }]);
    setTyping(true);

    if (phase === 0) {
      // Determine which phase 1 branch matches
      const nextPhase = matchPhase(chip);
      setTimeout(() => {
        setTyping(false);
        const p = DISCOVERY_PHASES[nextPhase];
        push([{ role: "ai", text: p.botText! }]);
        if (p.recommends) {
          // Will recommend after one more answer
          setPhase(nextPhase);
        } else {
          setPhase(nextPhase); // phase 1e — needs one more answer to route
        }
      }, 900);
    } else if (phase === 99) {
      if (chip === "Yes, let's book it") {
        setConfirmed(true);
        setTyping(false);
        push([{ role: "ai", text: "Perfect! Let's get the details sorted. I'll take you to choose a location next." }]);
        setTimeout(() => onSelect(recommended!), 1200);
      } else {
        // Start over
        setTyping(false);
        push([{ role: "ai", text: "No problem! Let's try again. What are you actually looking to do?" }]);
        setRecommended(null);
        setPhase(0);
      }
    } else if (phase >= 1 && phase < DISCOVERY_PHASES.length) {
      const currentPhase = DISCOVERY_PHASES[phase];
      let serviceId = currentPhase.recommends;

      // Phase 1e — route based on the vague-answer chip
      if (!serviceId) serviceId = mapVagueAnswer(chip);

      const pitch = SERVICE_PITCHES[serviceId!];
      setTimeout(() => {
        setTyping(false);
        push([{
          role: "ai",
          text: `Based on what you've told me, I'd recommend our **${pitch.name}** service.\n\n${pitch.pitch}\n\nDoes that sound right for what you need?`,
        }]);
        setRecommended(serviceId!);
        setPhase(99);
      }, 1100);
    }
  }

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    handleChip(text);
  }

  const currentChips: string[] = (() => {
    if (confirmed) return [];
    if (phase === 99) return ["Yes, let's book it", "That's not quite right"];
    if (phase >= 0 && phase < DISCOVERY_PHASES.length) return DISCOVERY_PHASES[phase].chips;
    return [];
  })();

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 flex-shrink-0">
        <h2 className="text-[24px] mb-0.5" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>
          Let's find the right service
        </h2>
        <p className="text-[14px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
          Have a quick chat with our assistant — we'll figure it out together.
        </p>
      </div>

      {/* Chat thread */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-3 min-h-0" style={{ maxHeight: "340px" }}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex items-start gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            {msg.role === "ai" && (
              <div className="w-8 h-8 bg-gradient-to-br from-[#5cb89c] to-[#4a9d84] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Sparkles size={14} className="text-white" />
              </div>
            )}
            <div
              className="max-w-[82%] px-4 py-3 rounded-[14px] text-[14px] leading-relaxed whitespace-pre-wrap"
              style={{
                fontFamily: "DM Sans, sans-serif",
                backgroundColor: msg.role === "ai" ? "#f5f5f5" : "#d85a30",
                color: msg.role === "ai" ? "#2d2d2d" : "#fff",
                borderBottomLeftRadius: msg.role === "ai" ? "4px" : "14px",
                borderBottomRightRadius: msg.role === "user" ? "4px" : "14px",
              }}
            >
              {msg.text.replace(/\*\*(.*?)\*\*/g, "$1")}
            </div>
          </div>
        ))}

        {typing && (
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-[#5cb89c] to-[#4a9d84] rounded-full flex items-center justify-center flex-shrink-0">
              <Sparkles size={14} className="text-white" />
            </div>
            <div className="px-4 py-3 rounded-[14px] bg-[#f5f5f5] flex items-center gap-1.5" style={{ borderBottomLeftRadius: "4px" }}>
              {[0, 1, 2].map((d) => (
                <span key={d} className="w-2 h-2 rounded-full bg-[#c0c0c0] animate-bounce" style={{ animationDelay: `${d * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick-reply chips */}
      {currentChips.length > 0 && !typing && (
        <div className="flex flex-wrap gap-2 py-3 flex-shrink-0">
          {currentChips.map((chip) => (
            <button
              key={chip}
              onClick={() => handleChip(chip)}
              className="px-3.5 py-2 rounded-full text-[13px] border transition-all hover:border-[#d85a30] hover:text-[#d85a30]"
              style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 500, borderColor: "#e0e0e0", color: "#2d2d2d", backgroundColor: "white" }}
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Free-text input */}
      {!confirmed && phase >= 0 && !typing && (
        <div className="flex gap-2 pt-2 border-t border-[#f0f0f0] flex-shrink-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Or type your own answer…"
            className="flex-1 px-4 py-2.5 rounded-[10px] border border-[#e8e8e8] focus:outline-none focus:border-[#5cb89c] text-[14px]"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="w-10 h-10 rounded-[10px] flex items-center justify-center transition-colors disabled:opacity-40"
            style={{ backgroundColor: "#d85a30" }}
          >
            <Send size={15} className="text-white" />
          </button>
        </div>
      )}
    </div>
  );
}
