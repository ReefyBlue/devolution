// Container boxes: one mesh per box with shared geometry per size and height, operator colour, dark edges.

import * as THREE from 'three';
import type { Profiles } from '../config/profiles';
import { boxDims, type Container } from '../sim/container';

export class ContainerMeshes {
  readonly group = new THREE.Group();
  private readonly meshes = new Map<string, THREE.Mesh>();
  private readonly geometries = new Map<string, { box: THREE.BoxGeometry; edges: THREE.EdgesGeometry }>();
  private readonly materials = new Map<string, THREE.MeshStandardMaterial>();
  private readonly edgeMaterial = new THREE.LineBasicMaterial({ color: 0x15191d, transparent: true, opacity: 0.55 });

  constructor(private readonly profiles: Profiles) {}

  /** Creates meshes for new boxes and removes meshes of boxes no longer present. */
  sync(containers: readonly Container[]): void {
    const alive = new Set(containers.map((c) => c.id));
    for (const [id, mesh] of this.meshes) {
      if (!alive.has(id)) {
        this.group.remove(mesh);
        this.meshes.delete(id);
      }
    }
    for (const c of containers) {
      let mesh = this.meshes.get(c.id);
      if (!mesh) {
        mesh = this.create(c);
        this.meshes.set(c.id, mesh);
        this.group.add(mesh);
      }
      const h = boxDims(c, this.profiles.containers).height;
      mesh.position.set(c.x, c.y + h / 2, c.z);
      mesh.rotation.y = c.yaw;
    }
  }

  private create(c: Container): THREE.Mesh {
    const d = boxDims(c, this.profiles.containers);
    const key = `${c.size}${c.height}`;
    let geo = this.geometries.get(key);
    if (!geo) {
      const boxGeo = new THREE.BoxGeometry(d.length, d.height, d.width);
      geo = { box: boxGeo, edges: new THREE.EdgesGeometry(boxGeo) };
      this.geometries.set(key, geo);
    }
    const mesh = new THREE.Mesh(geo.box, this.material(c));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.add(new THREE.LineSegments(geo.edges, this.edgeMaterial));
    return mesh;
  }

  /** Operator colour with a small per-box shade so a stack does not look like one block. */
  private material(c: Container): THREE.MeshStandardMaterial {
    let hash = 0;
    for (const ch of c.id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    const shade = (hash % 5) - 2;
    const key = `${c.colour}/${shade}`;
    let m = this.materials.get(key);
    if (!m) {
      const colour = new THREE.Color(c.colour).offsetHSL(0, 0, shade * 0.025);
      m = new THREE.MeshStandardMaterial({ color: colour, roughness: 0.75, metalness: 0.2 });
      this.materials.set(key, m);
    }
    return m;
  }
}
