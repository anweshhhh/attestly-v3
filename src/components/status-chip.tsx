import clsx from "clsx";

export function StatusChip(props: { tone: "neutral" | "success" | "warning" | "danger"; children: React.ReactNode }) {
  return <span className={clsx("status-chip", `status-chip-${props.tone}`)}>{props.children}</span>;
}
