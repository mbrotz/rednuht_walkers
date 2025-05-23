let BodyDefinitions = {
    Classic: {
        density   : 106.2,
        upperTorso: { width : 0.25, height: 0.45 },
        lowerTorso: { width : 0.25, height: 0.2  },
        upperLeg  : { width : 0.18, length: 0.45 },
        lowerLeg  : { width : 0.13, length: 0.38 },
        foot      : { length: 0.28, height: 0.08 },
        upperArm  : { width : 0.12, length: 0.37 },
        lowerArm  : { width : 0.1 , length: 0.42 },
        head      : { width : 0.22, height: 0.22 },
        neck      : { width : 0.1 , height: 0.08 }
    },
    Extended: {
        density   : 106.2,
        upperTorso: { width : 0.25, height: 0.45 },
        lowerTorso: { width : 0.25, height: 0.2  },
        upperLeg  : { width : 0.18, length: 0.45 },
        lowerLeg  : { width : 0.13, length: 0.38 },
        foot      : { length: 0.28, height: 0.08 },
        upperArm  : { width : 0.12, length: 0.37 },
        lowerArm  : { width : 0.1 , length: 0.42 },
        head      : { width : 0.22, height: 0.22 },
        neck      : { width : 0.1 , height: 0.08 }
    }
};

let JointDefinitions = {
    Classic: {
        torso: {
            lowerAngle: -Math.PI / 18,
            upperAngle: Math.PI / 10,
            maxMotorTorque: 250,
            anchorOnBodyA: true,
            offsetX: -BodyDefinitions.Classic.lowerTorso.width / 3,
            offsetY: -BodyDefinitions.Classic.upperTorso.height / 2
        },
        knee: {
            lowerAngle: -1.6,
            upperAngle: -0.2,
            maxMotorTorque: 160,
            anchorOnBodyA: true,
            offsetX: BodyDefinitions.Classic.upperLeg.width / 4,
            offsetY: -BodyDefinitions.Classic.upperLeg.length / 2
        },
        ankle: {
            lowerAngle: -Math.PI / 5,
            upperAngle: Math.PI / 6,
            maxMotorTorque: 70,
            anchorOnBodyA: true,
            offsetX: 0,
            offsetY: -BodyDefinitions.Classic.lowerLeg.length / 2
        },
        elbow: {
            lowerAngle: 0,
            upperAngle: 1.22,
            maxMotorTorque: 60,
            anchorOnBodyA: true,
            offsetX: 0,
            offsetY: -BodyDefinitions.Classic.upperArm.length / 2
        },
        neck: {
            lowerAngle: -0.1,
            upperAngle: 0.1,
            maxMotorTorque: 2,
            anchorOnBodyA: false,
            offsetX: 0,
            offsetY: BodyDefinitions.Classic.neck.height / 2
        },
        shoulder: {
            lowerAngle: -Math.PI / 2,
            upperAngle: Math.PI / 1.5,
            maxMotorTorque: 120,
            anchorOnBodyA: true,
            offsetX: 0,
            offsetY: BodyDefinitions.Classic.upperTorso.height / 2
        },
        hip: {
            lowerAngle: -Math.PI / 2.5,
            upperAngle: Math.PI / 3,
            maxMotorTorque: 250,
            anchorOnBodyA: true,
            offsetX: 0,
            offsetY: -BodyDefinitions.Classic.lowerTorso.height / 2
        }
    },
    Extended: {
        torso: {                    // Simulates lumbar spine flexibility
            lowerAngle: -0.7,       // Increased flexion (bending forward, approx -40 deg)
            upperAngle: 0.5,        // Increased extension (bending backward, approx 28 deg)
            maxMotorTorque: 250,
            anchorOnBodyA: true,
            offsetX: -BodyDefinitions.Extended.lowerTorso.width / 3,
            offsetY: -BodyDefinitions.Extended.upperTorso.height / 2
        },
        knee: {
            lowerAngle: -2.2,       // Max flexion (approx -126 deg, leg bends backward)
            upperAngle: 0,          // Allows full straightening
            maxMotorTorque: 160,
            anchorOnBodyA: true,
            offsetX: BodyDefinitions.Extended.upperLeg.width / 4,
            offsetY: -BodyDefinitions.Extended.upperLeg.length / 2
        },
        ankle: {
            lowerAngle: -0.87,      // Plantarflexion (pointing foot down, approx -50 deg)
            upperAngle: 0.35,       // Dorsiflexion (pulling foot up, approx 20 deg)
            maxMotorTorque: 70,
            anchorOnBodyA: true,
            offsetX: 0,
            offsetY: -BodyDefinitions.Extended.lowerLeg.length / 2
        },
        elbow: {
            lowerAngle: 0,          // Allows full straightening
            upperAngle: 2.4,        // Increased flexion (approx 137 deg, arm bends forward)
            maxMotorTorque: 60,
            anchorOnBodyA: true,
            offsetX: 0,
            offsetY: -BodyDefinitions.Extended.upperArm.length / 2
        },
        neck: {
            lowerAngle: -0.8,       // Increased flexion (looking down, approx -45 deg)
            upperAngle: 0.8,        // Increased extension (looking up, approx 45 deg)
            maxMotorTorque: 20,     // Increased torque for better head control
            anchorOnBodyA: false,
            offsetX: 0,
            offsetY: BodyDefinitions.Extended.neck.height / 2
        },
        shoulder: {
            lowerAngle: -Math.PI / 2,
            upperAngle: Math.PI / 1.5,
            maxMotorTorque: 120,
            anchorOnBodyA: true,
            offsetX: 0,
            offsetY: BodyDefinitions.Extended.upperTorso.height / 2
        },
        hip: {
            lowerAngle: -Math.PI / 2.5,
            upperAngle: Math.PI / 3,
            maxMotorTorque: 250,
            anchorOnBodyA: true,
            offsetX: 0,
            offsetY: -BodyDefinitions.Extended.lowerTorso.height / 2
        }
    }
};

class WalkerBody {
    constructor(ownerWalker) {
        this.owner = ownerWalker;
        this.world = this.owner.game.world;
        this.density = BodyDefinitions.Classic.density;
        this.bodyDefs = BodyDefinitions.Classic;
        this.jointDefs = JointDefinitions.Extended;
        this.joints = [];
        this.torso = this.createTorso();
        this.left_leg = this.createLeg();
        this.right_leg = this.createLeg();
        this.left_arm = this.createArm();
        this.right_arm = this.createArm();
        this.head = this.createHead();
        this.connectParts();
        this.bodies = this.getBodies();
    }

    createBody(partDefinition, x, y, userData = null) {
        let boxWidth, boxHeight;

        if (partDefinition.hasOwnProperty('width') && partDefinition.hasOwnProperty('height')) {
            boxWidth = partDefinition.width;
            boxHeight = partDefinition.height;
        } else if (partDefinition.hasOwnProperty('width') && partDefinition.hasOwnProperty('length')) {
            boxWidth = partDefinition.width;
            boxHeight = partDefinition.length;
        } else if (partDefinition.hasOwnProperty('length') && partDefinition.hasOwnProperty('height')) {
            boxWidth = partDefinition.length;
            boxHeight = partDefinition.height;
        } else {
            console.error("Invalid body part dimensions: ", partDefinition);
            boxWidth = 0.1;
            boxHeight = 0.1;
        }

        let bd = new b2.BodyDef();
        bd.type = b2.Body.b2_dynamicBody;
        bd.linearDamping = 0;
        bd.angularDamping = 0.5;
        bd.allowSleep = true;
        bd.awake = true;
        bd.position.Set(x, y);

        let body = this.world.CreateBody(bd);

        let fd = new b2.FixtureDef();
        fd.density = this.density;
        fd.restitution = 0.1;
        fd.friction = 0.5;
        fd.filter.groupIndex = -1;
        fd.shape = new b2.PolygonShape();
        fd.shape.SetAsBox(boxWidth / 2, boxHeight / 2);

        let fixture = body.CreateFixture(fd);
        if (userData) {
            fixture.SetUserData(userData);
        }

        return body;
    }

    createRevoluteJoint(bodyA, bodyB, jointConfig) {
        let anchorBody = jointConfig.anchorOnBodyA ? bodyA : bodyB;
        let localAnchor = new b2.Vec2(jointConfig.offsetX || 0, jointConfig.offsetY || 0);
        let worldAnchorPos = anchorBody.GetWorldPoint(localAnchor);
        let jd = new b2.RevoluteJointDef();
        jd.Initialize(bodyA, bodyB, worldAnchorPos);
        jd.lowerAngle = jointConfig.lowerAngle;
        jd.upperAngle = jointConfig.upperAngle;
        jd.maxMotorTorque = jointConfig.maxMotorTorque;
        jd.enableMotor = true;
        jd.enableLimit = true;
        jd.motorSpeed = 0;
        this.joints.push(this.world.CreateJoint(jd));
    }

    createWeldJoint(bodyA, bodyB, localAnchorA, localAnchorB, referenceAngle = 0) {
        let jd = new b2.WeldJointDef();
        jd.bodyA = bodyA;
        jd.bodyB = bodyB;
        jd.localAnchorA = localAnchorA.Clone();
        jd.localAnchorB = localAnchorB.Clone();
        jd.referenceAngle = referenceAngle;
        this.world.CreateJoint(jd);
    }

    createTorso() {
        const initialX = 0.5 - this.bodyDefs.foot.length / 2 + this.bodyDefs.lowerLeg.width / 2;
        const legStackHeight = this.bodyDefs.foot.height + this.bodyDefs.lowerLeg.length + this.bodyDefs.upperLeg.length;
        const upperTorsoDef = this.bodyDefs.upperTorso;
        const lowerTorsoDef = this.bodyDefs.lowerTorso;

        let upperTorso = this.createBody(
            upperTorsoDef,
            initialX,
            legStackHeight + lowerTorsoDef.height + upperTorsoDef.height / 2
        );

        let lowerTorso = this.createBody(
            lowerTorsoDef,
            initialX,
            legStackHeight + lowerTorsoDef.height / 2
        );

        this.createRevoluteJoint(upperTorso, lowerTorso, this.jointDefs.torso);

        return {upperTorso: upperTorso, lowerTorso: lowerTorso};
    }

    createLeg() {
        const initialX = 0.5 - this.bodyDefs.foot.length / 2 + this.bodyDefs.lowerLeg.width / 2;
        const footBaseHeight = this.bodyDefs.foot.height;
        const upperLegDef = this.bodyDefs.upperLeg;
        const lowerLegDef = this.bodyDefs.lowerLeg;
        const footDef = this.bodyDefs.foot;

        let upperLeg = this.createBody(
            upperLegDef,
            initialX,
            footBaseHeight + lowerLegDef.length + upperLegDef.length / 2
        );

        let lowerLeg = this.createBody(
            lowerLegDef,
            initialX,
            footBaseHeight + lowerLegDef.length / 2
        );

        let foot = this.createBody(
            footDef,
            0.5,
            footDef.height / 2
        );

        this.createRevoluteJoint(upperLeg, lowerLeg, this.jointDefs.knee);
        this.createRevoluteJoint(lowerLeg, foot, this.jointDefs.ankle);

        return {upperLeg: upperLeg, lowerLeg: lowerLeg, foot:foot};
    }

    createArm() {
        const initialX = 0.5 - this.bodyDefs.foot.length / 2 + this.bodyDefs.lowerLeg.width / 2;
        const torsoTopY = this.bodyDefs.foot.height + this.bodyDefs.lowerLeg.length + this.bodyDefs.upperLeg.length +
                          this.bodyDefs.lowerTorso.height + this.bodyDefs.upperTorso.height;
        const upperArmDef = this.bodyDefs.upperArm;
        const lowerArmDef = this.bodyDefs.lowerArm;

        let upperArm = this.createBody(
            upperArmDef,
            initialX,
            torsoTopY - upperArmDef.length / 2
        );

        let lowerArm = this.createBody(
            lowerArmDef,
            initialX,
            torsoTopY - upperArmDef.length - lowerArmDef.length / 2
        );

        this.createRevoluteJoint(upperArm, lowerArm, this.jointDefs.elbow);

        return {upperArm: upperArm, lowerArm: lowerArm};
    }

    createHead() {
        const initialX = 0.5 - this.bodyDefs.foot.length / 2 + this.bodyDefs.lowerLeg.width / 2;
        const torsoTopY = this.bodyDefs.foot.height + this.bodyDefs.lowerLeg.length + this.bodyDefs.upperLeg.length +
                          this.bodyDefs.lowerTorso.height + this.bodyDefs.upperTorso.height;
        const neckDef = this.bodyDefs.neck;
        const headDef = this.bodyDefs.head;

        let neck = this.createBody(
            neckDef,
            initialX,
            torsoTopY + neckDef.height / 2
        );

        let head = this.createBody(
            headDef,
            initialX,
            torsoTopY + neckDef.height + headDef.height / 2,
            { isHead: true, walker: this.owner }
        );

        this.createRevoluteJoint(head, neck, this.jointDefs.neck);

        return {head: head, neck: neck};
    }

    connectParts() {
        this.createWeldJoint(
            this.head.neck,
            this.torso.upperTorso,
            new b2.Vec2(0, -this.bodyDefs.neck.height / 2),
            new b2.Vec2(0, this.bodyDefs.upperTorso.height / 2)
        );

        this.createRevoluteJoint(this.torso.upperTorso, this.right_arm.upperArm, this.jointDefs.shoulder);
        this.createRevoluteJoint(this.torso.upperTorso, this.left_arm.upperArm, this.jointDefs.shoulder);

        this.createRevoluteJoint(this.torso.lowerTorso, this.right_leg.upperLeg, this.jointDefs.hip);
        this.createRevoluteJoint(this.torso.lowerTorso, this.left_leg.upperLeg, this.jointDefs.hip);
    }

    getBodies() {
        return [
            this.left_arm.lowerArm,
            this.left_arm.upperArm,
            this.left_leg.foot,
            this.left_leg.lowerLeg,
            this.left_leg.upperLeg,
            this.head.neck,
            this.head.head,
            this.torso.lowerTorso,
            this.torso.upperTorso,
            this.right_leg.upperLeg,
            this.right_leg.lowerLeg,
            this.right_leg.foot,
            this.right_arm.upperArm,
            this.right_arm.lowerArm,
        ];
    }

    createGenome() {
        let genome = [];
        for(let k = 0; k < this.joints.length; k++) {
            genome.push({
              amplitude: gaussianRandom(0, 3),
              phase: gaussianRandom(Math.PI, Math.PI * 2),
              frequency: gaussianRandom(0.1, 0.1),
            });
        }
        return genome;
    }

    updateJoints() {
        for(let k = 0; k < this.joints.length; k++) {
            let gene = this.owner.genome[k];
            if (gene && this.joints[k]) {
                this.joints[k].SetMotorSpeed(gene.amplitude * Math.cos(gene.phase + gene.frequency * this.owner.local_step_counter));
            }
        }
    }

    destroy() {
        for(let i = 0; i < this.bodies.length; i++) {
            if(this.bodies[i]) {
                this.world.DestroyBody(this.bodies[i]);
                this.bodies[i] = null;
            }
        }
        this.bodies = [];
        this.joints = [];
        this.head = null;
        this.torso = null;
        this.left_arm = null;
        this.right_arm = null;
        this.left_leg = null;
        this.right_leg = null;
    }
}
