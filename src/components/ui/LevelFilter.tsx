export type AssignmentLevel = "all" | "platform" | "tenant" | "user";

const TILES: { value: AssignmentLevel; label: string; idle: string; on: string }[] = [
  {
    value: "all",
    label: "All",
    idle: "border-gray-200 bg-gray-50 text-gray-600",
    on: "border-gray-500 bg-gray-100 text-gray-900",
  },
  {
    value: "platform",
    label: "Platform",
    idle: "border-violet-200 bg-violet-50 text-violet-800",
    on: "border-violet-500 bg-violet-100 text-violet-950",
  },
  {
    value: "tenant",
    label: "Tenant",
    idle: "border-sky-200 bg-sky-50 text-sky-800",
    on: "border-sky-500 bg-sky-100 text-sky-950",
  },
  {
    value: "user",
    label: "User",
    idle: "border-emerald-200 bg-emerald-50 text-emerald-800",
    on: "border-emerald-500 bg-emerald-100 text-emerald-950",
  },
];

export function LevelFilter({
  value,
  onChange,
}: {
  value: AssignmentLevel;
  onChange: (value: AssignmentLevel) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Level">
      {TILES.map((tile) => {
        const selected = value === tile.value;
        return (
          <button
            key={tile.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(tile.value)}
            className={`rounded border px-2 py-1 text-xs font-medium ${selected ? tile.on : tile.idle}`}
          >
            {tile.label}
          </button>
        );
      })}
    </div>
  );
}
