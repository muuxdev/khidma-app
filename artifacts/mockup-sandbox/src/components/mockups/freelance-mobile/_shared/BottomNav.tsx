import React from 'react';
import { Home, Grid, FileText, MessageCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TabType = 'home' | 'categories' | 'orders' | 'chat' | 'profile';

interface BottomNavProps {
  active: TabType;
  dark?: boolean;
}

export function BottomNav({ active, dark = false }: BottomNavProps) {
  const tabs = [
    { id: 'home', icon: Home, label: 'Home', rtlLabel: 'الرئيسية' },
    { id: 'categories', icon: Grid, label: 'Categories', rtlLabel: 'الأقسام' },
    { id: 'orders', icon: FileText, label: 'Orders', rtlLabel: 'الطلبات' },
    { id: 'chat', icon: MessageCircle, label: 'Chat', rtlLabel: 'المحادثات' },
    { id: 'profile', icon: User, label: 'Profile', rtlLabel: 'حسابي' },
  ];

  return (
    <div className={cn(
      "absolute bottom-0 left-0 right-0 h-20 px-6 pb-5 pt-3 flex justify-between items-center z-50 fm-glass",
      dark ? "dark bg-[#171923]/80 border-t border-white/5" : "bg-white/80 border-t border-black/5"
    )}>
      {tabs.map(tab => {
        const isActive = active === tab.id;
        const Icon = tab.icon;
        
        return (
          <div key={tab.id} className="flex flex-col items-center justify-center gap-1 flex-1 cursor-pointer">
            <div className={cn(
              "relative p-1 rounded-full transition-all duration-300",
              isActive ? "text-[#5B3EFF]" : (dark ? "text-gray-400" : "text-gray-400")
            )}>
              <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
              {isActive && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#39E2C2]" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
