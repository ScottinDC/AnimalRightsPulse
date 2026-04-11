import type { StoryIdea } from "../lib/types";
import { SourceBadge } from "./SourceBadge";

interface StoryIdeasPanelProps {
  ideas: StoryIdea[];
}

export function StoryIdeasPanel({ ideas }: StoryIdeasPanelProps) {
  return (
    <div className="divide-y divide-[#99ADC6]/25 border border-[#99ADC6]/45 bg-white">
      {ideas.map((idea) => (
        <article key={idea.id} className="flex items-start gap-6 px-5 py-4">
          <div className="w-32 shrink-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#99ADC6]">{idea.category}</p>
            <span className="mt-2 inline-block border border-[#4A678F] bg-[#4A678F] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-white">P{idea.priority}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[#4A678F]">{idea.headline}</h3>
            <p className="mt-1 text-xs leading-5 text-[#4A678F]/70">{idea.rationale}</p>
          </div>
          <div className="shrink-0 flex flex-wrap gap-1 justify-end" style={{ maxWidth: 200 }}>
            {idea.relatedTerms.map((term) => (
              <span key={term} className="border border-[#99ADC6]/35 bg-[#F4F9FC] px-2 py-0.5 text-[10px] text-[#4A678F]">
                {term}
              </span>
            ))}
          </div>
          <div className="shrink-0 flex flex-wrap gap-1">
            {idea.sources.map((source) => (
              <SourceBadge key={`${idea.id}-${source}`} source={source} />
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
