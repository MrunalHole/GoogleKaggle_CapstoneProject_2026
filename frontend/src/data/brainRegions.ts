export interface BrainRegion {
  id: string;
  name: string;
  position: [number, number, number];
  color: string;
  description: string;
  role: string;
  parkinsonsRelevance: string;
}

/**
 * Simplified, illustrative anatomical layout — not to clinical scale.
 * Positions are tuned for visual clarity on a stylized procedural mesh,
 * not derived from MRI data.
 */
export const brainRegions: BrainRegion[] = [
  {
    id: "substantia-nigra",
    name: "Substantia Nigra",
    position: [0, -0.35, 0.15],
    color: "#f0a2a1",
    role: "A small structure deep in the midbrain that produces dopamine.",
    description:
      "Named for its dark pigmentation, this is the region most directly affected by Parkinson's disease.",
    parkinsonsRelevance:
      "Parkinson's is caused by the progressive loss of dopamine-producing neurons here. By the time motor symptoms appear, an estimated 60–80% of these cells may already be lost.",
  },
  {
    id: "basal-ganglia",
    name: "Basal Ganglia",
    position: [0.45, -0.1, 0.1],
    color: "#e88988",
    role: "A group of structures that fine-tune movement and help initiate voluntary actions.",
    description:
      "Works closely with the substantia nigra to smooth out and coordinate movement signals before they reach the muscles.",
    parkinsonsRelevance:
      "Reduced dopamine disrupts the basal ganglia's normal circuitry, producing the slowness (bradykinesia) and rigidity characteristic of Parkinson's.",
  },
  {
    id: "motor-cortex",
    name: "Motor Cortex",
    position: [0, 0.55, 0.35],
    color: "#c97675",
    role: "The outer brain layer responsible for planning and executing voluntary movement.",
    description:
      "Sends movement commands down through the brain and spinal cord to the muscles.",
    parkinsonsRelevance:
      "Without properly regulated input from the basal ganglia, motor cortex signals become less smooth, contributing to tremor and reduced movement amplitude.",
  },
  {
    id: "cerebellum",
    name: "Cerebellum",
    position: [0, -0.55, -0.45],
    color: "#d9924f",
    role: "Located at the back of the brain, it fine-tunes balance, coordination, and timing of movement.",
    description:
      "Often called the brain's 'movement calibrator' — it doesn't initiate movement but refines it.",
    parkinsonsRelevance:
      "While not primarily damaged by Parkinson's, the cerebellum can show compensatory activity changes as it tries to offset basal ganglia dysfunction.",
  },
  {
    id: "limbic-system",
    name: "Limbic System",
    position: [0.3, 0.0, -0.25],
    color: "#7ea787",
    role: "A network of structures involved in emotion, motivation, and memory.",
    description:
      "Includes structures like the amygdala and hippocampus, situated deep within the temporal regions.",
    parkinsonsRelevance:
      "Dopamine pathways here are linked to the mood changes, apathy, and motivation shifts that many people with Parkinson's experience — non-motor symptoms that are just as real as tremor.",
  },
];
