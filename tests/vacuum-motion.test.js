import test from 'node:test';
import assert from 'node:assert/strict';
import { VacuumMotion } from '../vacuum-motion.js';

test('Demo Robot cleans a substantial route without crossing furniture or walls', () => {
  const robot = new VacuumMotion();
  const visited = new Set();
  for (let i = 0; i < 9000; i++) {
    const from = { ...robot.position };
    robot.update(.04);
    assert(robot.navigation.isFree(robot.position.x, robot.position.z));
    assert(robot.navigation.segmentFree(from, robot.position));
    visited.add(`${Math.floor(robot.position.x / .35)},${Math.floor(robot.position.z / .35)}`);
  }
  assert(robot.distance > 20, `Travelled only ${robot.distance}`);
  assert(visited.size > 18, `Visited only ${visited.size} floor cells`);
});

test('Demo Robot replans around a moved chair', () => {
  const robot = new VacuumMotion(); robot.setChairPosition(1.20, .60);
  for (let i = 0; i < 5000; i++) {
    robot.update(.05);
    assert(Math.hypot(robot.position.x - 1.20, robot.position.z - .60) >= .24 + robot.navigation.margin - 1e-8);
    assert(robot.navigation.isFree(robot.position.x, robot.position.z));
  }
  assert(robot.distance > 10);
});

test('Demo Robot pauses exactly in place and resumes from the same route', () => {
  const robot = new VacuumMotion(); for (let i = 0; i < 100; i++) robot.update(.05);
  const before = { ...robot.position }, heading = robot.heading, distance = robot.distance;
  for (let i = 0; i < 100; i++) robot.update(.05, { paused: true });
  assert.deepEqual(robot.position, before); assert.equal(robot.heading, heading);
  for (let i = 0; i < 100; i++) robot.update(.05);
  assert(robot.distance > distance + .2);
});

test('Demo Robot waits when approached and resumes when the visitor steps away', () => {
  const robot = new VacuumMotion(), before = { ...robot.position };
  for (let i = 0; i < 100; i++) robot.update(.05, { person: { x: before.x + .2, z: before.z } });
  assert.deepEqual(robot.position, before);
  for (let i = 0; i < 100; i++) robot.update(.05, { person: { x: 1.75, z: 1.70 } });
  assert(robot.distance > .2);
});

test('Long frames cannot teleport Demo Robot or snap its heading', () => {
  const robot = new VacuumMotion(), from = { ...robot.position }, heading = robot.heading;
  robot.update(30);
  assert(Math.hypot(robot.position.x - from.x, robot.position.z - from.z) <= .13 * .05);
  assert(Math.abs(Math.atan2(Math.sin(robot.heading - heading), Math.cos(robot.heading - heading))) <= 1.6 * .05 + 1e-8);
});
