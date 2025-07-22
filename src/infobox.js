import { select } from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

import { formatCompactNumber, nodeNameWithIcon } from "./format";
import { state } from "./state";
import { isElementVisibleInContainer, nodeId } from "./utils";
import { drawSparkline } from "./sparkline";

const initialInfobox = select("#initial-infobox");
const initialInfoboxNetworksList = select("#initial-infobox-network-list");

function sparklineHTML(series) {
  if (!series || !series.length) return "";
  return `<div class="sparkline" data-gap="1" data-strokeWidth="1" data-colors="#559999" data-points='${series.map((p) => p.value).join(",")}'></div>`;
}

function createPowerbarHTML(d, percent) {
  return `<div class="power-bar-bg">
            <div style="width: ${percent}%; background-color: ${d.color}; height: 100%; opacity: 0.9;"></div>
          </div>`;
}

function getNetworkLink({ id }) {
  return encodeURI(`/network/index.html#urn:ocn:${id}`);
}

function createNetworkHeaderHTML(d) {
  const percent = ((d.volume / state.totalVolume) * 100).toFixed(1);
  return `<div class="header">
    <div class="title">
      <a href="${getNetworkLink(d)}" target="_blank" class="title-link">
        ${nodeNameWithIcon(d, 32)}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
      </a>
      <button id="infobox-close">&times;</button>
    </div>
    <div class="power-bar">
    ${createPowerbarHTML(d, percent)}
    </div>
    <div class="properties">
      <div><span>Volume</span><span><strong>$${formatCompactNumber(d.volume)}</strong></span></div>
      <div><span>Share</span><span>${percent}%</span></div>
    </div>
  </div>`;
}

function createInitialNetworkHeaderHTML(d) {
  const percent = ((d.volume / state.totalVolume) * 100).toFixed(1);

  return `<div class="header">
    <div class="title">
      <span>${nodeNameWithIcon(d, 24)}</span>
      <div class="power-bar">
        ${createPowerbarHTML(d, percent)}
      </div>
    </div>
    <div class="properties">
      <div><span>Volume</span><span><strong>$${formatCompactNumber(d.volume)}</strong></span></div>
      <div><span>Share</span><span>${percent}%</span></div>
    </div>
  </div>`;
}

function displayInitialInfobox() {
  const display = getComputedStyle(initialInfobox.node()).display;
  if (display == "none") {
    return;
  }

  function destroyInitialInfobox() {
    initialInfobox.style("display", "none");
    initialInfobox.innerHTML = "";
  }

  initialInfobox
    .select("#initial-infobox-close")
    .on("click", destroyInitialInfobox);

  const networks = state.sortedNodes;
  const list = initialInfoboxNetworksList.node();
  list.innerHTML = "";

  networks.forEach((net) => {
    const li = document.createElement("li");
    li.dataset.networkId = nodeId(net);
    li.innerHTML = createInitialNetworkHeaderHTML(net);

    function dispatch(e) {
      const elem = document.getElementById(li.dataset.networkId);
      if (elem) {
        elem.dispatchEvent(new MouseEvent(e.type, { bubbles: true }));
      }
    }

    li.addEventListener("mouseover", dispatch);
    li.addEventListener("mouseout", dispatch);
    li.addEventListener("click", dispatch);

    list.appendChild(li);
  });

  document.addEventListener("diagram-hover", (e) => {
    highlightInfoboxItem(e);
  });

  document.addEventListener("diagram-select", destroyInitialInfobox);

  function highlightInfoboxItem(e) {
    const id = nodeId(e.detail);
    const isPointerInList = list.matches(":hover");

    [...list.children].forEach((li) => {
      const isTarget = li.dataset.networkId === id;
      li.classList.toggle("highlighted", isTarget);

      if (
        !isPointerInList &&
        isTarget &&
        !isElementVisibleInContainer(list, li)
      ) {
        li.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
      }
    });
  }
}

const infoBox = select("#infobox");
const infoContent = select("#infobox-content");

function addSparklines() {
  infoContent.selectAll(".sparkline").each(function () {
    const el = this;

    if (!el.dataset.points?.length) return;

    const spark = drawSparkline(el);
    el.innerHTML = "";
    el.appendChild(spark);
  });
}

function displayInfobox(d, { onClose }) {
  const groupedLinks = {};
  state.cachedData.links.forEach((l) => {
    const isSource = l.source.id === d.id;
    const isTarget = l.target.id === d.id;
    if (!isSource && !isTarget) return;

    const other = isSource ? l.target : l.source;
    const key = other.id;

    if (!groupedLinks[key]) {
      groupedLinks[key] = {
        node: other,
        directions: {
          out: null,
          in: null,
        },
      };
    }

    if (isSource) {
      groupedLinks[key].directions.out = l;
    } else {
      groupedLinks[key].directions.in = l;
    }
  });

  const relatedHtml = Object.values(groupedLinks)
    .map((group) => {
      const { node, directions } = group;

      const outVol = directions.out?.volume;
      const inVol = directions.in?.volume;

      const outTx = directions.out?.transfers;
      const inTx = directions.in?.transfers;

      const arrowRight = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="arrow">
  <path fill-rule="evenodd" d="M2 8a.75.75 0 0 1 .75-.75h8.69L8.22 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06l3.22-3.22H2.75A.75.75 0 0 1 2 8Z" clip-rule="evenodd" />
</svg>
`;

      const outRow =
        outVol || outTx
          ? `<div style="position:relative;height:3.5rem;">
                    <div class="sparkline-container">
                ${sparklineHTML(directions.out?.series)}
          </div>
      <span class="channel-path">
        <span>${d.name}</span>
        ${arrowRight}
        <span>${node.name}</span>
      </span>
      <span class="channel-metrics" style="display:flex;flex-direction:column;gap:2px;text-align:right;">
        ${outVol ? `<span class="volume"><strong>$${formatCompactNumber(outVol)}</strong></span>` : ""}
        ${outTx ? `<span class="tx-count">${formatCompactNumber(outTx, 0)} tx</span>` : ""}
      </span>
    </div>`
          : "";

      const inRow =
        inVol || inTx
          ? `<div style="position:relative;height:3.5rem;">
          <div class="sparkline-container">
                ${sparklineHTML(directions.in?.series)}
          </div>
      <span class="channel-path">
        <span>${node.name}</span>
        ${arrowRight}
        <span>${d.name}</span>
      </span>
      <span class="channel-metrics" style="display:flex;flex-direction:column;gap:2px;text-align:right;">
        ${inVol ? `<span class="volume"><strong>$${formatCompactNumber(inVol)}</strong></span>` : ""}
        ${inTx ? `<span class="tx-count">${formatCompactNumber(inTx, 0)} tx</span>` : ""}
      </span>
    </div>`
          : "";

      return `
    <div class="related-channel">
      <div class="title">${nodeNameWithIcon(node, 24)}</div>
      <div class="properties">
        ${outRow}
        ${inRow}
      </div>
    </div>
  `;
    })
    .join("");

  infoContent.html(`${createNetworkHeaderHTML(d)}
    ${relatedHtml || ""}
  `);

  addSparklines();

  infoBox.style("display", "block").style("opacity", 1);

  const closeBtn = infoContent.select("#infobox-close");

  if (closeBtn) {
    closeBtn.on("click", () => {
      infoBox.style("display", "none");
      onClose();
    });
  }
}

export { displayInfobox, displayInitialInfobox };
