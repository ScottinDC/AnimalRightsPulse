import type { SummaryCard } from "../lib/types";

interface SummaryCardsProps {
  cards: SummaryCard[];
}

export function SummaryCards({ cards }: SummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article key={card.id} className="rounded-[1.75rem] bg-ink px-5 py-6 text-sand shadow-card">
          <p className="text-sm text-sky">{card.title}</p>
          <p className="mt-3 font-display text-3xl">{card.metric}</p>
          <p className="mt-2 text-sm font-semibold text-sky">{card.change}</p>
          <p className="mt-4 text-sm leading-6 text-sand/80">{card.narrative}</p>
        </article>
      ))}
    </div>
  );
}
