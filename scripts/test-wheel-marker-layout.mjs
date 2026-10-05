import assert from 'node:assert/strict';
import { fittedWheelMarkerLayouts, houseBoundedWheelMarkerLayouts } from '../apps/web/src/components/charts/wheelGeometry.ts';
const normalized = angle => ((angle % 360) + 360) % 360;
function layout(longitudes, radius = 218, rotation = 0) {
  return houseBoundedWheelMarkerLayouts(longitudes.map((longitude, i) => ({ key: String(i), longitude })), item => item.key, item => item.longitude, {
    radius, minimumRadius: radius === 218 ? 142 : radius, center: 300,
    minimumSpacing: radius === 123 ? 33 : 37.5, rowSpacing: 54,
    glyphSize: radius === 123 ? 22 : 26, annotationOffset: 22, angleForLongitude: longitude => longitude + rotation
  });
}
function assertContained(longitudes, radius = 218, rotation = 0) {
  const result = layout(longitudes, radius, rotation);
  assert.equal(result.size, longitudes.length);
  for (let sector = 0; sector < 12; sector++) {
    const ordered = longitudes.map((longitude, index) => ({ longitude: normalized(longitude), point: result.get(String(index)) }))
      .filter(entry => Math.floor(entry.longitude / 30) === sector)
      .sort((a, b) => a.longitude - b.longitude);
    const offsets = ordered.map(entry => normalized(entry.point.visualAngle - rotation - sector * 30));
    offsets.forEach((offset, index) => {
      if (index && ordered[index].longitude !== ordered[index - 1].longitude) {
        assert.ok(offset >= offsets[index - 1] - 1e-6, 'degree order is preserved around the whole house, including across rows');
      }
    });
  }
  const boxes = [];
  result.forEach((point, key) => {
    const longitude = normalized(longitudes[Number(key)]);
    const sector = Math.floor(longitude / 30);
    assert.equal(point.angle, normalized(longitude + rotation), 'true tick and aspect angles stay unchanged');
    assert.equal(Math.floor(normalized(point.visualAngle - rotation) / 30), sector, 'glyph center remains in its actual house');
    assert.equal(point.scale, 1, 'crowding never reduces glyph or degree size');
    assert.ok(point.radius >= (radius === 218 ? 142 : radius) - 1e-6);
    assert.ok(point.radius <= radius + 54 * longitudes.length, 'extra rows remain bounded');
    const glyphHalf = radius === 123 ? 11 : 13;
    const degreeRadius = point.radius - 22;
    const degreeAngle = point.visualAngle * Math.PI / 180;
    const degreeCenter = { x: 300 + Math.cos(degreeAngle) * degreeRadius, y: 300 - Math.sin(degreeAngle) * degreeRadius };
    for (const box of [
      { x: point.marker.x, y: point.marker.y, halfWidth: glyphHalf, halfHeight: glyphHalf },
      { x: degreeCenter.x, y: degreeCenter.y, halfWidth: 12 * point.scale, halfHeight: 6 * point.scale }
    ]) {
      for (const dx of [-box.halfWidth, box.halfWidth]) for (const dy of [-box.halfHeight, box.halfHeight]) {
        const angle = Math.atan2(300 - box.y - dy, box.x + dx - 300) * 180 / Math.PI;
        assert.equal(Math.floor(normalized(angle - rotation) / 30), sector, 'the whole glyph and degree box stay within their house');
      }
      boxes.push({ ...box, key });
    }
  });
  boxes.forEach((a, i) => boxes.slice(i + 1).forEach(b => {
    if (a.key === b.key) return;
    assert.ok(Math.abs(a.x - b.x) >= a.halfWidth + b.halfWidth - 1e-6 || Math.abs(a.y - b.y) >= a.halfHeight + b.halfHeight - 1e-6, `glyph and degree boxes do not overlap: ${JSON.stringify({longitudes,radius,rotation,a,b})}`);
  }));
  return result;
}
assert.equal(layout([]).size, 0);
assert.equal(layout([15]).get('0').visualAngle, 15);
for (const longitudes of [
  [0,30,90,180,270], [358,359,0,1,2,3], [40,41,42,43,44,45,46,47],
  [0,5,10,21,22,29,35,41], Array(22).fill(0),
  [314,222,309,286,319,114,156,228,248,202,41,160,311,323]
]) {
  for (const rotation of [0,17,45,95,183,271]) {
    assertContained(longitudes, 218, rotation);
    assertContained(longitudes, 304, rotation);
    assertContained(longitudes, 123, rotation);
  }
}
// Upright glyph boxes can pack differently after rotation, but remain in their houses.
const cluster = [309,311,314,319,323,45,165];
const original = assertContained(cluster);
assert.equal(original.get('5').visualAngle, 45);
for (const rotation of [17,95,183,271]) {
  assertContained(cluster, 218, rotation);
}
let seed = 42;
for (let chart=0; chart<300; chart++) {
  const longitudes = Array.from({length:22}, () => { seed=(1664525*seed+1013904223)>>>0; return seed/2**32*360; });
  assertContained(longitudes, 218, chart % 360);
  assertContained(longitudes, 123, chart % 360);
}
// A five-body stellium fits in two compact rows at the same size as an isolated glyph.
const stellium = layout([309,311,314,319,323,45], 218, 103);
assert.deepEqual([...new Set([...stellium.values()].map(point => point.scale))], [1]);
const aquariusOffsets = [0,1,2,3,4].map(index => normalized(stellium.get(String(index)).visualAngle - 103 - 300));
assert.ok(aquariusOffsets[3] > aquariusOffsets[2] && aquariusOffsets[2] > aquariusOffsets[1], '19 degrees follows 14 and 11 degrees across the staggered cluster');
const loose = houseBoundedWheelMarkerLayouts([309,311,314,319,323], String, Number, {
  radius:218, minimumRadius:142, center:300, minimumSpacing:37.5, rowSpacing:54,
  angleForLongitude: longitude => longitude + 103
});
const span = points => {
  const markers = [...points].map(point => point.marker);
  return Math.max(...markers.map(point => point.x)) - Math.min(...markers.map(point => point.x))
    + Math.max(...markers.map(point => point.y)) - Math.min(...markers.map(point => point.y));
};
assert.ok(span([...stellium.values()].slice(1)) < span(loose.values()), 'a crowded group occupies less space without shrinking its glyphs');
console.log('Wheel layout: tighter clusters, house containment, glyph separation, cusps, dense houses, rotations and 300 irregular charts passed.');

// Page-fitting mode keeps the natal canvas even when a sector has no room for
// another full-size row. Exact ticks are unchanged and displayed glyphs separate.
for (const radius of [123, 218, 220]) for (let rotation = 0; rotation < 360; rotation += 17) {
  for (const longitudes of [Array(22).fill(0), [358,359,0,1,2,3], [309,311,314,319,323,45],
    Array.from({length:22}, (_, i) => (i * 137.5) % 360)]) {
    const items = longitudes.map((longitude, index) => ({ key: String(index), longitude }));
    const result = fittedWheelMarkerLayouts(items, item => item.key, item => item.longitude, {
      radius, minimumRadius: radius === 218 ? 142 : radius, center:300,
      minimumSpacing: radius === 123 ? 33 : 37.5, rowSpacing:54,
      glyphSize:radius === 123 ? 22 : 26, annotationOffset:22,
      angleForLongitude:longitude => longitude + rotation
    });
    const boxes=[];
    result.forEach((point,key) => {
      assert.equal(point.scale,1,'fitting the page never shrinks a glyph');
      assert.ok(point.radius <= radius + 1e-6,'all markers fit inside their fixed ring');
      assert.equal(point.angle,normalized(longitudes[Number(key)] + rotation),'tick and aspect coordinates remain exact');
      const angle=point.visualAngle*Math.PI/180;
      const half=radius===123?11:13;
      boxes.push({key,x:point.marker.x,y:point.marker.y,hw:half,hh:half});
      boxes.push({key,x:300+Math.cos(angle)*(point.radius-22),y:300-Math.sin(angle)*(point.radius-22),hw:12,hh:6});
    });
    boxes.forEach((a,i)=>boxes.slice(i+1).forEach(b=>{
      if(a.key===b.key)return;
      assert.ok(Math.abs(a.x-b.x)>=a.hw+b.hw-1e-6 || Math.abs(a.y-b.y)>=a.hh+b.hh-1e-6,
        `fixed-ring glyphs and annotations separate at radius ${radius}, rotation ${rotation}`);
    }));
  }
}
console.log('Page-fitting wheels: fixed rings, full-size glyphs and exact ticks passed through all rotations.');
