/**
 * PinOverlay.tsx
 *
 * Full screen PIN entry overlay.
 * - 4 digit number pad
 * - Dot indicators
 * - Wrong PIN shakes and clears
 * - Lockout after 10 failed attempts for 60 seconds
 * - Optional cancel button
 */

import { useState, useEffect, useRef } from "react";
import "./PinOverlay.css";

interface PinOverlayProps {
  onSuccess: () => void;
  onCancel?: () => void;
  onCheck: (input: string) => boolean;
  title?: string;
}

const MAX_ATTEMPTS  = 10;
const LOCKOUT_SECS  = 60;

export default function PinOverlay({
  onSuccess,
  onCancel,
  onCheck,
  title = "Admin Access",
}: PinOverlayProps) {
  const [input,       setInput]       = useState("");
  const [error,       setError]       = useState(false);
  const [attempts,    setAttempts]    = useState(0);
  const [lockedOut,   setLockedOut]   = useState(false);
  const [countdown,   setCountdown]   = useState(LOCKOUT_SECS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Lockout countdown
  useEffect(() => {
    if (!lockedOut) return;

    setCountdown(LOCKOUT_SECS);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setLockedOut(false);
          setAttempts(0);
          return LOCKOUT_SECS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current!);
  }, [lockedOut]);

  const handleDigit = (digit: string) => {
    if (lockedOut) return;
    if (input.length >= 4) return;

    const next = input + digit;
    setInput(next);

    if (next.length === 4) {
      if (onCheck(next)) {
        onSuccess();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setError(true);

        if (newAttempts >= MAX_ATTEMPTS) {
          setLockedOut(true);
        }

        setTimeout(() => {
          setInput("");
          setError(false);
        }, 600);
      }
    }
  };

  const handleBackspace = () => {
    if (lockedOut) return;
    setInput((prev) => prev.slice(0, -1));
  };

  const attemptsRemaining = MAX_ATTEMPTS - attempts;

  return (
    <div className="pin-backdrop">
      <div className="pin-modal">
        <h2 className="pin-title">{title}</h2>

        {/* Dot indicators */}
        <div className="pin-dots">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`pin-dot ${input.length > i ? "filled" : ""} ${error ? "error" : ""}`}
            />
          ))}
        </div>

        {/* Status messages */}
        {lockedOut ? (
          <p className="pin-lockout">
            Too many attempts. Try again in {countdown}s
          </p>
        ) : attempts > 0 && attempts < MAX_ATTEMPTS ? (
          <p className="pin-attempts">
            {attemptsRemaining} attempt{attemptsRemaining !== 1 ? "s" : ""} remaining
          </p>
        ) : null}

        {/* Number pad */}
        <div className="pin-grid">
          {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((key, i) => (
            <button
              key={i}
              type="button"
              className={`pin-btn ${key === "" ? "pin-btn--empty" : ""}`}
              onClick={() => key === "⌫" ? handleBackspace() : key && handleDigit(key)}
              disabled={lockedOut || key === ""}
            >
              {key}
            </button>
          ))}
        </div>

        {/* Cancel */}
        {onCancel && (
          <button type="button" className="pin-cancel" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}