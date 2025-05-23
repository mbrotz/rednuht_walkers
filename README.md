# About Genetic Walkers

Welcome to Genetic Walkers! This is an HTML5 browser-based simulation where you can watch 2D bipedal creatures learn to walk through evolution. See how generations of walkers adapt and improve their ability to move, all powered by a physics-based environment (using jsbox2d). This project shows how complex behaviors can arise from simple rules and step-by-step improvements, offering you insights into concepts like genetic algorithms, how to encourage diverse solutions with MAP-Elites, and what makes a "good" walker.

---

## Core Concept: Continuous Genetic Algorithm

Unlike traditional genetic algorithms that work in separate, synchronized generations, Genetic Walkers uses a **continuous evolution** model:

1.  **Active Population:** A set number of walkers are always active in the simulation. Each walker has a unique set of genetic instructions (its genome) that controls its joint motors—things like the power, timing, and rhythm of its movements.
2.  **Simulation and Evaluation:** Walkers try to move across the 2D terrain. How well they do is measured by a fitness score.
3.  **Elimination:** A walker is removed from the active simulation if:
    *   Its head touches the floor.
    *   It's overtaken by an advancing "Pressure Line" (this encourages them to keep moving forward).
    *   It walks off the end of the available floor.
4.  **Archiving and Replacement:** When a walker is eliminated, its performance (its genetic instructions, score, and how it behaved, like its average head height) is recorded and sent to the MAP-Elites archive (more on this below).
5.  **Reproduction:** A new walker is immediately created to take the place of the eliminated one. This new walker's genetic instructions are created by:
    *   Picking a successful parent's genetic instructions from the MAP-Elites archive (via its Gene Pools).
    *   Making small random changes (mutations) to these parent instructions. You can configure the `Mutation Chance` (how likely a gene is to change) and `Mutation Strength` (how much a gene's value can change during mutation) using the controls.
6.  **Constant Iteration:** This cycle of simulation, elimination, saving good performers, and creating new mutated offspring happens constantly for each spot in the population. This means the population is always evolving without clear generational breaks.

---

## Hierarchical Archiving: MAP-Elites and Gene Pools

To help the walkers discover many different and effective ways to walk, the project uses a two-level system for saving the best performers: MAP-Elites at the top, with each MAP-Elites section containing its own Gene Pool.

### 1. MAP-Elites: Archiving Diverse Behavioral Niches

MAP-Elites (Multi-dimensional Archive of Phenotypic Elites) is a technique to find a collection of high-performing solutions across different types of behavior, not just the single best one.

*   **Behavioral Descriptor:** In this simulation, the main way walkers are sorted in MAP-Elites is by their average head height (the average height of their head while they were active, adjusted for their initial size). This encourages the evolution of walkers that hold their heads at different heights (e.g., walking tall, or stooping).
*   **Binning:** The range of possible average head height values (from a set starting point, or threshold, up to the maximum possible) is divided into several distinct bins or categories.
*   **Placement:** When an eliminated walker is processed, it's assigned to one of these MAP-Elites bins based on its "mean head height."
*   **Role:** The MAP-Elites archive makes sure that good walkers are saved across a whole spectrum of head heights. When it's time to create a new walker, a MAP-Elites bin is chosen (often favoring bins that have shown good results), and that bin's internal Gene Pool then picks the specific parent.
*   **Visualization:** The **MAP-Elites display** (the top bar with colored blocks, below the main simulation) shows these bins. The brightness of each bin usually indicates how good the walkers are within its corresponding Gene Pool. You can click a bin to look at its Gene Pool or right-click to temporarily stop that bin from contributing new walkers.

### 2. Gene Pools: Refining Solutions within Niches

Each bin in the MAP-Elites archive has its own `GenePool`. This allows for fine-tuning walkers that already share a similar characteristic (like a similar average head height).

*   **Performance-Based Binning:** Within each Gene Pool, walkers are further organized into bins based on their fitness score. These Gene Pool bins cover a range of scores, typically from a certain percentage of that Gene Pool's best score up to that record score.
*   **Capacity and Replacement:** Each bin in a Gene Pool can only hold a certain number of walkers (its capacity). When a new walker is added to a full Gene Pool bin:
    *   If the new walker's score is better than the worst one currently in that bin, the worst one might be replaced.
    *   Other factors, like how well its head height matches the target for that MAP-Elites bin, or simply how long an entry has been there, can also help decide which walker to replace if scores are close.
*   **Parent Selection:** When a MAP-Elites bin is chosen to provide a parent, its Gene Pool selects the specific parent's genetic instructions. This choice might be random from a good bin or lean towards higher-scoring bins within that Gene Pool.
*   **Mutation Parameters:** Each Gene Pool applies its own settings for how much genes mutate when a parent from it is chosen.
*   **History:** Each Gene Pool keeps its own `History` list of the best walkers it has found for its particular MAP-Elites niche.
*   **Visualization:** When you select a MAP-Elites bin (by clicking on it), the **Gene Pool display** (the bar below the MAP-Elites display) shows the score-based bins of the Gene Pool inside it. The colors can represent these bins, and lines might show average scores or how many walkers are in each bin.

This two-level system allows the simulation to first explore and keep a variety of approaches (different head heights via MAP-Elites) and then improve and perfect solutions within those diverse approaches (different scores via Gene Pools).

---

## Fitness Function: Measuring Success

The primary goal for a walker is to travel as far as possible, and do it efficiently. The fitness `score` is calculated like this:

`score = Maximum torso position * (1.0 + Mean forward velocity)`

Where:
*   `Maximum torso position`: The furthest horizontal distance the walker's torso has traveled from where it started. This directly rewards covering more ground.
*   `Mean forward velocity`: The average forward speed of the walker during its active time. This part acts as a bonus, rewarding walkers that cover the same distance more quickly.

While average head height isn't directly part of this score, it's very important for the MAP-Elites strategy to encourage different walking styles. Simply surviving (not being eliminated) is also an unwritten part of being "fit."

---

## Simulation and Your Interaction

*   **Visualization:** The main **simulation window** shows the walkers, the terrain, and a ruler to mark distance. The camera automatically tries to keep active walkers in view.
*   **Controls:** You can adjust:
    *   `Mutation Chance` and `Mutation Strength` for new walkers.
    *   `Animation Quality` (how many visual updates per second) to balance smooth visuals with how much computer power it uses.
    *   `Simulation Speed` (how many physics calculations happen per second), which lets evolution happen faster if you don't need to see every detail or if you pause the animation.
*   **Information Displays:**
    *   You'll see information like the total number of walkers created.
    *   You can see lists of the walkers currently active in the simulation and the best walkers found so far across all types.
    *   The visual displays for the MAP-Elites archive and the currently selected Gene Pool give you a real-time look at the evolutionary process.
*   **MAP-Elites Interaction:** Clicking on a bin in the MAP-Elites display lets you see the detailed Gene Pool and history for that specific type of walker behavior. Right-clicking a bin turns it on or off, affecting whether it helps create new walkers.

---

## Differences from the Original Genetic Walkers by RedNuht

This version of Genetic Walkers builds upon the fantastic original concept by RedNuht but introduces some key differences, primarily in how evolution and diversity are handled:

*   **Continuous vs. Generational Evolution:** The original project used discrete, timed "generations." All walkers were tested for a set "round length," and then the best performers were used to create an entirely new generation. This version uses a **continuous model**: when one walker is eliminated, it's immediately replaced by a new, mutated offspring from the archive. Evolution is always happening, walker by walker.
*   **MAP-Elites and Gene Pools for Diversity:** The original maintained diversity more implicitly through its generational model and by copying "elite clones." This version explicitly uses **MAP-Elites** to archive walkers based on their "mean head height," ensuring a range of postures are explored. Each MAP-Elites category then has its own **Gene Pool** to further refine solutions within that specific behavioral niche, based on their score. This is a more structured approach to exploring the "solution space."
*   **Fitness Function:** The original fitness function heavily rewarded upright posture and taking "proper steps." This version's fitness is more streamlined, focusing on `Maximum torso position` multiplied by a `Mean forward velocity` bonus. Elimination conditions (like head-floor contact and the "Pressure Line") implicitly penalize poor walking.
*   **User Interface and Controls:** The UI has been redesigned to accommodate the new MAP-Elites and Gene Pool displays. You'll find controls specific to these new systems, and the overall information presented reflects the continuous nature of the evolution.
*   **Code Structure:** The codebase has been significantly refactored and expanded into more specialized modules (like `Population`, `MapElites`, `GenePool`, `Renderer`, `GameLoop`) to manage the increased complexity of the continuous evolution and archiving systems.

Despite these changes, the core spirit of watching quirky bipeds learn to walk remains the same!

---

## Acknowledgements and Original Author

This project is a loving evolution of the original "HTML5 Genetic Algorithm Biped Walkers" created by **RedNuht**. The initial concept, the engaging physics-based biped simulation, and the general charm are all thanks to their foundational work.

If you enjoyed this, you should definitely check out the original at [RedNuht.org](https://rednuht.org/genetic_walkers/)!

The physics engine used is jsbox2d, a JavaScript port of Box2D by Erin Catto, with the port itself often credited to Paril.

---

## Disclaimer

I used Google Gemini 2.5 Pro to help me with the refactoring and some implementation details. It also provided the project description. While i could have implemented everything myself, Gemini made the process much faster.