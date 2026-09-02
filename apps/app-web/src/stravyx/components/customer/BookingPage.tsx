import { useEffect, useRef, useState } from "react";
import {
  X, ArrowLeft, MapPin as MapPinIcon, ChevronRight,
} from "lucide-react";
import { Logo } from "../Logo";
import { UrgencyTier } from "../../types";
import { BookingPageProps, StepId, SERVICES } from "./bookingData";
import { StepBar } from "./BookingStepBar";
import { ServiceStep } from "./BookingServiceStep";
import { LocationStep } from "./BookingLocationStep";
import { AIChatStep } from "./BookingChatStep";
import { TimingStep } from "./BookingTimingStep";
import { ReviewStep } from "./BookingReviewStep";
import { EmergencyDisclaimer } from "./EmergencyDisclaimer";
import { bookingEstimatedDuration, bookingLocationFromPlace } from "@/lib/bookingLocation";
import type { GeocodedPlace } from "@/lib/maptilerGeocode";

export function BookingPage({ onBack, onSubmit, preselectedService, urgencyTiers }: BookingPageProps) {
  const [step, setStep] = useState<StepId>(preselectedService ? "location" : "service");
  const [serviceId, setServiceId] = useState(preselectedService ?? "");
  const [selectedPlace, setSelectedPlace] = useState<GeocodedPlace | null>(null);
  const [brief, setBrief] = useState("");
  const [chatAnswers, setChatAnswers] = useState<string[]>([]);
  const [urgency, setUrgency] = useState<UrgencyTier>("standard");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [emergencyAck, setEmergencyAck] = useState(false);
  const locationAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearLocationAdvanceTimer() {
    if (locationAdvanceTimer.current === null) return;
    clearTimeout(locationAdvanceTimer.current);
    locationAdvanceTimer.current = null;
  }

  useEffect(() => () => {
    if (locationAdvanceTimer.current === null) return;
    clearTimeout(locationAdvanceTimer.current);
    locationAdvanceTimer.current = null;
  }, []);

  function selectService(id: string) {
    clearLocationAdvanceTimer();
    setServiceId(id);
    if (id === "emergency") return;
    locationAdvanceTimer.current = setTimeout(() => setStep("location"), 1300);
  }

  const canAdvance: Record<StepId, boolean> = {
    service: !!serviceId,
    location: selectedPlace !== null,
    chat: false, // chat advances itself
    timing: urgency !== "scheduled" || (!!scheduledDate && !!scheduledTime),
    review: true,
  };

  const nextStep: Record<StepId, StepId | null> = {
    service: "location",
    location: "chat",
    chat: "timing",
    timing: "review",
    review: null,
  };

  const prevStep: Record<StepId, StepId | null> = {
    service: null,
    location: preselectedService ? null : "service",
    chat: "location",
    timing: "chat",
    review: "timing",
  };

  function advance() {
    const next = nextStep[step];
    if (next) setStep(next);
  }

  function goBack() {
    const prev = prevStep[step];
    if (prev) setStep(prev);
    else onBack();
  }

  function handleChatComplete(generatedBrief: string, answers: string[]) {
    setBrief(generatedBrief);
    setChatAnswers(answers);
    setStep("timing");
  }

  function handleConfirm() {
    if (!selectedPlace) return;
    const svc = SERVICES.find((s) => s.id === serviceId);
    onSubmit({
      customerId: "customer-1",
      customerName: "John Smith",
      serviceType: svc?.name ?? serviceId,
      urgency,
      location: bookingLocationFromPlace(selectedPlace),
      estimatedDuration: bookingEstimatedDuration(),
      // Placeholder; App.createMission returns authoritative Network Price
      flightFee: 0,
      totalPrice: 0,
      description: brief,
      scheduledDate: urgency === "scheduled" ? scheduledDate : undefined,
      scheduledTime: urgency === "scheduled" ? scheduledTime : undefined,
      serviceId,
    });
  }

  const svc = SERVICES.find((s) => s.id === serviceId);
  const needsEmergencyAck = serviceId === "emergency" && !emergencyAck;

  function handleEmergencyAck() {
    clearLocationAdvanceTimer();
    setEmergencyAck(true);
    setStep((current) => (current === "service" ? "location" : current));
  }

  function handleEmergencyExit() {
    clearLocationAdvanceTimer();
    setEmergencyAck(false);
    setServiceId("");
    if (preselectedService) onBack();
    else setStep("service");
  }

  if (needsEmergencyAck) {
    return (
      <EmergencyDisclaimer
        onAcknowledge={handleEmergencyAck}
        onExit={handleEmergencyExit}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-[#fafafa] flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-[#e8e8e8] px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={goBack} className="p-2 hover:bg-[#f5f5f5] rounded-full transition-colors">
            <ArrowLeft size={20} className="text-[#737373]" />
          </button>
          <Logo className="h-10 hidden sm:block" />
        </div>
        <StepBar current={step} />
        <button onClick={onBack} className="p-2 hover:bg-[#f5f5f5] rounded-full transition-colors">
          <X size={20} className="text-[#737373]" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 md:px-8 py-8">

          {/* Service summary pill (steps 2+) */}
          {step !== "service" && svc && (
            <div className="flex items-center gap-2 mb-6 px-3 py-2 bg-white border border-[#e8e8e8] rounded-full w-fit">
              <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: `${svc.color}20` }}>
                <svc.icon size={12} style={{ color: svc.color }} />
              </div>
              <span className="text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#2d2d2d" }}>
                {svc.name}
              </span>
              {step !== "location" && selectedPlace && (
                <>
                  <span className="text-[#d0d0d0]">·</span>
                  <MapPinIcon size={12} className="text-[#737373]" />
                  <span className="text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>{selectedPlace.label}</span>
                </>
              )}
            </div>
          )}

          {serviceId === "emergency" && emergencyAck && (
            <div className="mb-6 px-4 py-3 rounded-[12px] border border-[#f0c9c9] bg-[#fdeaea] text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#a03a3a" }}>
              Reminder: for a genuine emergency call 000. Stravyx is private aerial support, not police, fire, or ambulance.
            </div>
          )}

          {step === "service" && (
            <ServiceStep onSelect={selectService} />
          )}
          {step === "location" && (
            <LocationStep place={selectedPlace} onChange={setSelectedPlace} />
          )}
          {step === "chat" && (
            <AIChatStep serviceId={serviceId} location={selectedPlace?.label ?? ""} onComplete={handleChatComplete} />
          )}
          {step === "timing" && (
            <TimingStep urgency={urgency} setUrgency={setUrgency} scheduledDate={scheduledDate} setScheduledDate={setScheduledDate} scheduledTime={scheduledTime} setScheduledTime={setScheduledTime} urgencyTiers={urgencyTiers} />
          )}
          {step === "review" && (
            <ReviewStep
              serviceId={serviceId} location={selectedPlace?.label ?? ""} brief={brief} setBrief={setBrief}
              urgency={urgency} onConfirm={handleConfirm} urgencyTiers={urgencyTiers}
              scheduledDate={scheduledDate} scheduledTime={scheduledTime}
            />
          )}

          {/* Next button (not shown on chat, service discovery, or review — they advance themselves) */}
          {step !== "chat" && step !== "service" && step !== "review" && (
            <button
              onClick={advance}
              disabled={!canAdvance[step]}
              className="mt-8 w-full bg-[#d85a30] text-white py-4 rounded-[14px] hover:bg-[#b8481f] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0px_4px_12px_rgba(216,90,48,0.25)] flex items-center justify-center gap-2"
              style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, fontSize: "16px" }}
            >
              Continue <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
