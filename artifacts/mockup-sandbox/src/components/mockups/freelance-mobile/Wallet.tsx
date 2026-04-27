import React from 'react';
import { PhoneFrame } from './_shared/PhoneFrame';
import { BottomNav } from './_shared/BottomNav';
import { ChevronLeft, ArrowUpRight, ArrowDownLeft, Building2, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import './_group.css';

export function Wallet() {
  const transactions = [
    { type: 'income', amount: '+$850.00', title: 'Order #4821', desc: 'Shopify Setup', date: 'Today, 2:40 PM', fee: '-$170 commission' },
    { type: 'expense', amount: '-$500.00', title: 'Withdrawal', desc: 'To Bank ****4091', date: 'Yesterday', fee: null },
    { type: 'expense', amount: '-$42.50', title: 'Platform Fee', desc: 'Subscription', date: 'Sep 1', fee: null },
    { type: 'income', amount: '+$350.00', title: 'Order #4790', desc: 'Meta Ads', date: 'Aug 28', fee: '-$70 commission' },
    { type: 'income', amount: '+$180.00', title: 'Order #4612', desc: 'Photography', date: 'Aug 20', fee: '-$36 commission' },
  ];

  return (
    <PhoneFrame dark dir="ltr" className="bg-[var(--fm-bg-dark)]">
      <div className="pb-24 text-[var(--fm-text-dark)] min-h-full">
        {/* Header */}
        <div className="pt-4 pb-4 px-6 flex items-center justify-between sticky top-0 bg-[var(--fm-bg-dark)]/80 backdrop-blur-md z-30">
          <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">My Wallet</h1>
          <div className="w-10 h-10" /> {/* Spacer */}
        </div>

        {/* Balance Card */}
        <div className="px-6 mt-2 mb-8">
          <div className="rounded-[2rem] p-6 shadow-2xl relative overflow-hidden" style={{ background: 'var(--fm-gradient-brand)' }}>
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/20 rounded-full blur-2xl translate-x-10 -translate-y-10" />
            
            <div className="relative z-10">
              <span className="text-white/80 text-sm font-medium">Available Balance</span>
              <h2 className="text-4xl font-bold text-white mt-1 mb-6 tracking-tight">$3,840.00</h2>
              
              <div className="flex gap-3">
                <Button className="flex-1 bg-[var(--fm-mint)] text-black hover:bg-[var(--fm-mint)]/90 font-bold h-12 rounded-xl border-none">
                  Withdraw
                </Button>
                <Button variant="outline" className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20 font-bold h-12 rounded-xl backdrop-blur-sm">
                  History
                </Button>
              </div>

              <div className="mt-6 pt-5 border-t border-white/20 flex justify-between items-center">
                <span className="text-white/80 text-sm">Pending Clearance</span>
                <span className="text-white font-bold">$447.50</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="px-6 mb-8">
          <h3 className="text-base font-bold mb-4">Payment Methods</h3>
          <div className="flex gap-3 overflow-x-auto fm-scrollbar-hide pb-2">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 min-w-[140px] shrink-0 flex flex-col gap-3">
              <Building2 className="w-6 h-6 text-gray-400" />
              <div>
                <p className="text-sm font-bold">Bank Account</p>
                <p className="text-xs text-gray-500">**** 4091</p>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 min-w-[140px] shrink-0 flex flex-col gap-3">
              <CreditCard className="w-6 h-6 text-gray-400" />
              <div>
                <p className="text-sm font-bold">Mastercard</p>
                <p className="text-xs text-gray-500">**** 8820</p>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="px-6">
          <h3 className="text-base font-bold mb-4">Recent Transactions</h3>
          <div className="space-y-4">
            {transactions.map((t, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  t.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-white/60'
                }`}>
                  {t.type === 'income' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold">{t.title}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-bold block ${
                    t.type === 'income' ? 'text-emerald-400' : 'text-white'
                  }`}>{t.amount}</span>
                  {t.fee && <span className="text-[10px] text-gray-500">{t.fee}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}
