import React from 'react';
import { PhoneFrame } from './_shared/PhoneFrame';
import { BottomNav } from './_shared/BottomNav';
import { ChevronLeft, Video, Phone, Paperclip, Mic, Send, MoreHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import './_group.css';

export function Chat() {
  return (
    <PhoneFrame dir="ltr" className="bg-[#FAFAFA]">
      <div className="flex flex-col h-[844px] pb-20">
        {/* Header */}
        <div className="pt-4 pb-3 px-4 bg-white shadow-sm flex items-center justify-between z-30 shrink-0 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <button className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-700">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="relative">
                <img src="/__mockup/images/freelance-mobile/avatar-1.png" className="w-10 h-10 rounded-full object-cover" alt="Omar" />
                <span className="absolute bottom-0 right-0 w-3 h-3 border-2 border-white bg-[var(--fm-mint)] rounded-full" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900 leading-none mb-1">Omar Al-Farsi</h2>
                <span className="text-xs font-medium text-gray-400">Online</span>
              </div>
            </div>
          </div>
          <div className="flex gap-1.5">
            <button className="w-9 h-9 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-50">
              <Phone className="w-4 h-4" />
            </button>
            <button className="w-9 h-9 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-50">
              <Video className="w-4 h-4" />
            </button>
            <button className="w-9 h-9 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-50">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5 bg-slate-50/50">
          <div className="text-center">
            <span className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">Today, 10:42 AM</span>
          </div>

          {/* Incoming */}
          <div className="flex gap-2 max-w-[85%]">
            <img src="/__mockup/images/freelance-mobile/avatar-1.png" className="w-8 h-8 rounded-full shrink-0 mt-auto" alt="" />
            <div>
              <div className="bg-white border border-gray-100 text-gray-800 p-3.5 rounded-2xl rounded-bl-sm shadow-sm text-sm font-medium leading-relaxed">
                Hello! I've started working on the Shopify theme setup. Could you share the high-res logo?
              </div>
              <span className="text-[10px] font-bold text-gray-400 mt-1 ml-1 block">10:42 AM</span>
            </div>
          </div>

          {/* Outgoing */}
          <div className="flex gap-2 max-w-[85%] self-end ml-auto">
            <div>
              <div className="bg-gradient-to-r from-[var(--fm-primary)] to-[var(--fm-primary-blue)] text-white p-3.5 rounded-2xl rounded-br-sm shadow-md text-sm font-medium leading-relaxed">
                Sure, sending it right now! Give me a second.
              </div>
              <span className="text-[10px] font-bold text-gray-400 mt-1 mr-1 block text-right">10:45 AM</span>
            </div>
          </div>

          {/* Outgoing File */}
          <div className="flex gap-2 max-w-[85%] self-end ml-auto">
            <div>
              <div className="bg-gradient-to-r from-[var(--fm-primary)] to-[var(--fm-primary-blue)] text-white p-2 rounded-2xl rounded-br-sm shadow-md">
                <div className="bg-white/20 rounded-xl p-3 flex items-center gap-3 w-48">
                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-[var(--fm-primary)]">
                    <Paperclip className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white truncate">logo-final.ai</div>
                    <div className="text-xs text-white/70">2.4 MB</div>
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold text-gray-400 mt-1 mr-1 block text-right">10:46 AM</span>
            </div>
          </div>

          {/* Incoming Preview */}
          <div className="flex gap-2 max-w-[85%]">
            <img src="/__mockup/images/freelance-mobile/avatar-1.png" className="w-8 h-8 rounded-full shrink-0 mt-auto" alt="" />
            <div>
              <div className="bg-white border border-gray-100 p-2 rounded-2xl rounded-bl-sm shadow-sm">
                <img src="/__mockup/images/freelance-mobile/portfolio-1.png" className="w-52 h-32 rounded-xl object-cover mb-2" alt="Preview" />
                <div className="text-sm font-medium text-gray-800 px-1.5 pb-1">
                  Got it. Here is a quick preview of the homepage layout. What do you think?
                </div>
              </div>
              <span className="text-[10px] font-bold text-gray-400 mt-1 ml-1 block">11:03 AM</span>
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t border-gray-100 flex items-center gap-3 shrink-0">
          <button className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-50 shrink-0">
            <Paperclip className="w-5 h-5" />
          </button>
          <div className="flex-1 relative">
            <Input 
              placeholder="Type a message..." 
              className="h-12 pr-10 bg-gray-50 border-transparent rounded-full text-sm font-medium focus-visible:ring-1 focus-visible:ring-[var(--fm-primary)]"
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-gray-400">
              <Mic className="w-4 h-4" />
            </button>
          </div>
          <button className="w-12 h-12 rounded-full bg-[var(--fm-primary)] flex items-center justify-center text-white shadow-md hover:bg-purple-700 shrink-0 pl-1">
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
      <BottomNav active="chat" />
    </PhoneFrame>
  );
}
