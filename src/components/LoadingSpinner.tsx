export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div
        className="h-10 w-10 rounded-full border-3 border-white/20 border-t-white"
        style={{
          animation: 'spin 0.8s linear infinite',
          willChange: 'transform',
        }}
      />
    </div>
  );
}
