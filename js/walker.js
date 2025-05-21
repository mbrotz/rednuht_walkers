
let Walker = function() {
    this.__constructor.apply(this, arguments);
}

Walker.prototype.__constructor = function(world, genome) {

    this.world = globals.world;
    this.density = 106.2;

    this.id = 0;
    this.is_eliminated = false;
    this.initial_head_position = 0;
    this.initial_torso_position = 0;
    this.max_torso_position = 0;
    this.mean_head_height = 0;
    this.mean_head_height_sum = 0;
    this.mean_forward_velocity = 0;
    this.mean_forward_velocity_sum = 0;
    this.steps_without_improvement = 0;
    this.local_step_counter = 0;
    this.score = 0.0;

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
    }

    this.head_def = {
        head_width: 0.22,
        head_height: 0.22,
        neck_width: 0.1,
        neck_height: 0.08
    }

    this.joints = [];

    this.torso = this.createTorso();
    this.left_leg = this.createLeg();
    this.right_leg = this.createLeg();
    this.left_arm = this.createArm();
    this.right_arm = this.createArm();
    this.head = this.createHead();
    this.connectParts();

    this.bodies = this.getBodies();

    this.initial_head_position = this.getHeadPosition();
    this.initial_torso_position = this.getTorsoPosition();
    this.pressure_line_position = this.initial_torso_position - config.pressure_line_starting_offset;
    this.pressure_line_speed = config.pressure_line_base_speed;

    if (genome) {
        this.genome = genome;
    } else {
        this.genome = this.createGenome(this.joints, this.bodies);
    }

    this.name = this.makeName(this.genome);
}

Walker.prototype.getHeadPosition = function() {
    return Math.max(0, this.head.head.GetPosition().y);
}

Walker.prototype.getNormalizedHeadPosition = function() {
    return this.getHeadPosition() / this.initial_head_position;
}

Walker.prototype.getTorsoPosition = function() {
    return this.torso.upper_torso.GetPosition().x;
}

Walker.prototype.getPressureLineDistance = function() {
    return Math.max(0, this.getTorsoPosition() - this.pressure_line_position);
}

Walker.prototype.isOffFloor = function() {
    return globals.max_floor_x < this.getTorsoPosition();
}

Walker.prototype.isSlacker = function() {
    return this.steps_without_improvement >= config.max_steps_without_improvement
}

Walker.prototype.destroyBody = function() {
    for(let l = 0; l < this.bodies.length; l++) {
        if(this.bodies[l]) {
            globals.world.DestroyBody(this.bodies[l]);
            this.bodies[l] = null;
        }
    }
    this.bodies = [];
}

Walker.prototype.createTorso = function() {
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
}

Walker.prototype.createLeg = function() {
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
}

Walker.prototype.createArm = function() {
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
}

Walker.prototype.createHead = function() {
    this.bd.position.Set(0.5 - this.leg_def.foot_length/2 + this.leg_def.tibia_width/2, this.leg_def.foot_height/2 + this.leg_def.foot_height/2 + this.leg_def.tibia_length + this.leg_def.femur_length + this.torso_def.lower_height + this.torso_def.upper_height + this.head_def.neck_height/2);
    let neck = this.world.CreateBody(this.bd);

    this.fd.shape.SetAsBox(this.head_def.neck_width/2, this.head_def.neck_height/2);
    neck.CreateFixture(this.fd);

    this.bd.position.Set(0.5 - this.leg_def.foot_length/2 + this.leg_def.tibia_width/2, this.leg_def.foot_height/2 + this.leg_def.foot_height/2 + this.leg_def.tibia_length + this.leg_def.femur_length + this.torso_def.lower_height + this.torso_def.upper_height + this.head_def.neck_height + this.head_def.head_height/2);
    let headBody = this.world.CreateBody(this.bd);

    this.fd.shape.SetAsBox(this.head_def.head_width/2, this.head_def.head_height/2);
    let headFixture = headBody.CreateFixture(this.fd);
    headFixture.SetUserData({ isHead: true, walker: this });

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
}

Walker.prototype.connectParts = function() {
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
}

Walker.prototype.getBodies = function() {
    return [
        this.head.head,
        this.head.neck,
        this.torso.upper_torso,
        this.torso.lower_torso,
        this.left_arm.upper_arm,
        this.left_arm.lower_arm,
        this.right_arm.upper_arm,
        this.right_arm.lower_arm,
        this.left_leg.upper_leg,
        this.left_leg.lower_leg,
        this.left_leg.foot,
        this.right_leg.upper_leg,
        this.right_leg.lower_leg,
        this.right_leg.foot
    ];
}

Walker.prototype.createGenome = function(joints, bodies) {
    let genome = [];
    for(let k = 0; k < this.joints.length; k++) {
        genome.push({
          //cos_factor: Math.random() * 6 - 3,
          //time_factor: Math.random() / 10,
          //time_shift: Math.random() * Math.PI * 2,
          amplitude: gaussianRandom(0, 3),
          phase: gaussianRandom(Math.PI, Math.PI * 2),
          frequency: gaussianRandom(0.1, 0.1),
        });
    }
    return genome;
}

Walker.prototype.updateJoints = function() {
    for(let k = 0; k < this.joints.length; k++) {
        let gene = this.genome[k];
        if (gene) {
            //let amp = (1 + motor_noise*(Math.random()*2 - 1)) * this.genome[k].cos_factor;
            //let phase = (1 + motor_noise*(Math.random()*2 - 1)) * this.genome[k].time_shift;
            //let freq = (1 + motor_noise*(Math.random()*2 - 1)) * this.genome[k].time_factor;
            this.joints[k].SetMotorSpeed(gene.amplitude * Math.cos(gene.phase + gene.frequency * this.local_step_counter));
        }
    }
}

Walker.prototype.updateMetrics = function() {
    if (this.local_step_counter > 0) {
        let torso_position = this.getTorsoPosition();
        let forward_change = Math.max(0, torso_position - this.max_torso_position) * config.time_step;
        this.max_torso_position = Math.max(this.max_torso_position, torso_position);
        if (forward_change > 0) {
            this.mean_head_height_sum += this.getNormalizedHeadPosition();
            this.mean_forward_velocity_sum += forward_change;
            this.steps_without_improvement = 0;
        } else {
            this.steps_without_improvement++;
        }
        this.mean_head_height = this.mean_head_height_sum / this.local_step_counter;
        this.mean_forward_velocity = this.mean_forward_velocity_sum / this.local_step_counter;
        this.score = this.max_torso_position; // * (1.0 + this.mean_forward_velocity);
    }
}

Walker.prototype.updatePressureLine = function() {
    this.pressure_line_position += this.pressure_line_speed;
    this.pressure_line_speed += config.pressure_line_acceleration;
}

Walker.prototype.updateEliminated = function() {
    if (this.isSlacker()) {
        this.is_eliminated = true;
    }
    if (this.isOffFloor()) {
        this.is_eliminated = true;
    }
    if (this.getPressureLineDistance() <= 0) {
        this.is_eliminated = true;
    }
}

Walker.prototype.simulationStep = function() {
    if (!this.is_eliminated) {
        this.updateJoints();
        this.updateMetrics();
        this.updatePressureLine();
        this.updateEliminated();
        this.local_step_counter++;
    }
}

Walker.prototype.makeName = function(genome) {
    let vowels = ['a','e','i','o','u','y'];
    let consonants = ['b','c','d','f','g','h','j','k','l','m','n','p','r','s','t','v','w','x','z'];

    let generateNamePart = function(genome_source, length, capitalizeFirst, gene_start_offset) {
        let name_part = '';
        let use_vowel = Math.random() < 0.5;

        for (let i = 0; i < length; i++) {
            let sum = 0;
            let gene_index = (gene_start_offset + i) % genome_source.length;

            let current_gene = genome_source[gene_index];
            if (current_gene) {
                for (let prop in current_gene) {
                    if (current_gene.hasOwnProperty(prop) && typeof current_gene[prop] === 'number') {
                        sum += (current_gene[prop] * (100 + (gene_start_offset % 13)));
                    }
                }
            }
            sum = Math.abs(Math.floor(sum));

            let char_to_add;
            if (use_vowel) {
                char_to_add = vowels[sum % vowels.length];
            } else {
                char_to_add = consonants[sum % consonants.length];
            }

            if (i === 0 && capitalizeFirst) {
                name_part += char_to_add.toUpperCase();
            } else {
                name_part += char_to_add;
            }
            use_vowel = !use_vowel;
        }
        return name_part;
    };

    if (!genome || genome.length === 0) {
        return "Genomi Anonymi";
    }

    let min_name_len = 3;
    let max_genus_len = 6;
    let max_species_len = 8;

    let genus_length = Math.max(min_name_len, Math.min(max_genus_len, Math.floor(genome.length / 2.5) + 1));
    let species_length = Math.max(min_name_len, Math.min(max_species_len, Math.floor(genome.length / 2) + 2));

    let genus_name = generateNamePart(genome, genus_length, true, 0);

    let species_offset = Math.floor(genome.length / 3);
    if (genome.length <= 2 && genome.length > 0) {
        species_offset = 1;
    } else if (genome.length === 0) {
        species_offset = 0;
    }

    let species_name = generateNamePart(genome, species_length, true, species_offset);

    return genus_name + " " + species_name;
};