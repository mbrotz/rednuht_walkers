class Walker {
    constructor(gameInstance, genome) {
        this.game = gameInstance;
        this.id = 0;
        this.is_eliminated = false;
        this.max_torso_position = 0;
        this.mean_head_height = 0;
        this.mean_head_height_sum = 0;
        this.mean_forward_velocity = 0;
        this.mean_forward_velocity_sum = 0;
        this.steps_without_improvement = 0;
        this.local_step_counter = 0;
        this.score = 0.0;
        this.body = new WalkerBody(this);
        this.initial_head_position = this.getHeadPosition();
        this.initial_torso_position = this.getTorsoPosition();
        this.pressure_line_position = this.initial_torso_position - this.game.config.pressure_line_starting_offset;
        this.pressure_line_speed = this.game.config.pressure_line_base_speed;
        this.head_floor_contact = false;
        this.head_floor_contact_at_step = -1;
        this.head_floor_contact_torso_x = -1;
        if (genome) {
            this.genome = genome;
        } else {
            this.genome = this.body.createGenome();
        }
        this.name = this.makeName(this.genome);
    }

    getHeadPosition() {
        return Math.max(0, this.body.head.head.GetPosition().y);
    }

    getNormalizedHeadPosition() {
        if (this.initial_head_position > 0) {
          return this.getHeadPosition() / this.initial_head_position;
        }
        return 0;
    }

    getTorsoPosition() {
        return this.body.torso.upperTorso.GetPosition().x;
    }

    getPressureLineDistance() {
        return Math.max(0, this.getTorsoPosition() - this.pressure_line_position);
    }

    isOffFloor() {
        return this.game.max_floor_x < this.getTorsoPosition();
    }

    isSlacker() {
        return this.steps_without_improvement >= this.game.config.max_steps_without_improvement
    }

    destroyBody() {
        if (this.body) {
            this.body.destroy();
            this.body = null;
        }
    }

    toEntry() {
        return {
            id: this.id,
            name: this.name,
            score: this.score,
            mean_head_height: this.mean_head_height,
            mean_head_height: this.mean_head_height,
            mean_forward_velocity: this.mean_forward_velocity,
            max_torso_position: this.max_torso_position,
            genome: JSON.stringify(this.genome),
        };
    }

    updateMetrics() {
        if (this.local_step_counter > 0) {
            let torso_position = this.getTorsoPosition();
            let forward_change = Math.max(0, torso_position - this.max_torso_position);
            this.max_torso_position = Math.max(this.max_torso_position, torso_position);
            if (forward_change > 0) {
                this.mean_head_height_sum += this.getNormalizedHeadPosition();
                this.mean_forward_velocity_sum += forward_change * this.game.config.time_step;
                this.steps_without_improvement = 0;
            } else {
                this.steps_without_improvement++;
            }
            this.mean_forward_velocity = this.mean_forward_velocity_sum / this.local_step_counter;
            this.mean_head_height = this.mean_head_height_sum / this.local_step_counter;
            this.score += forward_change * (1.0 + this.mean_forward_velocity);
        }
    }

    updatePressureLine() {
        this.pressure_line_position += this.pressure_line_speed;
        this.pressure_line_speed += this.game.config.pressure_line_acceleration;
    }

    updateEliminated() {
        if (this.isSlacker()) {
            this.is_eliminated = true;
            //console.log("slacker: " + this.score);
        }
        if (this.isOffFloor()) {
            this.is_eliminated = true;
            //console.log("off floor: " + this.score);
        }
        if (this.getPressureLineDistance() <= 0) {
            this.is_eliminated = true;
            //console.log("pressure line: " + this.score);
        }
    }

    simulationStep() {
        if (!this.is_eliminated) {
            this.body.updateJoints();
            this.updateMetrics();
            this.updatePressureLine();
            this.updateEliminated();
            this.local_step_counter++;
        }
    }

    makeName(genome) {
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
        if (genome.length === 0) {
            species_offset = 0;
        } else if (genome.length > 0 && genome.length <= 2) {
            species_offset = 1;
        }

        let species_name = generateNamePart(genome, species_length, true, species_offset);

        return genus_name + " " + species_name;
    }
}
