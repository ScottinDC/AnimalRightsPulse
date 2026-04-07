import type { StoryIdea } from "../lib/types";
import { SourceBadge } from "./SourceBadge";

interface StoryIdeasPanelProps {
  ideas: StoryIdea[];
}

export function StoryIdeasPanel({ ideas }: StoryIdeasPanelProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {ideas.map((idea) => (
        <article key={idea.id} className="rounded-[1.75rem] border border-moss/10 bg-white p-5 shadow-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-leaf">{idea.category}</p>
              <h3 className="mt-2 font-display text-2xl text-ink">{idea.headline}</h3>
            </div>
            <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-sand">Priority {idea.priority}</span>
          </div>
          <p className="mt-4 text-sm leading-6 text-moss/80">{idea.rationale}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {idea.sources.map((source) => (
              <SourceBadge key={`${idea.id}-${source}`} source={source} />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {idea.relatedTerms.map((term) => (
              <span key={term} className="rounded-full bg-sand px-3 py-1 text-xs text-moss">
                {term}
              </span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
