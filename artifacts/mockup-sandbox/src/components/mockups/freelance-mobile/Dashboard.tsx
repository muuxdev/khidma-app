import React from 'react';
import { PhoneFrame } from './_shared/PhoneFrame';
import { BottomNav } from './_shared/BottomNav';
import { Bell, Briefcase, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import './_group.css';

export function Dashboard() {
  return (
    <PhoneFrame dark dir="ltr" className="bg-[var(--fm-bg-dark)]">
      <div className="pb-24 text-[var(--fm-text-dark)] min-h-full bg-[image:var(--fm-gradient-dark)]">
        {/* Header */}
        <div className="pt-4 pb-6 px-6 flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-400 font-medium mb-1">Welcome back,</p>
            <h1 className="text-2xl font-bold">Sara Mohamed</h1>
          </div>
          <div className="relative">
            <div className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-sm">
              <Bell className="w-5 h-5 text-gray-300" />
            </div>
            <span className="absolute top-0 right-0 w-3 h-3 bg-[var(--fm-orange)] border-2 border-[var(--fm-bg-dark)] rounded-full" />
          </div>
        </div>

        {/* Earnings Card */}
        <div className="px-6 mb-6">
          <div className="relative p-6 rounded-3xl overflow-hidden border border-white/10 shadow-[0_8px_32px_rgba(91,62,255,0.15)] bg-gradient-to-br from-[#202330] to-[#12141C]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--fm-primary)] rounded-full blur-[60px] opacity-20" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-[var(--fm-mint)] rounded-full blur-[50px] opacity-10" />
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-gray-400">Earnings this month</span>
                <span className="text-xs font-bold text-[var(--fm-mint)] bg-[var(--fm-mint)]/10 px-2 py-1 rounded-md">+12.4%</span>
              </div>
              <h2 className="text-4xl font-bold tracking-tight mb-6">$4,287.50</h2>
              
              {/* Fake Sparkline */}
              <div className="h-12 w-full flex items-end opacity-80">
                <svg viewBox="0 0 100 30" className="w-full h-full preserve-aspect-ratio-none">
                  <path d="M0,25 L10,20 L20,28 L30,15 L40,22 L50,10 L60,18 L70,5 L80,12 L90,2 L100,8" fill="none" stroke="url(#gradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#5B3EFF" />
                      <stop offset="100%" stopColor="#39E2C2" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="px-6 grid grid-cols-3 gap-3 mb-8">
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 backdrop-blur-md">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mb-3">
              <Briefcase className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold mb-1">6</p>
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Active</p>
          </div>
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 backdrop-blur-md">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold mb-1">142</p>
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Completed</p>
          </div>
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 backdrop-blur-md">
            <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center mb-3">
              <Clock className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold mb-1">2h</p>
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Response</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="px-6">
          <h3 className="text-lg font-bold mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 backdrop-blur-md flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold">New Order #4822</h4>
                <p className="text-xs text-gray-400 mt-0.5">Meta Ads Campaign</p>
              </div>
              <span className="text-sm font-bold text-white">$350</span>
            </div>

            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 backdrop-blur-md flex items-center gap-4">
              <img src="/__mockup/images/freelance-mobile/avatar-1.png" className="w-10 h-10 rounded-full object-cover shrink-0" alt="" />
              <div className="flex-1">
                <h4 className="text-sm font-bold">Message from Omar</h4>
                <p className="text-xs text-gray-400 mt-0.5">Can you update the logo?</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-[var(--fm-primary)]" />
            </div>
          </div>
        </div>
      </div>
      <BottomNav active="profile" dark />
    </PhoneFrame>
  );
}
