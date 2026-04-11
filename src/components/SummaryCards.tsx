import type { SummaryCard } from "../lib/types";

interface SummaryCardsProps {
  cards: SummaryCard[];
}

export function SummaryCards({ cards }: SummaryCardsProps) {
  const toneForChange = (change: string) => {
    if (change.includes("Declining") || change.includes("-")) return "text-[#CB693A] bg-[#CB693A]/10 border-[#CB693A]/20";
    if (change.includes("Rising") || change.includes("Breakout") || change.includes("+")) return "text-[#4A678F] bg-[#F4F9FC] border-[#99ADC6]";
    return "text-[#4A678F] bg-white border-[#99ADC6]/60";
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article key={card.id} className="rounded-[1.5rem] border border-[#99ADC6]/45 bg-white px-5 py-5 shadow-card">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#99ADC6]">{card.title}</p>
          <p className="mt-3 font-display text-[2rem] leading-tight text-[#4A678F]">{card.metric}</p>
          <div className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${toneForChange(card.change)}`}>
            {card.change}
          </div>
          <p className="mt-4 text-sm leading-6 text-[#4A678F]/78">{card.narrative}</p>
        </article>
      ))}
    </div>
  );
}
