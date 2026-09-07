export function normalizeChartData(data) {
  return (Array.isArray(data) ? data : []).map((item) => ({
    ...item,
    label: String(item?.label ?? ''),
    value: Number.isFinite(Number(item?.value)) ? Math.max(0, Number(item.value)) : 0,
  }));
}

export function createRhythmPaths(data, width, maxValue = 100) {
  if (!data.length || !Number.isFinite(width) || width <= 0) return { areaPath: '', linePath: '', points: [], peak: null };
  const plotWidth = Math.max(0, width - 10);
  const scaleMaximum = Math.max(Number(maxValue) || 0, ...data.map((item) => item.value), 1);
  const points = data.map((item, index) => ({
    ...item,
    x: data.length === 1 ? width / 2 : 5 + index * plotWidth / (data.length - 1),
    y: 113 - (item.value / scaleMaximum) * 101,
  }));
  let linePath = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const midpoint = (previous.x + current.x) / 2;
    linePath += ` C ${midpoint} ${previous.y}, ${midpoint} ${current.y}, ${current.x} ${current.y}`;
  }
  return {
    linePath,
    areaPath: `${linePath} L ${points[points.length - 1].x} 113 L ${points[0].x} 113 Z`,
    points,
    peak: points.reduce((highest, point) => point.value > highest.value ? point : highest, points[0]),
  };
}
