"use client";

import { useState, useId, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { submitEarlyAccess } from "@/app/actions/early-access";

type RequestType = "demo" | "pilot" | "host_inquiry";

interface RequestAccessDialogProps {
  open: boolean;
  onClose: () => void;
  requestType: RequestType;
}

const requestTypeConfigs = {
  demo: {
    title: "Book a 15-Minute Demo",
    description: "Get a walkthrough of GameLedger tailored to your café",
    buttonText: "Request Demo",
  },
  pilot: {
    title: "Start a Pilot Weekend",
    description: "Experience GameLedger in your venue during a trial weekend",
    buttonText: "Start Pilot",
  },
  host_inquiry: {
    title: "Talk to a Host",
    description: "Get answers to your questions from our team",
    buttonText: "Send Inquiry",
  },
};

const tableCounts = ["1-5", "6-10", "11-20", "20+"] as const;

export function RequestAccessDialog({ open, onClose, requestType }: RequestAccessDialogProps) {
  const id = useId();
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const config = requestTypeConfigs[requestType];

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStatus("idle");
      setErrorMessage(null);
    }
  }, [open]);

  // Close dialog on escape key
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = await submitEarlyAccess(formData, requestType);

    if (result.success) {
      setStatus("success");
      // Close dialog after brief delay to show success message
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setStatus("error");
      setErrorMessage(result.error || "Something went wrong. Please try again.");
    }
  }

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md sm:max-w-lg">
        {/* Close button on backdrop */}
        <div
          className="fixed inset-0 cursor-pointer z-40"
          onClick={onClose}
        />

        {/* Dialog content wrapper */}
        <div className="relative z-50" onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-ink-secondary hover:text-ink-primary transition-colors"
              aria-label="Close dialog"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <AlertDialogTitle className="pr-8">{config.title}</AlertDialogTitle>
            <p className="text-sm text-ink-secondary">{config.description}</p>
          </AlertDialogHeader>

          {status === "success" ? (
            <div className="mt-6 p-4 rounded-lg bg-success/10 border border-success/30 text-center">
              <p className="text-base font-serif text-ink-primary mb-2">You&apos;re all set!</p>
              <p className="text-sm text-ink-secondary">
                We&apos;ll be in touch within 48 hours to get your {requestType === "demo" ? "demo" : requestType === "pilot" ? "pilot" : "inquiry"} scheduled.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor={`${id}-name`} className="text-xs uppercase tracking-[0.2em] text-ink-secondary font-medium">
                    Name <span className="text-accent">*</span>
                  </label>
                  <Input
                    id={`${id}-name`}
                    name="name"
                    placeholder="Your name"
                    required
                    minLength={2}
                    disabled={status === "submitting"}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor={`${id}-email`} className="text-xs uppercase tracking-[0.2em] text-ink-secondary font-medium">
                    Email <span className="text-accent">*</span>
                  </label>
                  <Input
                    id={`${id}-email`}
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    disabled={status === "submitting"}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor={`${id}-venue`} className="text-xs uppercase tracking-[0.2em] text-ink-secondary font-medium">
                    Venue Name <span className="text-accent">*</span>
                  </label>
                  <Input
                    id={`${id}-venue`}
                    name="venueName"
                    placeholder="Your café or venue"
                    required
                    minLength={2}
                    disabled={status === "submitting"}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor={`${id}-city`} className="text-xs uppercase tracking-[0.2em] text-ink-secondary font-medium">
                    City
                  </label>
                  <Input
                    id={`${id}-city`}
                    name="city"
                    placeholder="City or region"
                    disabled={status === "submitting"}
                  />
                </div>
              </div>

              {requestType === "pilot" && (
                <div className="space-y-1.5">
                  <label htmlFor={`${id}-tables`} className="text-xs uppercase tracking-[0.2em] text-ink-secondary font-medium">
                    Number of Tables
                  </label>
                  <select
                    id={`${id}-tables`}
                    name="tableCount"
                    className="w-full rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] px-3 py-2 text-sm shadow-card focus-ring"
                    disabled={status === "submitting"}
                  >
                    <option value="">Select range</option>
                    {tableCounts.map((count) => (
                      <option key={count} value={count}>
                        {count} tables
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor={`${id}-message`} className="text-xs uppercase tracking-[0.2em] text-ink-secondary font-medium">
                  Message
                </label>
                <Textarea
                  id={`${id}-message`}
                  name="message"
                  placeholder="Tell us about your venue or any specific needs..."
                  rows={3}
                  maxLength={500}
                  disabled={status === "submitting"}
                />
              </div>

              {status === "error" && errorMessage && (
                <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-sm text-danger">
                  {errorMessage}
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                pill
                className="w-full justify-center bg-accent border-accent"
                disabled={status === "submitting"}
              >
                {status === "submitting" ? "Submitting..." : config.buttonText}
              </Button>

              <p className="text-xs text-ink-secondary text-center">
                We&apos;ll never share your information with third parties.
              </p>
            </form>
          )}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
