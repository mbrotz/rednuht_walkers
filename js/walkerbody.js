
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
    jd.lowerAngle = -Math.PI/18;
    jd.upperAngle = Math.PI/10;
    jd.enableLimit = true;
    jd.maxMotorTorque = 250;
    jd.motorSpeed = 0;
    jd.enableMotor = true;
    this.joints.push(this.world.CreateJoint(jd));

    return {upper_torso: upper_torso, lower_torso: lower_torso};
};

WalkerBody.prototype._createLeg = function() {
    this.bd.position.Set(0.5 - this.leg_def.foot_length/2 + this.leg_def.tibia_width/2, this.leg_def.foot_height/2 + this.leg_def.foot_height/2 + this.leg_def.tibia_length + this.leg_def.femur_length/2);
    let upper_leg = this.world.CreateBody(this.bd);

    this.fd.shape.SetAsBox(this.leg_def.femur_width/2, this.leg_def.femur_length/2);
    upper_leg.CreateFixture(this.fd);

    this.bd.position.Set(0.5 - this.leg_def.foot_length/2 + this.leg_def.tibia_width/2, this.leg_def.foot_height/2 + this.leg_def.foot_height/2 + this.leg_def.tibia_length/2);
    let lower_leg = this.world.CreateBody(this.bd);

    this.fd.shape.SetAsBox(this.leg_def.tibia_width/2, this.leg_def.tibia_length/2);
    lower_leg.CreateFixture(this.fd);

    this.bd.position.Set(0.5, this.leg_def.foot_height/2);
    let foot = this.world.CreateBody(this.bd);

    this.fd.shape.SetAsBox(this.leg_def.foot_length/2, this.leg_def.foot_height/2);
    foot.CreateFixture(this.fd);

    let jd = new b2.RevoluteJointDef();
    let position = upper_leg.GetPosition().Clone();
    position.y -= this.leg_def.femur_length/2;
    position.x += this.leg_def.femur_width/4;
    jd.Initialize(upper_leg, lower_leg, position);
    jd.lowerAngle = -1.6;
    jd.upperAngle = -0.2;
    jd.enableLimit = true;
    jd.maxMotorTorque = 160;
    jd.motorSpeed = 0;
    jd.enableMotor = true;
    this.joints.push(this.world.CreateJoint(jd));

    position = lower_leg.GetPosition().Clone();
    position.y -= this.leg_def.tibia_length/2;
    jd.Initialize(lower_leg, foot, position);
    jd.lowerAngle = -Math.PI/5;
    jd.upperAngle = Math.PI/6;
    jd.enableLimit = true;
    jd.maxMotorTorque = 70;
    jd.motorSpeed = 0;
    jd.enableMotor = true;
    this.joints.push(this.world.CreateJoint(jd));

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

    let jd = new b2.RevoluteJointDef();
    let position = upper_arm.GetPosition().Clone();
    position.y -= this.arm_def.arm_length/2;
    jd.Initialize(upper_arm, lower_arm, position);
    jd.lowerAngle = 0;
    jd.upperAngle = 1.22;
    jd.enableLimit = true;
    jd.maxMotorTorque = 60;
    jd.motorSpeed = 0;
    jd.enableMotor = true;
    this.joints.push(this.world.CreateJoint(jd));

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

    let jd = new b2.RevoluteJointDef();
    let position = neck.GetPosition().Clone();
    position.y += this.head_def.neck_height/2;
    jd.Initialize(headBody, neck, position);
    jd.lowerAngle = -0.1;
    jd.upperAngle = 0.1;
    jd.enableLimit = true;
    jd.maxMotorTorque = 2;
    jd.motorSpeed = 0;
    jd.enableMotor = true;
    this.joints.push(this.world.CreateJoint(jd));

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

    let jd = new b2.RevoluteJointDef();

    let arm_connect_pos = this.torso.upper_torso.GetPosition().Clone();
    arm_connect_pos.y += this.torso_def.upper_height/2;

    jd.Initialize(this.torso.upper_torso, this.right_arm.upper_arm, arm_connect_pos);
    jd.lowerAngle = -Math.PI/2;
    jd.upperAngle = Math.PI/1.5;
    jd.enableLimit = true;
    jd.maxMotorTorque = 120;
    jd.motorSpeed = 0;
    jd.enableMotor = true;
    this.joints.push(this.world.CreateJoint(jd));

    let jd2 = new b2.RevoluteJointDef();
    jd2.Initialize(this.torso.upper_torso, this.left_arm.upper_arm, arm_connect_pos);
    jd2.lowerAngle = -Math.PI/2;
    jd2.upperAngle = Math.PI/1.5;
    jd2.enableLimit = true;
    jd2.maxMotorTorque = 120;
    jd2.motorSpeed = 0;
    jd2.enableMotor = true;
    this.joints.push(this.world.CreateJoint(jd2));

    let leg_connect_pos = this.torso.lower_torso.GetPosition().Clone();
    leg_connect_pos.y -= this.torso_def.lower_height/2;

    let jd3 = new b2.RevoluteJointDef();
    jd3.Initialize(this.torso.lower_torso, this.right_leg.upper_leg, leg_connect_pos);
    jd3.lowerAngle = -Math.PI/2.5;
    jd3.upperAngle = Math.PI/3;
    jd3.enableLimit = true;
    jd3.maxMotorTorque = 250;
    jd3.motorSpeed = 0;
    jd3.enableMotor = true;
    this.joints.push(this.world.CreateJoint(jd3));

    let jd4 = new b2.RevoluteJointDef();
    jd4.Initialize(this.torso.lower_torso, this.left_leg.upper_leg, leg_connect_pos);
    jd4.lowerAngle = -Math.PI/2.5;
    jd4.upperAngle = Math.PI/3;
    jd4.enableLimit = true;
    jd4.maxMotorTorque = 250;
    jd4.motorSpeed = 0;
    jd4.enableMotor = true;
    this.joints.push(this.world.CreateJoint(jd4));
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
