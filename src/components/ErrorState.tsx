interface ErrorStateProps {
  message: string;
}

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <div className="rounded-3xl border border-[#CB693A]/25 bg-[#CB693A]/10 p-6 text-sm text-[#CB693A]">
      <p className="font-semibold">Unable to load dashboard data</p>
      <p className="mt-2 leading-6">{message}</p>
    </div>
  );
}
