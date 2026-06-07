import { ReactNode } from "react";
import { CheckCircle2, CheckCircle } from "lucide-react";

export const Logo = ({ className }: { className?: string }) => (
  <img 
    src="/apple-touch-icon.png" 
    alt="SmartyAi Order Logo" 
    className={`w-full h-full object-cover scale-[1.1] select-none ${className || ""}`} 
    referrerPolicy="no-referrer" 
  />
);

export function InputField({ label, value, onChange, icon, highlight, manualLabel, type = "text", readOnly = false, onFocus, onBlur }: { 
  label: string, 
  value: string, 
  onChange: (v: string) => void,
  icon?: ReactNode,
  highlight?: boolean,
  manualLabel?: string,
  type?: string,
  readOnly?: boolean,
  onFocus?: () => void,
  onBlur?: () => void
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
          onFocus={onFocus}
          onBlur={onBlur}
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
      <h3 className="text-xl font-bold mb-3 tracking-tight select-none">{title}</h3>
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
