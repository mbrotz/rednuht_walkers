
let WalkerBody = function() {
    this.__constructor.apply(this, arguments);
}

WalkerBody.prototype.__constructor = function(owner, world, density) {
    this.owner = owner;
    this.world = world;
    this.density = density;

    this.bodyDefs = {
        upperTorso: { width : 0.25, height: 0.45 },
        lowerTorso: { width : 0.25, height: 0.2  },
        upperLeg  : { width : 0.18, length: 0.45 },
        lowerLeg  : { width : 0.13, length: 0.38 },
        foot      : { length: 0.28, height: 0.08 },
        upperArm  : { width : 0.12, length: 0.37 },
        lowerArm  : { width : 0.1 , length: 0.42 },
        head      : { width : 0.22, height: 0.22 },
        neck      : { width : 0.1 , height: 0.08 }
    };

    this.jointDefs = {
        torso: {
            lowerAngle: -Math.PI / 18,
            upperAngle: Math.PI / 10,
            maxMotorTorque: 250,
            anchorOnBodyA: true,
            offsetX: -this.bodyDefs.lowerTorso.width / 3,
            offsetY: -this.bodyDefs.upperTorso.height / 2
        },
        knee: {
            lowerAngle: -1.6,
            upperAngle: -0.2,
            maxMotorTorque: 160,
            anchorOnBodyA: true,
            offsetX: this.bodyDefs.upperLeg.width / 4,
            offsetY: -this.bodyDefs.upperLeg.length / 2
        },
        ankle: {
            lowerAngle: -Math.PI / 5,
            upperAngle: Math.PI / 6,
            maxMotorTorque: 70,
            anchorOnBodyA: true,
            offsetX: 0,
            offsetY: -this.bodyDefs.lowerLeg.length / 2
        },
        elbow: {
            lowerAngle: 0,
            upperAngle: 1.22,
            maxMotorTorque: 60,
            anchorOnBodyA: true,
            offsetX: 0,
            offsetY: -this.bodyDefs.upperArm.length / 2
        },
        neck: {
            lowerAngle: -0.1,
            upperAngle: 0.1,
            maxMotorTorque: 2,
            anchorOnBodyA: false,
            offsetX: 0,
            offsetY: this.bodyDefs.neck.height / 2
        },
        shoulder: {
            lowerAngle: -Math.PI / 2,
            upperAngle: Math.PI / 1.5,
            maxMotorTorque: 120,
            anchorOnBodyA: true,
            offsetX: 0,
            offsetY: this.bodyDefs.upperTorso.height / 2
        },
        hip: {
            lowerAngle: -Math.PI / 2.5,
            upperAngle: Math.PI / 3,
            maxMotorTorque: 250,
            anchorOnBodyA: true,
            offsetX: 0,
            offsetY: -this.bodyDefs.lowerTorso.height / 2
        }
    };

    this.joints = [];

    this.torso = this._createTorso();
    this.left_leg = this._createLeg();
    this.right_leg = this._createLeg();
    this.left_arm = this._createArm();
    this.right_arm = this._createArm();
    this.head = this._createHead();

    this._connectParts();

    this.bodies = this._getBodies();
};

/**
 * Helper function to create a dynamic body with a rectangular fixture.
 * It intelligently determines dimensions from the partDefinition.
 * @param {object} partDefinition - The body part definition.
 * @param {number} x - The world x-coordinate for the body's center.
 * @param {number} y - The world y-coordinate for the body's center.
 * @param {object} [userData=null] - Optional user data to set on the fixture.
 * @returns {b2.Body} The created Box2D body.
 */
WalkerBody.prototype._createBody = function(partDefinition, x, y, userData = null) {
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
    bd.angularDamping = 0.01;
    bd.allowSleep = true;
    bd.awake = true;
    bd.position.Set(x, y);

    let body = this.world.CreateBody(bd);

    let fd = new b2.FixtureDef();
    fd.density = this.density;
    fd.restitution = 0.1;
    fd.filter.groupIndex = -1;
    fd.shape = new b2.PolygonShape();
    fd.shape.SetAsBox(boxWidth / 2, boxHeight / 2);

    let fixture = body.CreateFixture(fd);
    if (userData) {
        fixture.SetUserData(userData);
    }

    return body;
};


/**
 * Helper function to create a revolute joint with common settings.
 * These joints are typically motorized and added to the this.joints array.
 * @param {b2.Body} bodyA The first body.
 * @param {b2.Body} bodyB The second body.
 * @param {object} jointConfig The joint configuration
 */
WalkerBody.prototype._createRevoluteJoint = function(bodyA, bodyB, jointConfig) {
    let worldAnchorPos;
    if (jointConfig.anchorOnBodyA) {
        worldAnchorPos = bodyA.GetPosition().Clone();
    } else {
        worldAnchorPos = bodyB.GetPosition().Clone();
    }
    worldAnchorPos.x += (jointConfig.offsetX || 0);
    worldAnchorPos.y += (jointConfig.offsetY || 0);
    let jd = new b2.RevoluteJointDef();
    jd.Initialize(bodyA, bodyB, worldAnchorPos);
    jd.lowerAngle = jointConfig.lowerAngle;
    jd.upperAngle = jointConfig.upperAngle;
    jd.maxMotorTorque = jointConfig.maxMotorTorque;
    jd.enableMotor = true;
    jd.enableLimit = true;
    jd.motorSpeed = 0;
    this.joints.push(this.world.CreateJoint(jd));
};

/**
 * Helper function to create a weld joint.
 * These joints are typically static and are not added to the this.joints array
 * @param {b2.Body} bodyA The first body.
 * @param {b2.Body} bodyB The second body.
 * @param {b2.Vec2} localAnchorA The anchor point on bodyA in its local coordinates.
 * @param {b2.Vec2} localAnchorB The anchor point on bodyB in its local coordinates.
 * @param {number} [referenceAngle=0] The initial angle between the bodies.
 */
WalkerBody.prototype._createWeldJoint = function(bodyA, bodyB, localAnchorA, localAnchorB, referenceAngle = 0) {
    let jd = new b2.WeldJointDef();
    jd.bodyA = bodyA;
    jd.bodyB = bodyB;
    jd.localAnchorA = localAnchorA.Clone();
    jd.localAnchorB = localAnchorB.Clone();
    jd.referenceAngle = referenceAngle;
    this.world.CreateJoint(jd);
};


WalkerBody.prototype._createTorso = function() {
    const initialX = 0.5 - this.bodyDefs.foot.length / 2 + this.bodyDefs.lowerLeg.width / 2;
    // legStackHeight is the Y-coordinate of the top of the upper leg
    const legStackHeight = this.bodyDefs.foot.height + this.bodyDefs.lowerLeg.length + this.bodyDefs.upperLeg.length;

    const upperTorsoDef = this.bodyDefs.upperTorso;
    const lowerTorsoDef = this.bodyDefs.lowerTorso;

    let upperTorso = this._createBody(
        upperTorsoDef,
        initialX,
        legStackHeight + lowerTorsoDef.height + upperTorsoDef.height / 2
    );

    let lowerTorso = this._createBody(
        lowerTorsoDef,
        initialX,
        legStackHeight + lowerTorsoDef.height / 2
    );

    this._createRevoluteJoint(upperTorso, lowerTorso, this.jointDefs.torso);

    return {upperTorso: upperTorso, lowerTorso: lowerTorso};
};

WalkerBody.prototype._createLeg = function() {
    const initialX = 0.5 - this.bodyDefs.foot.length / 2 + this.bodyDefs.lowerLeg.width / 2;
    // footBaseHeight is the Y-coordinate of the top of the foot
    const footBaseHeight = this.bodyDefs.foot.height;

    const upperLegDef = this.bodyDefs.upperLeg;
    const lowerLegDef = this.bodyDefs.lowerLeg;
    const footDef = this.bodyDefs.foot;

    let upperLeg = this._createBody(
        upperLegDef,
        initialX,
        footBaseHeight + lowerLegDef.length + upperLegDef.length / 2
    );

    let lowerLeg = this._createBody(
        lowerLegDef,
        initialX,
        footBaseHeight + lowerLegDef.length / 2
    );

    let foot = this._createBody(
        footDef,
        0.5, // Foot is centered at X=0.5
        footDef.height / 2 // Foot center Y, assuming its base is at Y=0
    );

    // Knee Joint
    this._createRevoluteJoint(upperLeg, lowerLeg, this.jointDefs.knee);

    // Ankle Joint
    this._createRevoluteJoint(lowerLeg, foot, this.jointDefs.ankle);

    return {upperLeg: upperLeg, lowerLeg: lowerLeg, foot:foot};
};

WalkerBody.prototype._createArm = function() {
    const initialX = 0.5 - this.bodyDefs.foot.length / 2 + this.bodyDefs.lowerLeg.width / 2;
    // torsoTopY is the Y-coordinate of the top of the upper torso
    const torsoTopY = this.bodyDefs.foot.height + this.bodyDefs.lowerLeg.length + this.bodyDefs.upperLeg.length +
                      this.bodyDefs.lowerTorso.height + this.bodyDefs.upperTorso.height;

    const upperArmDef = this.bodyDefs.upperArm;
    const lowerArmDef = this.bodyDefs.lowerArm;

    let upperArm = this._createBody(
        upperArmDef,
        initialX,
        torsoTopY - upperArmDef.length / 2 // Center of upper arm, hanging down
    );

    let lowerArm = this._createBody(
        lowerArmDef,
        initialX,
        torsoTopY - upperArmDef.length - lowerArmDef.length / 2 // Center of lower arm
    );

    // Elbow Joint
    this._createRevoluteJoint(upperArm, lowerArm, this.jointDefs.elbow);

    return {upperArm: upperArm, lowerArm: lowerArm};
};

WalkerBody.prototype._createHead = function() {
    const initialX = 0.5 - this.bodyDefs.foot.length / 2 + this.bodyDefs.lowerLeg.width / 2;
    // torsoTopY is the Y-coordinate of the top of the upper torso
    const torsoTopY = this.bodyDefs.foot.height + this.bodyDefs.lowerLeg.length + this.bodyDefs.upperLeg.length +
                      this.bodyDefs.lowerTorso.height + this.bodyDefs.upperTorso.height;

    const neckDef = this.bodyDefs.neck;
    const headDef = this.bodyDefs.head;

    let neck = this._createBody(
        neckDef,
        initialX,
        torsoTopY + neckDef.height / 2 // Center of neck, on top of torso
    );

    let head = this._createBody(
        headDef,
        initialX,
        torsoTopY + neckDef.height + headDef.height / 2, // Center of head, on top of neck
        { isHead: true, walker: this.owner }
    );

    // Neck Joint (connecting head body part to neck body part)
    this._createRevoluteJoint(head, neck, this.jointDefs.neck);

    return {head: head, neck: neck};
};

WalkerBody.prototype._connectParts = function() {
    // Weld joint connecting neck to upper torso
    this._createWeldJoint(
        this.head.neck,
        this.torso.upperTorso,
        new b2.Vec2(0, -this.bodyDefs.neck.height / 2),
        new b2.Vec2(0, this.bodyDefs.upperTorso.height / 2)
    );

    // Shoulder Joints
    this._createRevoluteJoint(this.torso.upperTorso, this.right_arm.upperArm, this.jointDefs.shoulder);
    this._createRevoluteJoint(this.torso.upperTorso, this.left_arm.upperArm, this.jointDefs.shoulder);

    // Hip Joints
    this._createRevoluteJoint(this.torso.lowerTorso, this.right_leg.upperLeg, this.jointDefs.hip);
    this._createRevoluteJoint(this.torso.lowerTorso, this.left_leg.upperLeg, this.jointDefs.hip);
};

WalkerBody.prototype._getBodies = function() {
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
};

WalkerBody.prototype.createGenome = function() {
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

WalkerBody.prototype.updateJoints = function() {
    for(let k = 0; k < this.joints.length; k++) {
        let gene = this.owner.genome[k];
        if (gene && this.joints[k]) {
            this.joints[k].SetMotorSpeed(gene.amplitude * Math.cos(gene.phase + gene.frequency * this.owner.local_step_counter));
        }
    }
}

WalkerBody.prototype.destroy = function() {
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
};
