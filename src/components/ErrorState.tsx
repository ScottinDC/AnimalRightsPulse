interface ErrorStateProps {
  message: string;
}

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <div className="rounded-3xl border border-ember/25 bg-ember/10 p-6 text-sm text-ember">
      <p className="font-semibold">Unable to load dashboard data</p>
      <p className="mt-2 leading-6">{message}</p>
    </div>
  );
}
