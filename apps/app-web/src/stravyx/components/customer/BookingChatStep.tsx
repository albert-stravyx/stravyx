import { useState, useEffect, useRef } from "react";
import { Send, Sparkles, ChevronRight } from "lucide-react";
import { QUESTIONS, SERVICES, ChatMessage, generateBrief } from "./bookingData";

export function AIChatStep({
  serviceId,
  location,
  onComplete,
}: {
  serviceId: string;
  location: string;
  onComplete: (brief: string, answers: string[]) => void;
}) {
  const questions = QUESTIONS[serviceId] ?? QUESTIONS["photography"];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [phase, setPhase] = useState<number>(-1); // -1 = greeting, 0..n = questions, n+1 = generating
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");
  const [brief, setBrief] = useState("");
  const [done, setDone] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const svc = SERVICES.find((s) => s.id === serviceId);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  // Send the greeting on mount
  useEffect(() => {
    setTyping(true);
    const t = setTimeout(() => {
      setMessages([{
        role: "ai",
        text: `Hi there! I'll help you put together a clear brief for your ${svc?.name ?? "job"} at ${location || "the job site"}. I have a few quick questions — your answers help us match you with the right operator and ensure nothing gets missed.`,
      }]);
      setTyping(false);
      // Trigger first question
      setTimeout(() => sendAIQuestion(0, []), 600);
    }, 800);
    return () => clearTimeout(t);
  }, []);

  function sendAIQuestion(qIdx: number, answersSoFar: string[]) {
    if (qIdx >= questions.length) {
      generateBriefAsync(answersSoFar);
      return;
    }
    setTyping(true);
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: "ai", text: questions[qIdx].question }]);
      setTyping(false);
      setPhase(qIdx);
    }, 900);
  }

  function handleAnswer(answer: string) {
    if (!answer.trim()) return;
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);
    setMessages((prev) => [...prev, { role: "user", text: answer }]);
    setInput("");
    const next = phase + 1;
    setPhase(-2); // disable input while AI responds
    sendAIQuestion(next, newAnswers);
  }

  function generateBriefAsync(finalAnswers: string[]) {
    setTyping(true);
    setPhase(-2);
    setTimeout(() => {
      setMessages((prev) => [...prev, {
        role: "ai",
        text: "Perfect — I have everything I need. Generating your job brief now…",
      }]);
      setTyping(false);
    }, 800);
    setTimeout(() => {
      const generated = generateBrief(serviceId, location, finalAnswers);
      setBrief(generated);
      setMessages((prev) => [...prev, {
        role: "ai",
        text: `Here's the brief I'll send to your operator:\n\n"${generated}"\n\nThis gives them everything they need to arrive prepared. You can edit it on the next screen if needed.`,
      }]);
      setDone(true);
    }, 2400);
  }

  const currentQ = phase >= 0 && phase < questions.length ? questions[phase] : null;
  const inputActive = phase >= 0 && phase < questions.length;

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <h2 className="text-[24px] mb-1" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>
          Tell us what you need
        </h2>
        <p className="text-[15px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
          Our AI will build a clear brief for your operator.
        </p>
      </div>

      {/* Chat thread */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-2 min-h-0" style={{ maxHeight: "380px" }}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex items-start gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            {msg.role === "ai" && (
              <div className="w-8 h-8 bg-gradient-to-br from-[#5cb89c] to-[#4a9d84] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Sparkles size={14} className="text-white" />
              </div>
            )}
            <div
              className="max-w-[80%] px-4 py-3 rounded-[14px] text-[14px] leading-relaxed whitespace-pre-wrap"
              style={{
                fontFamily: "DM Sans, sans-serif",
                backgroundColor: msg.role === "ai" ? "#f5f5f5" : "#5cb89c",
                color: msg.role === "ai" ? "#2d2d2d" : "#fff",
                borderBottomLeftRadius: msg.role === "ai" ? "4px" : "14px",
                borderBottomRightRadius: msg.role === "user" ? "4px" : "14px",
              }}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {typing && (
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-[#5cb89c] to-[#4a9d84] rounded-full flex items-center justify-center flex-shrink-0">
              <Sparkles size={14} className="text-white" />
            </div>
            <div className="px-4 py-3 bg-[#f5f5f5] rounded-[14px] rounded-bl-[4px] flex items-center gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-2 h-2 rounded-full bg-[#b0b0b0] animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick reply chips */}
      {inputActive && currentQ && currentQ.chips.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-3 pb-2 border-t border-[#f0f0f0]">
          {currentQ.chips.map((chip) => (
            <button
              key={chip}
              onClick={() => handleAnswer(chip)}
              className="px-3 py-1.5 border border-[#5cb89c] rounded-full text-[13px] hover:bg-[#e8f5f0] transition-colors"
              style={{ fontFamily: "DM Sans, sans-serif", color: "#2d6b53", fontWeight: 500 }}
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Free text input */}
      {inputActive && (currentQ?.freeText || currentQ?.chips.length === 0) && (
        <div className="flex gap-2 pt-3 border-t border-[#f0f0f0]">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAnswer(input)}
            placeholder="Type your answer…"
            className="flex-1 px-4 py-3 border border-[#e8e8e8] rounded-[10px] focus:outline-none focus:border-[#5cb89c] transition-colors text-[14px]"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          />
          <button
            onClick={() => handleAnswer(input)}
            disabled={!input.trim()}
            className="w-11 h-11 bg-[#5cb89c] rounded-[10px] flex items-center justify-center hover:bg-[#b8481f] transition-colors disabled:opacity-40"
          >
            <Send size={16} className="text-white" />
          </button>
        </div>
      )}

      {/* Continue button once done */}
      {done && (
        <button
          onClick={() => onComplete(brief, answers)}
          className="mt-4 w-full bg-[#d85a30] text-white py-3.5 rounded-[12px] hover:bg-[#b8481f] transition-all flex items-center justify-center gap-2 shadow-[0px_4px_12px_rgba(216,90,48,0.3)]"
          style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, fontSize: "15px" }}
        >
          Continue to Timing <ChevronRight size={18} />
        </button>
      )}
    </div>
  );
}
