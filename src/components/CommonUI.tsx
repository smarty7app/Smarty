import { ReactNode } from "react";
import { CheckCircle2, CheckCircle } from "lucide-react";

export const Logo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M21 8L12 13L3 8V16L12 21L21 16V8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 13V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 8L12 3L3 8L12 13L21 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 14.5C10 13.5 11 13 12 13C13 13 14 13.5 14 14.5C14 15.5 13 16 12 16C11 16 10 16.5 10 17.5C10 18.5 11 19 12 19C13 19 14 18.5 14 17.5" 
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" 
    />
  </svg>
);

export function InputField({ label, value, onChange, icon, highlight, manualLabel, type = "text", readOnly = false }: { 
  label: string, 
  value: string, 
  onChange: (v: string) => void,
  icon?: ReactNode,
  highlight?: boolean,
  manualLabel?: string,
  type?: string,
  readOnly?: boolean
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] text-zinc-500 uppercase px-1 tracking-wider flex justify-between">
        {label}
        {highlight && <span className="text-yellow-500 font-bold">{manualLabel}</span>}
      </label>
      <div className={`
        flex items-center gap-2 bg-black/50 border rounded-xl px-3 py-2 transition-all group
        ${highlight ? 'border-yellow-500/50 bg-yellow-500/5 shadow-[0_0_10px_rgba(234,179,8,0.05)]' : 'border-zinc-800 focus-within:border-zinc-600'}
        ${readOnly ? 'opacity-60 select-none cursor-not-allowed' : ''}
      `}>
        {icon}
        <input 
          type={type}
          className={`bg-transparent w-full text-sm outline-none placeholder:text-zinc-800 ${readOnly ? 'cursor-not-allowed' : ''}`}
          value={value ?? ""}
          onChange={(e) => {
            if (!readOnly) {
              onChange(e.target.value);
            }
          }}
          readOnly={readOnly}
        />
        {value && !highlight && <CheckCircle2 className="w-4 h-4 text-green-500/50" />}
      </div>
    </div>
  );
}

export function FeatureCard({ icon, title, desc }: { icon: ReactNode, title: string, desc: string }) {
  return (
    <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-blue-500/50 hover:bg-white/[0.05] transition-all group">
      <div className="mb-6 p-3 bg-white/5 rounded-2xl w-fit group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 tracking-tight">{title}</h3>
      <p className="text-zinc-500 leading-relaxed text-sm">{desc}</p>
    </div>
  );
}

export function Step({ number, text, isRtl }: { number: number, text: string, isRtl: boolean }) {
  return (
    <div className={`flex items-center gap-8 relative z-10 ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}>
      <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-2xl font-bold shrink-0 shadow-[0_0_20px_rgba(37,99,235,0.3)]">
        {number}
      </div>
      <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 flex-1 hover:bg-white/[0.05] transition-all">
        <p className="font-medium text-lg leading-relaxed">{text}</p>
      </div>
    </div>
  );
}
