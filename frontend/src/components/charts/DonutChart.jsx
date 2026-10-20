/**
 * DonutChart en SVG puro.
 * props:
 *   data: [{ label, value, color }]
 *   size, thickness
 *   centerLabel, centerValue
 */
export const DonutChart = ({
  data = [],
  size = 200,
  thickness = 24,
  centerLabel = 'Total',
  centerValue,
}) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  const radius = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;

  return (
    <div className="flex items-center gap-6">
      <div className="relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Fondo */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={thickness}
          />

          {/* Segmentos */}
          {total > 0 &&
            data.map((d, i) => {
              const fraction = d.value / total;
              const dash = fraction * circumference;
              const gap = circumference - dash;
              const el = (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill="none"
                  stroke={d.color}
                  strokeWidth={thickness}
                  strokeDasharray={`${dash} ${gap}`}
                  strokeDashoffset={-offset}
                  transform={`rotate(-90 ${cx} ${cy})`}
                  strokeLinecap="butt"
                />
              );
              offset += dash;
              return el;
            })}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs uppercase tracking-wider text-slate-400">{centerLabel}</span>
          <span className="text-2xl font-bold text-slate-800">
            {centerValue ?? total}
          </span>
        </div>
      </div>

      <ul className="flex flex-col gap-1.5 text-sm">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: d.color }}
            />
            <span className="text-slate-600">{d.label}</span>
            <span className="ml-auto font-medium text-slate-800">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};