const url = "https://dev-api.ocelloids.net/query/xcm";
const apiKey =
  "eyJhbGciOiJFZERTQSIsImtpZCI6IklSU1FYWXNUc0pQTm9kTTJsNURrbkJsWkJNTms2SUNvc0xBRi16dlVYX289In0.ewogICJpc3MiOiAiZGV2LWFwaS5vY2VsbG9pZHMubmV0IiwKICAianRpIjogIjAxMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwIiwKICAic3ViIjogInB1YmxpY0BvY2VsbG9pZHMiCn0K.bjjQYsdIN9Fx34S9Of5QSKxb8_aOtwURInOGSSc_DxrdZcnYWi-5nnZsh1v5rYWuRWNzLstX0h1ICSH_oAugAQ";

const BUCKET_OPTS = {
  "3 months": { bucketSeconds: 86400, totalBuckets: 90 },
  "1 months": { bucketSeconds: 86400, totalBuckets: 30 },
  "7 days": { bucketSeconds: 21600, totalBuckets: 28 },
  "1 days": { bucketSeconds: 3600, totalBuckets: 24 },
};

const TIME_MAP = {
  "90D": {
    timeframe: "3 months",
    bucket: "1 days",
  },
  "30D": {
    timeframe: "1 months",
    bucket: "1 days",
  },
  "7D": {
    timeframe: "7 days",
    bucket: "6 hours",
  },
  "1D": {
    timeframe: "1 days",
    bucket: "1 hours",
  },
};

const EXCLUDE = ["urn:ocn:paseo:0", "urn:ocn:paseo:1000"];

const CACHE_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

function fillMissingBuckets(series, options) {
  if (!series.length) return [];

  const { bucketSeconds, totalBuckets } = options;
  const map = Object.fromEntries(series.map((d) => [d.time, d.value]));

  let start, end;

  if (options.startTime != null && options.endTime != null) {
    start = options.startTime;
    end = options.endTime;
  } else if (series.length) {
    const times = series.map((d) => d.time);
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    if (totalBuckets) {
      end = Math.ceil(maxTime / bucketSeconds) * bucketSeconds;
      start = end - bucketSeconds * (totalBuckets - 1);
    } else {
      start = Math.floor(minTime / bucketSeconds) * bucketSeconds;
      end = Math.ceil(maxTime / bucketSeconds) * bucketSeconds;
    }
  } else if (totalBuckets) {
    const now = Math.floor(Date.now() / 1000);
    end = Math.floor(now / bucketSeconds) * bucketSeconds;
    start = end - bucketSeconds * (totalBuckets - 1);
  }

  const filled = [];
  for (let t = start; t <= end; t += bucketSeconds) {
    filled.push({ time: t, value: map[t] ?? 0 });
  }

  return filled;
}

function transformArcDiagram(data, { timeframe }) {
  const bucketOpts = BUCKET_OPTS[timeframe];
  const nodesSet = new Set();
  const links = [];

  data.items.forEach((item) => {
    const [fromRaw, toRaw] = item.key.split("-");
    const from = fromRaw.split(":").slice(2).join(":");
    const to = toRaw.split(":").slice(2).join(":");

    if (EXCLUDE.includes(fromRaw) || EXCLUDE.includes(toRaw)) {
      return;
    }

    nodesSet.add(from);
    nodesSet.add(to);

    const filledSeries = fillMissingBuckets(item.series, bucketOpts);

    links.push({
      source: from,
      target: to,
      volume: item.volumeUsd,
      transfers: item.total,
      id: item.key,
      series: filledSeries,
    });
  });

  const nodes = Array.from(nodesSet).map((id) => ({ id }));

  return { nodes, links };
}

async function _fetch(criteria) {
  return await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      args: {
        op: "transfers_by_channel_series",
        criteria,
      },
    }),
  });
}

function hasLocalStorage() {
  try {
    const testKey = "__test__";
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

function getCacheKey(time) {
  return `arcDiagramCache_${time}`;
}

export async function fetchSeries(time) {
  try {
    const criteria = TIME_MAP[time];
    if (hasLocalStorage()) {
      const cacheKey = getCacheKey(time);
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { timestamp, data } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_EXPIRY_MS) {
          return data;
        }
      }

      const response = await _fetch(criteria);
      if (response.ok) {
        const data = transformArcDiagram(await response.json(), criteria);
        localStorage.setItem(
          cacheKey,
          JSON.stringify({ timestamp: Date.now(), data }),
        );
        return data;
      }
      return null;
    } else {
      const response = await _fetch(criteria);
      if (response.ok) {
        return transformArcDiagram(await response.json(), criteria);
      }
      return null;
    }
  } catch (error) {
    console.error("Fetch error:", error);
    return null;
  }
}
