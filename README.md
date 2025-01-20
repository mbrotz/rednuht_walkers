# Rednuht Walkers
Scrape of the rednuht web-site giving a cool example of a genetic algorithm.

[https://rednuht.org/genetic_walkers/](https://rednuht.org/genetic_walkers/)

# Disclaimer
This documentation was generated using Google AI Studio with Gemini 2.0 Fast Experimental. I generated it to help me understand the implementation but i did not check it for correctness! It may or may not be accurate!

# Chapter 1: Project Overview

This document provides a technical overview of a web application that uses a genetic algorithm to simulate the evolution of two-dimensional walking agents within a Box2D physics environment. The application renders the simulation on an HTML canvas, displays real-time information, and allows users to dynamically adjust various simulation parameters. The project comprises HTML, CSS, and JavaScript files, each serving a specific purpose in the overall architecture.

## **Key Concepts:**

*   **Genetic Algorithm (GA):** A search heuristic inspired by the process of natural selection. It uses mechanisms like selection, crossover, and mutation to iteratively evolve a population of solutions toward better performance according to a given fitness function.
*   **Box2D Physics Engine:** A physics engine used to simulate realistic movement and interactions between objects in a 2D environment. The JSBox2D library provides a JavaScript port of the Box2D library.
*   **Canvas Rendering:** The HTML5 canvas element is used to render the graphical representation of the simulation, including the walking agents and the environment.
*   **Modular Architecture:** The project uses separate files for different functionalities, resulting in clear, organized, and maintainable code.
*   **Dynamic Configuration:** The system is designed to be highly configurable, and many properties can be modified directly via the user interface, providing immediate feedback on the effect of different parameters on the evolutionary results.

## **Key Components:**

*   `index.html`: The main HTML file that sets up the structure of the application, links all other files, and contains the canvas for rendering the simulation.
*   `walkers.css`: The CSS file that provides styling for the HTML elements.
*   `game.js`: The primary JavaScript file that manages the simulation loop, the genetic algorithm, and the interaction with other JavaScript files.
*   `interface.js`: Manages all the elements that are used as part of the user interface.
*   `floor.js`: Creates the static floor for the Box2D physics world.
*   `walker.js`: Defines the `Walker` class, which represents the walking agents.
*   `draw.js`: Handles the drawing of the simulation on the HTML canvas.

## **User-Configurable Settings**

The simulation provides several settings that users can modify through HTML `<select>` elements in the `index.html` file. These settings control various aspects of the genetic algorithm, the physics simulation, and the rendering process. The selected values are stored in the `config` object within `game.js` and then read and used by the other JavaScript files to control the behavior of the simulation.

**1. `motor_noise` (Motor Noise)**

*   **Purpose:** This setting introduces randomness into the motor speeds of the walker's joints.
*   **Implementation:** The value selected in the `motor_noise` dropdown is read via the `interfaceSetup()` function in `interface.js` when the page loads, and whenever a new option is selected by the user via an event listener. The value is then stored in the `config.motor_noise` variable. The `config.motor_noise` variable is then multiplied by a random value between `-1` and `1` in the `simulationStep()` method of the `Walker` class in `walker.js` before the joint speed is set.
*   **Range of Values:** The available values are typically numerical values between `0.0` and `1.0` that increment by `0.1`.
*   **Influence on Simulation:**
    *   `0.0`: No noise is added, meaning the walkers’ joints move in a very predictable manner based on the values of the genome.
    *   Values greater than `0.0`: Introduces randomness into the motor speeds, leading to more unpredictable movements. Higher noise values may make it more difficult for the walkers to stand upright.
    *   Higher values can result in a more diverse range of movement, making it more difficult for the walkers to move predictably.
    *   The use of noise can also help the walkers avoid "perfect solutions", by making them less perfect and more resilient to change.

**2. `round_length` (Round Length)**

*   **Purpose:** Determines the duration of each simulation round before the population advances to the next generation.
*   **Implementation:** The value selected in the `round_length` dropdown is read via the `interfaceSetup()` function in `interface.js` when the page loads, and whenever a new option is selected by the user via an event listener. The selected value is then stored in the `config.round_length` variable. This value is checked against the `globals.step_counter` every frame in `simulationStep()` of `game.js`.
*   **Range of Values:** The default values are integers between `50` and `200`, incrementing by `50`.
*   **Influence on Simulation:**
    *   Higher values allow the walkers to more fully explore the space of possible movements within a single simulation round, but increase the time it takes to simulate one generation.
    *   Lower values will reduce the simulation time, and will result in less opportunity to explore different traits, but more generations will be simulated.

**3. `draw_fps` (Draw FPS)**

*   **Purpose:** Sets the drawing frames per second, controlling the frequency of the rendering of the simulation to the canvas.
*   **Implementation:** The value selected in the `draw_fps` dropdown is read via the `interfaceSetup()` function in `interface.js` when the page loads, and whenever a new option is selected by the user via an event listener. The value is then stored in the `config.draw_fps` variable. The `setFps` method in `draw.js` is called which uses the `setInterval` to set the drawing framerate.
*   **Range of Values:** The values are integers representing frames per second: `0`, `10`, `30`, `60`.
    *   `0`: Disables rendering completely, which can be used when performance is limited.
*   **Influence on Simulation:**
    *   `0`: The simulation continues to run, but the canvas is not updated, meaning there is no rendering. This may be useful if the rendering is causing performance issues.
    *   Higher values mean a smoother visual experience, but will require more processing power.
    *   Lower values will result in a choppier visual experience, but require less processing power.

**4. `simulation_fps` (Simulation FPS)**

*   **Purpose:** Controls the simulation frames per second, which directly relates to the speed of the simulation itself.
*   **Implementation:** The value selected in the `simulation_fps` dropdown is read via the `interfaceSetup()` function in `interface.js` when the page loads, and whenever a new option is selected by the user via an event listener. The value is then stored in the `config.simulation_fps` variable. The `setSimulationFps()` method in `game.js` is called which uses the `setInterval` to set the simulation framerate.
*   **Range of Values:** The values are integers representing frames per second: `0`, `30`, `60`, `120`.
    *   `0`: Pauses the simulation.
*   **Influence on Simulation:**
    *   `0`: Pauses the simulation.
    *   Higher values mean the simulation runs faster, with more simulation steps per second.
    *   Lower values will cause the simulation to run slower, simulating fewer steps each second.
    *   This setting does not directly affect the behavior of the walkers, but instead controls the overall simulation speed.

**5. `mutation_chance` (Gene mutation probability)**

*   **Purpose:** Sets the probability that a gene will be mutated during the reproduction process.
*   **Implementation:** The value selected in the `mutation_chance` dropdown is read via the `interfaceSetup()` function in `interface.js` when the page loads, and whenever a new option is selected by the user via an event listener. The value is then stored in the `config.mutation_chance` variable. This value is compared to a random number in the `copulate()` method of the `game.js` file, to control the chance of mutation of each gene.
*   **Range of Values:** The values are numbers between `0.0` and `1.0`, incrementing by `0.1`.
    *   `0.0`: No mutation takes place
    *   `1.0`: Mutation occurs with 100% chance, so all genes will be mutated.
*   **Influence on Simulation:**
    *   `0.0`: No mutation occurs, meaning the only differences will come from crossover.
    *   Higher values lead to more frequent mutations, which can result in a diverse population and better solutions, but can also increase the randomness of the solution and make the results more difficult to predict.
    *   Lower values lead to less frequent mutations, resulting in more stable traits passed on to subsequent generations. This may lead to stagnation in the evolutionary process if there is no good solution available in the existing population.

**6. `mutation_amount` (Gene mutation amount)**

*   **Purpose:** Controls the amount of change introduced to a gene parameter when a mutation occurs, except for the `target` properties.
*   **Implementation:** The value selected in the `mutation_amount` dropdown is read via the `interfaceSetup()` function in `interface.js` when the page loads, and whenever a new option is selected by the user via an event listener. The value is then stored in the `config.mutation_amount` variable. The `config.mutation_amount` is then used to scale a random number in the `copulate()` method of the `game.js` file, to control the amount of mutation applied to each value.
*   **Range of Values:** The values are numbers between `0.0` and `1.0`, incrementing by `0.1`.
*   **Influence on Simulation:**
    *   `0.0`: No mutation takes place, only crossover.
    *   Higher values result in larger changes to the gene properties, meaning the mutated offspring may have dramatically different joint speeds.
    *  Lower values result in smaller changes to the gene properties.

**7. `elite_clones` (Elite clones)**

*   **Purpose:** Sets the number of top-performing walkers that are directly passed on to the next generation without undergoing crossover or mutation.
*   **Implementation:** The value selected in the `elite_clones` dropdown is read via the `interfaceSetup()` function in `interface.js` when the page loads, and whenever a new option is selected by the user via an event listener. The selected value is then stored in the `config.elite_clones` variable. This value is used when creating a new population in `createNewGenerationGenomes()` of `game.js`, to copy the best genomes from the current generation to the next generation.
*   **Range of Values:** Integers between `0` and `6`.
*   **Influence on Simulation:**
    *   `0`: No elite walkers are preserved, and all members of the next generation will be created from crossover and mutation.
    *   Higher values mean a larger number of top performers are automatically passed on to the next generation, which speeds up the convergence toward a good solution, at the risk of premature convergence.
    *   Lower values reduce the speed of convergence, which may allow for exploration of other solutions.

# Chapter 2: Genetic Algorithm Implementation

This chapter describes the implementation of the genetic algorithm used to evolve the walking agents, focusing on the key mechanisms of fitness evaluation, selection, crossover (copulation), and mutation.

## **Genome Structure and Function**

The `genome` of each `Walker` is an array of `gene` objects. Each `gene` corresponds to a specific joint in the walker's body. The properties within each `gene` dictate how that particular joint will move over time.

Here's a breakdown of the `gene` object and how it's used:

```javascript
// Example of a gene object
gene = {
    cos_factor: 2.132, // Amplitude of the motor speed oscillation
    time_factor: 0.072,  // Frequency of the motor speed oscillation
    time_shift: 1.2  // Phase shift of the motor speed oscillation
};
```

*   **`cos_factor`**: This numeric value determines the magnitude or amplitude of the motor speed. It scales the result of the cosine function. In essence, it dictates how fast or slow a joint will move during its movement cycle. This value can be positive or negative, which can result in a forward or backward motion, relative to other joints.
*   **`time_factor`**: This numeric value controls the frequency of the joint's movement. It scales the time variable, and directly affects the overall speed of the joint rotation. A higher value means the joint will oscillate faster, and vice versa.
*   **`time_shift`**: This numeric value introduces a phase shift to the cosine wave that drives the motor speed. The effect is that it offsets the starting point of the movement for this particular joint, allowing different joints to move in a coordinated, yet not directly synchronized manner, creating the walking movement.

## **How the Genome Dictates Movement**

The `simulationStep()` function of the `Walker` class in `walker.js` is where the genome is actively used to control the walker's movement. Let's break down the relevant code:

```javascript
Walker.prototype.simulationStep = function(motor_noise) {
    for(var k = 0; k < this.joints.length; k++) {
        var amp = (1 + motor_noise*(Math.random()*2 - 1)) * this.genome[k].cos_factor;
        var phase = (1 + motor_noise*(Math.random()*2 - 1)) * this.genome[k].time_shift;
        var freq = (1 + motor_noise*(Math.random()*2 - 1)) * this.genome[k].time_factor;
        this.joints[k].SetMotorSpeed(amp * Math.cos(phase + freq * globals.step_counter));
    }
    // ... (rest of simulationStep code)
}
```
1. **Iterating Through Joints**: The code iterates through each of the walker's joints using a `for` loop, ensuring every joint is updated each simulation step.
2. **Motor Noise**: This code injects a small random value multiplied by the `motor_noise` configuration variable into the amplitude, phase, and frequency of the joint movement. This introduces randomness into the joint movement, which helps prevent the walkers from becoming too uniform in their movement. This is the only source of randomness in the joint movement, and as such, the walkers will move with more predictable steps if the `motor_noise` variable is set to `0`.
3. **Calculating Motor Speed**: The critical line `this.joints[k].SetMotorSpeed(amp * Math.cos(phase + freq * globals.step_counter))` sets the motor speed of the joint based on the values stored in the gene, and the current time step. Here's the breakdown of the equation:
    *   `amp * Math.cos(phase + freq * globals.step_counter)`:
        *   `globals.step_counter` is the simulation time variable. The `globals.step_counter` variable represents the passage of time in the simulation. This value increments every simulation step in the `simulationStep()` function of the `game.js` file.
        *   `freq` (`time_factor`) scales the `globals.step_counter` variable to control the frequency of the oscillation.
        *   `phase` (`time_shift`) shifts the cosine wave forward or backward to control the start position of the rotation.
        *   `Math.cos()` produces a cosine value between -1 and 1, causing the joint to oscillate.
        *   `amp` (`cos_factor`) then scales this value to adjust the amplitude of the oscillation which sets the speed.

## **In simpler terms**

Each joint of the walker oscillates back and forth at a speed, frequency, and starting point defined by its `gene`. The `cos_factor` value is the speed or amplitude, the `time_factor` value is the frequency of the oscillation, and the `time_shift` value shifts the start position of the cycle. The `step_counter` determines the current position in that cycle. By varying the values of these parameters, different joints move in different patterns, and when combined, the walker can move forwards, backwards, or fall down.

## **Impact of the Genetic Algorithm**

The genetic algorithm evolves these `gene` values over generations, to find an optimal set of movement for each walker. Through crossover and mutation, the walkers inherit and adapt the gene values. Walkers with values that happen to result in a more efficient upright walking movement get a higher fitness score. These walkers are more likely to reproduce and have their traits passed to future generations, in the process improving the average locomotion over time.

## **Key Takeaways**

*   The `genome` is not a direct instruction set, but a set of values that control the sinusoidal patterns of joint movement.
*   The `simulationStep()` function uses these values to calculate the motor speed of each joint.
*   The combination of different `cos_factor`, `time_factor`, and `time_shift` values across all joints results in a diverse range of walking patterns.
*   The genetic algorithm optimizes these parameters to produce walkers that can move efficiently within the simulation.

In essence, the genome provides the "rhythm" and "amplitude" for each joint, and the physics engine and simulation time do the rest of the work by creating motion and applying forces to the walker to see if it can get up and move.

## **Purpose of the Fitness Function**

In a genetic algorithm, the fitness function is crucial. It's the yardstick that measures how well a particular individual (in this case, a walker) performs at the task we want it to achieve. The fitness function takes the current state of the walker as an input, and generates a numerical score. This numerical score is used to select the best individuals for reproduction in the genetic algorithm, and as such, the values produced by this function have a direct impact on the final behaviors that the walkers will exhibit.

In this simulation, the goal is to evolve walkers that can walk upright and move forward. Therefore, the fitness function is designed to reward these behaviors.

## **Implementation of the Fitness Function**

The fitness calculation is done within the `simulationStep()` function of the `Walker` class in `walker.js`. Here's the relevant code:

```javascript
Walker.prototype.simulationStep = function(motor_noise) {
    // ... (joint motor speed updates) ...

    var oldmax = this.max_distance;
    var distance = this.torso.upper_torso.GetPosition().x;
    this.max_distance = Math.max(this.max_distance, distance);

  // score
  this.head_height = this.head.head.GetPosition().y;
  this.low_foot_height = Math.min(this.left_leg.foot.GetPosition().y, this.right_leg.foot.GetPosition().y);
  var body_delta = this.head_height-this.low_foot_height;
  var leg_delta = this.right_leg.foot.GetPosition().x - this.left_leg.foot.GetPosition().x;

  if(body_delta > config.min_body_delta) {
    this.score += body_delta/50;
    if(this.max_distance > oldmax) {
      if(Math.abs(leg_delta) > config.min_leg_delta && this.head.head.m_linearVelocity.y > -2) {
        if(typeof this.leg_delta_sign == 'undefined') {
          this.leg_delta_sign = leg_delta/Math.abs(leg_delta);
        } else if(this.leg_delta_sign * leg_delta < 0) {
          this.leg_delta_sign = leg_delta/Math.abs(leg_delta);
          this.steps++;
          this.score += 100;
          this.score += this.max_distance;
          this.health = config.walker_health;
        }
      }
    }
  }
  // ... (rest of simulationStep code)
}
```
## **Breakdown of the Calculation**

1.  **Distance Tracking**:
    *   `var oldmax = this.max_distance;`: The old value of the furthest distance the walker has traveled is stored in this variable
    *   `var distance = this.torso.upper_torso.GetPosition().x;`: The current x position of the torso is stored in this variable.
    *   `this.max_distance = Math.max(this.max_distance, distance);`: The furthest position the walker has traveled is tracked by continuously comparing the new position of the torso to the existing `max_distance` value, and setting the new furthest position accordingly.
2.  **Height Measurement**:
    *   `this.head_height = this.head.head.GetPosition().y;`: Gets the current y-coordinate of the walker's head (the higher, the better for an upright posture).
    *   `this.low_foot_height = Math.min(this.left_leg.foot.GetPosition().y, this.right_leg.foot.GetPosition().y);`: Gets the y-coordinate of the lowest foot in the simulation.
    *   `var body_delta = this.head_height - this.low_foot_height;`: Calculates the difference in height between the head and the lowest foot. This is a critical part of the fitness function, which encourages an upright posture.
3.  **Upright Posture Reward:**
    *   `if (body_delta > config.min_body_delta)`: Checks if the walker is sufficiently upright (the height difference is greater than the minimum value configured by `config.min_body_delta` variable). If this is true, the score is increased by a value proportional to the `body_delta`.
    *   `this.score += body_delta/50;`: Adds a score based on the difference in height. This rewards the walker for being upright. The `/50` scaling is there to prevent this factor from contributing too much to the overall score.
4.  **Step Reward:**
    *   `if(this.max_distance > oldmax)`: Checks to see if the walker has traveled further since the last time the fitness was calculated. If this condition is met the code moves to the next condition.
    *   `if(Math.abs(leg_delta) > config.min_leg_delta && this.head.head.m_linearVelocity.y > -2)`: Checks to see if the feet are in a stepping configuration, where the `leg_delta` has to be greater than the configured `min_leg_delta`. Additionally checks that the walker is not in free fall by confirming that the head's vertical velocity is greater than `-2`.
    *   The following code block is used to track the walkers steps:
        *   `if(typeof this.leg_delta_sign == 'undefined') { this.leg_delta_sign = leg_delta/Math.abs(leg_delta); }`: If the sign variable is not yet set, then it will be set based on the current values of the feet.
        *   `else if(this.leg_delta_sign * leg_delta < 0)`: This condition checks to see if the sign of the feet has switched, indicating a step has been taken.
        *   The following code executes if a step has been taken:
            *   `this.leg_delta_sign = leg_delta/Math.abs(leg_delta);`: The `leg_delta_sign` variable is updated based on the new positions of the walkers feet.
            *   `this.steps++;`: The step counter for this walker is increased.
            *   `this.score += 100;`: A bonus score is added for taking a proper step.
            *   `this.score += this.max_distance;`: Another bonus score is added proportional to the current distance.
            *   `this.health = config.walker_health;`: The walkers health is reset to the default value when a step is taken.

## **What the Fitness Function Measures**

The fitness function, in essence, measures the following:

*   **Uprightness:** The difference in height between the head and the lowest foot is a key indicator of how upright a walker is. A larger difference contributes more to the score.
*   **Forward Movement**: The fitness rewards walkers that travel further over the course of the simulation.
*   **Stepping Behavior:** The fitness rewards the walkers if their feet take a step back and forth to propel it forward, also resetting the walkers health when a step is taken.

## **How It Drives Evolution**

The simulation function does not care how the walker moves. It only cares about the final fitness score. Because of the factors included in the fitness function, the following is encouraged:

*   Walkers that manage to stand upright and maintain that posture will have higher scores due to the `body_delta` and subsequent score rewards, encouraging the upright posture.
*   Walkers that take a step, even if they don't travel far, will get rewarded, encouraging a walking behavior.
*   Walkers that move forward consistently and take steps while upright will get a higher score, because they will get a reward for the `body_delta`, the step, and the distance, as such, over time, they will be the most likely to be selected for reproduction.

## **Key Takeaways**

*   The fitness function combines multiple measurements into a single score.
*   It encourages walkers to stand tall, move forward, and take steps.
*   The way that the `if` statements are set up mean that all of these conditions must be true to reach the final fitness score. For example, a walker can not simply stay still and be tall, it also has to be able to move and step to get a better fitness score.
*   The specific formula and scaling factors (e.g. `/50` when the score is increased by `body_delta`) are tuned to balance these different objectives, as such, slight changes to these values will have a large impact on the walking behaviours that the simulation produces.

By rewarding walkers that exhibit the desired characteristics and behaviours, the fitness function guides the genetic algorithm towards increasingly effective walking solutions.

## **Selection Process**

The selection process determines which individuals from the current generation will become parents for the next generation. In this simulation, the selection isn't a strict "top N" approach but rather uses a probabilistic method based on fitness ranking, combined with elitism. This is handled in the `pickParents()` function within `game.js`.

Here's a breakdown of the code:

```javascript
pickParents = function() {
  var parents = [];
  for(var k = 0; k < config.population_size; k++) {
    if(Math.random() < (1/(k+2))) {
      parents.push(k);
      if(parents.length >= 2) {
        break;
      }
    }
  }
  if(typeof parents[0] == 'undefined' || typeof parents[1] == 'undefined') {
    return false;
  }
  return parents;
}
```

## **Explanation:**

1.  **Iterate Through the Population:** The function iterates through each walker in the current population using a `for` loop.
2.  **Probabilistic Selection:** For each walker, a random number between 0 and 1 is generated using `Math.random()`. If this random number is less than `1/(k+2)`, the current walker is selected as a parent, where `k` is the index of the walker in the current population.
3.  **Parent Pair Collection:** The function continues to select parents until two have been chosen. The indexes of the chosen walkers are added to the `parents` array.
4.  **Validation**: The selected parents are then checked to make sure that 2 parents were actually selected and returns the index of the two selected parents, or returns `false` if two parents weren't selected.

## **Impact of Probabilistic Selection**

*   **Fitness-Based Probability:** The probability of a walker being selected as a parent decreases as its position in the population increases. Walker at index `0` has a selection probability of `1/(0+2) = 0.5`, walker at index `1` has `1/(1+2) = 0.33`, walker at index `2` has `1/(2+2) = 0.25`, and so on, so better performing walkers are more likely to be chosen as parents for the next generation.
*   **Diversity Preservation:** Because of this, there is still a chance that lower-scoring walkers will still be able to reproduce, which will still introduce diversity into the gene pool. This helps prevent the population from converging too quickly on a suboptimal solution.
*   **Stochastic Nature:** This is a probabilistic approach, not a deterministic one. That means every time this function runs, the results will be different, even if the population is identical.

## **Implementation of Elitism**

Elitism ensures that the very best individuals from the current generation are directly passed on to the next generation, without any modification or reproduction. This is implemented in the `createNewGenerationGenomes()` function within `game.js`.

Here's the relevant code:

```javascript
createNewGenerationGenomes = function() {
  globals.walkers.sort(function(a,b) {
    return b[config.fitness_criterium] - a[config.fitness_criterium];
  });
  // ... (rest of the code) ...
  var genomes = [];
  // clones
  for(var k = 0; k < config.elite_clones; k++) {
    genomes.push(globals.walkers[k].genome);
  }
  for(var k = config.elite_clones; k < config.population_size; k++) {
    if(parents = pickParents()) {
      genomes.push(copulate(globals.walkers[parents[0]], globals.walkers[parents[1]]));
    }
  }
  return genomes;
}
```

## **Explanation:**

1.  **Sorting by Fitness:**
    *   `globals.walkers.sort(function(a,b) { return b[config.fitness_criterium] - a[config.fitness_criterium]; });`
    *   The walkers are first sorted by their fitness score. This places the most fit walkers at the beginning of the `globals.walkers` array.
2.  **Elite Preservation:**
    *   `for(var k = 0; k < config.elite_clones; k++) { genomes.push(globals.walkers[k].genome); }`
    *   This code iterates through the top `config.elite_clones` walkers based on their sorted order, and their genomes are added directly to the new `genomes` array, guaranteeing the best performers from the current generation are included in the next generation. This is the "elitism" part of the algorithm. The default value of the `config.elite_clones` is `2`.
3.  **Creating Offspring:**
    *   `for(var k = config.elite_clones; k < config.population_size; k++) {  if(parents = pickParents()) { genomes.push(copulate(globals.walkers[parents[0]], globals.walkers[parents[1]])); } }`
    *   The rest of the genomes are created by the `copulate()` function based on the selected parents from the `pickParents` function.

## **Impact of Elitism**

*   **Preservation of Best Traits:** Elitism ensures that the best-performing individuals from the current generation are directly passed on to the next generation, thus preserving good features that the population has already found and further improving the average locomotion over time.
*   **Faster Convergence:** By directly passing on the top performers, elitism can accelerate the rate at which the population converges toward an optimal solution. Since the best performing walkers are always passed on to the next generation, the "fitness landscape" is always improving from one generation to the next.
*   **Risk of Premature Convergence:** If the number of elite clones is set too high, elitism can cause the population to converge prematurely, potentially settling for a suboptimal solution, which is why it is combined with the probabilistic selection, which promotes diversity.

## **Combined Impact of Selection and Elitism**

*   **Exploration and Exploitation:** The combination of probabilistic selection and elitism balances exploration (trying new combinations via less fit parents) and exploitation (using what's already known via the top fit parents).
*   **Evolutionary Pressure:** The fitness-based selection puts pressure on the population to improve and the elitism ensures that the improvements made are not lost. This results in the fitness of the population generally getting better over time.
*   **Dynamic Adaptation:** The probabilistic nature of the selection process introduces diversity, while elitism helps preserve and quickly implement the best traits found in the current generation. This ensures that the simulation does not end up with an identical population.

## **In Summary:**

*   **Selection:** Individuals for reproduction are selected based on their fitness ranking, where the highest-ranking walkers are more likely to be selected.
*   **Elitism:** The best-performing individuals from each generation are directly cloned to the next generation, ensuring that progress is not lost.
*   **Balance:** The combination of these two techniques provides a balance between the exploration of new traits and the exploitation of known traits.
*   **Configuration:** These values can be modified via the `config.elite_clones` HTML select element, which gives the user the ability to change the number of elite clones used for the next generation, as such, the user can modify the evolutionary pressure in the simulation.

Okay, let's delve into the reproduction mechanisms, including crossover (or copulation as it's named in this project) and mutation, within this genetic algorithm simulation. These are the core processes that drive the diversity and evolution of the population.

## **Reproduction Mechanism: Crossover**

In this simulation, the term "copulation" refers to the process of creating a new genome by combining the genetic material of two parent walkers. The `copulate` function in `game.js` implements this process.

Here's the relevant code:

```javascript
copulate = function(walker_1, walker_2) {
  var new_genome = [];
  for(var k = 0; k < walker_1.genome.length; k++) {
    if(Math.random() < 0.5) {
      var parent = walker_1;
    } else {
      var parent = walker_2
    }
    var new_gene = JSON.parse(JSON.stringify(parent.genome[k]));
    for(var g in walker_1.genome[k]) {
      if(walker_1.genome[k].hasOwnProperty(g)) {
        if(Math.random() < config.mutation_chance) {
          if(g.indexOf('target') >= 0) {
            new_gene[g] = Math.floor(Math.random() * walker_1.bodies.length);
          } else {
            new_gene[g] = new_gene[g] * (1 + config.mutation_amount*(Math.random()*2 - 1));
          }
        }
      }
    }
    new_genome[k] = new_gene;
  }
  return new_genome;
}
```

## **Explanation:**

1.  **Initialization**:
    *   A new empty array `new_genome` is created to store the genes of the offspring.
2.  **Iterating Over Genes**:
    *   The function loops through each gene in the parent genomes using a `for` loop, ensuring that every gene is considered when making the offspring.
3.  **Parent Gene Selection (Crossover)**:
    *   `if(Math.random() < 0.5) { var parent = walker_1; } else { var parent = walker_2 }`
    *   For each gene, a random number between 0 and 1 is generated. If this value is less than 0.5, the gene is inherited from `walker_1`; otherwise, it's inherited from `walker_2`. This is the core of the "crossover" mechanism, and because this is done for each gene, a mosaic of genes is created for the offspring.
4. **Deep Copying the Gene:**
    *   `var new_gene = JSON.parse(JSON.stringify(parent.genome[k]));`:
    *   The genes inherited from the parent are deep copied to make sure any changes made to the offspring do not modify the parent.
5. **Mutation:**
    *   The code then iterates through each property (`g`) of the selected gene: `for(var g in walker_1.genome[k]) { ... }`.
    *   `if(Math.random() < config.mutation_chance) { ... }`: If a random number less than the `mutation_chance` from the config is generated, then mutation is applied to the gene.
    *   **Target Mutation:** If the gene property includes the string `target`, this variable is set to a random integer between `0` and the total number of bodies.
    *   **Other Mutations**: If the gene property does not include the string `target`, then the value of this property is mutated by a random number between `-1` and `1` which is multiplied by `config.mutation_amount` and added to the existing value.
6.  **Adding to the New Genome:**
    *   `new_genome[k] = new_gene;`: The new gene is added to the new genome at the correct position.
7.  **Returning the New Genome**:
    *   The function returns the new `new_genome` array.

## **Impact of Crossover**

*   **Combining Traits:** Crossover allows the offspring to inherit a mix of traits from both parents, potentially combining beneficial characteristics from both.
*   **Diversity:** By mixing the genomes, the population becomes more diverse, which allows the simulation to continue to explore the fitness landscape over time.

## **Mutation Mechanism**

Mutation introduces random changes into the genome of the offspring, which can introduce completely new traits that may not have existed in the current population, allowing the simulation to try entirely new solutions. Mutation is integrated directly within the `copulate` function. It's applied after the gene has been inherited via the crossover mechanism.

Here's a reminder of the relevant code section:

```javascript
if(Math.random() < config.mutation_chance) {
  if(g.indexOf('target') >= 0) {
    new_gene[g] = Math.floor(Math.random() * walker_1.bodies.length);
  } else {
    new_gene[g] = new_gene[g] * (1 + config.mutation_amount*(Math.random()*2 - 1));
  }
}
```

## **Explanation:**

1.  **Mutation Chance**:
    *   `if(Math.random() < config.mutation_chance) { ... }`: A random number is compared against the `config.mutation_chance` value to determine if a mutation should be applied. The `config.mutation_chance` variable is set via the `select` element labeled as `Gene mutation probability` in the UI. This variable controls the probability of mutation.
2.  **Mutation Application**:
    *   **Target Mutation**:
         *   `if(g.indexOf('target') >= 0) { new_gene[g] = Math.floor(Math.random() * walker_1.bodies.length); }`: If a given gene property contains the string `target`, the numerical value of this property is mutated by setting it to a random integer within the total number of bodies.
    *   **Other Gene Mutation**:
         *   `else { new_gene[g] = new_gene[g] * (1 + config.mutation_amount*(Math.random()*2 - 1)); }`: If the gene property doesn't contain `target`, the mutation is applied to the existing numerical value. The mutation value is calculated by multiplying the old value by `(1 + config.mutation_amount * (a random number between -1 and 1))`, which can have the effect of increasing or decreasing the original value. The `config.mutation_amount` variable is set via the `select` element labeled as `Gene mutation amount` in the UI. This variable controls the amount of mutation applied to each property.

## **Impact of Mutation**

*   **Exploration:** Mutation helps in exploring new regions of the fitness landscape. The mutation process injects randomness into the genome, which allows traits to emerge that might not have been possible through crossover alone. This is important because if the initial population does not start out close to the optimal solution, mutation may be needed to push the solution out of a local optima.
*   **Prevents Stagnation:** It prevents the population from getting stuck in local optima by randomly injecting new traits into the population that may lead to further improvements.
*   **Diversity:** Mutation helps increase diversity within the gene pool, which makes the population more resilient to changes in selection pressure.

## **Combined Impact of Crossover and Mutation**

*   **Balancing Exploration and Exploitation**: Crossover combines the existing traits, while mutation introduces new ones. This balance is critical for a genetic algorithm to efficiently find an optimal solution.
*   **Adaptive Evolution**: Through these processes, the population is able to adapt over time, as the advantageous characteristics become more prevalent while the others are phased out.
*   **Customizable**: The user can control the frequency and severity of mutation via the UI by modifying the `Gene mutation probability` and `Gene mutation amount` parameters. These parameters can be changed dynamically, and as such the user can observe how different amounts of mutation affect the populations evolution.

## **Summary**

*   **Crossover (Copulation)**: Combines genetic material from two parents to create offspring, creating a mosaic of traits from different parts of the population.
*   **Mutation**: Introduces random changes into the genome, adding diversity to the population and helps prevent getting stuck in a local optima.
*   **Interaction**: The interaction of these two mechanisms causes the population to explore the space of possible solutions while retaining the desirable traits of the current population, resulting in a population that is better suited to the environment over time.
*   **Tuning**: The strength of mutation is controlled by configuration variables that can be modified by the user, providing control over the evolutionary process.

These reproduction and mutation mechanisms are essential for the genetic algorithm to work effectively and are key to the emergence of walking behaviors. They ensure that the population continues to evolve and adapt towards the set fitness criteria.

# Chapter 3: Code Documentation

This chapter provides a detailed breakdown of each file within the project, covering its purpose, relevant elements or code structures, and significant logic.

## HTML Files

### File Name: index.html

**File Description:**
The primary HTML file for the project that defines the structure of the web application, including the canvas for drawing and all other user interface elements. It also contains embedded JavaScript to initialize the simulation and handle Google Analytics tracking.

**HTML Elements:**
*   `<canvas id="main_screen">`: The main canvas element for rendering the simulation.
*   `<h1>`, `<h2>`, `<h3>`: Elements used for displaying titles and subtitles.
*   `<div id="main_holder">`: The main container for all elements.
*   `<div id="generation_timer">` / `<div id="generation_timer_bar">`: Used to display the simulation progress.
*   `<div id="info">`, `<div id="controls">`, `<div id="about">`: Used to structure different information panels.
*   `<table>`: Used to display data related to the current generation and record history.
*   `<select>`: Used to provide controls for modifying the simulation parameters.
*   `<script>`: Used to link external javascript files, and contain the initialization functions and Google Analytics tracking.
*   `<img>`: Used as a placeholder for a screenshot image.

**CSS Styles:**

See the `walkers.css` section for styling details.

**JavaScript Classes/Functions:**
* **Embedded Script**:
    * `init()`
        * **Parameters**: None
        * **Return Values**: None
        * **Description**: Initializes the simulation by calling `gameInit()` after the page has loaded.
    *   `window.addEventListener("load", init, false);`
        *   **Parameters**:
            *  `"load"` (`String`): The event type to listen for.
            *  `init` (`Function`): The function to be called when the event is triggered.
            * `false` (`Boolean`): The event capturing value, `false` indicates the event will be handled in the bubbling phase.
        *   **Return Values**: None
        *   **Description**: Sets up an event listener that triggers when the page has finished loading, calling the `init()` function.
    * Google Analytics Tracking Code
        * **Parameters**: None
        * **Return Values**: None
        * **Description**: This code is used to send site visit data to Google analytics, which can be used to track and review site usage.

## CSS Files

### File Name: walkers.css

**File Description:**
This file provides the CSS styles for the HTML elements used in the `index.html` file.

**CSS Selectors and Rules:**
*   `*`: Resets default browser styling.
*   `body`, `h1`, `h2`, `h3`, `select`: Styles for base HTML elements.
*   `#main_holder`: Container for the main content.
*   `#main_screen`: Styles for the canvas element.
*   `#info`: Container for info panels.
*   `.name_list_table`: Styles for the tables used to display data.
*    `.name_list_table .elite_name` Styles for table row items of elite members
*   `#generation_timer`, `#generation_timer_bar`: Styles for the simulation progress bar.
*   `#hidden_ss`: Hides the placeholder screenshot image.

## JavaScript Files

### File Name: game.js

**File Description:**
This file contains the core logic of the simulation, including the genetic algorithm, the Box2D physics simulation, and the overall simulation control flow.

**Classes:**
*   None

**Functions:**

*   `gameInit()`
    *   **Parameters:** None
    *   **Return Values:** None
    *   **Description:** Initializes the entire simulation environment. Sets up the interface using `interfaceSetup()` from `interface.js`, creates a new `b2.World`, creates the initial `walkers` population using `createPopulation()`, creates the `floor` with `createFloor()`, initializes the canvas with `drawInit()`, and starts the simulation loop using `setInterval`.
    *   **Usage:** Called once at the beginning of the simulation in the `init()` function of the embedded script from `index.html`.

*   `simulationStep()`
    *   **Parameters:** None
    *   **Return Values:** None
    *   **Description:** Executes one step of the physics simulation and manages the evolution. Advances the Box2D physics simulation by calling `world.Step()`. Clears the Box2D forces with `world.ClearForces()`. Updates the population of walkers by calling `populationSimulationStep()`. Increments the step counter. Updates the timer bar on the screen. Advances to the next generation if the step count reaches the `config.round_length`.
    *   **Usage:** Called continuously by the `simulation_interval`.

*   `setSimulationFps(fps)`
    *   **Parameters:**
        *   `fps` (`Number`): The desired frames per second for the simulation.
    *   **Return Values:** None
    *   **Description:** Sets the simulation frames per second and controls the simulation loop. Clears the existing `simulation_interval`. If `fps` is greater than 0, sets a new `simulation_interval` using `setInterval`. Also, clears and starts `draw_interval` as needed, setting the paused flag and handling drawing updates accordingly.
    *   **Usage**: Called when the simulation speed drop down element is changed by the user.

*   `createPopulation(genomes)`
    *   **Parameters:**
        *   `genomes` (`Array`, optional): An array of genomes to use for creating the walkers. If no genomes are given, random genomes are created.
    *   **Return Values:** `Array`: An array of newly created `Walker` objects.
    *   **Description:** Creates a new population of `Walker` objects. Increments the generation count, updates the displayed generation on the screen. Creates a new array of `Walker` objects using a `for` loop, each of which receives an individual genome and sets the `is_elite` property for the first few walkers.
    *   **Usage:** Called during `gameInit()` to create an initial population, and during `nextGeneration()` to create a new generation.

*   `populationSimulationStep()`
    *   **Parameters:** None
    *   **Return Values:** None
    *   **Description:** Updates all walkers in the simulation for a single step. Iterates through all walkers, calls `simulationStep()` on each walker if they are still alive. If they die, their Box2D bodies are destroyed, and they are marked as dead. Calls `printNames()` to update the names on the screen. Checks if all walkers are dead and calls `nextGeneration()` if so.
    *   **Usage:** Called from `simulationStep()` each simulation step.

*   `nextGeneration()`
    *   **Parameters:** None
    *   **Return Values**: None
    *   **Description:** Manages the transition to the next generation of walkers. Clears any existing simulation and draw intervals, gets configuration values via the `getInterfaceValues()` function, calls `createNewGenerationGenomes()` to prepare new genomes, calls `killGeneration()` to clean up the old generation, creates the new population with `createPopulation()`, resets the camera using `resetCamera()`, resets the step counter, and starts new simulation and draw intervals.
    *   **Usage:** Called when the step counter reaches `config.round_length`, or if all walkers are dead during the current generation.

*   `killGeneration()`
    *   **Parameters:** None
    *   **Return Values:** None
    *   **Description:** Destroys the Box2D bodies of the current generation of walkers. Iterates through the current population, destroying each Box2D body associated with the walkers.
    *   **Usage:** Called by `nextGeneration()` at the beginning of a new generation.

*   `createNewGenerationGenomes()`
    *   **Parameters:** None
    *   **Return Values:** `Array`: An array of newly generated genomes.
    *   **Description:** Creates a new array of genomes for the next generation of walkers. Sorts the current population of walkers by their fitness score. Checks to see if a new record score has been made by checking against `globals.last_record` and updates the screen using the `printChampion()` function. Creates a new array of genomes. Adds the genomes from the elite walkers of the current generation. Adds newly created genomes by calling `copulate()`, and returns an array of genomes for the next generation.
    *   **Usage:** Called from `nextGeneration()` to generate the genomes for the next generation.

*   `pickParents()`
     *   **Parameters:** None
     *   **Return Values:** `Array` or `false`: Returns the array containing the indexes of the selected parents or returns `false` if two parents weren't selected.
     *   **Description:** Selects two parent walkers from the current population to create a new genome by reproduction, with the fittest walkers having a greater chance of being selected. Iterates through all of the walkers, and if a random number less than a probability dependent on the walker's index is generated, that walker is selected as a parent. If two parents have been selected, then it returns an array containing the indexes of the parent walkers.
     *   **Usage:** Called from `createNewGenerationGenomes()` to get parents for creating offspring.

*   `copulate(walker_1, walker_2)`
    *   **Parameters:**
        *   `walker_1` (`Walker`): The first parent `Walker` object.
        *   `walker_2` (`Walker`): The second parent `Walker` object.
    *   **Return Values:** `Array`: Returns a new genome created by combining the genomes of `walker_1` and `walker_2`.
    *   **Description:** Creates a new genome by combining the genomes of two parent walkers and introducing mutation. Creates a new array representing the new genome. Iterates over each gene in the parent genomes, randomly choosing to inherit from `walker_1` or `walker_2`. The values of each gene have a chance of being mutated according to the probability set in `config.mutation_chance`, and with an amount according to the `config.mutation_amount` parameter. Mutated `target` genes will result in a random new integer within the total number of bodies.
    *   **Usage:** Called from `createNewGenerationGenomes()` to create offspring for the next generation.

*   `mutateClones(genomes)`
    *   **Parameters:**
         *   `genomes` (`Array`): An array of genomes to mutate.
    *   **Return Values:** `Array`: Returns an array of possibly modified genomes.
    *   **Description:** Mutates the cloned genomes in the next generation, to introduce more variety in the population. Checks that `mutation_chance` is set to a value other than `0`, if it is, then it will compare each genome to all other genomes in the array. If the stringified genomes are identical, it will select a random gene to mutate by calling a random number, and then mutating a random property within the gene, but only properties that do not contain `target` in the property name.
   *   **Usage:** Called from `createNewGenerationGenomes()` to provide more diversity in the new population.

*  `getInterfaceValues()`
   *   **Parameters:** None
   *   **Return Values:** None
   *   **Description:** Retrieves the selected values from the simulation control elements on the webpage. Retreives the selected values from the HTML `select` elements, sets these values in the global `config` object.
   *   **Usage**: Called at the beginning of every new generation in the `nextGeneration()` function.

### File Name: interface.js

**File Description:**
This file manages the user interface interactions, including displaying data, updating records, and setting random quotes.

**Classes:**
*   None

**Functions:**

*   `printNames(walkers)`
    *   **Parameters:**
        *   `walkers` (`Array`): An array of `Walker` objects.
    *   **Return Values:** None
    *   **Description:** Updates the name list table on the webpage with the names and scores of the current walkers. Clears the existing content from the `name_list` table. Iterates through the array of `walkers`. For each walker, creates a new `<tr>` element containing the walker's name and score. Appends each row to the `name_list` table. Adds an `elite_name` class if the walker is marked as elite.
    *   **Usage:** Called in the `populationSimulationStep()` of `game.js` each simulation step.

*   `printChampion(walker)`
    *   **Parameters:**
        *   `walker` (`Walker`): The champion `Walker` object.
    *   **Return Values:** None
    *   **Description:** Adds a new record to the champion history table, if it is a new record. Retrieves the `champ_list` table element. If the table has `config.population_size` or more records, the oldest record is removed. Creates a new `<tr>` element with a generation number, name, and score for the new record. Appends the new record to the table.
    *   **Usage:** Called in the `createNewGenerationGenomes()` in `game.js` if there is a new record.

*   `updateGeneration(number)`
    *   **Parameters:**
        *   `number` (`Number`): The current generation number.
    *   **Return Values:** None
    *   **Description:** Updates the current generation number displayed on the page. Sets the HTML content of the `gen_number` element to the specified `number`.
    *   **Usage:** Called at the beginning of every new generation in the `createPopulation()` function of `game.js`.

*   `setQuote()`
    *   **Parameters:** None
    *   **Return Values:** None
    *   **Description:** Sets a random quote on the page. Randomly selects a quote from the `quotes` array and sets the text content of the `page_quote` element.
    *   **Usage:** Called at the beginning of each new generation in the `createPopulation()` function of `game.js`.

*   `interfaceSetup()`
    *   **Parameters:** None
    *   **Return Values:** None
    *   **Description:** Initializes the user interface elements by setting up event listeners and updating their values according to the `config` object. Initializes all the HTML `select` elements. Selects the correct value from each dropdown based on the values set in the `config` object. Adds event listeners to the `motor_noise`, `round_length`, `draw_fps`, and `simulation_fps` dropdown elements to update the `config` when a new value has been selected.
    *   **Usage:** Called from `gameInit()` once at the start of the simulation.

### File Name: floor.js

**File Description:**
This file is responsible for creating the static floor object in the Box2D world.

**Classes:**
*   None

**Functions:**

*   `createFloor()`
    *   **Parameters:** None
    *   **Return Values:** `b2.Body`
    *   **Description:** Creates the static floor object in the Box2D world. Creates a new Box2D `BodyDef` and `Body` object for the floor. Creates a new `FixtureDef`, sets the friction, and creates a chain shape using `b2.ChainShape()` and `CreateChain()` by iterating over the total number of tiles set in `config.max_floor_tiles`. Returns the new Box2D `Body` object for the floor.
    *   **Usage:** Called from `gameInit()` once at the beginning of the simulation to create the floor.

### File Name: walker.js

**File Description:**
This file defines the `Walker` class, which represents the walking agents in the simulation.

**Classes:**

*   `Walker`
    *   **Description:** Represents a walking agent in the simulation, including its structure, physical properties, and behavior.

**Functions:**

*   `Walker(world, genome)`
    *   **Parameters:**
        *   `world` (`b2.World`): The Box2D world in which the walker will exist.
        *   `genome` (`Array`, optional): An array of genes to use as the starting genome for the walker. If not provided, a random genome will be created.
    *   **Return Values:** None
    *   **Description:** Constructor for the `Walker` class. Sets the walkers properties such as `density`, `max_distance`, `health`, `score`, `low_foot_height`, `head_height`, `steps`, creates default body definitions, fixture definitions, and shape properties. Creates the torso, leg, arm, and head parts. Connects the parts together via joints. Calls the `getBodies()` function to get all of the Box2D bodies. If a genome is given, sets the walkers genome, otherwise the walker is given a random genome by calling `createGenome()`, and calls `makeName()` to generate a name based on the walkers genome.
    *   **Usage:** Called in `createPopulation()` in `game.js` for every new walker created.

*   `Walker.prototype.createTorso()`
    *   **Parameters:** None
    *   **Return Values:** `Object`: An object containing the `b2.Body` objects `upper_torso` and `lower_torso`
    *   **Description:** Creates the upper and lower torso bodies for the walker. Creates two `b2.Body` objects for the upper and lower torso. Sets a fixture of the correct shape, and creates a joint between the two using `b2.RevoluteJointDef`. Returns the upper and lower torso in an object.
    *   **Usage:** Called during the initialization of the `Walker` object in the constructor.

*   `Walker.prototype.createLeg()`
    *   **Parameters:** None
    *   **Return Values:** `Object`: An object containing the `b2.Body` objects `upper_leg`, `lower_leg`, and `foot`.
    *   **Description:** Creates the upper leg, lower leg, and foot for a single leg on the walker. Creates three `b2.Body` objects for the upper leg, lower leg, and foot. Sets a fixture of the correct shape. Creates joints between the upper leg and lower leg, and the lower leg and the foot, all of the joints use `b2.RevoluteJointDef`. Returns the new bodies in an object.
    *   **Usage:** Called during the initialization of the `Walker` object in the constructor.

*  `Walker.prototype.createArm()`
    *   **Parameters:** None
    *   **Return Values:** `Object`: An object containing the `b2.Body` objects `upper_arm` and `lower_arm`
    *   **Description:** Creates the upper arm and lower arm for a single arm on the walker. Creates two `b2.Body` objects for the upper and lower arm. Sets a fixture of the correct shape. Creates a joint between the upper arm and lower arm using `b2.RevoluteJointDef`. Returns the new bodies in an object.
    *   **Usage:** Called during the initialization of the `Walker` object in the constructor.

*   `Walker.prototype.createHead()`
    *   **Parameters:** None
    *   **Return Values:** `Object`: An object containing the `b2.Body` objects `head` and `neck`.
    *   **Description:** Creates the head and neck for the walker. Creates two `b2.Body` objects for the neck and head. Sets a fixture of the correct shape. Creates a joint between the head and neck using `b2.RevoluteJointDef`. Returns the new bodies in an object.
    *   **Usage:** Called during the initialization of the `Walker` object in the constructor.

*  `Walker.prototype.connectParts()`
    *   **Parameters:** None
    *   **Return Values:** None
    *   **Description:** Connects all the body parts of the walker to create the complete structure. Connects the head to the torso using `b2.WeldJointDef`. Connects the arms to the torso using two `b2.RevoluteJointDef` objects, connects the legs to the torso using two `b2.RevoluteJointDef` objects. All joints are added to the `joints` property of the `Walker` class.
    *   **Usage:** Called during the initialization of the `Walker` object in the constructor.

*   `Walker.prototype.getBodies()`
    *   **Parameters:** None
    *   **Return Values:** `Array`: An array of all the `b2.Body` objects in the walker.
    *   **Description:** Returns an array containing all the Box2D bodies that make up the walker. Returns the body objects from all of the `head`, `torso`, `left_arm`, `right_arm`, `left_leg`, and `right_leg` properties of the `Walker` class in a single array.
    *   **Usage:** Called during the initialization of the `Walker` object in the constructor.

*   `Walker.prototype.createGenome(joints, bodies)`
    *   **Parameters:**
         *   `joints` (`array`): An array of `b2.Joint` objects used in this walker.
         *   `bodies` (`array`): An array of `b2.Body` objects used in this walker.
    *   **Return Values:** `Array`: An array of `gene` objects representing the genome of the walker.
    *   **Description:** Creates a new random genome for the walker. Creates a random genome, which is an array of `gene` objects. Each gene object has properties relating to joint movement. Returns the new genome array.
    *   **Usage:** Called during the initialization of the `Walker` object in the constructor, if a genome isn't given.

*   `Walker.prototype.simulationStep(motor_noise)`
    *   **Parameters:**
        *   `motor_noise` (`Number`): A value to control the amount of motor noise to apply to the joint motors.
    *   **Return Values:** None
    *   **Description:** Updates the motor speeds of the joints and updates the walker's fitness. Iterates over all the joints and sets their motor speed by combining a cosine function and properties from the walker's genome. Adds motor noise to each of the values used to calculate the motor speed to introduce more variation in the joint movement. Updates the walkers fitness by considering position, steps, and distance traveled. Updates the walkers health, by reducing the health and setting it to zero if the walker is not upright.
    *   **Usage:** Called from `populationSimulationStep()` in `game.js` every simulation step, when the walker is alive.

*   `Walker.prototype.makeName(genome)`
    *   **Parameters:**
        *  `genome` (`Array`): The array of genes that will determine the walkers name.
    *   **Return Values:** `String`: A newly created string based on the given `genome`.
    *   **Description:** Creates a string based on the `genome` of the walker. Iterates over each gene and calculates a sum of all the numerical properties, then chooses a letter based on whether its an even or odd index in the array. If it's an even index, a consonant is selected from the ascii character set, otherwise a vowel is selected from a limited array. A space is inserted at the half way point.
    *   **Usage:** Called during the initialization of the `Walker` object in the constructor, and set to the `name` property of the `Walker`.

### File Name: draw.js

**File Description:**
This file handles the drawing of the simulation on the HTML canvas, including all of the rendering functions.

**Classes:**
*   None

**Functions:**

*   `drawInit()`
    *   **Parameters:** None
    *   **Return Values:** None
    *   **Description:** Initializes the canvas for rendering the simulation. Gets the canvas element and its 2D rendering context, and resets the camera by calling the `resetCamera()` function.
    *   **Usage:** Called in `gameInit()` at the start of the simulation.

*   `resetCamera()`
    *   **Parameters:** None
    *   **Return Values:** None
    *   **Description:** Sets the initial zoom, translation, and y offset of the camera. Sets `globals.zoom` to the configured `max_zoom_factor`. Also resets the `globals.translate_x` and `globals.translate_y` variables.
    *   **Usage:** Called in `drawInit()` at the start of the simulation, and in `nextGeneration()` of `game.js` at the start of a new generation.

*   `setFps(fps)`
    *   **Parameters:**
        *   `fps` (`Number`): The desired frames per second for the drawing.
    *   **Return Values:** None
    *   **Description:** Sets the drawing frame rate and toggles the drawing interval. Clears any existing `draw_interval`. If `fps` is greater than 0, sets a new `draw_interval` using `setInterval`.
    *   **Usage:** Called when the draw FPS drop down element is modified by the user.

*   `drawFrame()`
    *   **Parameters:** None
    *   **Return Values:** None
    *   **Description:** Draws a single frame of the simulation. Gets the minimum and maximum positions of the walkers, updates zoom based on the new positions, clears the canvas, saves the canvas context, translates the canvas using the variables set earlier, scales the context based on the current zoom, draws the floor, iterates through all walkers and calls the `drawWalker()` function for each one, then restores the canvas context.
    *   **Usage:** Called continuously by the `draw_interval`, unless the drawing has been paused.

*   `drawFloor()`
    *   **Parameters:** None
    *   **Return Values:** None
    *   **Description:** Draws the floor on the canvas. Sets the drawing `strokeStyle` and `lineWidth`, starts a new path on the canvas using `beginPath()`, moves to the first vertex of the floor from the `floor` variable in `globals`, then uses the `lineTo()` to iterate through all of the remaining vertexes of the floor, and finally calls the `stroke()` function to display the floor on the screen.
    *   **Usage:** Called by `drawFrame()` to draw the floor during every draw frame.

*   `drawWalker(walker)`
    *   **Parameters:**
        *   `walker` (`Walker`): The walker object to draw.
    *   **Return Values:** None
    *   **Description:** Draws all the body parts of a given walker on the canvas. Sets the stroke and fill style based on whether a walker is elite or not. Calls the `drawRect()` function for all the parts of a walker, starting with the left side, then the head, torso, and finally the right side.
    *   **Usage:** Called by `drawFrame()` to draw the walkers during every draw frame.

*   `drawRect(body)`
    *   **Parameters:**
        *   `body` (`b2.Body`): The Box2D body to draw.
    *   **Return Values:** None
    *   **Description:** Helper function to draw a rectangle on the canvas from a given Box2D body. Starts a new path, gets the fixture for the body, then gets the shape of the body. Uses a for loop to get the world points of each corner of the shape from the Box2D body and moves the context line to these points before finishing the path and calling the `fill()` and `stroke()` functions.
    *   **Usage:** Called by `drawWalker()` to draw the rectangular body parts during every draw frame.

*   `getMinMaxDistance()`
    *   **Parameters:** None
    *   **Return Values:** `Object`: An object containing the minimum and maximum `x` and `y` coordinates, in the format of `{min_x: number, max_x: number, min_y: number, max_y: number}`.
    *   **Description:** Calculates the minimum and maximum coordinates of all active walkers in the simulation. Loops through all of the walkers and keeps track of the minimum and maximum x and y values, and then returns them all in an object.
    *   **Usage:** Called in `drawFrame()` to calculate the zoom and position of the camera.

*   `getZoom(min_x, max_x, min_y, max_y)`
    *   **Parameters:**
        *   `min_x` (`Number`): The minimum x coordinate of the simulation.
        *   `max_x` (`Number`): The maximum x coordinate of the simulation.
        *   `min_y` (`Number`): The minimum y coordinate of the simulation.
        *   `max_y` (`Number`): The maximum y coordinate of the simulation.
    *   **Return Values:** `Number`: The zoom value calculated based on the parameters.
    *   **Description:** Calculates the appropriate zoom level based on the given coordinates. Calculates the delta x and delta y between the maximum and minimum values given, then calculates the zoom by comparing the horizontal and vertical space needed to fit all of the walkers on screen. Returns the calculated zoom.
    *   **Usage:** Called in `drawFrame()` to calculate the zoom value.
