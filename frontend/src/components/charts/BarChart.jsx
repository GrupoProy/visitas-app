import { useState } from 'react';

export const BarChart = ({
  data = [],
  height = 220,
  color = '#3366ff',
  color2 = '#10b981',
  showSecond = false,
  labelFirst = 'Total',
  labelSecond = 'Finalizadas',
}) => {
  const [hover, setHover] = useState(null); // { index, serie }

  const width = 600;
  const padding = { top: 12, right: 12, bottom: 32, left: 32 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxValue = Math.max(1, ...data.map((d) => Math.max(d.value, d.value2 ?? 0)));
  const barGroupW = chartW / Math.max(1, data.length);
  const barW = showSecond ? barGroupW * 0.28 : barGroupW * 0.5;

  const yTicks = 4;
  const yStep = chartH / yTicks;

  const hoverData = hover !== null ? data[hover.index] : null;

  // Datos del tooltip (posición en unidades del viewBox)
  const tooltipW = 130;
  const tooltipH = 48;
  let tooltip = null;

  if (hover !== null && hoverData) {
    const groupX = padding.left + hover.index * barGroupW;
    const bar1X = groupX + barGroupW / 2 - barW - 2;
    const bar2X = groupX + barGroupW / 2 + 2;

    const cx = hover.serie === 1 ? bar1X + barW / 2 : bar2X + barW / 2;
    const val = hover.serie === 1 ? hoverData.value : (hoverData.value2 ?? 0);
    const barH = (val / maxValue) * chartH;
    const barTopY = padding.top + chartH - barH;

    // Posicionar arriba de la barra; si no cabe, abajo
    let tooltipY = barTopY - tooltipH - 6;
    if (tooltipY < 0) tooltipY = barTopY + 6;

    // Centrar y evitar que se salga a los lados
    let tooltipX = cx - tooltipW / 2;
    if (tooltipX < 0) tooltipX = 0;
    if (tooltipX + tooltipW > width) tooltipX = width - tooltipW;

    tooltip = {
      x: tooltipX,
      y: tooltipY,
      label: hoverData.label,
      serieLabel: hover.serie === 1 ? labelFirst : labelSecond,
      value: val,
      serieColor: hover.serie === 1 ? color : color2,
    };
  }

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => setHover(null)}
        style={{ overflow: 'visible' }}
      >
        {/* Gridlines */}
        {Array.from({ length: yTicks + 1 }).map((_, i) => {
          const y = padding.top + i * yStep;
          const label = Math.round((maxValue * (yTicks - i)) / yTicks);
          return (
            <g key={i}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="3 3"
              />
              <text
                x={padding.left - 6}
                y={y + 3}
                textAnchor="end"
                fontSize="10"
                fill="#94a3b8"
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* Barras */}
        {data.map((d, i) => {
          const groupX = padding.left + i * barGroupW;
          const h1 = (d.value / maxValue) * chartH;
          const h2 = showSecond ? ((d.value2 ?? 0) / maxValue) * chartH : 0;

          const bar1X = showSecond
            ? groupX + barGroupW / 2 - barW - 2
            : groupX + (barGroupW - barW) / 2;
          const bar2X = groupX + barGroupW / 2 + 2;

          const opacity1 =
            hover === null || (hover.index === i && hover.serie === 1) ? 1 : 0.45;
          const opacity2 =
            hover === null || (hover.index === i && hover.serie === 2) ? 1 : 0.45;

          return (
            <g key={i}>
              {/* Barra Total */}
              <rect
                x={bar1X}
                y={padding.top + chartH - h1}
                width={barW}
                height={h1}
                fill={color}
                rx="3"
                style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
                opacity={opacity1}
                onMouseEnter={() => setHover({ index: i, serie: 1 })}
              />

              {/* Barra Finalizadas */}
              {showSecond && (
                <rect
                  x={bar2X}
                  y={padding.top + chartH - h2}
                  width={barW}
                  height={h2}
                  fill={color2}
                  rx="3"
                  style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
                  opacity={opacity2}
                  onMouseEnter={() => setHover({ index: i, serie: 2 })}
                />
              )}

              {/* Etiqueta del día */}
              <text
                x={groupX + barGroupW / 2}
                y={height - 10}
                textAnchor="middle"
                fontSize="10"
                fill="#64748b"
              >
                {d.label}
              </text>
            </g>
          );
        })}

        {/* Baseline */}
        <line
          x1={padding.left}
          x2={width - padding.right}
          y1={padding.top + chartH}
          y2={padding.top + chartH}
          stroke="#cbd5e1"
        />

        {/* 🔹 Tooltip nativo SVG (foreignObject) */}
        {tooltip && (
          <foreignObject
            x={tooltip.x}
            y={tooltip.y}
            width={tooltipW}
            height={tooltipH}
            style={{ overflow: 'visible', pointerEvents: 'none' }}
          >
            <div
              xmlns="http://www.w3.org/1999/xhtml"
              style={{
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '6px 10px',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>
                {tooltip.label}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    backgroundColor: tooltip.serieColor,
                    display: 'inline-block',
                  }}
                />
                <span style={{ fontSize: 11, color: '#475569' }}>
                  {tooltip.serieLabel}:
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>
                  {tooltip.value}
                </span>
              </div>
            </div>
          </foreignObject>
        )}
      </svg>
    </div>
  );
};