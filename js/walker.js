// walker has fixed shapes and structures
// shape definitions are in the constructor


var Walker = function() {
  this.__constructor.apply(this, arguments);
}

Walker.prototype.__constructor = function(world, genome) {

  this.world = globals.world; 

  this.density = 106.2; 

  this.local_step_counter = 0; // Represents "Steps_Lived_So_Far"

  this.max_distance = -5; // Still useful for camera or other non-scoring logic
  // this.health = config.walker_health; // Removed
  // this.score = 0; // Removed, using this.fitness_score
  // this.low_foot_height = 0; // Removed
  // this.head_height = 0; // Removed (calculated live)
  // this.steps = 0; // Removed (old step bonus counter)
  this.id = 0; 
  // this.is_dead = false; // Removed

  // New properties for "Persistent Pursuit & Performance Metric"
  this.is_eliminated = false;
  this.processed_after_elimination = false; // Flag to ensure one-time processing after elimination
  this.initial_torso_center_x = 0;    // Will be set after body creation
  this.pressure_line_x_position = 0;  // Will be initialized based on initial_torso_center_x
  this.sum_normalized_head_heights = 0.0;
  this.fitness_score = 0.0;           // Unified live fitness score, becomes final on elimination

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

  // Initialize pressure line start point after bodies are created
  // Using upper_torso as the main torso reference point
  this.initial_torso_center_x = this.torso.upper_torso.GetPosition().x;
  this.pressure_line_x_position = this.initial_torso_center_x - config.pressure_line_starting_offset;


  if(genome) {
    this.genome = JSON.parse(JSON.stringify(genome));
  } else {
    this.genome = this.createGenome(this.joints, this.bodies); 
  }

  this.name = this.makeName(this.genome);
}

Walker.prototype.createTorso = function() {
  this.bd.position.Set(0.5 - this.leg_def.foot_length/2 + this.leg_def.tibia_width/2, this.leg_def.foot_height/2 + this.leg_def.foot_height/2 + this.leg_def.tibia_length + this.leg_def.femur_length + this.torso_def.lower_height + this.torso_def.upper_height/2);
  var upper_torso = this.world.CreateBody(this.bd);

  this.fd.shape.SetAsBox(this.torso_def.upper_width/2, this.torso_def.upper_height/2);
  upper_torso.CreateFixture(this.fd);

  this.bd.position.Set(0.5 - this.leg_def.foot_length/2 + this.leg_def.tibia_width/2, this.leg_def.foot_height/2 + this.leg_def.foot_height/2 + this.leg_def.tibia_length + this.leg_def.femur_length + this.torso_def.lower_height/2);
  var lower_torso = this.world.CreateBody(this.bd);

  this.fd.shape.SetAsBox(this.torso_def.lower_width/2, this.torso_def.lower_height/2);
  lower_torso.CreateFixture(this.fd);

  var jd = new b2.RevoluteJointDef();
  var position = upper_torso.GetPosition().Clone();
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
  var upper_leg = this.world.CreateBody(this.bd);

  this.fd.shape.SetAsBox(this.leg_def.femur_width/2, this.leg_def.femur_length/2);
  upper_leg.CreateFixture(this.fd);

  this.bd.position.Set(0.5 - this.leg_def.foot_length/2 + this.leg_def.tibia_width/2, this.leg_def.foot_height/2 + this.leg_def.foot_height/2 + this.leg_def.tibia_length/2);
  var lower_leg = this.world.CreateBody(this.bd);

  this.fd.shape.SetAsBox(this.leg_def.tibia_width/2, this.leg_def.tibia_length/2);
  lower_leg.CreateFixture(this.fd);

  this.bd.position.Set(0.5, this.leg_def.foot_height/2);
  var foot = this.world.CreateBody(this.bd);

  this.fd.shape.SetAsBox(this.leg_def.foot_length/2, this.leg_def.foot_height/2);
  foot.CreateFixture(this.fd);

  var jd = new b2.RevoluteJointDef();
  var position = upper_leg.GetPosition().Clone();
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
  this.bd.position.Set(0.5 - this.leg_def.foot_length/2 + this.leg_def.tibia_width/2, this.leg_def.foot_height/2 + this.leg_def.foot_height/2 + this.leg_def.tibia_length + this.leg_def.femur_length + this.torso_def.lower_height + this.torso_def.upper_height - this.arm_def.arm_length/2);
  var upper_arm = this.world.CreateBody(this.bd);

  this.fd.shape.SetAsBox(this.arm_def.arm_width/2, this.arm_def.arm_length/2);
  upper_arm.CreateFixture(this.fd);

  this.bd.position.Set(0.5 - this.leg_def.foot_length/2 + this.leg_def.tibia_width/2, this.leg_def.foot_height/2 + this.leg_def.foot_height/2 + this.leg_def.tibia_length + this.leg_def.femur_length + this.torso_def.lower_height + this.torso_def.upper_height - this.arm_def.arm_length - this.arm_def.forearm_length/2);
  var lower_arm = this.world.CreateBody(this.bd);

  this.fd.shape.SetAsBox(this.arm_def.forearm_width/2, this.arm_def.forearm_length/2);
  lower_arm.CreateFixture(this.fd);

  var jd = new b2.RevoluteJointDef();
  var position = upper_arm.GetPosition().Clone();
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
  var neck = this.world.CreateBody(this.bd);

  this.fd.shape.SetAsBox(this.head_def.neck_width/2, this.head_def.neck_height/2);
  neck.CreateFixture(this.fd);

  this.bd.position.Set(0.5 - this.leg_def.foot_length/2 + this.leg_def.tibia_width/2, this.leg_def.foot_height/2 + this.leg_def.foot_height/2 + this.leg_def.tibia_length + this.leg_def.femur_length + this.torso_def.lower_height + this.torso_def.upper_height + this.head_def.neck_height + this.head_def.head_height/2);
  var head = this.world.CreateBody(this.bd);

  this.fd.shape.SetAsBox(this.head_def.head_width/2, this.head_def.head_height/2);
  head.CreateFixture(this.fd);

  var jd = new b2.RevoluteJointDef();
  var position = neck.GetPosition().Clone();
  position.y += this.head_def.neck_height/2;
  jd.Initialize(head, neck, position);
  jd.lowerAngle = -0.1;
  jd.upperAngle = 0.1;
  jd.enableLimit = true;
  jd.maxMotorTorque = 2; 
  jd.motorSpeed = 0;
  jd.enableMotor = true;
  this.joints.push(this.world.CreateJoint(jd));

  return {head: head, neck: neck};
}

Walker.prototype.connectParts = function() {
  var jd_weld = new b2.WeldJointDef(); 
  jd_weld.bodyA = this.head.neck;
  jd_weld.bodyB = this.torso.upper_torso;
  jd_weld.localAnchorA = new b2.Vec2(0, -this.head_def.neck_height/2);
  jd_weld.localAnchorB = new b2.Vec2(0, this.torso_def.upper_height/2);
  jd_weld.referenceAngle = 0;
  this.world.CreateJoint(jd_weld); 

  var jd = new b2.RevoluteJointDef(); 

  var arm_connect_pos = this.torso.upper_torso.GetPosition().Clone();
  arm_connect_pos.y += this.torso_def.upper_height/2; 

  jd.Initialize(this.torso.upper_torso, this.right_arm.upper_arm, arm_connect_pos);
  jd.lowerAngle = -Math.PI/2; 
  jd.upperAngle = Math.PI/1.5; 
  jd.enableLimit = true;
  jd.maxMotorTorque = 120;
  jd.motorSpeed = 0;
  jd.enableMotor = true;
  this.joints.push(this.world.CreateJoint(jd));

  var jd2 = new b2.RevoluteJointDef(); 
  jd2.Initialize(this.torso.upper_torso, this.left_arm.upper_arm, arm_connect_pos);
  jd2.lowerAngle = -Math.PI/2;
  jd2.upperAngle = Math.PI/1.5;
  jd2.enableLimit = true;
  jd2.maxMotorTorque = 120;
  jd2.motorSpeed = 0;
  jd2.enableMotor = true;
  this.joints.push(this.world.CreateJoint(jd2));

  var leg_connect_pos = this.torso.lower_torso.GetPosition().Clone();
  leg_connect_pos.y -= this.torso_def.lower_height/2; 

  var jd3 = new b2.RevoluteJointDef();
  jd3.Initialize(this.torso.lower_torso, this.right_leg.upper_leg, leg_connect_pos);
  jd3.lowerAngle = -Math.PI/2.5; 
  jd3.upperAngle = Math.PI/3;   
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

Walker.prototype.createGenome = function(joints, bodies) { 
  var genome = [];
  var num_motorized_joints = this.joints.length; 
  
  for(var k = 0; k < num_motorized_joints; k++) {
    var gene = {}; 
    gene.cos_factor = 6*Math.random() - 3; 
    gene.time_factor = Math.random()/10;   
    gene.time_shift = Math.random()*Math.PI*2 
    genome.push(gene);
  }
  return genome;
}

Walker.prototype.simulationStep = function(motor_noise) {
  if (this.is_eliminated) {
    return;
  }

  // Motor control (existing logic)
  for(var k = 0; k < this.joints.length; k++) {
    if (this.genome[k]) {
      var amp = (1 + motor_noise*(Math.random()*2 - 1)) * this.genome[k].cos_factor;
      var phase = (1 + motor_noise*(Math.random()*2 - 1)) * this.genome[k].time_shift;
      var freq = (1 + motor_noise*(Math.random()*2 - 1)) * this.genome[k].time_factor;
      this.joints[k].SetMotorSpeed(amp * Math.cos(phase + freq * this.local_step_counter));
    }
  }

  // --- Persistent Pursuit & Performance Metric ---

  // 1. Current Progress Score (Base)
  // Using upper_torso as the main torso reference point, consistent with initialization
  var current_torso_x = this.torso.upper_torso.GetPosition().x;
  var current_progress_score = current_torso_x;

  // 2. Lifetime Average Normalized Head Height Modifier
  var current_head_y = this.head.head.GetPosition().y;
  var instantaneous_normalized_head_height = Math.min(1.0, Math.max(0.0, current_head_y / config.max_reasonable_head_height));
  
  this.sum_normalized_head_heights += instantaneous_normalized_head_height;
  
  var steps_lived = this.local_step_counter + 1; // local_step_counter is 0-indexed for first step it's about to complete
  var current_avg_normalized_head_height = (steps_lived > 0) ? (this.sum_normalized_head_heights / steps_lived) : 0.0;
  
  var effective_posture_modifier = config.min_posture_contribution + ((1.0 - config.min_posture_contribution) * current_avg_normalized_head_height);

  // 3. Current Live Fitness Score
  this.fitness_score = current_progress_score * effective_posture_modifier;

  // Update Advancing Pressure Line
  // steps_lived here should be consistent with its use in avg head height.
  // If local_step_counter starts at 0, then for the Nth step (1-indexed), local_step_counter is N-1.
  // The formula uses Steps_Lived. If a walker is on its first step, Steps_Lived = 1.
  // local_step_counter is incremented at the end. So for the calculation, use (this.local_step_counter).
  // If it means "number of steps *completed*", then on step 0, completed_steps = 0. On step 1, completed_steps = 1.
  // Let's use `this.local_step_counter` for `Steps_Lived` in the formula, assuming it's effectively `current_step_number - 1`
  // or "number of previous full steps lived". The original prompt formulation was `Steps_Lived`.
  // If `local_step_counter` is 0 on the first frame, then `Pressure_Line_X_Position_at_step_0` (initial state before any step)
  // would be `(Initial_Torso_Center_X - Starting_Offset)`. This seems correct.
  var pressure_steps = this.local_step_counter;
  this.pressure_line_x_position = (this.initial_torso_center_x - config.pressure_line_starting_offset) + 
                                  (config.pressure_line_base_speed * pressure_steps) + 
                                  (config.pressure_line_acceleration_factor * pressure_steps * pressure_steps);

  // Elimination Trigger
  if (current_torso_x <= this.pressure_line_x_position) {
    this.is_eliminated = true;
    // this.fitness_score is already up-to-date and will serve as the final score.
  }

  // Update max_distance (still useful for camera)
  this.max_distance = Math.max(this.max_distance, current_torso_x);

  // Increment step counter (for next frame's calculations and pressure line advancement)
  this.local_step_counter++;
}

Walker.prototype.makeName = function(genome) {
  var vowels = ['a','e','i','o','u','y'];
  var consonants = ['b','c','d','f','g','h','j','k','l','m','n','p','r','s','t','v','w','x','z'];

  var generateNamePart = function(genome_source, length, capitalizeFirst, gene_start_offset) {
    var name_part = '';
    var use_vowel = Math.random() < 0.5;

    for (var i = 0; i < length; i++) {
      var sum = 0;
      var gene_index = (gene_start_offset + i) % genome_source.length;
      
      var current_gene = genome_source[gene_index];
      if (current_gene) { 
        for (var prop in current_gene) {
          if (current_gene.hasOwnProperty(prop) && typeof current_gene[prop] === 'number') {
            sum += (current_gene[prop] * (100 + (gene_start_offset % 13))); 
          }
        }
      }
      sum = Math.abs(Math.floor(sum));

      var char_to_add;
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

  var min_name_len = 3; 
  var max_genus_len = 6;
  var max_species_len = 8;

  var genus_length = Math.max(min_name_len, Math.min(max_genus_len, Math.floor(genome.length / 2.5) + 1));
  var species_length = Math.max(min_name_len, Math.min(max_species_len, Math.floor(genome.length / 2) + 2));
  
  var genus_name = generateNamePart(genome, genus_length, true, 0);

  var species_offset = Math.floor(genome.length / 3);
  if (genome.length <= 2 && genome.length > 0) { 
    species_offset = 1;
  } else if (genome.length === 0) { 
    species_offset = 0;
  }

  var species_name = generateNamePart(genome, species_length, false, species_offset);

  return genus_name + " " + species_name;
};