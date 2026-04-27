import React from 'react';
import { PhoneFrame } from './_shared/PhoneFrame';
import { BottomNav } from './_shared/BottomNav';
import { Bell, Wallet, Search, Filter, Sparkles, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import './_group.css';

export function Home() {
  const categories = [
    'تصميم متجر', 'إعلانات', 'تصوير', 'SEO', 'براندينج', 'محتوى'
  ];

  const featuredServices = [
    {
      id: 1,
      image: '/__mockup/images/freelance-mobile/portfolio-1.png',
      title: 'تصميم متجر شوبيفاي احترافي بثيم مميز',
      freelancer: 'سارة محمد',
      avatar: '/__mockup/images/freelance-mobile/avatar-2.png',
      rating: 4.9,
      price: '850 ر.س',
    },
    {
      id: 2,
      image: '/__mockup/images/freelance-mobile/portfolio-2.png',
      title: 'إدارة حملات تيك توك الإعلانية - شهر',
      freelancer: 'خالد نصر',
      avatar: '/__mockup/images/freelance-mobile/avatar-3.png',
      rating: 4.8,
      price: '1,200 ر.س',
    }
  ];

  const topFreelancers = [
    {
      id: 1,
      name: 'ليلى حسن',
      specialty: 'براندينج وتصميم هويات',
      avatar: '/__mockup/images/freelance-mobile/avatar-4.png',
      rating: '4.9',
      reviews: 287
    },
    {
      id: 2,
      name: 'عمر الفارسي',
      specialty: 'خبير شوبيفاي وسلة',
      avatar: '/__mockup/images/freelance-mobile/avatar-1.png',
      rating: '5.0',
      reviews: 412
    }
  ];

  return (
    <PhoneFrame dir="rtl" className="bg-[#FAFAFA]">
      <div className="pb-24">
        {/* Header */}
        <div className="sticky top-0 z-30 pt-2 pb-4 px-6 fm-glass">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 border-2 border-white shadow-sm">
                <AvatarImage src="/__mockup/images/freelance-mobile/avatar-4.png" />
                <AvatarFallback>LH</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm text-gray-500">أهلاً بك،</p>
                <p className="text-lg font-bold text-gray-900 leading-none mt-0.5">ليلى</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm relative">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-[var(--fm-orange)]" />
              </div>
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                <Wallet className="w-5 h-5 text-gray-600" />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <Input 
                placeholder="ابحث عن خدمات..." 
                className="h-12 pr-11 bg-white border-transparent shadow-sm rounded-xl text-base"
              />
            </div>
            <button className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm text-[var(--fm-primary)] shrink-0">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Categories */}
        <div className="mt-4 px-6 mb-8">
          <div className="flex gap-3 overflow-x-auto fm-scrollbar-hide pb-2 -mx-6 px-6">
            <div className="px-5 py-2 rounded-full bg-[var(--fm-primary)] text-white font-medium text-sm whitespace-nowrap shadow-sm">
              الكل
            </div>
            {categories.map((cat, i) => (
              <div key={i} className="px-5 py-2 rounded-full bg-white border border-gray-100 text-gray-600 font-medium text-sm whitespace-nowrap shadow-sm">
                {cat}
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Header */}
        <div className="px-6 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[var(--fm-primary-blue)] font-semibold bg-blue-50 px-3 py-1.5 rounded-lg">
            <Sparkles className="w-4 h-4" />
            <span>موصى به لك</span>
          </div>
          <span className="text-sm font-medium text-gray-400">عرض الكل</span>
        </div>

        {/* Featured Services Horizontal Scroll */}
        <div className="flex gap-4 overflow-x-auto fm-scrollbar-hide pb-8 -mx-6 px-6">
          {featuredServices.map(service => (
            <div key={service.id} className="w-[260px] shrink-0 bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
              <div className="h-[140px] relative">
                <img src={service.image} alt={service.title} className="w-full h-full object-cover" />
                <button className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-gray-600">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                </button>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-1 text-sm font-medium text-gray-700">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{service.rating}</span>
                  </div>
                  <span className="font-bold text-[var(--fm-primary)]" dir="rtl">{service.price}</span>
                </div>
                <h3 className="font-bold text-gray-900 leading-tight mb-3 line-clamp-2">{service.title}</h3>
                <div className="flex items-center gap-2">
                  <img src={service.avatar} className="w-6 h-6 rounded-full object-cover" alt="" />
                  <span className="text-sm text-gray-500 font-medium">{service.freelancer}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Top Freelancers */}
        <div className="px-6 mb-4">
          <h2 className="text-lg font-bold text-gray-900 mb-4">أفضل المستقلين</h2>
          <div className="space-y-3">
            {topFreelancers.map((freelancer) => (
              <div key={freelancer.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                <img src={freelancer.avatar} className="w-14 h-14 rounded-full object-cover" alt="" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-gray-900">{freelancer.name}</h4>
                    <span className="text-[10px] px-2 py-0.5 bg-purple-50 text-[var(--fm-primary)] font-bold rounded">موثّق</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-1.5">{freelancer.specialty}</p>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>{freelancer.rating}</span>
                    <span className="text-gray-400">({freelancer.reviews} تقييم)</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <BottomNav active="home" />
    </PhoneFrame>
  );
}
