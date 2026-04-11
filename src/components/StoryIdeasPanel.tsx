import type { StoryIdea } from "../lib/types";
import { SourceBadge } from "./SourceBadge";

interface StoryIdeasPanelProps {
  ideas: StoryIdea[];
}

export function StoryIdeasPanel({ ideas }: StoryIdeasPanelProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {ideas.map((idea) => (
        <article key={idea.id} className="rounded-[1.75rem] border border-[#99ADC6]/45 bg-white p-5 shadow-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#99ADC6]">{idea.category}</p>
              <h3 className="mt-2 font-display text-2xl text-[#4A678F]">{idea.headline}</h3>
            </div>
            <span className="whitespace-nowrap rounded-full bg-[#4A678F] px-3 py-1 text-xs font-semibold text-white">Priority {idea.priority}</span>
          </div>
          <p className="mt-4 text-sm leading-6 text-[#4A678F]/80">{idea.rationale}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {idea.sources.map((source) => (
              <SourceBadge key={`${idea.id}-${source}`} source={source} />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {idea.relatedTerms.map((term) => (
              <span key={term} className="rounded-full bg-[#F4F9FC] px-3 py-1 text-xs text-[#4A678F]">
                {term}
              </span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
