export function drawSparkline(conf) {
  function setup(opts) {
    const defaultOpts = {
      gap: parseIntWithDefault(opts.dataset.gap, 5),
      strokeWidth: parseIntWithDefault(opts.dataset.strokeWidth, 2),
      type: opts.dataset.type || "bar",
      colors: opts.dataset.colors
        ? opts.dataset.colors.split(",")
        : ["#669999"],
      points: opts.dataset.points
        ? opts.dataset.points.split(",").map(Number)
        : [],
    };

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("preserveAspectRatio", "none");
    defaultOpts.svg = svg;
    return defaultOpts;
  }

  function parseIntWithDefault(val, defaultValue) {
    const parsed = Number.parseInt(val, 10);
    return Number.isNaN(parsed) ? defaultValue : parsed;
  }

  function bar(opts) {
    const { points, gap, colors, svg } = opts;
    const totalBars = points.length;
    const maxValue = Math.max(...points) || 1;

    const bbox = svg.getBoundingClientRect();
    const width = bbox.width;
    const height = bbox.height;
    if (width === 0 || height === 0) return;

    const columnWidth = Math.max(
      3,
      (width - (totalBars - 1) * gap) / totalBars,
    );

    points.forEach((point, idx) => {
      const color =
        point === 0 ? "rgba(255,255,255,0.25)" : colors[idx % colors.length];
      const rect = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "rect",
      );

      let rectHeight = (point / maxValue) * height;
      if (rectHeight < 3) rectHeight = 3;

      const x = idx * (columnWidth + gap);
      const y = height - rectHeight;

      rect.setAttribute("x", x);
      rect.setAttribute("y", y);
      rect.setAttribute("width", columnWidth);
      rect.setAttribute("height", rectHeight);
      rect.setAttribute("fill", color);
      rect.setAttribute("stroke", "rgba(0,0,0,0.75)");
      rect.setAttribute("stroke-width", "0.5");

      svg.appendChild(rect);
    });
  }

  function render(opts) {
    requestAnimationFrame(() => {
      if (opts.type === "bar") {
        bar(opts);
      } else {
        console.error(`${opts.type} is not a valid sparkline type`);
      }
    });
  }

  const opts = setup(conf);
  const container = document.createElement("div");
  container.className = "w-full h-full sparkline";
  container.appendChild(opts.svg);

  requestAnimationFrame(() => {
    render(opts);
  });

  return container;
}
