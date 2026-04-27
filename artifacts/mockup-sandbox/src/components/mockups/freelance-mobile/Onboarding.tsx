import React from 'react';
import { PhoneFrame } from './_shared/PhoneFrame';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import './_group.css';

export function Onboarding() {
  return (
    <PhoneFrame dark dir="rtl" className="bg-[var(--fm-bg-dark)]">
      <div className="relative min-h-[100dvh] flex flex-col text-[var(--fm-text-dark)] bg-[image:var(--fm-gradient-dark)]">
        {/* Skip button */}
        <div className="px-6 pt-4 flex justify-between items-center z-10 relative">
          <button className="text-sm text-gray-400 hover:text-white transition-colors">تخطي</button>
        </div>

        {/* Hero Image */}
        <div className="relative mt-8 mb-12 flex-1 flex flex-col items-center justify-center px-6">
          <div className="relative w-full aspect-square max-w-[320px] mx-auto rounded-3xl overflow-hidden shadow-2xl mb-12 border border-white/10">
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
            <img 
              src="/__mockup/images/freelance-mobile/onboarding-hero.png" 
              alt="E-commerce illustration" 
              className="w-full h-full object-cover"
            />
          </div>

          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold leading-tight">
              ابدأ مشروعك في <span className="text-[var(--fm-mint)]">التجارة الإلكترونية</span> بثقة
            </h1>
            <p className="text-gray-400 text-base leading-relaxed px-4">
              من تصميم المتجر إلى إطلاق الحملات الإعلانية، تواصل مع أفضل الخبراء في مكان واحد.
            </p>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="px-6 pb-12">
          <div className="flex justify-center gap-2 mb-8">
            <div className="w-2 h-2 rounded-full bg-white/20" />
            <div className="w-6 h-2 rounded-full bg-[var(--fm-mint)] shadow-[0_0_10px_rgba(57,226,194,0.5)]" />
            <div className="w-2 h-2 rounded-full bg-white/20" />
          </div>

          <Button 
            className="w-full bg-[var(--fm-mint)] text-black hover:bg-[var(--fm-mint)]/90 h-14 text-lg font-bold rounded-2xl shadow-[0_4px_20px_rgba(57,226,194,0.3)] border-none"
          >
            التالي
          </Button>
        </div>
      </div>
    </PhoneFrame>
  );
}
