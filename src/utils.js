export function isElementVisibleInContainer(el, container) {
  const elRect = el.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  return (
    elRect.top >= containerRect.top && elRect.bottom <= containerRect.bottom
  );
}

export function arcId(d) {
  return CSS.escape(`arc-${d.source.id}-${d.target.id}`);
}

export function labelId(d) {
  return CSS.escape(`label-${d.source.id}-${d.target.id}`);
}

export function nodeId(d) {
  return d.id == null ? null : CSS.escape(`node-${d.id}`);
}

export function getGradientId(d) {
  return `gradient-${d.source.id}-${d.target.id}`;
}

export function getArrowTransform(path) {
  const len = path.getTotalLength();
  const t = 0.33;
  const p = path.getPointAtLength(len * t);
  const pNext = path.getPointAtLength(Math.min(len, len * (t + 0.01)));

  const dx = pNext.x - p.x;
  const dy = pNext.y - p.y;

  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  return `translate(${p.x}, ${p.y}) rotate(${angle})`;
}
