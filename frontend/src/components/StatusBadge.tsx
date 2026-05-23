import { cn } from "../lib/ui";

interface StatusBadgeProps {
  status: string;
}

function toneForStatus(status: string) {
  switch (status) {
    case "Draft":
      return "border-[#d7d7db] text-[#111111]";
    case "Submitted":
      return "border-[#b7c8e6] text-[#194b8f]";
    case "Under Review":
      return "border-[#f0d2a0] text-[#905600]";
    case "Need More Information":
      return "border-[#f1c3cd] text-[#e4002b]";
    case "Approved":
      return "border-[#beddcd] text-[#177245]";
    case "Rejected":
      return "border-[#efc9cf] text-[#9c1c25]";
    default:
      return "border-[#d7d7db] text-[#111111]";
  }
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]",
        toneForStatus(status),
      )}
    >
      {status}
    </span>
  );
}
