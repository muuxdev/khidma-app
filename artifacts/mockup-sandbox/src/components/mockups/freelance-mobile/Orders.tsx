import React from 'react';
import { PhoneFrame } from './_shared/PhoneFrame';
import { BottomNav } from './_shared/BottomNav';
import { Clock } from 'lucide-react';
import './_group.css';

export function Orders() {
  const orders = [
    {
      id: '#4821',
      title: 'Shopify Store Setup with Premium Theme',
      freelancer: 'Omar Al-Farsi',
      avatar: '/__mockup/images/freelance-mobile/avatar-1.png',
      thumb: '/__mockup/images/freelance-mobile/portfolio-1.png',
      status: 'In Progress',
      progress: 60,
      time: '2 days left',
      price: '$249',
      color: 'bg-[var(--fm-primary)]'
    },
    {
      id: '#4790',
      title: 'Meta Ads Campaign Management',
      freelancer: 'Sara Mohamed',
      avatar: '/__mockup/images/freelance-mobile/avatar-2.png',
      thumb: '/__mockup/images/freelance-mobile/portfolio-2.png',
      status: 'Awaiting Approval',
      progress: 100,
      time: 'Delivery ready',
      price: '$350',
      color: 'bg-[var(--fm-orange)]'
    },
    {
      id: '#4612',
      title: 'Product Photography - 20 Photos',
      freelancer: 'Khalid Nasr',
      avatar: '/__mockup/images/freelance-mobile/avatar-3.png',
      thumb: '/__mockup/images/freelance-mobile/portfolio-3.png',
      status: 'Delivered',
      progress: 100,
      time: 'Completed 1w ago',
      price: '$180',
      color: 'bg-[var(--fm-mint)]'
    }
  ];

  return (
    <PhoneFrame dir="ltr" className="bg-[#FAFAFA]">
      <div className="pb-24">
        {/* Header */}
        <div className="sticky top-0 z-30 pt-4 pb-2 px-6 fm-glass">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">My Orders</h1>
          
          <div className="flex gap-2 overflow-x-auto fm-scrollbar-hide pb-2">
            {['All', 'Active', 'Delivered', 'Cancelled'].map((tab, i) => (
              <button 
                key={tab} 
                className={`px-5 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all ${
                  i === 1 
                    ? 'bg-gray-900 text-white shadow-md' 
                    : 'bg-white border border-gray-200 text-gray-600'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Order List */}
        <div className="px-6 pt-4 space-y-4">
          {orders.map((order, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex gap-4 mb-4">
                <img src={order.thumb} className="w-16 h-16 rounded-xl object-cover shrink-0" alt="" />
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-bold text-gray-400">{order.id}</span>
                    <span className="font-bold text-gray-900">{order.price}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm leading-tight mb-2">{order.title}</h3>
                  <div className="flex items-center gap-1.5">
                    <img src={order.avatar} className="w-5 h-5 rounded-full" alt="" />
                    <span className="text-xs text-gray-500 font-medium">{order.freelancer}</span>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-gray-50 pt-3">
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-xs font-bold ${i === 2 ? 'text-[var(--fm-mint)]' : (i === 1 ? 'text-[var(--fm-orange)]' : 'text-[var(--fm-primary)]')}`}>
                    {order.status}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    {order.time}
                  </div>
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${order.color}`} style={{ width: `${order.progress}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <BottomNav active="orders" />
    </PhoneFrame>
  );
}
