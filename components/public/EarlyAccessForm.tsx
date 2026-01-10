"use client";

import { useState, useId } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { submitEarlyAccess } from "@/app/actions/early-access";

const tableCounts = ["1-5", "6-10", "11-20", "20+"] as const;

export function EarlyAccessForm() {
  const id = useId();
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = await submitEarlyAccess(formData);

    if (result.success) {
      setStatus("success");
      (e.target as HTMLFormElement).reset();
    } else {
      setStatus("error");
      setErrorMessage(result.error || "Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="p-6 rounded-2xl bg-success/10 border border-success/30 text-center">
        <p className="text-lg font-serif text-ink-primary mb-2">You&apos;re on the list!</p>
        <p className="text-sm text-ink-secondary">
          We&apos;ll be in touch within 48 hours to discuss your pilot.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        {status === "submitting" ? "Submitting..." : "Request Early Access"}
      </Button>

      <p className="text-xs text-ink-secondary text-center">
        We&apos;ll never share your information with third parties.
      </p>
    </form>
  );
}
