import React from 'react';
import { Battery, Wifi, Signal } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StatusBar({ dark = false }: { dark?: boolean }) {
  return (
    <div className={cn(
      "h-12 flex items-center justify-between px-6 pt-2 shrink-0 z-50 relative",
      dark ? "text-white" : "text-black"
    )}>
      <div className="text-[15px] font-semibold tracking-tight">9:41</div>
      <div className="flex items-center gap-1.5">
        <Signal className="w-4 h-4" />
        <Wifi className="w-4 h-4" />
        <Battery className="w-[22px] h-[22px]" />
      </div>
    </div>
  );
}
