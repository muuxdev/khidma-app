import React from 'react';
import { StatusBar } from './StatusBar';
import { cn } from '@/lib/utils';
import '../_group.css';

interface PhoneFrameProps {
  children: React.ReactNode;
  dark?: boolean;
  className?: string;
  dir?: 'ltr' | 'rtl';
}

export function PhoneFrame({ children, dark = false, className, dir = 'ltr' }: PhoneFrameProps) {
  return (
    <div className="w-full h-full bg-transparent flex items-center justify-center">
      <div 
        className={cn(
          "w-full h-full max-w-[390px] max-h-[844px] relative overflow-hidden rounded-[2.5rem] shadow-2xl flex flex-col",
          dark ? "bg-[#10121A] text-white dark" : "bg-[#FAFAFA] text-[#111318]",
          className
        )}
        dir={dir}
        style={{
          fontFamily: dir === 'rtl' ? "'Cairo', sans-serif" : "'Plus Jakarta Sans', 'Inter', sans-serif"
        }}
      >
        <StatusBar dark={dark} />
        
        <div className="flex-1 overflow-y-auto fm-scrollbar-hide relative z-10 pb-6">
          {children}
        </div>
        
        {/* Home Indicator */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1/3 h-1.5 rounded-full bg-black/20 dark:bg-white/20 z-50 pointer-events-none" />
      </div>
    </div>
  );
}
