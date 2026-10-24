export default function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-semibold tracking-tight ${className}`}>
      backchannel<span className="text-lime-300">.</span>
    </span>
  );
}
