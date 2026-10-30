import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomNavigation } from '../navigation.js';

const point = (x, z, scale) => ({ x: x * scale, z: z * scale });

function assertClearRoute(nav, start, route) {
  assert.ok(route.length, 'a safe stopping point is returned');
  let previous = start;
  for (const waypoint of route) {
    assert.ok(nav.isFree(waypoint.x, waypoint.z), 'waypoint clears furniture and walls');
    assert.ok(nav.segmentFree(previous, waypoint), 'the entire walking segment stays clear');
    previous = waypoint;
  }
}

for (const scale of [1, 0.95]) {
  test(`walking reaches the shelf without crossing furniture (scale ${scale})`, () => {
    const nav = new RoomNavigation(scale);
    const start = point(1.42, 0.72, scale), goal = point(0.12, 1.65, scale);
    assert.equal(nav.segmentFree(start, goal), false, 'the direct line is obstructed');
    const route = nav.route(start, goal);
    assertClearRoute(nav, start, route);
    assert.ok(route.length > 1, 'the route goes around the obstruction');
    assert.deepEqual(route.at(-1), goal);
  });

  test(`walking respects a repositioned chair (scale ${scale})`, () => {
    const nav = new RoomNavigation(scale);
    nav.circles[0][0] = 1.1 * scale;
    nav.circles[0][1] = 1.05 * scale;
    const start = point(1.42, 0.72, scale), goal = point(0.12, 1.65, scale);
    const route = nav.route(start, goal);
    assertClearRoute(nav, start, route);
    assert.deepEqual(route.at(-1), goal);
  });

  test(`a floor click under the desk stops outside it (scale ${scale})`, () => {
    const nav = new RoomNavigation(scale);
    const start = point(1.42, 0.72, scale), goal = point(0.1, 0.1, scale);
    assert.equal(nav.isFree(goal.x, goal.z), false);
    const route = nav.route(start, goal);
    assertClearRoute(nav, start, route);
    assert.notDeepEqual(route.at(-1), goal);
  });

  test(`a long movement step cannot tunnel through the desk (scale ${scale})`, () => {
    const nav = new RoomNavigation(scale);
    const position = point(1.2, 0.3, scale);
    nav.move(position, -2 * scale, 0);
    assert.ok(nav.isFree(position.x, position.z));
    assert.ok(position.x > 0.4 * scale, 'movement stays on the starting side of the desk');
  });

  test(`diagonal movement slides along the desk edge (scale ${scale})`, () => {
    const nav = new RoomNavigation(scale);
    const position = point(0.5, 0.3, scale);
    nav.move(position, -0.2 * scale, 0.35 * scale);
    assert.ok(nav.isFree(position.x, position.z));
    assert.ok(position.z > 0.6 * scale, 'movement along the unobstructed axis continues');
    assert.ok(position.x > 0.4 * scale);
  });

  test(`varied room destinations remain collision free (scale ${scale})`, () => {
    const nav = new RoomNavigation(scale);
    let seed = 7351;
    const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
    for (let i = 0; i < 160; i++) {
      const start = nav.project(point(-0.3 + random() * 2.4, -1.3 + random() * 3.8, scale));
      const goal = point(-0.3 + random() * 2.4, -1.3 + random() * 3.8, scale);
      assert.ok(nav.isFree(start.x, start.z));
      assertClearRoute(nav, start, nav.route(start, goal));
    }
  });
}
