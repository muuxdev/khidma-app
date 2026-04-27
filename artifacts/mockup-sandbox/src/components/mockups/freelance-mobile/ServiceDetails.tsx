import React, { useState } from 'react';
import { PhoneFrame } from './_shared/PhoneFrame';
import { ChevronRight, Share, Heart, Star, Shield, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import './_group.css';

export function ServiceDetails() {
  const [activeTab, setActiveTab] = useState('packages');

  return (
    <PhoneFrame dir="rtl" className="bg-[#FAFAFA]">
      <div className="pb-28">
        {/* Hero Image & Top Nav */}
        <div className="relative h-[280px] w-full">
          <img src="/__mockup/images/freelance-mobile/portfolio-1.png" className="w-full h-full object-cover" alt="Service" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/20" />
          
          <div className="absolute top-4 left-0 right-0 px-6 flex justify-between items-center z-10">
            <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
              <ChevronRight className="w-6 h-6" />
            </button>
            <div className="flex gap-3">
              <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                <Share className="w-5 h-5" />
              </button>
              <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                <Heart className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pt-5 bg-white rounded-t-3xl -mt-6 relative z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-xl font-bold text-gray-900 leading-snug flex-1 pl-4">تصميم متجر شوبيفاي احترافي بثيم مميز</h1>
          </div>

          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
            <img src="/__mockup/images/freelance-mobile/avatar-1.png" className="w-12 h-12 rounded-full object-cover" alt="Freelancer" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 text-sm">عمر الفارسي</span>
                <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-blue-50 text-[var(--fm-primary-blue)] rounded font-bold">
                  <Shield className="w-3 h-3" />
                  محترف موثّق
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium mt-1">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="text-gray-900 font-bold">5.0</span>
                <span className="text-gray-400">(412 تقييم)</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex bg-gray-50 p-1 rounded-xl mb-6">
            <button 
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'overview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
              onClick={() => setActiveTab('overview')}
            >
              نظرة عامة
            </button>
            <button 
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'packages' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
              onClick={() => setActiveTab('packages')}
            >
              الباقات
            </button>
            <button 
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'reviews' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
              onClick={() => setActiveTab('reviews')}
            >
              التقييمات
            </button>
          </div>

          {/* Packages Content */}
          {activeTab === 'packages' && (
            <div className="space-y-4">
              {/* Standard Package (Active) */}
              <div className="border-2 border-[var(--fm-primary)] rounded-2xl p-5 relative shadow-[0_8px_30px_rgba(91,62,255,0.12)]">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--fm-primary)] text-white text-xs font-bold px-3 py-1 rounded-full">
                  الأكثر طلباً
                </div>
                <div className="flex justify-between items-end mb-4 pt-1">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">قياسي</h3>
                    <p className="text-sm text-gray-500 mt-1">متجر متكامل بـ 10 منتجات</p>
                  </div>
                  <div className="text-right">
                    <div className="text-[var(--fm-primary)] font-bold text-xl">850 ر.س</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-5 bg-purple-50 w-fit px-3 py-1.5 rounded-lg">
                  <Clock className="w-4 h-4 text-[var(--fm-primary)]" />
                  تسليم خلال 5 أيام
                </div>

                <div className="space-y-3 mb-6">
                  {['تصميم ثيم احترافي', 'إضافة 10 منتجات مع الوصف', 'ربط بوابات الدفع (مدى، ابل باي)', 'ربط دومين مخصص'].map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-[var(--fm-mint)] shrink-0" />
                      <span className="text-sm text-gray-600 font-medium">{item}</span>
                    </div>
                  ))}
                </div>

                <Button className="w-full bg-[var(--fm-primary)] text-white h-12 rounded-xl font-bold shadow-md hover:bg-purple-700">
                  احجز الباقة
                </Button>
              </div>

              {/* Basic Package */}
              <div className="border border-gray-200 rounded-2xl p-5 bg-white opacity-70">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">أساسي</h3>
                    <p className="text-sm text-gray-500 mt-1">تجهيز أساسي للمتجر</p>
                  </div>
                  <div className="text-gray-900 font-bold text-xl">450 ر.س</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Bottom Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 flex items-center justify-between gap-4 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 font-medium">الإجمالي</span>
            <span className="font-bold text-xl text-gray-900 leading-none mt-1">850 ر.س</span>
          </div>
          <div className="flex gap-2 flex-1">
            <button className="h-14 px-4 rounded-xl border border-gray-200 text-gray-700 font-bold bg-white text-sm whitespace-nowrap">
              تواصل
            </button>
            <Button className="flex-1 h-14 rounded-xl text-white font-bold text-base shadow-[0_8px_20px_rgba(91,62,255,0.25)] border-none" style={{ background: 'var(--fm-gradient-brand)' }}>
              اطلب الآن
            </Button>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}
