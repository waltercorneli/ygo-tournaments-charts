import { DecksChartData } from "../hooks/useDecksInfos";

export function DecksBarChart({
  labels,
  data,
  colors,
  isDark = false,
}: DecksChartData & { isDark?: boolean }) {
  const total = data.reduce((s, v) => s + v, 0);
  const max = Math.max(...data);

  if (total === 0) return null;

  return (
    <div className="flex flex-col justify-start gap-3 h-full px-2 py-2 backdrop-blur-sm">
      {labels.map((label, i) => {
        const pct = total > 0 ? ((data[i] / total) * 100).toFixed(1) : "0.0";
        const barWidth = max > 0 ? (data[i] / max) * 100 : 0;
        return (
          <div key={i} className="flex flex-col gap-0.5">
            <div className="flex items-baseline justify-between gap-2">
              <span
                className={`text-[0.55rem] font-semibold truncate ${isDark ? "text-white" : "text-gray-900"}`}
              >
                {label}
              </span>
              <span
                className={`text-[0.55rem] flex-shrink-0 ${isDark ? "text-gray-300" : "text-gray-500"}`}
              >
                {data[i]} ({pct}%)
              </span>
            </div>
            <div
              className={`w-full rounded-full h-2 ${isDark ? "bg-gray-700" : "bg-gray-200"}`}
            >
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${barWidth}%`,
                  backgroundColor: colors[i] ?? "#6b7280",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
