import React from 'react';
import { PhoneFrame } from './_shared/PhoneFrame';
import { BottomNav } from './_shared/BottomNav';
import { ChevronLeft, Filter, ShoppingBag, PieChart, PenTool, Camera, TrendingUp, Search, Monitor, Mail } from 'lucide-react';
import './_group.css';

export function Categories() {
  const categories = [
    { name: 'Store Setup', icon: ShoppingBag, count: '1.2k', color: 'from-blue-500 to-cyan-400' },
    { name: 'Meta Ads', icon: TrendingUp, count: '850', color: 'from-purple-500 to-indigo-400' },
    { name: 'Branding', icon: PenTool, count: '2.1k', color: 'from-pink-500 to-rose-400' },
    { name: 'Photography', icon: Camera, count: '640', color: 'from-amber-500 to-orange-400' },
    { name: 'SEO', icon: Search, count: '920', color: 'from-emerald-500 to-teal-400' },
    { name: 'TikTok Ads', icon: Monitor, count: '1.5k', color: 'from-gray-800 to-gray-600' },
    { name: 'Copywriting', icon: PieChart, count: '430', color: 'from-blue-600 to-indigo-500' },
    { name: 'Email Mktg', icon: Mail, count: '310', color: 'from-violet-500 to-purple-400' },
  ];

  return (
    <PhoneFrame dir="ltr" className="bg-[#FAFAFA]">
      <div className="pb-24">
        {/* Header */}
        <div className="sticky top-0 z-30 pt-4 pb-4 px-6 fm-glass flex items-center justify-between">
          <button className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-700">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Browse Categories</h1>
          <button className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-700">
            <Filter className="w-5 h-5" />
          </button>
        </div>

        {/* Grid */}
        <div className="px-6 pt-4">
          <div className="grid grid-cols-2 gap-4">
            {categories.map((cat, idx) => {
              const Icon = cat.icon;
              return (
                <div key={idx} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col items-center text-center group active:scale-95 transition-transform">
                  <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${cat.color} flex items-center justify-center mb-4 shadow-md group-hover:shadow-lg transition-shadow`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-[15px] mb-1">{cat.name}</h3>
                  <p className="text-xs font-medium text-gray-400">{cat.count} services</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <BottomNav active="categories" />
    </PhoneFrame>
  );
}
