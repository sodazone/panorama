import { select } from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

import { iconSize } from "./consts";
import { getGradientId } from "./utils";

export function createDefs(svg, { links }) {
  let defs = svg.select("defs");
  if (!defs.size()) defs = svg.append("defs");

  // Remove old gradients on re-render
  defs.selectAll("linearGradient").remove();

  const gradients = defs
    .selectAll("linearGradient")
    .data(links)
    .enter()
    .append("linearGradient")
    .attr("id", (d) => getGradientId(d))
    .attr("gradientUnits", "userSpaceOnUse")
    .attr("x1", (d) => d.source.x)
    .attr("y1", (d) => d.source.y)
    .attr("x2", (d) => d.target.x)
    .attr("y2", (d) => d.target.y);

  gradients.each(function (d) {
    const gradient = select(this);

    gradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", d.source.color)
      .attr("stop-opacity", 1);

    gradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", d.target.color)
      .attr("stop-opacity", 1);
  });

  defs
    .append("clipPath")
    .attr("id", "circle-clip")
    .append("circle")
    .attr("r", iconSize / 2)
    .attr("cx", 0)
    .attr("cy", 0);

  // bg
  const gradient = defs
    .append("linearGradient")
    .attr("id", "diagram-bg-gradient")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "100%")
    .attr("y2", "100%");

  gradient.append("stop").attr("offset", "0%").attr("stop-color", "#0f172a");

  gradient.append("stop").attr("offset", "100%").attr("stop-color", "#1e293b");
}
