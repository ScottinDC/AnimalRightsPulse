interface EmptyStateProps {
  title: string;
  body: string;
}

export function EmptyState({ title, body }: EmptyStateProps) {
  return (
    <div className="border border-dashed border-[#99ADC6]/55 bg-[#F4F9FC] p-6 text-sm text-[#4A678F]/80">
      <p className="font-semibold text-[#4A678F]">{title}</p>
      <p className="mt-2 leading-6">{body}</p>
    </div>
  );
}
