// Shared radio-card class generator to keep Genre/Difficulty selectors consistent
// Core Principles: DRY, CLEAN, MODULAR

export function radioCardClass(selected: boolean, disabled: boolean) {
  const base = 'rounded-xl border-2 px-4 py-4 sm:px-5 sm:py-5 font-medium capitalize transition-all disabled:cursor-not-allowed flex flex-col items-center justify-center gap-1.5 hover:translate-y-[-1px] active:translate-y-[0px]'
  const selectedCls = 'border-purple-400 bg-purple-600 text-white shadow-lg ring-2 ring-purple-300'
  const idleCls = 'border-purple-700 bg-black/30 text-purple-200 hover:border-purple-400 hover:bg-purple-900/40 disabled:hover:border-purple-700 disabled:hover:bg-black/30'
  return [base, selected ? selectedCls : idleCls, disabled ? 'opacity-60' : ''].join(' ').trim()
}
