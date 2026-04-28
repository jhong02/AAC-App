/**
 * FirstLoadModal.tsx
 *
 * Shown once on first app load when no PIN setup has been completed.
 * Gives the caregiver the option to set a PIN or continue without one.
 * Once dismissed it never shows again.
 */

import { useState } from "react";
import type { Database } from "sql.js";
import { setPin, completePinSetup } from "../hooks/usePIN";
import "./FirstLoadModal.css";

interface FirstLoadModalProps {
  db: Database;
  onDone: () => void;
}

type Step = "choice" | "create" | "confirm" | "success";

export default function FirstLoadModal({ db, onDone }: FirstLoadModalProps) {
  const [step,       setStep]       = useState<Step>("choice");
  const [newPin,     setNewPin]     = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError,   setPinError]   = useState("");

  const handleSetPin = () => {
    setStep("create");
    setNewPin("");
    setConfirmPin("");
    setPinError("");
  };

  const handleSkip = () => {
    completePinSetup(db);
    onDone();
  };

  const handleDigitCreate = (digit: string) => {
    if (newPin.length >= 4) return;
    const next = newPin + digit;
    setNewPin(next);
    if (next.length === 4) setStep("confirm");
  };

  const handleDigitConfirm = (digit: string) => {
    if (confirmPin.length >= 4) return;
    const next = confirmPin + digit;
    setConfirmPin(next);
    if (next.length === 4) {
      if (next === newPin) {
        setPin(db, next);
        completePinSetup(db);
        setStep("success");
        setTimeout(onDone, 1500);
      } else {
        setPinError("PINs don't match. Try again.");
        setNewPin("");
        setConfirmPin("");
        setStep("create");
      }
    }
  };

  const handleBackspace = (which: "create" | "confirm") => {
    if (which === "create") setNewPin((p) => p.slice(0, -1));
    else setConfirmPin((p) => p.slice(0, -1));
  };

  const renderDots = (value: string) => (
    <div className="flm-dots">
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className={`flm-dot ${value.length > i ? "filled" : ""}`} />
      ))}
    </div>
  );

  const renderPad = (onDigit: (d: string) => void, onBack: () => void) => (
    <div className="flm-grid">
      {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((key, i) => (
        <button
          key={i}
          type="button"
          className={`flm-btn ${key === "" ? "flm-btn--empty" : ""}`}
          onClick={() => key === "⌫" ? onBack() : key && onDigit(key)}
        >
          {key}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flm-backdrop">
      <div className="flm-modal">

        {step === "choice" && (
          <>
            <h2>Welcome! 👋</h2>
            <p className="flm-subtitle">
              Would you like to set a PIN to prevent children from accessing caregiver settings?
            </p>
            <button className="flm-btn-primary" onClick={handleSetPin}>
              🔒 Set a PIN
            </button>
            <button className="flm-btn-secondary" onClick={handleSkip}>
              Continue Without PIN
            </button>
          </>
        )}

        {step === "create" && (
          <>
            <h2>Create PIN</h2>
            <p className="flm-subtitle">Enter a 4-digit PIN</p>
            {pinError && <p className="flm-error">{pinError}</p>}
            {renderDots(newPin)}
            {renderPad(handleDigitCreate, () => handleBackspace("create"))}
          </>
        )}

        {step === "confirm" && (
          <>
            <h2>Confirm PIN</h2>
            <p className="flm-subtitle">Enter your PIN again to confirm</p>
            {renderDots(confirmPin)}
            {renderPad(handleDigitConfirm, () => handleBackspace("confirm"))}
          </>
        )}

        {step === "success" && (
          <>
            <div className="flm-success-icon">✓</div>
            <h2>PIN Set!</h2>
            <p className="flm-subtitle">Your caregiver PIN has been saved.</p>
          </>
        )}

      </div>
    </div>
  );
}
