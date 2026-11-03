/**
 * 3D Articulated Character & Companion Controller (`char_prefect.glb`, `pet_niffler.glb`, `pet_hedwig.glb`)
 * Drives House-colored Prefect robes/scarf, breathing, head look-around, Reparo wand-casting rotation,
 * and wandering Niffler / Hedwig animations inside the Three.js Isometric World Stage.
 */

import * as THREE from 'three';
import {
  applyActorHouse3D,
  cloneGlbInstance,
  createContactShadowDisc,
  hasGlbLoaded,
} from './glbBank.js';

function findNamedParts(root, names) {
  const out = {};
  root.traverse((n) => {
    if (names.includes(n.name)) out[n.name] = n;
  });
  return out;
}

export class World3DActorsController {
  constructor(parentGroup) {
    this.parentGroup = parentGroup;
    this.prefect = null;
    this.prefectParts = {};
    this.prefectHouse = '';

    this.pet = null;
    this.petKey = '';
    this.petParts = {};
    this.petHouse = '';
    this._prevPetX = null;
    this._prevPetZ = null;
    this._petYaw = -0.35;
  }

  _ensurePrefect(house) {
    if (!this.prefect && hasGlbLoaded('char_prefect')) {
      this.prefect = cloneGlbInstance('char_prefect', { castShadow: true, receiveShadow: true, centerXZ: true });
      if (this.prefect) {
        this.prefectParts = findNamedParts(this.prefect, ['Head', 'ArmR_Wand', 'ArmL', 'WandTip']);
        // Capture rest rotations so procedural animation never drifts
        for (const k of Object.keys(this.prefectParts)) {
          this.prefectParts[k].userData.restRot = this.prefectParts[k].rotation.clone();
        }
        this.prefectShadow = createContactShadowDisc(0.5);
        this.parentGroup.add(this.prefectShadow, this.prefect);
      }
    }
    if (this.prefect && this.prefectHouse !== house) {
      applyActorHouse3D(this.prefect, house);
      this.prefectHouse = house;
    }
    return Boolean(this.prefect);
  }

  _ensurePet(isGarden, house) {
    const wantKey = isGarden ? 'pet_niffler' : 'pet_hedwig';
    if (this.pet && this.petKey !== wantKey) {
      this.parentGroup.remove(this.pet);
      this.pet = null;
      this.petParts = {};
      this.petKey = '';
      this.petHouse = '';
    }
    if (!this.pet && hasGlbLoaded(wantKey)) {
      this.pet = cloneGlbInstance(wantKey, { castShadow: true, receiveShadow: true, centerXZ: true });
      if (this.pet) {
        this.petKey = wantKey;
        this.petParts = findNamedParts(this.pet, [
          'NifflerHead', 'NifArm_0.21', 'NifArm_-0.21', 'NifTail', 'GoldCoinFront',
          'OwlHead', 'OwlWing_0.23', 'OwlWing_-0.23', 'HogwartsLetter',
        ]);
        for (const k of Object.keys(this.petParts)) {
          this.petParts[k].userData.restRot = this.petParts[k].rotation.clone();
        }
        if (!this.petShadow) {
          this.petShadow = createContactShadowDisc(0.45);
          this.parentGroup.add(this.petShadow);
        }
        this.parentGroup.add(this.pet);
      }
    }
    if (this.pet && wantKey === 'pet_hedwig' && this.petHouse !== house) {
      applyActorHouse3D(this.pet, house);
      this.petHouse = house;
    }
    return Boolean(this.pet);
  }

  /**
   * Updates 3D Prefect + Pet world transforms and returns `{ prefectReady, petReady, wandWorldPos }`.
   */
  sync({
    isGarden,
    house = 'gryffindor',
    austinScreen,
    petScreen,
    petHop = 0,
    spellCast = null,
    sc = 1,
    timeSec = 0,
    screenToWorldXZ,
  }) {
    const prefectReady = this._ensurePrefect(house);
    const petReady = this._ensurePet(isGarden, house);
    let wandWorldPos = null;

    if (prefectReady && austinScreen) {
      const entry = this.prefect.userData.glbEntry;
      const targetHeightPx = (isGarden ? 116 : 112) * sc;
      const s = targetHeightPx / Math.max(0.4, entry.sizeY);
      const breathe = 1 + Math.sin(timeSec * 3.1) * 0.018;

      const { x: wx, z: wz } = screenToWorldXZ(austinScreen.x, austinScreen.y);
      this.prefect.position.set(wx, 0, wz);
      this.prefect.scale.set(s, s * breathe, s);
      if (this.prefectShadow) {
        this.prefectShadow.position.set(wx, 0.4, wz);
        this.prefectShadow.scale.set(52 * sc, 1, 52 * sc);
      }

      // Default cozy three-quarter stance; turn left/right toward target while keeping 3/4 face visible!
      let targetYaw = isGarden ? -0.42 : 0.42;
      let castRatio = 0;
      if (spellCast) {
        castRatio = Math.sin(Math.min(1, spellCast.t / Math.max(0.2, spellCast.duration)) * Math.PI);
        const tgtXZ = screenToWorldXZ(spellCast.tx, spellCast.ty);
        const dx = tgtXZ.x - wx;
        const dz = tgtXZ.z - wz;
        targetYaw = Math.atan2(dx, Math.max(Math.abs(dz) * 0.65, 28));
      } else {
        targetYaw += Math.sin(timeSec * 1.15) * 0.14;
      }
      this.prefect.rotation.set(0, targetYaw, Math.sin(timeSec * 2.1) * 0.015);

      const { Head: head, ArmR_Wand: armR, ArmL: armL, WandTip: wandTip } = this.prefectParts;
      if (head?.userData.restRot) {
        head.rotation.copy(head.userData.restRot);
        head.rotation.y += spellCast ? 0 : Math.sin(timeSec * 1.7) * 0.22;
        head.rotation.x += spellCast ? -0.14 * castRatio : Math.sin(timeSec * 2.4) * 0.05;
      }
      if (armR?.userData.restRot) {
        armR.rotation.copy(armR.userData.restRot);
        if (spellCast) {
          armR.rotation.x -= 0.92 * castRatio;
          armR.rotation.z += Math.sin(timeSec * 18) * 0.12 * castRatio;
        } else {
          armR.rotation.x -= 0.12 + Math.sin(timeSec * 2.8) * 0.08;
        }
      }
      if (armL?.userData.restRot) {
        armL.rotation.copy(armL.userData.restRot);
        armL.rotation.x += Math.sin(timeSec * 2.8 + Math.PI) * 0.06;
      }

      this.prefect.updateMatrixWorld(true);
      if (wandTip) {
        wandWorldPos = new THREE.Vector3();
        wandTip.getWorldPosition(wandWorldPos);
      } else {
        wandWorldPos = new THREE.Vector3(wx, targetHeightPx * 0.62, wz);
      }
    }

    if (petReady && petScreen) {
      const entry = this.pet.userData.glbEntry;
      const targetPetPx = (isGarden ? 62 : 76) * sc;
      const ps = targetPetPx / Math.max(0.3, entry.maxSpan);

      const { x: px, z: pz } = screenToWorldXZ(petScreen.x, petScreen.y);
      const idleHop = Math.abs(Math.sin(timeSec * 4.2)) * (isGarden ? 5.5 : 1.8) * sc;
      const tapJump = Math.sin(petHop * Math.PI) * 26 * sc;
      this.pet.position.set(px, idleHop + tapJump, pz);
      this.pet.scale.setScalar(ps);
      if (this.petShadow) {
        const hopShrink = Math.max(0.58, 1 - (idleHop + tapJump) / Math.max(40, 80 * sc));
        this.petShadow.position.set(px, 0.4, pz);
        this.petShadow.scale.set(38 * sc * hopShrink, 1, 38 * sc * hopShrink);
      }

      if (!isGarden) {
        this._petYaw = 0.22 + Math.sin(timeSec * 1.4) * 0.14;
      } else if (this._prevPetX !== null && this._prevPetZ !== null) {
        const dx = px - this._prevPetX;
        const dz = pz - this._prevPetZ;
        if (Math.hypot(dx, dz) > 0.35) {
          // Keep adorable 3/4 front face, snout & gold coins oriented toward the isometric camera!
          const desiredYaw = Math.atan2(dx, Math.max(Math.abs(dz) * 0.75, 18));
          let diff = desiredYaw - this._petYaw;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          this._petYaw += diff * 0.14;
        }
      }
      this._prevPetX = px;
      this._prevPetZ = pz;

      const spinBonus = petHop > 0 ? Math.sin(petHop * Math.PI) * Math.PI * 2 : 0;
      this.pet.rotation.set(0, this._petYaw + spinBonus, Math.sin(timeSec * 4.2) * (isGarden ? 0.045 : 0.02));

      if (isGarden) {
        const { NifflerHead: nHead, NifTail: nTail } = this.petParts;
        if (nHead?.userData.restRot) {
          nHead.rotation.copy(nHead.userData.restRot);
          nHead.rotation.y += Math.sin(timeSec * 3.1) * 0.24;
          nHead.rotation.x += Math.sin(timeSec * 5.2) * 0.08;
        }
        if (nTail?.userData.restRot) {
          nTail.rotation.copy(nTail.userData.restRot);
          nTail.rotation.y += Math.sin(timeSec * 7.5) * 0.28;
        }
      } else {
        const { OwlHead: oHead } = this.petParts;
        const wingR = this.petParts['OwlWing_0.23'];
        const wingL = this.petParts['OwlWing_-0.23'];
        if (oHead?.userData.restRot) {
          oHead.rotation.copy(oHead.userData.restRot);
          oHead.rotation.y += Math.sin(timeSec * 2.2) * 0.34;
        }
        const flap = petHop > 0 ? Math.abs(Math.sin(timeSec * 24)) * 0.65 : Math.max(0, Math.sin(timeSec * 3.4) - 0.65) * 0.45;
        if (wingR?.userData.restRot) {
          wingR.rotation.copy(wingR.userData.restRot);
          wingR.rotation.z -= flap;
        }
        if (wingL?.userData.restRot) {
          wingL.rotation.copy(wingL.userData.restRot);
          wingL.rotation.z += flap;
        }
      }
    }

    return { prefectReady, petReady, wandWorldPos };
  }
}
