const assert = require("node:assert/strict");
const test = require("node:test");

const {
  TRACK,
  TOWNS,
  distanceToTrackKm,
  haversineKm,
  nearestTown,
  pointAlongTrack,
  trackBounds,
} = require("../.test-build/geo.js");

test("la distancia entre Tilcara y Humahuaca es del orden de 40 km", () => {
  const distance = haversineKm(TOWNS[1].location, TOWNS[2].location);
  assert.ok(distance > 30 && distance < 60, `distancia inesperada: ${distance}`);
});

test("un pueblo sobre la traza queda a menos de 1 km de ella", () => {
  for (const town of TOWNS) {
    assert.ok(distanceToTrackKm(town.location) < 1, `${town.name} quedó lejos de la traza`);
  }
});

test("un punto lejano queda a cientos de kilómetros de la traza", () => {
  assert.ok(distanceToTrackKm({ lat: -20, lng: -60 }) > 300);
});

test("la interpolación respeta los extremos y el punto medio", () => {
  assert.deepEqual(pointAlongTrack(0), TRACK[0]);
  assert.deepEqual(pointAlongTrack(1), TRACK[TRACK.length - 1]);
  const middle = pointAlongTrack(0.5);
  assert.ok(middle.lat > TRACK[0].lat && middle.lat < TRACK[TRACK.length - 1].lat);
});

test("el pueblo más cercano a una posición es el esperado", () => {
  assert.equal(nearestTown(TOWNS[1].location).name, "Tilcara");
});

test("el bounding box cubre toda la traza", () => {
  const bounds = trackBounds(TRACK, 20);
  for (const point of TRACK) {
    assert.ok(point.lat >= bounds.south && point.lat <= bounds.north);
    assert.ok(point.lng >= bounds.west && point.lng <= bounds.east);
  }
});
