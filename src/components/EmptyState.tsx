interface EmptyStateProps {
  title: string;
  body: string;
}

export function EmptyState({ title, body }: EmptyStateProps) {
  return (
    <div className="rounded-3xl border border-dashed border-moss/20 bg-sand/70 p-6 text-sm text-moss/80">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-2 leading-6">{body}</p>
    </div>
  );
}
