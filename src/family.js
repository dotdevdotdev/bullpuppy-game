import * as THREE from 'three';
import { FAMILY } from './config.js';

let familyIdCounter = 0;

export class Family {
  constructor(daddy = null, mommy = null) {
    this.id = ++familyIdCounter;
    this.daddy = daddy;
    this.mommy = mommy;
    this.children = [];

    if (daddy) daddy.family = this;
    if (mommy) mommy.family = this;
  }

  addChild(child) {
    this.children.push(child);
    child.family = this;
    child.parents = [this.daddy, this.mommy].filter(p => p);
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
    }
  }

  getMembers() {
    const members = [...this.children];
    if (this.daddy) members.push(this.daddy);
    if (this.mommy) members.push(this.mommy);
    return members;
  }

  getCenter() {
    const members = this.getMembers();
    if (members.length === 0) return null;

    const center = new THREE.Vector3();
    for (const member of members) {
      center.add(member.model.position);
    }
    center.divideScalar(members.length);
    return center;
  }

  getParentsCenter() {
    const parents = [this.daddy, this.mommy].filter(p => p);
    if (parents.length === 0) return null;

    const center = new THREE.Vector3();
    for (const parent of parents) {
      center.add(parent.model.position);
    }
    center.divideScalar(parents.length);
    return center;
  }

  // Get force to keep family together
  getCohesionForce(dog) {
    const members = this.getMembers();
    if (members.length <= 1) return new THREE.Vector3();

    const center = this.getCenter();
    if (!center) return new THREE.Vector3();

    const toCenter = new THREE.Vector3().subVectors(center, dog.model.position);
    const distance = toCenter.length();

    // Only apply cohesion if spread too far
    if (distance < FAMILY.MAX_SPREAD * 0.5) {
      return new THREE.Vector3();
    }

    toCenter.normalize();
    const strength = Math.min((distance - FAMILY.MAX_SPREAD * 0.5) / FAMILY.MAX_SPREAD, 1);
    return toCenter.multiplyScalar(strength * FAMILY.COHESION_STRENGTH);
  }

  isComplete() {
    return this.daddy && this.mommy;
  }
}
