
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

WalkerBody.prototype._createTorso = function() {
    this.bd.position.Set(0.5 - this.leg_def.foot_length/2 + this.leg_def.tibia_width/2, this.leg_def.foot_height/2 + this.leg_def.foot_height/2 + this.leg_def.tibia_length + this.leg_def.femur_length + this.torso_def.lower_height + this.torso_def.upper_height/2);
    let upper_torso = this.world.CreateBody(this.bd);

    this.fd.shape.SetAsBox(this.torso_def.upper_width/2, this.torso_def.upper_height/2);
    upper_torso.CreateFixture(this.fd);

    this.bd.position.Set(0.5 - this.leg_def.foot_length/2 + this.leg_def.tibia_width/2, this.leg_def.foot_height/2 + this.leg_def.foot_height/2 + this.leg_def.tibia_length + this.leg_def.femur_length + this.torso_def.lower_height/2);
    let lower_torso = this.world.CreateBody(this.bd);

    this.fd.shape.SetAsBox(this.torso_def.lower_width/2, this.torso_def.lower_height/2);
    lower_torso.CreateFixture(this.fd);

    let jd = new b2.RevoluteJointDef();
    let position = upper_torso.GetPosition().Clone();
    position.y -= this.torso_def.upper_height/2;
    position.x -= this.torso_def.lower_width/3;
    jd.Initialize(upper_torso, lower_torso, position);
    jd.lowerAngle = this.torso_joint_def.lowerAngle;
    jd.upperAngle = this.torso_joint_def.upperAngle;
    jd.enableLimit = true;
    jd.maxMotorTorque = this.torso_joint_def.maxMotorTorque;
    jd.motorSpeed = 0;
    jd.enableMotor = true;
    this.joints.push(this.world.CreateJoint(jd));

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
    let jd_knee = new b2.RevoluteJointDef();
    let knee_pos = upper_leg.GetPosition().Clone();
    knee_pos.y -= this.leg_def.femur_length/2;
    knee_pos.x += this.leg_def.femur_width/4;
    jd_knee.Initialize(upper_leg, lower_leg, knee_pos);
    jd_knee.lowerAngle = this.knee_joint_def.lowerAngle;
    jd_knee.upperAngle = this.knee_joint_def.upperAngle;
    jd_knee.enableLimit = true;
    jd_knee.maxMotorTorque = this.knee_joint_def.maxMotorTorque;
    jd_knee.motorSpeed = 0;
    jd_knee.enableMotor = true;
    this.joints.push(this.world.CreateJoint(jd_knee));

    // Ankle Joint
    let jd_ankle = new b2.RevoluteJointDef();
    let ankle_pos = lower_leg.GetPosition().Clone();
    ankle_pos.y -= this.leg_def.tibia_length/2;
    jd_ankle.Initialize(lower_leg, foot, ankle_pos);
    jd_ankle.lowerAngle = this.ankle_joint_def.lowerAngle;
    jd_ankle.upperAngle = this.ankle_joint_def.upperAngle;
    jd_ankle.enableLimit = true;
    jd_ankle.maxMotorTorque = this.ankle_joint_def.maxMotorTorque;
    jd_ankle.motorSpeed = 0;
    jd_ankle.enableMotor = true;
    this.joints.push(this.world.CreateJoint(jd_ankle));

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
    let jd_elbow = new b2.RevoluteJointDef();
    let elbow_pos = upper_arm.GetPosition().Clone();
    elbow_pos.y -= this.arm_def.arm_length/2;
    jd_elbow.Initialize(upper_arm, lower_arm, elbow_pos);
    jd_elbow.lowerAngle = this.elbow_joint_def.lowerAngle;
    jd_elbow.upperAngle = this.elbow_joint_def.upperAngle;
    jd_elbow.enableLimit = true;
    jd_elbow.maxMotorTorque = this.elbow_joint_def.maxMotorTorque;
    jd_elbow.motorSpeed = 0;
    jd_elbow.enableMotor = true;
    this.joints.push(this.world.CreateJoint(jd_elbow));

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
    let jd_neck = new b2.RevoluteJointDef();
    let neck_joint_pos = neck.GetPosition().Clone();
    neck_joint_pos.y += this.head_def.neck_height/2;
    jd_neck.Initialize(headBody, neck, neck_joint_pos);
    jd_neck.lowerAngle = this.neck_joint_def.lowerAngle;
    jd_neck.upperAngle = this.neck_joint_def.upperAngle;
    jd_neck.enableLimit = true;
    jd_neck.maxMotorTorque = this.neck_joint_def.maxMotorTorque;
    jd_neck.motorSpeed = 0;
    jd_neck.enableMotor = true;
    this.joints.push(this.world.CreateJoint(jd_neck));

    return {head: headBody, neck: neck};
};

WalkerBody.prototype._connectParts = function() {
    let jd_weld = new b2.WeldJointDef();
    jd_weld.bodyA = this.head.neck;
    jd_weld.bodyB = this.torso.upper_torso;
    jd_weld.localAnchorA = new b2.Vec2(0, -this.head_def.neck_height/2);
    jd_weld.localAnchorB = new b2.Vec2(0, this.torso_def.upper_height/2);
    jd_weld.referenceAngle = 0;
    this.world.CreateJoint(jd_weld);

    let arm_connect_pos = this.torso.upper_torso.GetPosition().Clone();
    arm_connect_pos.y += this.torso_def.upper_height/2;

    // Right Shoulder Joint
    let jd_right_shoulder = new b2.RevoluteJointDef();
    jd_right_shoulder.Initialize(this.torso.upper_torso, this.right_arm.upper_arm, arm_connect_pos);
    jd_right_shoulder.lowerAngle = this.shoulder_joint_def.lowerAngle;
    jd_right_shoulder.upperAngle = this.shoulder_joint_def.upperAngle;
    jd_right_shoulder.enableLimit = true;
    jd_right_shoulder.maxMotorTorque = this.shoulder_joint_def.maxMotorTorque;
    jd_right_shoulder.motorSpeed = 0;
    jd_right_shoulder.enableMotor = true;
    this.joints.push(this.world.CreateJoint(jd_right_shoulder));

    // Left Shoulder Joint
    let jd_left_shoulder = new b2.RevoluteJointDef();
    jd_left_shoulder.Initialize(this.torso.upper_torso, this.left_arm.upper_arm, arm_connect_pos);
    jd_left_shoulder.lowerAngle = this.shoulder_joint_def.lowerAngle;
    jd_left_shoulder.upperAngle = this.shoulder_joint_def.upperAngle;
    jd_left_shoulder.enableLimit = true;
    jd_left_shoulder.maxMotorTorque = this.shoulder_joint_def.maxMotorTorque;
    jd_left_shoulder.motorSpeed = 0;
    jd_left_shoulder.enableMotor = true;
    this.joints.push(this.world.CreateJoint(jd_left_shoulder));

    let leg_connect_pos = this.torso.lower_torso.GetPosition().Clone();
    leg_connect_pos.y -= this.torso_def.lower_height/2;

    // Right Hip Joint
    let jd_right_hip = new b2.RevoluteJointDef();
    jd_right_hip.Initialize(this.torso.lower_torso, this.right_leg.upper_leg, leg_connect_pos);
    jd_right_hip.lowerAngle = this.hip_joint_def.lowerAngle;
    jd_right_hip.upperAngle = this.hip_joint_def.upperAngle;
    jd_right_hip.enableLimit = true;
    jd_right_hip.maxMotorTorque = this.hip_joint_def.maxMotorTorque;
    jd_right_hip.motorSpeed = 0;
    jd_right_hip.enableMotor = true;
    this.joints.push(this.world.CreateJoint(jd_right_hip));

    // Left Hip Joint
    let jd_left_hip = new b2.RevoluteJointDef();
    jd_left_hip.Initialize(this.torso.lower_torso, this.left_leg.upper_leg, leg_connect_pos);
    jd_left_hip.lowerAngle = this.hip_joint_def.lowerAngle;
    jd_left_hip.upperAngle = this.hip_joint_def.upperAngle;
    jd_left_hip.enableLimit = true;
    jd_left_hip.maxMotorTorque = this.hip_joint_def.maxMotorTorque;
    jd_left_hip.motorSpeed = 0;
    jd_left_hip.enableMotor = true;
    this.joints.push(this.world.CreateJoint(jd_left_hip));
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
