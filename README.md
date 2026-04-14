# Quantum Frontiers

An interactive quantum computing explorer built for [World Quantum Day](https://worldquantumday.org) 2026 (April 14).

**Live site: [jhammant.github.io/WorldQuantumDay](https://jhammant.github.io/WorldQuantumDay/)**

## What is this?

A hands-on introduction to quantum computing for developers and anyone curious about the quantum world. No physics degree required.

The site walks you through quantum concepts with interactive 3D visualizations, from classical bits all the way to real quantum algorithms — with pseudocode, use cases, and links to run actual quantum code.

## Features

### Learn the concepts
- **Bits vs Qubits** — Bridge from classical computing to quantum, with analogies that actually make sense
- **The Qubit** — Interactive 3D Bloch sphere you can drag to rotate, with annotations explaining what each region means
- **Quantum Gates** — Apply H, X, Y, Z, S, T gates and watch the state vector move in real-time, with probability bars and challenges
- **Circuits** — Interactive circuit diagrams you can run to see measurement outcomes and probability distributions
- **Easy Mode** — Toggle simpler explanations using everyday analogies (spinning coins, light switches, noise-canceling headphones)

### See the algorithms
Four interactive visualizations comparing quantum vs classical approaches:

- **Grover's Search** — Race a quantum search against classical brute-force on a visual database grid
- **Shor's Factoring** — Watch quantum waves break an RSA lock while classical trial division bounces off
- **Optimization (QAOA)** — See quantum route-finding converge on the optimal path while classical tries every permutation
- **Quantum Key Distribution (BB84)** — Watch an eavesdropper get caught by quantum physics

Each demo includes a "How it works" button with detailed pseudocode and complexity analysis.

### Take the next step
- Real **Qiskit code** you can copy and run on IBM Quantum hardware — for free
- Links to **IBM Quantum**, **AWS Braket**, **Quantum Country**, and more
- A realistic **quantum timeline** (what's possible now vs 5 years vs 10+ years)

## Tech

- **Three.js** with WebGL and UnrealBloom post-processing
- **OrbitControls** for interactive Bloch sphere rotation
- **WebXR** AR mode for placing the Bloch sphere on real surfaces (mobile)
- Pure ES modules from CDN — no build tools, no bundler, no framework
- Static files only — hosted on GitHub Pages

## Run locally

```bash
git clone https://github.com/jhammant/WorldQuantumDay.git
cd WorldQuantumDay
python3 -m http.server 8080
# Open http://localhost:8080
```

Any static file server works (e.g., `npx serve`, VS Code Live Server).

## Project structure

```text
index.html              # All HTML, CSS, and panel content
js/
  app.js                # Main orchestrator, navigation, UI wiring
  qubit.js              # Pure quantum math (complex amplitudes, gate matrices)
  bloch-sphere.js       # 3D Bloch sphere visualization
  race.js               # Grover's search race visualization
  shors.js              # Shor's factoring lock-breaking visualization
  optimization.js       # QAOA route optimization visualization
  qkd.js                # BB84 quantum key distribution visualization
  particles.js          # Ambient and burst particle systems
  ar.js                 # WebXR AR mode
```

## Why April 14?

4.14 references Planck's constant: approximately 4.14 x 10^-15 eV-s — the fundamental constant governing the quantum world.

## Contributing

Issues and PRs welcome. If you find a bug, have a suggestion, or want to add a new visualization, open an issue.

## License

MIT License — see [LICENSE](LICENSE).
