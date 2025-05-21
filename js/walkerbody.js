
let WalkerBody = function() {
    this.__constructor.apply(this, arguments);
}

WalkerBody.prototype.__constructor = function(owner, world, density) {
    this.owner = owner;
    this.world = world;
    this.density = density;

    this.bd = new b2.BodyDef();
    this.bd.type = b2.Body.b2_dynamicBody;
    this.bd.linearDamping = 0;
    this.bd.angularDamping = 0.01;
    this.bd.allowSleep = true;
    this.bd.awake = true;

    this.fd = new b2.FixtureDef();
    this.fd.density = this.density;
    this.fd.restitution = 0.1;
    this.fd.shape = new b2.PolygonShape();
    this.fd.filter.groupIndex = -1;

    this.torso_def = {
        upper_width: 0.25,
        upper_height: 0.45,
        lower_width: 0.25,
        lower_height: 0.2
    };

    this.leg_def = {
        femur_width: 0.18,
        femur_length: 0.45,
        tibia_width: 0.13,
        tibia_length: 0.38,
        foot_height: 0.08,
        foot_length: 0.28
    };

    this.arm_def = {
        arm_width: 0.12,
        arm_length: 0.37,
        forearm_width: 0.1,
        forearm_length: 0.42
    };

    this.head_def = {
        head_width: 0.22,
        head_height: 0.22,
        neck_width: 0.1,
        neck_height: 0.08
    };

    // Joint Definitions
    this.torso_joint_def = {
        lowerAngle: -Math.PI / 18,
        upperAngle: Math.PI / 10,
        maxMotorTorque: 250
    };

    this.knee_joint_def = {
        lowerAngle: -1.6,
        upperAngle: -0.2,
        maxMotorTorque: 160
    };

    this.ankle_joint_def = {
        lowerAngle: -Math.PI / 5,
        upperAngle: Math.PI / 6,
        maxMotorTorque: 70
    };

    this.elbow_joint_def = {
        lowerAngle: 0,
        upperAngle: 1.22,
        maxMotorTorque: 60
    };

    this.neck_joint_def = { // Joint between head and neck body parts
        lowerAngle: -0.1,
        upperAngle: 0.1,
        maxMotorTorque: 2
    };

    this.shoulder_joint_def = { // Joint between torso and upper arm
        lowerAngle: -Math.PI / 2,
        upperAngle: Math.PI / 1.5,
        maxMotorTorque: 120
    };

    this.hip_joint_def = { // Joint between torso and upper leg
        lowerAngle: -Math.PI / 2.5,
        upperAngle: Math.PI / 3,
        maxMotorTorque: 250
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
 * Helper function to create a revolute joint with common settings.
 * These joints are typically motorized and added to the this.joints array.
 * @param {b2.Body} bodyA The first body.
 * @param {b2.Body} bodyB The second body.
 * @param {b2.Vec2} worldAnchorPos The anchor point in world coordinates.
 * @param {object} jointConfig An object with lowerAngle, upperAngle, and maxMotorTorque.
 */
WalkerBody.prototype._createRevoluteJoint = function(bodyA, bodyB, worldAnchorPos, jointConfig) {
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
    this.bd.position.Set(0.5 - this.leg_def.foot_length/2 + this.leg_def.tibia_width/2, this.leg_def.foot_height/2 + this.leg_def.foot_height/2 + this.leg_def.tibia_length + this.leg_def.femur_length + this.torso_def.lower_height + this.torso_def.upper_height/2);
    let upper_torso = this.world.CreateBody(this.bd);

    this.fd.shape.SetAsBox(this.torso_def.upper_width/2, this.torso_def.upper_height/2);
    upper_torso.CreateFixture(this.fd);

    this.bd.position.Set(0.5 - this.leg_def.foot_length/2 + this.leg_def.tibia_width/2, this.leg_def.foot_height/2 + this.leg_def.foot_height/2 + this.leg_def.tibia_length + this.leg_def.femur_length + this.torso_def.lower_height/2);
    let lower_torso = this.world.CreateBody(this.bd);

    this.fd.shape.SetAsBox(this.torso_def.lower_width/2, this.torso_def.lower_height/2);
    lower_torso.CreateFixture(this.fd);

    let torso_joint_anchor = upper_torso.GetPosition().Clone();
    torso_joint_anchor.y -= this.torso_def.upper_height/2;
    torso_joint_anchor.x -= this.torso_def.lower_width/3;
    this._createRevoluteJoint(upper_torso, lower_torso, torso_joint_anchor, this.torso_joint_def);

    return {upper_torso: upper_torso, lower_torso: lower_torso};
};

WalkerBody.prototype._createLeg = function() {
    this.bd.position.Set(0.5 - this.leg_def.foot_length/2 + this.leg_def.tibia_width/2, this.leg_def.foot_height/2 + this.leg_def.foot_height/2 + this.leg_def.tibia_length + this.leg_def.femur_length/2);
    let upper_leg = this.world.CreateBody(this.bd); // Femur

    this.fd.shape.SetAsBox(this.leg_def.femur_width/2, this.leg_def.femur_length/2);
    upper_leg.CreateFixture(this.fd);

    this.bd.position.Set(0.5 - this.leg_def.foot_length/2 + this.leg_def.tibia_width/2, this.leg_def.foot_height/2 + this.leg_def.foot_height/2 + this.leg_def.tibia_length/2);
    let lower_leg = this.world.CreateBody(this.bd); // Tibia

    this.fd.shape.SetAsBox(this.leg_def.tibia_width/2, this.leg_def.tibia_length/2);
    lower_leg.CreateFixture(this.fd);

    this.bd.position.Set(0.5, this.leg_def.foot_height/2);
    let foot = this.world.CreateBody(this.bd);

    this.fd.shape.SetAsBox(this.leg_def.foot_length/2, this.leg_def.foot_height/2);
    foot.CreateFixture(this.fd);

    // Knee Joint
    let knee_anchor_pos = upper_leg.GetPosition().Clone();
    knee_anchor_pos.y -= this.leg_def.femur_length/2;
    knee_anchor_pos.x += this.leg_def.femur_width/4;
    this._createRevoluteJoint(upper_leg, lower_leg, knee_anchor_pos, this.knee_joint_def);

    // Ankle Joint
    let ankle_anchor_pos = lower_leg.GetPosition().Clone();
    ankle_anchor_pos.y -= this.leg_def.tibia_length/2;
    this._createRevoluteJoint(lower_leg, foot, ankle_anchor_pos, this.ankle_joint_def);

    return {upper_leg: upper_leg, lower_leg: lower_leg, foot:foot};
};

WalkerBody.prototype._createArm = function() {
    this.bd.position.Set(0.5 - this.leg_def.foot_length/2 + this.leg_def.tibia_width/2, this.leg_def.foot_height/2 + this.leg_def.foot_height/2 + this.leg_def.tibia_length + this.leg_def.femur_length + this.torso_def.lower_height + this.torso_def.upper_height - this.arm_def.arm_length/2);
    let upper_arm = this.world.CreateBody(this.bd);

    this.fd.shape.SetAsBox(this.arm_def.arm_width/2, this.arm_def.arm_length/2);
    upper_arm.CreateFixture(this.fd);

    this.bd.position.Set(0.5 - this.leg_def.foot_length/2 + this.leg_def.tibia_width/2, this.leg_def.foot_height/2 + this.leg_def.foot_height/2 + this.leg_def.tibia_length + this.leg_def.femur_length + this.torso_def.lower_height + this.torso_def.upper_height - this.arm_def.arm_length - this.arm_def.forearm_length/2);
    let lower_arm = this.world.CreateBody(this.bd);

    this.fd.shape.SetAsBox(this.arm_def.forearm_width/2, this.arm_def.forearm_length/2);
    lower_arm.CreateFixture(this.fd);

    // Elbow Joint
    let elbow_anchor_pos = upper_arm.GetPosition().Clone();
    elbow_anchor_pos.y -= this.arm_def.arm_length/2;
    this._createRevoluteJoint(upper_arm, lower_arm, elbow_anchor_pos, this.elbow_joint_def);

    return {upper_arm: upper_arm, lower_arm: lower_arm};
};

WalkerBody.prototype._createHead = function() {
    this.bd.position.Set(0.5 - this.leg_def.foot_length/2 + this.leg_def.tibia_width/2, this.leg_def.foot_height/2 + this.leg_def.foot_height/2 + this.leg_def.tibia_length + this.leg_def.femur_length + this.torso_def.lower_height + this.torso_def.upper_height + this.head_def.neck_height/2);
    let neck = this.world.CreateBody(this.bd);

    this.fd.shape.SetAsBox(this.head_def.neck_width/2, this.head_def.neck_height/2);
    neck.CreateFixture(this.fd);

    this.bd.position.Set(0.5 - this.leg_def.foot_length/2 + this.leg_def.tibia_width/2, this.leg_def.foot_height/2 + this.leg_def.foot_height/2 + this.leg_def.tibia_length + this.leg_def.femur_length + this.torso_def.lower_height + this.torso_def.upper_height + this.head_def.neck_height + this.head_def.head_height/2);
    let headBody = this.world.CreateBody(this.bd);

    this.fd.shape.SetAsBox(this.head_def.head_width/2, this.head_def.head_height/2);
    let headFixture = headBody.CreateFixture(this.fd);
    headFixture.SetUserData({ isHead: true, walker: this.owner });

    // Neck Joint (connecting head body part to neck body part)
    let neck_anchor_pos = neck.GetPosition().Clone();
    neck_anchor_pos.y += this.head_def.neck_height/2;
    this._createRevoluteJoint(headBody, neck, neck_anchor_pos, this.neck_joint_def);

    return {head: headBody, neck: neck};
};

WalkerBody.prototype._connectParts = function() {
    // Weld joint connecting neck to upper torso
    this._createWeldJoint(
        this.head.neck,
        this.torso.upper_torso,
        new b2.Vec2(0, -this.head_def.neck_height/2),
        new b2.Vec2(0, this.torso_def.upper_height/2)
    );

    // Shoulder Joints
    let shoulder_anchor_pos = this.torso.upper_torso.GetPosition().Clone();
    shoulder_anchor_pos.y += this.torso_def.upper_height/2;

    this._createRevoluteJoint(this.torso.upper_torso, this.right_arm.upper_arm, shoulder_anchor_pos, this.shoulder_joint_def);
    this._createRevoluteJoint(this.torso.upper_torso, this.left_arm.upper_arm, shoulder_anchor_pos, this.shoulder_joint_def);

    // Hip Joints
    let hip_anchor_pos = this.torso.lower_torso.GetPosition().Clone();
    hip_anchor_pos.y -= this.torso_def.lower_height/2;

    this._createRevoluteJoint(this.torso.lower_torso, this.right_leg.upper_leg, hip_anchor_pos, this.hip_joint_def);
    this._createRevoluteJoint(this.torso.lower_torso, this.left_leg.upper_leg, hip_anchor_pos, this.hip_joint_def);
};

WalkerBody.prototype._getBodies = function() {
    return [
        this.left_arm.lower_arm,
        this.left_arm.upper_arm,
        this.left_leg.foot,
        this.left_leg.lower_leg,
        this.left_leg.upper_leg,
        this.head.neck,
        this.head.head,
        this.torso.lower_torso,
        this.torso.upper_torso,
        this.right_leg.upper_leg,
        this.right_leg.lower_leg,
        this.right_leg.foot,
        this.right_arm.upper_arm,
        this.right_arm.lower_arm,
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
