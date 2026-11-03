/**
 * 3D Articulated Character & Companion Controller (`char_prefect.glb`, `pet_niffler.glb`, `pet_hedwig.glb`)
 * Drives House-colored Prefect robes/scarf, breathing, head look-around, Reparo wand-casting rotation,
 * and wandering Niffler / Hedwig animations directly in canonical 3D world space!
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

  sync({
    isGarden,
    house = 'gryffindor',
    austinWorld,
    petWorld,
    petHop = 0,
    spellCast = null,
    timeSec = 0,
    screenToWorldXZ,
  }) {
    const prefectReady = this._ensurePrefect(house);
    const petReady = this._ensurePet(isGarden, house);
    let wandWorldPos = null;

    if (prefectReady && austinWorld) {
      const entry = this.prefect.userData.glbEntry;
      const targetHeight = isGarden ? 148 : 142;
      const s = targetHeight / Math.max(0.4, entry.sizeY);
      const breathe = 1 + Math.sin(timeSec * 3.1) * 0.018;

      const wx = austinWorld.x;
      const wz = austinWorld.z;
      this.prefect.position.set(wx, 0, wz);
      this.prefect.scale.set(s, s * breathe, s);
      if (this.prefectShadow) {
        this.prefectShadow.position.set(wx, 1.1, wz);
        this.prefectShadow.scale.set(62, 1, 62);
      }

      let targetYaw = isGarden ? -0.42 : 0.42;
      let castRatio = 0;
      if (spellCast) {
        castRatio = Math.sin(Math.min(1, spellCast.t / Math.max(0.2, spellCast.duration)) * Math.PI);
        const tgtXZ = spellCast.worldTarget || screenToWorldXZ(spellCast.tx, spellCast.ty);
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
        wandWorldPos = new THREE.Vector3(wx, targetHeight * 0.62, wz);
      }
    }

    if (petReady && petWorld) {
      const entry = this.pet.userData.glbEntry;
      const targetPetSpan = isGarden ? 78 : 94;
      const ps = targetPetSpan / Math.max(0.3, entry.maxSpan);

      const px = petWorld.x;
      const pz = petWorld.z;
      const idleHop = Math.abs(Math.sin(timeSec * 4.2)) * (isGarden ? 6.5 : 2.2);
      const tapJump = Math.sin(petHop * Math.PI) * 32;
      this.pet.position.set(px, idleHop + tapJump, pz);
      this.pet.scale.setScalar(ps);
      if (this.petShadow) {
        const hopShrink = Math.max(0.58, 1 - (idleHop + tapJump) / 96);
        this.petShadow.position.set(px, 1.1, pz);
        this.petShadow.scale.set(44 * hopShrink, 1, 44 * hopShrink);
      }

      if (!isGarden) {
        this._petYaw = 0.22 + Math.sin(timeSec * 1.4) * 0.14;
      } else if (this._prevPetX !== null && this._prevPetZ !== null) {
        const dx = px - this._prevPetX;
        const dz = pz - this._prevPetZ;
        if (Math.hypot(dx, dz) > 0.35) {
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
