"use client";

import * as RadixSwitch from "@radix-ui/react-switch";

interface WatermarkSwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled: boolean;
}

export default function WatermarkSwitch({
  checked,
  onCheckedChange,
  disabled,
}: WatermarkSwitchProps): React.ReactElement {
  return (
    <label
      className={[
        "flex items-center gap-2.5 select-none transition-all duration-300",
        disabled
          ? "opacity-30 pointer-events-none cursor-not-allowed"
          : "cursor-pointer",
      ].join(" ")}
      title={disabled ? "Watermark removal not applicable" : "Remove the embedded watermark"}
    >
      <RadixSwitch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={[
          "relative w-9 h-5 rounded-full border transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
          checked ? "bg-white border-white" : "bg-[#222] border-[#333]",
        ].join(" ")}
      >
        <RadixSwitch.Thumb
          className={[
            "block w-3.5 h-3.5 rounded-full transition-all duration-300 shadow-sm",
            "absolute top-[3px] left-[3px]",
            checked ? "translate-x-[14px] bg-black" : "translate-x-0 bg-gray-500",
          ].join(" ")}
        />
      </RadixSwitch.Root>
      <span
        className={[
          "text-xs font-medium uppercase tracking-wider transition-colors duration-300",
          disabled ? "text-gray-500" : checked ? "text-white" : "text-gray-300",
        ].join(" ")}
      >
        No watermark
      </span>
    </label>
  );
}
