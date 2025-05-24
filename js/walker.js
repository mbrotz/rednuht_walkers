
function check(x, str) {
    if (Number.isNaN(x)) {
        console.error("Got NaN! " + str);
        return 0;
    }
    return x;
}

class Walker {
    constructor(gameInstance, brain) {
        this.game = gameInstance;
        this.id = 0;
        this.is_eliminated = false;
        this.mean_head_height = 0;
        this.mean_head_height_sum = 0;
        this.mean_forward_velocity = 0;
        this.mean_forward_velocity_sum = 0;
        this.local_step_counter = 0;
        this.score = 0.0;
        this.body = new WalkerBody(this);
        this.floor_y = gameInstance.floor_y;
        this.initial_head_height = this.getHeadHeight();
        this.initial_upper_torso_position = this.getUpperTorsoPosition();
        this.initial_upper_torso_height = this.getUpperTorsoHeight();
        this.initial_lower_torso_height = this.getLowerTorsoHeight();
        this.max_upper_torso_position = 0;
        this.pressure_line_position = this.initial_upper_torso_position - this.game.config.pressure_line_starting_offset;
        this.pressure_line_speed = this.game.config.pressure_line_base_speed;
        this.head_floor_contact = false;
        this.head_floor_contact_at_step = -1;
        this.head_floor_contact_torso_x = -1;
        if (brain) {
            this.brain = brain;
        } else {
            this.brain = this.createBrain();
        }
        this.name = Walker.makeName(this.brain.getParams());
    }

    getHeadHeight() {
        return check(Math.max(0, this.body.head.head.GetPosition().y - this.floor_y), "head height");
    }

    getUpperTorsoPosition() {
        return check(this.body.torso.upperTorso.GetPosition().x, "upper torso position");
    }

    getUpperTorsoHeight() {
        return check(this.body.torso.upperTorso.GetPosition().y - this.floor_y, "upper torso height");
    }

    getLowerTorsoPosition() {
        return check(this.body.torso.lowerTorso.GetPosition().x, "lower torso position");
    }

    getLowerTorsoHeight() {
        return check(this.body.torso.lowerTorso.GetPosition().y - this.floor_y, "lower torso height");
    }

    getLeftFootPosition() {
        return check(this.body.left_leg.foot.GetPosition().x - this.getLowerTorsoPosition(), "left foot position");
    }

    getRightFootPosition() {
        return check(this.body.right_leg.foot.GetPosition().x - this.getLowerTorsoPosition(), "right foot position");
    }

    getLeftFootHeight() {
        return check(this.body.left_leg.foot.GetPosition().y - this.floor_y, "left foot height");
    }

    getRightFootHeight() {
        return check(this.body.right_leg.foot.GetPosition().y - this.floor_y, "right foot height");
    }

    getNormalizedHeadHeight() {
        return check(this.getHeadHeight() / this.initial_head_height, "normalized head height");
    }

    getNormalizedHeadVelocity() {
        return check(this.body.head.head.GetLinearVelocity().x / 2, "normalized head velocity");
    }

    getNormalizedUpperTorsoVelocity() {
        return check(this.body.torso.upperTorso.GetLinearVelocity().x / 2, "normalized upper torso velocity");
    }

    getNormalizedLowerTorsoVelocity() {
        return check(this.body.torso.lowerTorso.GetLinearVelocity().x / 2, "normalized lower torso velocity");
    }

    getNormalizedUpperTorsoHeight() {
        return check(this.getUpperTorsoHeight() / this.initial_upper_torso_height, "normalized upper torso height");
    }

    getNormalizedLowerTorsoHeight() {
        return check(this.getLowerTorsoHeight() / this.initial_lower_torso_height, "normalized lower torso height");
    }

    getNormalizedUpperTorsoAngle() {
        return check(this.body.torso.upperTorso.GetAngle() / Math.PI, "normalized upper torso angle");
    }

    getNormalizedUpperTorsoAngularVelocity() {
        return check(this.body.torso.upperTorso.GetAngularVelocity() / (2 * Math.PI), "normalized upper torso angular velocity");
    }

    getNormalizedLowerTorsoAngle() {
        return check(this.body.torso.lowerTorso.GetAngle() / Math.PI, "normalized lower torso angle");
    }

    getNormalizedLowerTorsoAngularVelocity() {
        return check(this.body.torso.lowerTorso.GetAngularVelocity() / (2 * Math.PI), "normalized lower torso angular velocity");
    }

    getNormalizedLeftFootHeight() {
        return check(this.getLeftFootHeight() / this.initial_lower_torso_height, "normalized left foot height");
    }

    getNormalizedRightFootHeight() {
        return check(this.getRightFootHeight() / this.initial_lower_torso_height, "normalized right foot height");
    }

    getPressureLineDistance() {
        return check(Math.max(0, this.getUpperTorsoPosition() - this.pressure_line_position), "pressure line distance");
    }

    getNormalizedPressureLineDistance() {
        return check(1.0 / (1.0 + this.getPressureLineDistance()), "noramlized pressure line distance");
    }

    getNormalizedJointAngle(joint) {
        let upperLimit = joint.GetUpperLimit();
        let lowerLimit = joint.GetLowerLimit();
        let range = upperLimit - lowerLimit;
        if (range != 0.0) {
            return check(-1.0 + 2.0 * (joint.GetJointAngle() - lowerLimit) / range, "normalized joint angle");
        }
        return 0.0;
    }

    getNormalizedJointAngularVelocity(joint) {
        return check(joint.GetJointSpeed() / (3 * Math.PI), "normalized joint angular velocity");
    }

    isOffFloor() {
        return this.game.max_floor_x < this.getLowerTorsoPosition();
    }

    destroyBody() {
        if (this.body) {
            this.body.destroy();
            this.body = null;
        }
    }

    toEntry(include_brain = false) {
        return {
            id: this.id,
            name: this.name,
            score: this.score,
            mean_head_height: this.mean_head_height,
            mean_head_height: this.mean_head_height,
            mean_forward_velocity: this.mean_forward_velocity,
            max_upper_torso_position: this.max_upper_torso_position,
            brain: include_brain === true ? this.brain.copy() : null,
        };
    }

    createBrain() {
        return new NeuralNetwork(45, [35, 25], 12);
    }

    updateBrain() {
        let input = this.brain.input;
        let i = 0;
        input[i++] = this.getNormalizedPressureLineDistance();

        input[i++] = this.getNormalizedHeadHeight();
        input[i++] = this.getNormalizedHeadVelocity();

        input[i++] = this.getNormalizedUpperTorsoHeight();
        input[i++] = this.getNormalizedUpperTorsoVelocity();
        input[i++] = this.getNormalizedUpperTorsoAngle();
        input[i++] = this.getNormalizedUpperTorsoAngularVelocity();

        input[i++] = this.getNormalizedLowerTorsoHeight();
        input[i++] = this.getNormalizedLowerTorsoVelocity();
        input[i++] = this.getNormalizedLowerTorsoAngle();
        input[i++] = this.getNormalizedLowerTorsoAngularVelocity();

        let joints = this.body.joints;
        for (let j = 0; j < joints.length; j++) {
            input[i++] = this.getNormalizedJointAngle(joints[j]);
            input[i++] = this.getNormalizedJointAngularVelocity(joints[j]);
        }

        input[i++] = this.getNormalizedLeftFootHeight();
        input[i++] = this.getNormalizedRightFootHeight();

        input[i++] = this.getLeftFootPosition();
        input[i++] = this.getRightFootPosition();

        let time = this.local_step_counter / this.game.config.time_step;
        let theta = 2 * Math.PI * time;
        input[i++] = Math.cos(theta * 2);
        input[i++] = Math.sin(theta * 2);
        input[i++] = Math.cos(theta);
        input[i++] = Math.sin(theta);
        input[i++] = Math.cos(theta * 0.5);
        input[i++] = Math.sin(theta * 0.5);

        if (i > this.brain.input_size)
            console.error("Too much input! Brain input size: " + this.brain.input_size + ", Got: " + i + ", Joints: " + joints.length);

        this.brain.step();
    }

    updateJoint(joint, target_angle_factor, kp, kd, max_motor_speed) {
        check(target_angle_factor, "target angle factor");
        let lower_limit = joint.GetLowerLimit();
        let upper_limit = joint.GetUpperLimit();
        let target_angle = lower_limit + (target_angle_factor * 0.5 + 0.5) * (upper_limit - lower_limit);
        let current_angle = joint.GetJointAngle();
        let current_angular_velocity = joint.GetJointSpeed();
        let angle_error = target_angle - current_angle;
        angle_error = Math.atan2(Math.sin(angle_error), Math.cos(angle_error));
        let raw_motor_speed = kp * angle_error - kd * current_angular_velocity;
        let motor_speed = Math.max(-max_motor_speed, Math.min(max_motor_speed, raw_motor_speed));
        joint.SetMotorSpeed(motor_speed);
    }

    updateJoints() {
        let angle = this.brain.angle;
        let joints = this.body.joints;
        for (let j = 0; j < joints.length; j++)
            this.updateJoint(joints[j], angle[j], 5, 0.5, 1.0);
    }

    updateMetrics() {
        this.max_upper_torso_position = Math.max(this.max_upper_torso_position, this.getUpperTorsoPosition() - this.initial_upper_torso_position);
        this.mean_forward_velocity = (this.max_upper_torso_position / this.local_step_counter) * this.game.config.time_step;
        this.mean_head_height_sum += this.getNormalizedHeadHeight();
        this.mean_head_height = this.mean_head_height_sum / this.local_step_counter;
        this.score = this.max_upper_torso_position * (1.0 + this.mean_forward_velocity);
    }

    updatePressureLine() {
        this.pressure_line_position += this.pressure_line_speed;
        this.pressure_line_speed += this.game.config.pressure_line_acceleration;
    }

    updateEliminated() {
        if (this.isOffFloor()) {
            this.is_eliminated = true;
        }
        if (this.getPressureLineDistance() <= 0) {
            this.is_eliminated = true;
        }
    }

    simulationStep() {
        if (!this.is_eliminated) {
            this.local_step_counter++;
            this.updateBrain();
            this.updateJoints();
            this.updateMetrics();
            this.updatePressureLine();
            this.updateEliminated();
        }
    }

    static makeNamePart(data, length, offset, capitalizeFirst, vowels, consonants) {
        let name_part = '';
        let use_vowel = false;
        for (let i = 0; i < length; i++) {
            let sum = 0;
            let index = (offset + i) % data.length;
            let value = data[index];
            sum = value * (10000 + (offset % 1300));
            sum = Math.abs(Math.floor(sum));
            if (i == 0) {
                use_vowel = (sum % 2) == 0;
            }
            let char_to_add;
            if (use_vowel) {
                char_to_add = vowels[sum % vowels.length];
            } else {
                char_to_add = consonants[sum % consonants.length];
            }
            if (i === 0 && capitalizeFirst) {
                char_to_add = char_to_add.toUpperCase();
            }
            name_part += char_to_add;
            use_vowel = !use_vowel;
        }
        return name_part;
    }

    static makeName(data) {
        const vowels = ['a', 'e', 'i', 'o', 'u'];
        const consonants = ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'w', 'x', 'z'];
        const min_name_len = 3;
        const max_genus_len = 7;
        const max_species_len = 9;
        const length = data.length;
        let genus_length = Math.max(min_name_len, Math.min(max_genus_len, Math.floor(length / 200) + min_name_len));
        let species_length = Math.max(min_name_len, Math.min(max_species_len, Math.floor(length / 150) + min_name_len));
        genus_length = Math.max(min_name_len, genus_length);
        species_length = Math.max(min_name_len, species_length);
        let genus_name = Walker.makeNamePart(data, genus_length, 0, true, vowels, consonants);
        let species_offset = 0;
        if (length > 0) {
            species_offset = Math.floor(length / 3);
        }
        species_offset = species_offset % length;
        let species_name = Walker.makeNamePart(data, species_length, species_offset, true, vowels, consonants);
        return genus_name + " " + species_name;
    }
}
