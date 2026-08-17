export function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 mb-8">
      <span className="material-symbols-outlined text-5xl! text-gray-400 mb-4">calendar_month</span>
      <h3 className="text-lg font-bold text-white mb-1">Nothing on right now</h3>
      <p className="text-gray-400 max-w-xs">{text}</p>
    </div>
  );
}
