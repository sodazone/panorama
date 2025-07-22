import {
  scaleSqrt,
  select,
  arc,
  easeCubicInOut,
  max,
  sum,
} from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

import { networkMetadata } from "./meta.js";
import { fetchSeries } from "./api.js";
import { setupZoom } from "./zoom.js";
import { formatCompactNumber } from "./format.js";
import {
  nodeId,
  arcId,
  getArrowTransform,
  getGradientId,
  labelId,
} from "./utils.js";

import { state } from "./state.js";
import { displayInfobox, displayInitialInfobox } from "./infobox.js";
import { createDefs } from "./defs.js";
import {
  iconSize,
  margin,
  minHeight,
  minWidth,
  nodeSpacing,
} from "./consts.js";
import { installNavMenu } from "./menu.js";

const infoBox = select("#infobox");
const infoBoxToggle = document.getElementById("infobox-toggle");

const svg = select("svg#chart")
  .classed("pannable", true)
  .attr("viewBox", `0 0 ${window.innerWidth} ${window.innerHeight}`)
  .attr("preserveAspectRatio", "xMidYMid meet");

svg
  .append("rect")
  .attr("x", 0)
  .attr("y", 0)
  .attr("width", "100%")
  .attr("height", "100%")
  .attr("fill", "url(#diagram-bg-gradient)")
  .lower();

// Zoom
const zoomLayer = setupZoom(svg);

function renderGraph() {
  const graph = state.cachedData;
  zoomLayer.selectAll("*").remove();

  const maxVolume = max(graph.links, (d) => d.volume);
  const linkWidth = scaleSqrt().domain([100, maxVolume]).range([1, 32]);

  const nodeCount = graph.nodes.length;
  const contentWidth = Math.max(
    minWidth,
    margin * 2 + nodeSpacing * (nodeCount - 1),
  );
  const contentHeight = Math.max(minHeight, window.innerHeight);

  // Center node Y
  const nodeY = contentHeight / 2;

  graph.nodes.forEach((n, i) => {
    const m = networkMetadata[n.id];
    n.name = m == null ? n.id : m.name;
    n.color = m == null ? "#00ff00" : m.color;
    n.img = m == null ? "https://placehold.co/64" : m.img;
    n.id = n.id;
    n.x = margin + i * nodeSpacing;
    n.y = nodeY;
  });

  const translateX = (window.innerWidth - contentWidth) / 2;
  const translateY = (window.innerHeight - contentHeight) / 2;
  zoomLayer.attr("transform", `translate(${translateX}, ${translateY})`);

  // Create a map of node id -> node for easy link source/target mapping
  const idToNode = Object.fromEntries(graph.nodes.map((n) => [n.id, n]));
  graph.links.forEach((l) => {
    l.source = idToNode[l.source] || l.source;
    l.target = idToNode[l.target] || l.target;
  });

  // Node aggregates
  const nodeDegrees = {};
  const nodeVolumes = {};
  graph.nodes.forEach((n) => {
    nodeDegrees[n.id] = 0;
    nodeVolumes[n.id] = 0;
  });
  graph.links.forEach((l) => {
    nodeDegrees[l.source.id]++;
    nodeDegrees[l.target.id]++;
    nodeVolumes[l.source.id] += l.volume || 0;
    nodeVolumes[l.target.id] += l.volume || 0;
  });
  graph.nodes.forEach((n) => {
    n.degree = nodeDegrees[n.id] || 1;
    n.volume = nodeVolumes[n.id] || 0;
  });

  createDefs(svg, graph);

  // Draw links as arcs
  zoomLayer
    .append("g")
    .attr("class", "links")
    .selectAll("path")
    .data(graph.links)
    .enter()
    .append("path")
    .attr("id", arcId)
    .attr("class", (d) => (d.source.x < d.target.x ? "outbound" : "inbound"))
    .attr("stroke-width", (d) => linkWidth(d.volume || 0))
    .attr("stroke", (d) => `url(#${getGradientId(d)})`)
    .attr("stroke-opacity", 0.1)
    .attr("fill", "none")
    .attr("d", (d) => {
      const dx = d.target.x - d.source.x;
      const radius = Math.abs(dx) / 2;
      return [
        "M",
        d.source.x,
        d.source.y,
        "A",
        radius,
        radius,
        0,
        0,
        1,
        d.target.x,
        d.target.y,
      ].join(" ");
    });

  const arcArrows = zoomLayer
    .append("g")
    .attr("class", "link-arrows")
    .selectAll("path")
    .data(graph.links)
    .enter()
    .append("path")
    .attr("class", "link-arrow")
    .attr("d", "M 0,-5 L 10,0 L 0,5 Z")
    .attr("fill", (d) => d.source.color)
    .attr("pointer-events", "none")
    .style("opacity", 0)
    .attr("transform", (d) => {
      const path = document.getElementById(arcId(d));
      if (!path) return "translate(-1000,-1000)";
      return getArrowTransform(path);
    });

  const linkLabels = zoomLayer
    .append("g")
    .attr("class", "link-labels")
    .selectAll("text")
    .data(graph.links)
    .enter()
    .append("text")
    .attr("id", labelId)
    .attr("fill", "#FFFFFF")
    .attr("font-size", 12)
    .attr("pointer-events", "none")
    .style("opacity", 0)
    .attr("text-anchor", "middle")
    .text((d) => `$${formatCompactNumber(d.volume)}`)
    .attr("x", (d) => {
      const path = document.getElementById(arcId(d));
      if (path) {
        const len = path.getTotalLength();
        const midpoint = path.getPointAtLength(len / 2);
        return midpoint.x;
      }
      return 0;
    })
    .attr("y", (d) => {
      const path = document.getElementById(arcId(d));
      if (path) {
        const len = path.getTotalLength();
        const midpoint = path.getPointAtLength(len / 2);
        return midpoint.y;
      }
      return 0;
    });

  // Draw nodes
  state.totalVolume = sum(graph.nodes, (d) => d.volume);
  const totalVolume = state.totalVolume;

  const node = zoomLayer
    .append("g")
    .attr("class", "nodes")
    .selectAll("g")
    .data(graph.nodes)
    .enter()
    .append("g")
    .attr("transform", (d) => `translate(${d.x},${d.y})`);

  // ARC GAUGE
  const outerRadius = iconSize / 2 + 9;
  const innerRadius = iconSize / 2 + 6;
  const gauge = arc()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius)
    .startAngle(0);

  // BACKGROUND CIRCLE (full 100%)
  node
    .append("path")
    .attr("class", "gauge-bg")
    .attr("d", gauge({ endAngle: 2 * Math.PI }))
    .attr("fill", "rgba(255,255,255,0.08)")
    .style("pointer-events", "none");

  // FOREGROUND ARC (share %)
  node
    .append("path")
    .attr("class", "gauge-arc")
    .attr("d", (d) =>
      gauge({ endAngle: (d.volume / totalVolume) * 2 * Math.PI }),
    )
    .attr("fill", (d) => d.color)
    .attr("opacity", 0.75)
    .style("pointer-events", "none");

  // ICON BG
  node
    .append("circle")
    .attr("class", "selectable")
    .attr("r", iconSize / 2 + 2)
    .attr("fill", "rgba(13, 17, 23, 0.8)")
    .attr("stroke", (d) => d.color)
    .attr("stroke-width", 1.25)
    .append("title")
    .text((d) => d.name);

  // ICON constant-size network icon
  node
    .append("image")
    .attr("class", "node-icon")
    .attr("xlink:href", (d) => d.img)
    .attr("x", -iconSize / 2)
    .attr("y", -iconSize / 2)
    .attr("width", iconSize)
    .attr("height", iconSize)
    .attr("clip-path", "url(#circle-clip)")
    .style("pointer-events", "none");

  function highlight(d) {
    node.selectAll(".node-icon").style("opacity", 0.35);
    node.selectAll(".selectable").style("stroke-opacity", 0.1);

    const parent = select(this.parentNode);
    parent.select(".node-icon").style("opacity", 1);
    parent.select(".selectable").style("stroke-opacity", 1);

    // Highlight neighbors
    const neighbors = graph.links
      .filter((l) => l.source === d || l.target === d)
      .map((l) => (l.source === d ? l.target : l.source));

    const selectedNeighbors = node.filter((nd) => neighbors.includes(nd));

    selectedNeighbors.selectAll(".node-icon").style("opacity", 1);
    selectedNeighbors.selectAll(".selectable").style("stroke-opacity", 1);

    zoomLayer
      .selectAll(".links path")
      .style("stroke-opacity", (l) =>
        l.source === d || l.target === d ? 0.8 : 0.1,
      );

    arcArrows
      .filter((link) => link.source === d || link.target === d)
      .interrupt()
      .transition()
      .duration(200)
      .style("opacity", 1);

    linkLabels
      .filter((link) => link.source === d || link.target === d)
      .interrupt()
      .transition()
      .duration(200)
      .style("opacity", 1);

    node
      .selectAll("text")
      .style("opacity", (nd) => (nd === d || neighbors.includes(nd) ? 1 : 0));
  }

  function dim() {
    node.selectAll(".selectable").style("stroke-opacity", 1);
    zoomLayer.selectAll(".links path").style("stroke-opacity", 0.1);
    arcArrows.interrupt().transition().duration(100).style("opacity", 0);
    linkLabels.interrupt().transition().duration(200).style("opacity", 0);
    node.selectAll("text").style("opacity", 1);
    node.selectAll(".node-icon").style("opacity", 1);
  }

  displayInitialInfobox();

  let pinnedNode = null;

  // Node interactions
  node
    .selectAll(".selectable")
    .attr("id", nodeId)
    .on("click", function (event, d) {
      event.stopPropagation();

      document.dispatchEvent(
        new CustomEvent("diagram-select", { detail: { id: d.id } }),
      );

      if (pinnedNode != d) {
        dim();
        pinnedNode = d;
        highlight.call(event.target, d);
      }

      displayInfobox(d, {
        onClose: () => {
          pinnedNode = null;
          dim();
        },
      });
    })
    .on("mouseover", function (event, d) {
      document.dispatchEvent(
        new CustomEvent("diagram-hover", { detail: { id: d.id } }),
      );

      if (pinnedNode) {
        return;
      }

      select(this)
        .transition()
        .duration(200)
        .attr("r", iconSize / 2 + 6);

      highlight.call(this, d);
    })
    .on("mouseout", function () {
      document.dispatchEvent(
        new CustomEvent("diagram-hover", { detail: { id: null } }),
      );

      select(this)
        .transition()
        .duration(200)
        .attr("r", iconSize / 2 + 2);

      if (pinnedNode) {
        return;
      }

      dim();
    });

  // Clicking outside info box hides it
  svg.on("click", function () {
    infoBox.style("display", "none");
    pinnedNode = null;
    dim();
  });
}

function updateNodePositions() {
  let nodes = state.sortedNodes;
  const links = state.cachedData.links;

  nodes.forEach((n, i) => {
    n.x = margin + i * nodeSpacing;
  });

  zoomLayer
    .selectAll("g.nodes g")
    .data(nodes, (d) => d.id)
    .interrupt()
    .transition()
    .duration(500)
    .ease(easeCubicInOut)
    .attr("transform", (d) => `translate(${d.x},${d.y})`);

  let remaining = links.length;
  const arcTransition = zoomLayer
    .selectAll("g.links path")
    .data(links)
    .interrupt()
    .transition()
    .duration(500)
    .ease(easeCubicInOut)
    .attr("d", (d) => {
      const dx = d.target.x - d.source.x;
      const radius = Math.abs(dx) / 2;
      return [
        "M",
        d.source.x,
        d.source.y,
        "A",
        radius,
        radius,
        0,
        0,
        1,
        d.target.x,
        d.target.y,
      ].join(" ");
    });

  createDefs(svg, state.cachedData);

  function updateLabelPositions() {
    const arcPaths = {};
    zoomLayer.selectAll("g.links path").each(function (d) {
      arcPaths[arcId(d)] = this;
    });
    requestAnimationFrame(() => {
      zoomLayer.selectAll("g.link-labels text").each(function (d) {
        const path = arcPaths[arcId(d)];
        if (path) {
          const len = path.getTotalLength();
          const midpoint = path.getPointAtLength(len / 2);
          select(this).attr("x", midpoint.x).attr("y", midpoint.y);
        }
      });
    });
  }

  function updateArrowPositions() {
    requestAnimationFrame(() => {
      zoomLayer.selectAll("g.link-arrows path").each(function (d) {
        const path = document.getElementById(arcId(d));
        if (!path) return;

        select(this).interrupt().attr("transform", getArrowTransform(path));
      });
    });
  }

  arcTransition.on("end", function () {
    remaining--;
    if (remaining === 0) {
      updateLabelPositions();
      updateArrowPositions();
    }
  });
}

function loadData() {
  fetchSeries(state.currentTimeframe)
    .then((graph) => {
      state.cachedData = graph;

      renderGraph();

      updateNodePositions();
    })
    .catch(console.error);
}

document.getElementById("sort-select").addEventListener("change", (e) => {
  state.currentSort = e.target.value;
  updateNodePositions();
});

document.getElementById("time-select").addEventListener("change", (e) => {
  state.currentTimeframe = e.target.value;
  loadData();
});

// only enable toggle on mobile
function updateToggleBehavior() {
  if (window.innerWidth < 768) {
    infoBoxToggle.onclick = () => {
      infoBox.node().classList.toggle("open");
    };
  } else {
    infoBox.node().classList.add("open");
    infoBoxToggle.onclick = null;
  }
}

updateToggleBehavior();

window.addEventListener("resize", () => {
  updateToggleBehavior();
  if (state.cachedData) {
    renderGraph();
    updateNodePositions();
  }
});

installNavMenu();

loadData();
