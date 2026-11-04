import * as React from "react";
import { Pill } from "@/components/ui/pill";

export default function CheckinPage() {
  return (
    <div className="space-y-4">
      <Pill>Daily Check-in</Pill>
      <h1 className="font-heading text-3xl text-ink">Heart Check</h1>
      <p className="text-sm text-inkSoft">Share how your heart is doing today.</p>
    </div>
  );
}
