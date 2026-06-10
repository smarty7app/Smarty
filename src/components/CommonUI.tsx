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
    <div className="space-y-1.5 w-full">
      <label className="text-[10px] text-zinc-400 font-extrabold uppercase px-1 tracking-wider flex justify-between">
        <span>{label}</span>
        {highlight && <span className="text-purple-400 font-black animate-pulse">{manualLabel}</span>}
      </label>
      <div className={`
        flex items-center gap-2.5 rounded-xl px-4 py-3 transition-all duration-300 group slick-input
        ${highlight ? 'border-purple-500/50 bg-purple-500/5 shadow-[0_0_15px_rgba(168,85,247,0.1)]' : ''}
        ${readOnly ? 'opacity-60 select-none cursor-not-allowed' : ''}
      `}>
        {icon}
        <input 
          type={type}
          className={`bg-transparent w-full text-sm outline-none placeholder:text-zinc-600 font-medium ${readOnly ? 'cursor-not-allowed' : ''}`}
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
        {value && !highlight && <CheckCircle2 className="w-4 h-4 text-emerald-500/60 shrink-0" />}
      </div>
    </div>
  );
}

export function FeatureCard({ icon, title, desc }: { icon: ReactNode, title: string, desc: string }) {
  return (
    <div className="glass-card p-8 group hover:border-purple-500/40 hover:shadow-[0_0_30px_rgba(168,85,247,0.25)] transition-all duration-305">
      <div className="mb-6 p-3.5 bg-purple-500/10 rounded-2xl w-fit group-hover:scale-110 group-hover:bg-purple-500/25 group-hover:text-purple-400 text-zinc-400 border border-white/5 transition-all duration-300">
        {icon}
      </div>
      <h3 className="text-lg font-extrabold mb-3 tracking-tight text-white select-none">{title}</h3>
      <p className="text-zinc-400 leading-relaxed text-sm font-medium">{desc}</p>
    </div>
  );
}

export function Step({ number, text, isRtl }: { number: number, text: string, isRtl: boolean }) {
  return (
    <div className={`flex items-center gap-6 relative z-10 ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}>
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-xl font-black text-white shrink-0 shadow-[0_0_20px_rgba(147,51,234,0.25)] hover:scale-105 transition-transform duration-300">
        {number}
      </div>
      <div className="glass-card p-6 flex-1 hover:border-purple-500/20">
        <p className="font-semibold text-zinc-200 text-base leading-relaxed">{text}</p>
      </div>
    </div>
  );
}
