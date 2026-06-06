"use client";

import React from "react";

export default function AccordionGroup({
  title,
  count,
  open,
  onToggle,
  children,
  badgeClassName = "text-xs px-2 py-0.5 rounded-full bg-[#C8A84E]/15 text-[#C8A84E]",
}: {
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  badgeClassName?: string;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition active:scale-[0.99]"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white/90">{title}</span>
          <span className={badgeClassName}>{count}</span>
        </div>

        <span className={`transform transition-transform duration-300 ${open ? "rotate-180" : ""}`}>
          ▼
        </span>
      </button>

      {open && <div className="px-3 pb-3 flex flex-col gap-3">{children}</div>}
    </div>
  );
}
