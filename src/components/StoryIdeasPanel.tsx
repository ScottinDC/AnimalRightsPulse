import { useMemo, useState } from "react";
import { evaluateStoryTopic, type StoryEvaluatorData } from "../lib/storyEvaluator";
import type { StoryIdea } from "../lib/types";
import { SourceBadge } from "./SourceBadge";

interface StoryIdeasPanelProps {
  ideas: StoryIdea[];
}

interface StoryWorthEvaluatorProps {
  defaultValue: string;
  evaluatorData: StoryEvaluatorData;
}

export function StoryWorthEvaluator({ defaultValue, evaluatorData }: StoryWorthEvaluatorProps) {
  const [query, setQuery] = useState(defaultValue);

  const evaluation = useMemo(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return null;
    return evaluateStoryTopic(trimmedQuery, evaluatorData);
  }, [evaluatorData, query]);

  return (
    <div className="mb-5 border border-[#4A678F]/18 bg-[#F4F9FC] p-4">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#99ADC6]">Story Idea Evaluator</p>
        <h4 className="text-base font-semibold text-[#4A678F]">Should we post this story now?</h4>
        <p className="text-sm leading-6 text-[#4A678F]/78">
          Type a story idea or topic below and the dashboard will blend GSC, GA4, Google News, FB Insights, and Google Trends into a 1-10 score.
        </p>
      </div>

      <label htmlFor="story-worth-input" className="mt-4 block text-xs font-semibold uppercase tracking-[0.16em] text-[#99ADC6]">
        Story Topic
      </label>
      <input
        id="story-worth-input"
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Example: factory farming protest"
        className="mt-3 w-full border-2 border-[#4A678F]/45 bg-white px-4 py-4 text-base text-[#4A678F] outline-none transition focus:border-[#4A678F]"
      />

      {evaluation ? (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.06em]">
            <span className="border border-[#4A678F] bg-[#4A678F] px-3 py-2 text-white">Score {evaluation.score}/10</span>
            <span className="border border-[#99ADC6]/45 px-3 py-2 text-[#4A678F]">Worth posting: {evaluation.worthPosting ? "Yes" : "No"}</span>
            <span className="border border-[#99ADC6]/45 px-3 py-2 text-[#4A678F]">Status: {evaluation.posture}</span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {evaluation.sources.map((source) => (
              <div key={source.source} className="border border-[#99ADC6]/25 px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#99ADC6]">{source.label}</span>
                  <span className="text-sm font-semibold text-[#4A678F]">{source.score.toFixed(1)}</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-[#4A678F]/78">{source.evidence}</p>
              </div>
            ))}
          </div>

          <p className="text-sm leading-6 text-[#4A678F]/82">{evaluation.rationale}</p>
        </div>
      ) : null}
    </div>
  );
}

export function StoryIdeasPanel({ ideas }: StoryIdeasPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      {ideas.map((idea) => (
        <article key={idea.id} className="border border-[#99ADC6]/45 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#99ADC6]">{idea.category}</p>
              <h3 className="mt-2 text-xl font-semibold text-[#4A678F]">{idea.headline}</h3>
            </div>
            <span className="whitespace-nowrap border border-[#4A678F] bg-[#4A678F] px-3 py-1 text-xs font-semibold uppercase tracking-[0.06em] text-white">Priority {idea.priority}</span>
          </div>
          <p className="mt-4 text-sm leading-6 text-[#4A678F]/80">{idea.rationale}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[...new Set(idea.sources)].map((source) => (
              <SourceBadge key={`${idea.id}-${source}`} source={source} />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {idea.relatedTerms.map((term) => (
              <span key={term} className="border border-[#99ADC6]/35 bg-[#F4F9FC] px-3 py-1 text-xs text-[#4A678F]">
                {term}
              </span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
