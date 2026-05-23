export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export const labelClass =
  "mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#e4002b]";
export const panelClass = "border border-[#d7d7db] bg-white";
export const panelPaddingClass = `${panelClass} p-5`;
export const mutedTextClass = "text-sm leading-6 text-[#636366]";
export const pageGridClass = "grid gap-5";
export const headerTitleClass =
  "m-0 max-w-[10ch] text-[clamp(2.8rem,7vw,5.6rem)] font-semibold leading-[0.92] tracking-[-0.03em] text-[#111111]";
export const sectionTitleClass =
  "m-0 text-[clamp(1.85rem,4vw,2.8rem)] font-semibold leading-tight tracking-[-0.03em] text-[#111111]";
export const cardTitleClass = "m-0 text-[1.05rem] font-semibold tracking-[-0.02em] text-[#111111]";
export const buttonBaseClass =
  "inline-flex min-h-11 items-center justify-center border px-4 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50";
export const primaryButtonClass = `${buttonBaseClass} border-[#e4002b] bg-[#e4002b] text-white hover:bg-[#c80026]`;
export const secondaryButtonClass = `${buttonBaseClass} border-[#111111] bg-white text-[#111111] hover:border-[#e4002b] hover:text-[#e4002b]`;
export const dangerButtonClass = `${buttonBaseClass} border-[#9c1c25] bg-white text-[#9c1c25] hover:bg-[#fff4f5]`;
export const inputClass =
  "w-full border border-[#d7d7db] bg-white px-3 py-3 text-sm text-[#111111] outline-none transition-colors placeholder:text-[#8b8b90] focus:border-[#111111]";
export const selectClass = inputClass;
export const textareaClass = `${inputClass} min-h-[10rem] resize-y`;
export const linkUnderlineClass = "border-b border-current text-inherit";
export const successPanelClass = "border border-[#beddcd] bg-[#f4fbf7] p-4 text-sm text-[#177245]";
export const errorPanelClass = "border border-[#efc9cf] bg-[#fff4f5] p-4 text-sm text-[#9c1c25]";
export const tableCellClass =
  "border-b border-[#d7d7db] px-5 py-4 align-top text-sm text-[#111111]";
export const tableHeadClass =
  "border-b border-[#d7d7db] px-5 py-4 text-left text-[0.8rem] font-medium text-[#636366]";

