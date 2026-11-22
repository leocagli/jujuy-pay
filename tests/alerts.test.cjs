const assert = require("node:assert/strict");
const test = require("node:test");

const { crowdingAlerts, fireAlerts, floodAlerts, sortAlerts } = require("../.test-build/alert-rules.js");
const { TOWNS } = require("../.test-build/geo.js");

const now = new Date("2026-11-22T16:00:00.000Z");
const tilcara = TOWNS[1];

function weatherFor(town, millimeters) {
  return {
    town,
    weather: {
      town: town.name,
      location: town.location,
      hours: [],
      next6hPrecipitationMm: millimeters,
      source: "fixture",
      fetchedAt: now.toISOString(),
    },
  };
}

function hotspot(id, lat, lng) {
  return {
    id,
    location: { lat, lng },
    detectedAt: now.toISOString(),
    confidence: "h",
    frp: 10,
  };
}

test("la lluvia por encima de 10 mm genera warning y por encima de 20 mm critical", () => {
  const alerts = floodAlerts(
    [weatherFor(TOWNS[0], 5), weatherFor(TOWNS[1], 12), weatherFor(TOWNS[2], 25)],
    now,
  );
  assert.deepEqual(
    alerts.map((alert) => alert.severity),
    ["warning", "critical"],
  );
  assert.equal(alerts[0].kind, "flood");
  assert.equal(alerts[0].source, "open-meteo");
});

test("un foco cercano a la traza genera una alerta por pueblo, sin duplicados", () => {
  const alerts = fireAlerts(
    [
      hotspot("cercano", tilcara.location.lat + 0.008, tilcara.location.lng),
      hotspot("mas-cercano", tilcara.location.lat + 0.002, tilcara.location.lng),
      hotspot("lejano", -22, -64),
    ],
    now,
  );
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].town, "Tilcara");
  assert.equal(alerts[0].severity, "critical");
  assert.equal(alerts[0].source, "firms");
});

test("la ocupación del 90% genera una alerta de aglomeración con alternativa", () => {
  const alerts = crowdingAlerts(
    {
      train: { location: TOWNS[0].location, passengers: 100, solarKw: 38, batteryPct: 78, progress: 0 },
      occupancy: [
        { town: "Purmamarca", occupancyPct: 92, alternativeTown: "Uquía" },
        { town: "Tilcara", occupancyPct: 40 },
      ],
      updatedAt: now.toISOString(),
    },
    now,
  );
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].kind, "crowding");
  assert.equal(alerts[0].severity, "info");
  assert.match(alerts[0].message, /Uquía/);
});

test("las alertas se ordenan por severidad", () => {
  const alerts = sortAlerts([
    crowdingAlerts(
      {
        train: { location: TOWNS[0].location, passengers: 100, solarKw: 38, batteryPct: 78, progress: 0 },
        occupancy: [{ town: "Purmamarca", occupancyPct: 92 }],
        updatedAt: now.toISOString(),
      },
      now,
    )[0],
    floodAlerts([weatherFor(TOWNS[0], 25)], now)[0],
    fireAlerts([hotspot("fuego", tilcara.location.lat, tilcara.location.lng + 0.09)], now)[0],
  ]);
  assert.deepEqual(
    alerts.map((alert) => alert.severity),
    ["critical", "warning", "info"],
  );
});
