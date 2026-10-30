// A small navigation grid for this room, rebuilt per route so a moved chair is
// always respected. All collision and path coordinates use room world units.
export class RoomNavigation {
  constructor(scale = 1) {
    this.scale = scale;
    this.margin = 0.065 * scale;
    this.cell = 0.085 * scale;
    this.bounds = { x0: -0.16 * scale, x1: 1.82 * scale, z0: -1.07 * scale, z1: 2.16 * scale };
    this.boxes = [
      [-0.3, 0.38, -0.5, 0.74], [-0.3, 0.36, -1.1, -0.45],
      [0.5, 1.5, -1.2, -0.93], [0.62, 1.28, 2.05, 2.35],
      [1.76, 2, 0.99, 1.41],
    ].map((box) => box.map((value) => value * scale));
    this.circles = [[0.56, 1.02, 0.24], [1.62, -1.08, 0.14], [0.43, -1.07, 0.1], [1.55, 1.95, 0.2]]
      .map((circle) => circle.map((value) => value * scale));
  }

  isFree(x, z) {
    const b = this.bounds, pad = this.margin;
    if (x < b.x0 || x > b.x1 || z < b.z0 || z > b.z1) return false;
    for (const [x0, x1, z0, z1] of this.boxes) {
      if (x > x0 - pad + 1e-6 && x < x1 + pad - 1e-6 && z > z0 - pad + 1e-6 && z < z1 + pad - 1e-6) return false;
    }
    return !this.circles.some(([cx, cz, radius]) => (x - cx) ** 2 + (z - cz) ** 2 < (radius + pad) ** 2 - 1e-7);
  }

  project(point) {
    const b = this.bounds, pad = this.margin;
    for (let pass = 0; pass < 5; pass++) {
      point.x = Math.max(b.x0, Math.min(b.x1, point.x));
      point.z = Math.max(b.z0, Math.min(b.z1, point.z));
      for (const [x0, x1, z0, z1] of this.boxes) {
        if (point.x > x0 - pad && point.x < x1 + pad && point.z > z0 - pad && point.z < z1 + pad) {
          const distances = [point.x - x0 + pad, x1 + pad - point.x, point.z - z0 + pad, z1 + pad - point.z];
          const side = distances.indexOf(Math.min(...distances));
          if (side === 0) point.x = x0 - pad;
          else if (side === 1) point.x = x1 + pad;
          else if (side === 2) point.z = z0 - pad;
          else point.z = z1 + pad;
        }
      }
      for (const [cx, cz, radius] of this.circles) {
        const dx = point.x - cx, dz = point.z - cz, distance = Math.hypot(dx, dz), limit = radius + pad;
        if (distance < limit) {
          point.x = cx + (distance > 1e-7 ? dx / distance : 0) * limit;
          point.z = cz + (distance > 1e-7 ? dz / distance : 1) * limit;
        }
      }
      if (this.isFree(point.x, point.z)) break;
    }
    point.x = Math.max(b.x0, Math.min(b.x1, point.x));
    point.z = Math.max(b.z0, Math.min(b.z1, point.z));
    // Near a wall, an obstacle's nearest edge can be outside the room. Pick a
    // nearby free cell instead of leaving the requested point inside furniture.
    if (!this.isFree(point.x, point.z)) {
      let bestX = point.x, bestZ = point.z, cost = Infinity;
      for (let x = b.x0; x <= b.x1; x += this.cell) {
        for (let z = b.z0; z <= b.z1; z += this.cell) {
          const distance = (x - point.x) ** 2 + (z - point.z) ** 2;
          if (distance < cost && this.isFree(x, z)) { bestX = x; bestZ = z; cost = distance; }
        }
      }
      point.x = bestX; point.z = bestZ;
    }
    return point;
  }

  segmentFree(from, to) {
    const count = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / (0.025 * this.scale)));
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      if (!this.isFree(from.x + (to.x - from.x) * t, from.z + (to.z - from.z) * t)) return false;
    }
    return true;
  }

  move(point, dx, dz) {
    // Swept substeps prevent a slow frame from jumping through thin obstacles.
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / (0.018 * this.scale)));
    for (let i = 0; i < steps; i++) {
      point.x += dx / steps;
      point.z += dz / steps;
      this.project(point);
    }
    return point;
  }

  route(start, requested) {
    const target = this.project({ x: requested.x, z: requested.z });
    if (this.segmentFree(start, target)) return [target];
    const { x0, x1, z0, z1 } = this.bounds, step = this.cell;
    const width = Math.floor((x1 - x0) / step) + 1, height = Math.floor((z1 - z0) / step) + 1;
    const count = width * height;
    const pointAt = (index) => ({ x: x0 + (index % width) * step, z: z0 + Math.floor(index / width) * step });
    const free = new Uint8Array(count);
    for (let i = 0; i < count; i++) { const p = pointAt(i); free[i] = this.isFree(p.x, p.z) ? 1 : 0; }
    const nearest = (point, visible = true) => {
      let best = -1, cost = Infinity;
      for (let i = 0; i < count; i++) {
        if (!free[i]) continue;
        const p = pointAt(i), distance = (p.x - point.x) ** 2 + (p.z - point.z) ** 2;
        if (distance < cost && (!visible || this.segmentFree(point, p))) { best = i; cost = distance; }
      }
      return best;
    };
    const source = nearest(start);
    let goal = nearest(target);
    if (source < 0) return [{ x: start.x, z: start.z }];
    if (goal < 0) { goal = nearest(target, false); if (goal < 0) return []; Object.assign(target, pointAt(goal)); }
    const costs = new Float32Array(count).fill(Infinity), parent = new Int32Array(count).fill(-1), closed = new Uint8Array(count);
    const open = new MinHeap();
    costs[source] = 0;
    open.push(source, 0);
    let closest = source, closestDistance = Infinity;
    const offsets = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    while (open.length) {
      const current = open.pop();
      if (closed[current]) continue;
      const remaining = Math.hypot(current % width - goal % width, Math.floor(current / width) - Math.floor(goal / width));
      if (remaining < closestDistance) { closestDistance = remaining; closest = current; }
      if (current === goal) break;
      closed[current] = 1;
      const cx = current % width, cz = Math.floor(current / width), from = pointAt(current);
      for (const [dx, dz] of offsets) {
        const nx = cx + dx, nz = cz + dz;
        if (nx < 0 || nz < 0 || nx >= width || nz >= height) continue;
        const next = nz * width + nx;
        if (!free[next] || closed[next]) continue;
        const point = pointAt(next);
        if (!this.segmentFree(from, point)) continue;
        const cost = costs[current] + Math.hypot(dx, dz);
        if (cost >= costs[next]) continue;
        costs[next] = cost; parent[next] = current;
        open.push(next, cost + Math.hypot(nx - goal % width, nz - Math.floor(goal / width)));
      }
    }
    if (source !== goal && parent[goal] < 0) { goal = closest; Object.assign(target, pointAt(goal)); }
    const points = [target];
    for (let cursor = goal; cursor !== source && cursor >= 0; cursor = parent[cursor]) points.unshift(pointAt(cursor));
    points.unshift(pointAt(source));
    // Keep only visible waypoints; diagonal corner-cutting is never allowed.
    const result = [];
    let anchor = start, index = 0;
    while (index < points.length) {
      let next = index;
      while (next + 1 < points.length && this.segmentFree(anchor, points[next + 1])) next++;
      result.push(points[next]); anchor = points[next]; index = next + 1;
    }
    return result;
  }
}

class MinHeap {
  constructor() { this.items = []; }
  get length() { return this.items.length; }
  push(index, score) {
    const entry = { index, score }, list = this.items;
    let i = list.length; list.push(entry);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (list[p].score <= score) break;
      list[i] = list[p]; i = p;
    }
    list[i] = entry;
  }
  pop() {
    const list = this.items, first = list[0], last = list.pop();
    if (list.length) {
      let i = 0;
      while (i * 2 + 1 < list.length) {
        let child = i * 2 + 1;
        if (child + 1 < list.length && list[child + 1].score < list[child].score) child++;
        if (list[child].score >= last.score) break;
        list[i] = list[child]; i = child;
      }
      list[i] = last;
    }
    return first.index;
  }
}
