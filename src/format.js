export function formatCompactNumber(value, fractionDigits = 1) {
  if (value == null || isNaN(value)) return "";
  const units = ["", "K", "M", "B", "T"];
  const abs = Math.abs(value);
  if (abs < 10) {
    return abs.toFixed(fractionDigits);
  }
  const unitIndex = Math.floor(Math.log10(abs) / 3);
  const scaled = value / Math.pow(10, unitIndex * 3);
  return scaled.toFixed(fractionDigits) + units[unitIndex];
}

export function nodeNameWithIcon(node, size = 24) {
  if (node.img) {
    return `<div class="node-name-icon"><img width="${size}" height="${size}" src="${node.img}" alt=""/><span>${node.name}</span></div>`;
  }
  return `<span>${node.name}</span>`;
}
