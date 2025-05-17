// walker has fixed shapes and structures
// shape definitions are in the constructor


var Walker = function() {
  this.__constructor.apply(this, arguments);
}

Walker.prototype.__constructor = function(world, genome) {

  this.world = globals.world; // world is passed via globals now

  this.density = 106.2; // common for all fixtures, no reason to be too specific

  this.local_step_counter = 0;

  this.max_distance = -5;
  this.health = config.walker_health;
  this.score = 0;
  this.low_foot_height = 0;
  this.head_height = 0;
  this.steps = 0;
  this.id = 0; // Will be set by game.js
  this.is_dead = false; // Flag to ensure death processing happens once

  this.bd = new b2.BodyDef();
  this.bd.type = b2.Body.b2_dynamicBody;
  this.bd.linearDamping = 0;
  this.bd.angularDamping = 0.01;
  this.bd.allowSleep = true; // Allow sleep to potentially save performance on inactive walkers
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

  if(genome) {
    this.genome = JSON.parse(JSON.stringify(genome));
  } else {
    this.genome = this.createGenome(this.joints, this.bodies); // Pass joints and bodies to createGenome
  }

  this.name = this.makeName(this.genome);
  // Removed is_elite assignment
}

Walker.prototype.createTorso = function() {
  // upper torso
  this.bd.position.Set(0.5 - this.leg_def.foot_length/2 + this.leg_def.tibia_width/2, this.leg_def.foot_height/2 + this.leg_def.foot_height/2 + this.leg_def.tibia_length + this.leg_def.femur_length + this.torso_def.lower_height + this.torso_def.upper_height/2);
  var upper_torso = this.world.CreateBody(this.bd);

  this.fd.shape.SetAsBox(this.torso_def.upper_width/2, this.torso_def.upper_height/2);
  upper_torso.CreateFixture(this.fd);

  // lower torso
  this.bd.position.Set(0.5 - this.leg_def.foot_length/2 + this.leg_def.tibia_width/2, this.leg_def.foot_height/2 + this.leg_def.foot_height/2 + this.leg_def.tibia_length + this.leg_def.femur_length + this.torso_def.lower_height/2);
  var lower_torso = this.world.CreateBody(this.bd);

  this.fd.shape.SetAsBox(this.torso_def.lower_width/2, this.torso_def.lower_height/2);
  lower_torso.CreateFixture(this.fd);

  // torso joint
  var jd = new b2.RevoluteJointDef();
  var position = upper_torso.GetPosition().Clone();
  position.y -= this.torso_def.upper_height/2;
  position.x -= this.torso_def.lower_width/3; // Original offset
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
  // upper leg
  this.bd.position.Set(0.5 - this.leg_def.foot_length/2 + this.leg_def.tibia_width/2, this.leg_def.foot_height/2 + this.leg_def.foot_height/2 + this.leg_def.tibia_length + this.leg_def.femur_length/2);
  var upper_leg = this.world.CreateBody(this.bd);

  this.fd.shape.SetAsBox(this.leg_def.femur_width/2, this.leg_def.femur_length/2);
  upper_leg.CreateFixture(this.fd);

  // lower leg
  this.bd.position.Set(0.5 - this.leg_def.foot_length/2 + this.leg_def.tibia_width/2, this.leg_def.foot_height/2 + this.leg_def.foot_height/2 + this.leg_def.tibia_length/2);
  var lower_leg = this.world.CreateBody(this.bd);

  this.fd.shape.SetAsBox(this.leg_def.tibia_width/2, this.leg_def.tibia_length/2);
  lower_leg.CreateFixture(this.fd);

  // foot
  this.bd.position.Set(0.5, this.leg_def.foot_height/2);
  var foot = this.world.CreateBody(this.bd);

  this.fd.shape.SetAsBox(this.leg_def.foot_length/2, this.leg_def.foot_height/2);
  foot.CreateFixture(this.fd);

  // leg joints (knee)
  var jd = new b2.RevoluteJointDef();
  var position = upper_leg.GetPosition().Clone();
  position.y -= this.leg_def.femur_length/2;
  position.x += this.leg_def.femur_width/4; // Original offset
  jd.Initialize(upper_leg, lower_leg, position);
  jd.lowerAngle = -1.6; // Original value, allows bending backward a lot
  jd.upperAngle = -0.2; // Original value, limits forward extension
  jd.enableLimit = true;
  jd.maxMotorTorque = 160;
  jd.motorSpeed = 0;
  jd.enableMotor = true;
  this.joints.push(this.world.CreateJoint(jd));

  // foot joint (ankle)
  var position = lower_leg.GetPosition().Clone();
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
  // upper arm
  this.bd.position.Set(0.5 - this.leg_def.foot_length/2 + this.leg_def.tibia_width/2, this.leg_def.foot_height/2 + this.leg_def.foot_height/2 + this.leg_def.tibia_length + this.leg_def.femur_length + this.torso_def.lower_height + this.torso_def.upper_height - this.arm_def.arm_length/2);
  var upper_arm = this.world.CreateBody(this.bd);

  this.fd.shape.SetAsBox(this.arm_def.arm_width/2, this.arm_def.arm_length/2);
  upper_arm.CreateFixture(this.fd);

  // lower arm
  this.bd.position.Set(0.5 - this.leg_def.foot_length/2 + this.leg_def.tibia_width/2, this.leg_def.foot_height/2 + this.leg_def.foot_height/2 + this.leg_def.tibia_length + this.leg_def.femur_length + this.torso_def.lower_height + this.torso_def.upper_height - this.arm_def.arm_length - this.arm_def.forearm_length/2);
  var lower_arm = this.world.CreateBody(this.bd);

  this.fd.shape.SetAsBox(this.arm_def.forearm_width/2, this.arm_def.forearm_length/2);
  lower_arm.CreateFixture(this.fd);

  // arm joint (elbow)
  var jd = new b2.RevoluteJointDef();
  var position = upper_arm.GetPosition().Clone();
  position.y -= this.arm_def.arm_length/2;
  jd.Initialize(upper_arm, lower_arm, position);
  jd.lowerAngle = 0; // Bend forward
  jd.upperAngle = 1.22; // Don't bend backward past straight
  jd.enableLimit = true;
  jd.maxMotorTorque = 60;
  jd.motorSpeed = 0;
  jd.enableMotor = true;
  this.joints.push(this.world.CreateJoint(jd));

  return {upper_arm: upper_arm, lower_arm: lower_arm};
}

Walker.prototype.createHead = function() {
  // neck
  this.bd.position.Set(0.5 - this.leg_def.foot_length/2 + this.leg_def.tibia_width/2, this.leg_def.foot_height/2 + this.leg_def.foot_height/2 + this.leg_def.tibia_length + this.leg_def.femur_length + this.torso_def.lower_height + this.torso_def.upper_height + this.head_def.neck_height/2);
  var neck = this.world.CreateBody(this.bd);

  this.fd.shape.SetAsBox(this.head_def.neck_width/2, this.head_def.neck_height/2);
  neck.CreateFixture(this.fd);

  // head
  this.bd.position.Set(0.5 - this.leg_def.foot_length/2 + this.leg_def.tibia_width/2, this.leg_def.foot_height/2 + this.leg_def.foot_height/2 + this.leg_def.tibia_length + this.leg_def.femur_length + this.torso_def.lower_height + this.torso_def.upper_height + this.head_def.neck_height + this.head_def.head_height/2);
  var head = this.world.CreateBody(this.bd);

  this.fd.shape.SetAsBox(this.head_def.head_width/2, this.head_def.head_height/2);
  head.CreateFixture(this.fd);

  // neck joint (head to neck)
  var jd = new b2.RevoluteJointDef();
  var position = neck.GetPosition().Clone();
  position.y += this.head_def.neck_height/2;
  jd.Initialize(head, neck, position);
  jd.lowerAngle = -0.1;
  jd.upperAngle = 0.1;
  jd.enableLimit = true;
  jd.maxMotorTorque = 2; // Low torque for a bit of wobble
  jd.motorSpeed = 0;
  jd.enableMotor = true;
  this.joints.push(this.world.CreateJoint(jd));

  return {head: head, neck: neck};
}

Walker.prototype.connectParts = function() {
  // neck/torso (Weld joint - no motor here)
  var jd_weld = new b2.WeldJointDef(); // Use a distinct jd variable for weld
  jd_weld.bodyA = this.head.neck;
  jd_weld.bodyB = this.torso.upper_torso;
  jd_weld.localAnchorA = new b2.Vec2(0, -this.head_def.neck_height/2);
  jd_weld.localAnchorB = new b2.Vec2(0, this.torso_def.upper_height/2);
  jd_weld.referenceAngle = 0;
  this.world.CreateJoint(jd_weld); // This joint is not added to this.joints (as it's not motorized by genome)

  var jd = new b2.RevoluteJointDef(); // Re-use for motorized joints

  // torso/arms (shoulders)
  var arm_connect_pos = this.torso.upper_torso.GetPosition().Clone();
  arm_connect_pos.y += this.torso_def.upper_height/2; // Connect at top of upper torso

  jd.Initialize(this.torso.upper_torso, this.right_arm.upper_arm, arm_connect_pos);
  jd.lowerAngle = -Math.PI/2; // Swing back
  jd.upperAngle = Math.PI/1.5; // Swing forward/up
  jd.enableLimit = true;
  jd.maxMotorTorque = 120;
  jd.motorSpeed = 0;
  jd.enableMotor = true;
  this.joints.push(this.world.CreateJoint(jd));

  var jd2 = new b2.RevoluteJointDef(); // Use new jd instance for second arm to avoid issues
  jd2.Initialize(this.torso.upper_torso, this.left_arm.upper_arm, arm_connect_pos);
  jd2.lowerAngle = -Math.PI/2;
  jd2.upperAngle = Math.PI/1.5;
  jd2.enableLimit = true;
  jd2.maxMotorTorque = 120;
  jd2.motorSpeed = 0;
  jd2.enableMotor = true;
  this.joints.push(this.world.CreateJoint(jd2));

  // torso/legs (hips)
  var leg_connect_pos = this.torso.lower_torso.GetPosition().Clone();
  leg_connect_pos.y -= this.torso_def.lower_height/2; // Connect at bottom of lower torso

  var jd3 = new b2.RevoluteJointDef();
  jd3.Initialize(this.torso.lower_torso, this.right_leg.upper_leg, leg_connect_pos);
  jd3.lowerAngle = -Math.PI/2.5; // Leg backward
  jd3.upperAngle = Math.PI/3;   // Leg forward
  jd3.enableLimit = true;
  jd3.maxMotorTorque = 250;
  jd3.motorSpeed = 0;
  jd3.enableMotor = true;
  this.joints.push(this.world.CreateJoint(jd3));

  var jd4 = new b2.RevoluteJointDef();
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

Walker.prototype.createGenome = function(joints, bodies) { // bodies param not used in current genome
  var genome = [];
  // Genome length should match the number of motorized joints pushed into this.joints
  var num_motorized_joints = this.joints.length; // Relies on this.joints being populated correctly before this call
                                                // Or, more robustly, pass the expected number of genes
                                                // For now, this assumes this.joints is ALREADY populated by the time createGenome is called by constructor
                                                // which is true if createGenome is called AFTER all createXXX and connectParts.
                                                // If called by pickParentGenome fallback, this.joints of the temp walker will be correct.

  for(var k = 0; k < num_motorized_joints; k++) {
    var gene = {}; // Use object literal for clarity
    gene.cos_factor = 6*Math.random() - 3; // Amplitude
    gene.time_factor = Math.random()/10;   // Frequency
    gene.time_shift = Math.random()*Math.PI*2 // Phase shift (full circle)
    genome.push(gene);
  }
  return genome;
}

Walker.prototype.simulationStep = function(motor_noise) {
  if (this.health <= 0) return; // Do nothing if dead

  for(var k = 0; k < this.joints.length; k++) {
    // Ensure genome has an entry for this joint
    if (this.genome[k]) {
      var amp = (1 + motor_noise*(Math.random()*2 - 1)) * this.genome[k].cos_factor;
      var phase = (1 + motor_noise*(Math.random()*2 - 1)) * this.genome[k].time_shift;
      var freq = (1 + motor_noise*(Math.random()*2 - 1)) * this.genome[k].time_factor;
      // globals.step_counter is the continuous global time step
      this.joints[k].SetMotorSpeed(amp * Math.cos(phase + freq * this.local_step_counter));
    }
  }
  var oldmax = this.max_distance;
  var distance = this.torso.upper_torso.GetPosition().x;
  this.max_distance = Math.max(this.max_distance, distance);

  // score
  this.head_height = this.head.head.GetPosition().y;
  this.low_foot_height = Math.min(this.left_leg.foot.GetPosition().y, this.right_leg.foot.GetPosition().y);
  var body_delta = this.head_height-this.low_foot_height;
  var leg_delta_x = this.right_leg.foot.GetPosition().x - this.left_leg.foot.GetPosition().x;

  if(body_delta > config.min_body_delta) {
    this.score += body_delta/50; // Basic score for being upright
    if(this.max_distance > oldmax) { // If moving forward
      this.score += (this.max_distance - oldmax) * 2; // Score for distance moved
      if(Math.abs(leg_delta_x) > config.min_leg_delta && this.head.head.m_linearVelocity.y > -2) {
        if(typeof this.leg_delta_sign == 'undefined') {
          this.leg_delta_sign = leg_delta_x/Math.abs(leg_delta_x);
        } else if(this.leg_delta_sign * leg_delta_x < 0) { // Sign changed, indicates a step
          this.leg_delta_sign = leg_delta_x/Math.abs(leg_delta_x);
          this.steps++;
          this.score += 100; // Bonus for a step
          this.health = Math.min(this.health + config.walker_health / 3, config.walker_health); // Heal on step
        }
      }
    }
  }

  if(config.check_health) {
    if(body_delta < config.instadeath_delta) {
      this.health = 0;
    } else {
      this.health--;
    }
  }
  if (this.torso.upper_torso.GetPosition().y < -1) { // Fell off world
      this.health = 0;
  }

  this.local_step_counter++;
  return;
}

Walker.prototype.makeName = function(genome) {
  var name = '';
  var vowels = ['a','e','i','o','u','y']; // Added 'y'
  var consonants = ['b','c','d','f','g','h','j','k','l','m','n','p','r','s','t','v','w','x','z'];
  var name_length = Math.max(4, Math.min(8, Math.floor(genome.length / 1.5))); // Name length based on genome
  var use_vowel = Math.random() < 0.5;

  for(var k = 0; k < name_length; k++) {
    var sum = 0;
    // Use a portion of the genome for each letter to vary names more
    var gene_index = k % genome.length;
    for(var l_prop in genome[gene_index]) {
      if(genome[gene_index].hasOwnProperty(l_prop) && typeof genome[gene_index][l_prop] === 'number') {
        sum += (genome[gene_index][l_prop]*100); // Increased multiplier for more variance
      }
    }
    sum = Math.abs(Math.floor(sum));

    if(use_vowel) {
      name += vowels[sum%vowels.length];
    } else {
      name += consonants[sum%consonants.length];
    }
    use_vowel = !use_vowel; // Alternate
    if (k === 0) name = name.toUpperCase(); // Capitalize first letter
  }
  return name;
}