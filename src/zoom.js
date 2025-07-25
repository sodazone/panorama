import {
  select,
  zoom,
  zoomTransform,
  zoomIdentity,
} from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

const zoomControls = select("#zoom-controls");

const plusIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
  <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
</svg>`;
const minusIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
  <path fill-rule="evenodd" d="M4 10a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 10Z" clip-rule="evenodd" />
</svg>`;
const resetIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
  <path fill-rule="evenodd" d="M10 4.5c1.215 0 2.417.055 3.604.162a.68.68 0 0 1 .615.597c.124 1.038.208 2.088.25 3.15l-1.689-1.69a.75.75 0 0 0-1.06 1.061l2.999 3a.75.75 0 0 0 1.06 0l3.001-3a.75.75 0 1 0-1.06-1.06l-1.748 1.747a41.31 41.31 0 0 0-.264-3.386 2.18 2.18 0 0 0-1.97-1.913 41.512 41.512 0 0 0-7.477 0 2.18 2.18 0 0 0-1.969 1.913 41.16 41.16 0 0 0-.16 1.61.75.75 0 1 0 1.495.12c.041-.52.093-1.038.154-1.552a.68.68 0 0 1 .615-.597A40.012 40.012 0 0 1 10 4.5ZM5.281 9.22a.75.75 0 0 0-1.06 0l-3.001 3a.75.75 0 1 0 1.06 1.06l1.748-1.747c.042 1.141.13 2.27.264 3.386a2.18 2.18 0 0 0 1.97 1.913 41.533 41.533 0 0 0 7.477 0 2.18 2.18 0 0 0 1.969-1.913c.064-.534.117-1.071.16-1.61a.75.75 0 1 0-1.495-.12c-.041.52-.093 1.037-.154 1.552a.68.68 0 0 1-.615.597 40.013 40.013 0 0 1-7.208 0 .68.68 0 0 1-.615-.597 39.785 39.785 0 0 1-.25-3.15l1.689 1.69a.75.75 0 0 0 1.06-1.061l-2.999-3Z" clip-rule="evenodd" />
</svg>
`;

const icons = {
  "+": plusIcon,
  "−": minusIcon,
  "⟳": resetIcon,
};

export function setupZoom(svg) {
  const zoomLayer = svg.append("g").attr("class", "zoom-layer");

  const zoomBehavior = zoom()
    .scaleExtent([0.25, 4])
    .on("start", () => svg.classed("grabbing", true))
    .on("end", () => svg.classed("grabbing", false))
    .on("zoom", (event) => {
      zoomLayer.attr("transform", event.transform);
    });

  svg.call(zoomBehavior);

  ["+", "−", "⟳"].forEach((label) => {
    zoomControls
      .append("button")
      .html(icons[label])
      .on("click", () => {
        const t = zoomTransform(svg.node());
        if (label === "+")
          svg.transition().call(zoomBehavior.scaleTo, t.k * 1.2);
        if (label === "−")
          svg.transition().call(zoomBehavior.scaleTo, t.k / 1.2);
        if (label === "⟳")
          svg.transition().call(zoomBehavior.transform, zoomIdentity);
      });
  });

  return zoomLayer;
}
