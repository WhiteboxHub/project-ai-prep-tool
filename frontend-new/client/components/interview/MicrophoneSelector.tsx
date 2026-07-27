import React from "react";
import { Mic, ChevronDown } from "lucide-react";

interface MicrophoneSelectorProps {
  availableMics: MediaDeviceInfo[];
  selectedMicId: string;
  onSelect: (deviceId: string) => void;
}

export function MicrophoneSelector({ availableMics, selectedMicId, onSelect }: MicrophoneSelectorProps) {
  if (availableMics.length <= 1) {
    return null; // Do not show if there's only 0 or 1 mic
  }

  return (
    <div className="w-full mb-4">
      <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
        <Mic className="w-4 h-4 text-primary" />
        Select Microphone
      </label>
      <div className="relative">
        <select
          value={selectedMicId}
          onChange={(e) => onSelect(e.target.value)}
          className="w-full appearance-none bg-card border border-border/50 text-foreground text-sm rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all cursor-pointer"
        >
          {availableMics.map((mic) => (
            <option key={mic.deviceId} value={mic.deviceId}>
              {mic.label || `Microphone ${mic.deviceId.slice(0, 5)}...`}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-muted-foreground">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
