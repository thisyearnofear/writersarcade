// Shared radio-card class generator to keep Genre/Difficulty selectors consistent
// Core Principles: DRY, CLEAN, MODULAR

export function radioCardClass(selected: boolean, disabled: boolean) {
  const base = 'rounded-xl border-2 px-4 py-4 sm:px-5 sm:py-5 font-medium capitalize transition-all flex flex-col items-center justify-center gap-1.5'
  
  // Disabled state - very clear visual treatment
  if (disabled) {
    return [
      base,
      'border-gray-700/50 bg-gray-900/20 text-gray-500 cursor-not-allowed opacity-50',
      'hover:translate-y-0 active:translate-y-0' // No hover effects when disabled
    ].join(' ').trim()
  }
  
  // Active states with hover effects
  const selectedCls = 'border-purple-400 bg-purple-600 text-white shadow-lg ring-2 ring-purple-300 hover:translate-y-[-1px] active:translate-y-[0px]'
  const idleCls = 'border-purple-700 bg-black/30 text-purple-200 hover:border-purple-400 hover:bg-purple-900/40 hover:translate-y-[-1px] active:translate-y-[0px]'
  
  return [base, selected ? selectedCls : idleCls].join(' ').trim()
}
