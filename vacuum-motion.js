import { RoomNavigation } from './navigation.js';

export const VACUUM_RADIUS = .17;
const angle = value => Math.atan2(Math.sin(value), Math.cos(value));

// Local room coordinates. The larger margin includes the sweeping brushes.
export class VacuumMotion {
  constructor({ x = .65, z = -.55 } = {}) {
    this.navigation = new RoomNavigation();
    this.navigation.margin = VACUUM_RADIUS + .012;
    this.navigation.bounds = { x0: -.08, x1: 1.79, z0: -1, z1: 2.10 };
    this.position = this.navigation.project({ x, z });
    this.heading = Math.PI / 2;
    this.speed = 0;
    this.distance = 0;
    this.state = 'cleaning';
    this.path = [];
    this.targetIndex = 0;
    this.replanIn = 0;
    this.targets = [];
    [-.62, -.24, .16, .56, .96, 1.36, 1.72].forEach((z, row) => {
      const columns = row % 2 ? [1.60, 1.24, .88, .6] : [.6, .88, 1.24, 1.60];
      columns.forEach(x => { if (this.navigation.isFree(x, z)) this.targets.push({ x, z }); });
    });
  }
  setChairPosition(x, z) {
    const chair = this.navigation.circles[0];
    if (Math.hypot(chair[0] - x, chair[1] - z) < .002) return;
    chair[0] = x; chair[1] = z; this.path = []; this.replanIn = 0;
  }
  plan() {
    for (let i = 0; i < this.targets.length; i++) {
      const target = this.targets[this.targetIndex++ % this.targets.length];
      if (!this.navigation.isFree(target.x, target.z) || Math.hypot(target.x - this.position.x, target.z - this.position.z) < .08) continue;
      this.path = this.navigation.route(this.position, target);
      if (this.path.length) return;
    }
    this.replanIn = .7;
  }
  update(delta, { paused = false, person = null } = {}) {
    const dt = Math.min(Math.max(delta || 0, 0), .05);
    const before = { ...this.position }, oldHeading = this.heading;
    const nearby = person && Math.hypot(person.x - before.x, person.z - before.z) < .34;
    if (!dt || paused || nearby || !this.navigation.isFree(before.x, before.z)) {
      this.speed = 0; this.state = 'waiting'; return { distance: 0, turn: 0 };
    }
    this.replanIn = Math.max(0, this.replanIn - dt);
    if (this.path.length && !this.navigation.segmentFree(this.position, this.path[0])) this.path = [];
    if (!this.path.length && !this.replanIn) this.plan();
    while (this.path.length && Math.hypot(this.path[0].x - before.x, this.path[0].z - before.z) < .014) this.path.shift();
    const next = this.path[0];
    if (!next) { this.speed = 0; this.state = 'waiting'; return { distance: 0, turn: 0 }; }
    const dx = next.x - before.x, dz = next.z - before.z, distance = Math.hypot(dx, dz);
    const difference = angle(Math.atan2(dx, dz) - this.heading);
    this.heading = angle(this.heading + Math.max(-1.6 * dt, Math.min(1.6 * dt, difference)));
    const desiredSpeed = Math.abs(difference) > .32 ? 0 : .13 * Math.min(1, distance / .08);
    this.speed += (desiredSpeed - this.speed) * (1 - Math.exp(-8 * dt));
    const step = Math.min(this.speed * dt, distance);
    const candidate = { x: before.x + Math.sin(this.heading) * step, z: before.z + Math.cos(this.heading) * step };
    const safeForPerson = !person || Math.hypot(person.x - candidate.x, person.z - candidate.z) >= .34;
    if (safeForPerson && this.navigation.segmentFree(before, candidate)) Object.assign(this.position, candidate);
    else { this.speed = 0; this.path = []; this.replanIn = .3; }
    const travelled = Math.hypot(this.position.x - before.x, this.position.z - before.z);
    this.distance += travelled; this.state = travelled > .00001 ? 'cleaning' : 'turning';
    return { distance: travelled, turn: angle(this.heading - oldHeading) };
  }
}
