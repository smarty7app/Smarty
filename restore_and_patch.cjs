const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  // 1. Restore the file using Git
  console.log('Restoring file from git...');
  execSync('git checkout src/components/LandingPage.tsx', { stdio: 'inherit' });
  console.log('Git checkout successful!');

  // 2. Read the restored (perfectly compiled and clean!) file
  const filePath = path.join(__dirname, 'src', 'components', 'LandingPage.tsx');
  let content = fs.readFileSync(filePath, 'utf8');

  // Let's replace the hardcoded backgrounds and text colors safely
  
  // Section 3: bg-[#0A0D17] -> bg-slate-50 dark:bg-[#0A0D17] and responsive texts
  content = content.replace(
    'className="py-24 px-6 border-b border-white/[0.04] bg-[#0A0D17]"',
    'className="py-24 px-6 border-b border-zinc-200 dark:border-white/[0.04] bg-slate-50 dark:bg-[#0A0D17] transition-colors duration-300"'
  );
  
  // Inside section 3, replace hardcoded dark classes
  content = content.replace(
    '<h3 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">',
    '<h3 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">'
  );
  content = content.replace(
    '<p className="text-zinc-400 text-sm leading-relaxed">',
    '<p className="text-slate-600 dark:text-zinc-400 text-sm leading-relaxed">'
  );
  content = content.replace(
    '<span className="text-xs font-semibold text-zinc-300 leading-normal">{feat}</span>',
    '<span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 leading-normal">{feat}</span>'
  );

  // Section FAQ: bg-[#080B13]/40 -> bg-slate-100 dark:bg-[#080B13]/40 and responsive FAQ components
  content = content.replace(
    'className="py-20 px-6 bg-[#080B13]/40 border-t border-white/[0.05]"',
    'className="py-20 px-6 bg-slate-100 dark:bg-[#080B13]/40 border-t border-zinc-205 dark:border-white/[0.05] transition-colors duration-300"'
  );
  content = content.replace(
    '<h2 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-snug md:leading-normal select-none">',
    '<h2 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-snug md:leading-normal select-none text-slate-900 dark:text-white">'
  );
  content = content.replace(
    '<div key={idx} className="bg-zinc-950/40 border border-zinc-900 rounded-3xl p-6 hover:border-zinc-800 transition-all duration-300">',
    '<div key={idx} className="bg-white/50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-950 rounded-3xl p-6 hover:border-zinc-300 dark:hover:border-zinc-800 transition-all duration-300 shadow-sm dark:shadow-none">'
  );
  content = content.replace(
    '<h4 className="font-bold text-white text-sm sm:text-base mb-2.5 flex items-start gap-2.5 select-none animate-shimmer">',
    '<h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base mb-2.5 flex items-start gap-2.5 select-none">'
  );
  content = content.replace(
    '<p className="text-zinc-400 text-xs sm:text-sm leading-relaxed pl-4 pr-4">',
    '<p className="text-slate-600 dark:text-zinc-400 text-xs sm:text-sm leading-relaxed pl-4 pr-4">'
  );

  // Section Pricing: title and subtitle heading colors
  content = content.replace(
    '<h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-snug md:leading-normal select-none">{t.sub_upgrade || "Upgrade Plans"}</h2>',
    '<h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-snug md:leading-normal select-none text-slate-900 dark:text-white">{t.sub_upgrade || "Upgrade Plans"}</h2>'
  );
  content = content.replace(
    '<p className="text-zinc-405 text-lg max-w-2xl mx-auto">{t.landing_pricing_subtitle || "Choose the best plan for your business."}</p>',
    '<p className="text-slate-600 dark:text-zinc-400 text-lg max-w-2xl mx-auto">{t.landing_pricing_subtitle || "Choose the best plan for your business."}</p>'
  );

  // Plan Cards
  content = content.replace(
    /\$\{plan\.popular\s*\?\s*'bg-gradient-to-b from-purple-950\/20 to-zinc-950\/20 border-purple-500 shadow-\[0_0_55px_rgba\(147,51,234,0\.15\)\] ring-2 ring-purple-500\/50 hover:scale-\[1\.01\]'\s*:\s*plan\.color === 'blue'\s*\?\s*'bg-white\/\[0\.01\] border-blue-900\/30 hover:border-blue-500\/50 hover:scale-\[1\.01\]'\s*:\s*plan\.color === 'yellow'\s*\?\s*'bg-white\/\[0\.01\] border-yellow-905\/30 hover:border-yellow-500\/50 hover:scale-\[1\.01\]'\s*:\s*'bg-white\/\[0\.02\] border-white\/10 hover:border-white\/20 hover:scale-\[1\.01\]'\}/g,
    `\$\{plan.popular 
                    ? 'bg-gradient-to-b from-purple-50/50 to-white dark:from-purple-950/20 dark:to-zinc-950/20 border-purple-500 shadow-[0_0_55px_rgba(147,51,234,0.15)] ring-2 ring-purple-500/50 hover:scale-[1.01] text-slate-900 dark:text-white' 
                    : plan.color === 'blue'
                      ? 'bg-slate-50 dark:bg-white/[0.01] border-slate-200 dark:border-blue-900/30 hover:border-blue-500/50 hover:scale-[1.01] text-slate-900 dark:text-white'
                      : plan.color === 'yellow'
                        ? 'bg-slate-50 dark:bg-white/[0.01] border-slate-200 dark:border-yellow-905/30 hover:border-yellow-500/50 hover:scale-[1.01] text-slate-900 dark:text-white'
                        : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 hover:border-white/20 hover:scale-[1.01] text-slate-900 dark:text-white'\}`
  );

  // Pricing items text and button
  content = content.replace(
    "plan.color === 'purple' ? 'text-purple-400' : \n                  plan.color === 'yellow' ? 'text-yellow-400' : 'text-zinc-400'",
    "plan.color === 'purple' ? 'text-purple-600 dark:text-purple-400' : \n                  plan.color === 'yellow' ? 'text-amber-600 dark:text-yellow-400' : 'text-slate-500 dark:text-zinc-400'"
  );
  content = content.replace(
    "plan.color === 'yellow' ? 'text-yellow-400' : 'text-zinc-505'",
    "plan.color === 'yellow' ? 'text-amber-500 dark:text-yellow-400' : 'text-slate-400 dark:text-zinc-505'"
  );
  content = content.replace(
    '<span className="text-xs font-medium text-zinc-350 text-zinc-300 leading-normal select-none">{feature}</span>',
    '<span className="text-xs font-medium text-slate-700 dark:text-zinc-300 leading-normal select-none">{feature}</span>'
  );
  content = content.replace(
    /\s*: 'bg-white text-black hover:bg-zinc-205'/g,
    `: 'bg-slate-900 text-white dark:bg-white dark:text-black hover:bg-slate-800 dark:hover:bg-zinc-200 border border-slate-200 dark:border-transparent'`
  );

  // Footer: bg-[#070A11] -> bg-slate-100 dark:bg-[#070A11] and responsive border/texts
  content = content.replace(
    'className="py-20 px-6 border-t border-white/10 bg-[#070A11] relative select-none"',
    'className="py-20 px-6 border-t border-zinc-250 dark:border-white/10 bg-slate-100 dark:bg-[#070A11] relative select-none transition-colors duration-300"'
  );
  content = content.replace(
    'className="text-zinc-500 hover:text-white',
    'className="text-slate-500 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-white'
  );
  content = content.replace(
    'className="text-zinc-400 hover:text-white text-xs block"',
    'className="text-slate-600 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white text-xs block"'
  );
  content = content.replace(
    'className="text-xs text-zinc-500"',
    'className="text-xs text-slate-500 dark:text-zinc-500"'
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('PATCH_SUCCESS_ALL');
} catch (e) {
  console.error('ERROR:', e.message);
}
