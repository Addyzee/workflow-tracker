interface StatusBadgeProps {
  status: string;
}

function toneForStatus(status: string) {
  switch (status) {
    case "Draft":
      return "neutral";
    case "Submitted":
      return "info";
    case "Under Review":
      return "warning";
    case "Need More Information":
      return "accent";
    case "Approved":
      return "success";
    case "Rejected":
      return "danger";
    default:
      return "neutral";
  }
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return <span className={`status-badge ${toneForStatus(status)}`}>{status}</span>;
}

