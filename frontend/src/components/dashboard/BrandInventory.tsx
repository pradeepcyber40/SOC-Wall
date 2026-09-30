import React from 'react';
import { Tag, ArrowRight, Layers } from 'lucide-react';
import { BrandItem } from '../../types';

interface BrandInventoryProps {
  brands: BrandItem[];
  onSelectBrand: (brand: string) => void;
  selectedBrand?: string;
}

export const BrandInventory: React.FC<BrandInventoryProps> = ({ brands, onSelectBrand, selectedBrand }) => {
  const maxCount = Math.max(...brands.map((b) => b.count), 1);

  return (
    <div className="bg-[#0d1321] border border-[#1c2842] rounded-xl shadow-soc-panel overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 bg-[#11192c] border-b border-[#1c2842] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Tag className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
            Brand Distribution & OEM Footprint
          </h2>
        </div>
        <span className="text-xs font-mono text-slate-400">
          Hardware Vendors
        </span>
      </div>

      {/* Brand list */}
      <div className="p-4 space-y-3">
        {brands.length === 0 ? (
          <div className="py-8 text-center text-slate-500 font-mono text-xs">
            <Layers className="w-6 h-6 text-slate-600 mx-auto mb-1.5" />
            <p>No OEM brand signatures profiled yet.</p>
            <span className="text-[10px] text-slate-600">Discovered MAC addresses and agent hardware will populate here.</span>
          </div>
        ) : (
          brands.map((b) => {
            const pct = Math.round((b.count / maxCount) * 100);
            const isSelected = selectedBrand === b.brand;

            return (
              <div
                key={b.brand}
                onClick={() => onSelectBrand(b.brand === 'Other Vendors' ? 'All' : b.brand)}
                className={`p-3 rounded-lg border cursor-pointer transition-all duration-150 select-none group ${
                  isSelected
                    ? 'bg-cyan-950/30 border-[#00d2ff] shadow-glow-cyan'
                    : 'bg-[#090d16] border-[#1c2842] hover:border-cyan-500/50 hover:bg-[#141d30]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5 font-mono">
                  <span className="text-xs font-bold text-slate-200 group-hover:text-white">
                    {b.brand}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-cyan-300">
                      {b.count.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      ({b.online} online)
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                  </div>
                </div>

                {/* Bar Meter */}
                <div className="w-full h-1.5 bg-[#141d30] rounded-full overflow-hidden border border-[#1c2842]">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
