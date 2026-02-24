import { DecksChartData } from "../hooks/useDecksInfos";

export function DecksBarChart({
  labels,
  data,
  colors,
  isDark = false,
  sliceImages = {},
  panelOpacity = 60,
}: DecksChartData & {
  isDark?: boolean;
  sliceImages?: Record<string, string>;
  panelOpacity?: number;
}) {
  const total = data.reduce((s, v) => s + v, 0);
  const max = Math.max(...data);
  const hasImages = Object.keys(sliceImages).length > 0;

  if (total === 0) return null;

  return (
    <div
      className={`flex flex-col justify-start gap-3 h-full px-2 py-2 backdrop-blur-sm rounded border ${isDark ? "border-gray-600/70" : "border-gray-200/70"}`}
      style={{
        backgroundColor: isDark
          ? `rgba(31,41,55,${panelOpacity / 100})`
          : `rgba(249,250,251,${panelOpacity / 100})`,
      }}
    >
      {labels.map((label, i) => {
        const barWidth = max > 0 ? (data[i] / max) * 100 : 0;
        const imgUrl = sliceImages[label];
        const color = colors[i] ?? "#6b7280";
        return (
          <div key={i} className="flex flex-col gap-0.5">
            <div className="flex items-baseline justify-between gap-2">
              <span
                className={`text-[0.9rem] font-semibold truncate ${isDark ? "text-white" : "text-gray-900"}`}
              >
                {label}
              </span>
              <span
                className={`text-[0.9rem] flex-shrink-0 ${isDark ? "text-gray-300" : "text-gray-500"}`}
              >
                {data[i]}{" "}
                <span
                  className={`text-[0.75rem] ${isDark ? "text-gray-500" : "text-gray-600"}`}
                >
                  / {total}
                </span>
              </span>
            </div>
            {/* Track */}
            <div
              className={`w-full overflow-hidden ${
                hasImages ? "rounded h-3" : "rounded-full h-1.5"
              } ${isDark ? "bg-gray-700" : "bg-gray-200"}`}
            >
              {/* Fill */}
              <div
                className={`h-full transition-all duration-500 ${
                  hasImages ? "rounded" : "rounded-full"
                }`}
                style={{
                  width: `${barWidth}%`,
                  ...(imgUrl
                    ? {
                        backgroundImage: `url(${imgUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : { backgroundColor: color }),
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
