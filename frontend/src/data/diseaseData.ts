export interface DiseaseStage {
  stage: number;
  hoehnYahr: string;
  title: string;
  description: string;
  dopamineLevel: number; // 0-100, illustrative only
  motorSymptoms: string[];
  nonMotorSymptoms: string[];
}

export const diseaseStages: DiseaseStage[] = [
  {
    stage: 1,
    hoehnYahr: "Stage I",
    title: "Early & one-sided",
    description:
      "Symptoms appear on only one side of the body and are often mild enough to go unnoticed by others. Many people continue daily routines without major changes.",
    dopamineLevel: 85,
    motorSymptoms: ["Slight tremor in one hand", "Subtle changes in posture or walk"],
    nonMotorSymptoms: ["Reduced sense of smell", "Mild fatigue", "Sleep changes"],
  },
  {
    stage: 2,
    hoehnYahr: "Stage II",
    title: "Both sides affected",
    description:
      "Symptoms now appear on both sides of the body. Tasks take longer, but balance is usually still intact and independence is largely preserved.",
    dopamineLevel: 65,
    motorSymptoms: ["Tremor and stiffness on both sides", "Slower movements", "Facial expression less animated"],
    nonMotorSymptoms: ["Soft or quiet voice", "Mild mood changes", "Difficulty with handwriting"],
  },
  {
    stage: 3,
    hoehnYahr: "Stage III",
    title: "Balance involvement",
    description:
      "Loss of balance becomes noticeable, with slower reflexes. Falls become more common, though most people are still independent for most tasks.",
    dopamineLevel: 45,
    motorSymptoms: ["Balance and coordination problems", "Falls", "Noticeably slower movement"],
    nonMotorSymptoms: ["Sleep disruption", "Mild cognitive changes", "Lightheadedness on standing"],
  },
  {
    stage: 4,
    hoehnYahr: "Stage IV",
    title: "Severe symptoms",
    description:
      "Symptoms are severe and limiting. Standing or walking unassisted becomes difficult, and most people need help with some daily activities.",
    dopamineLevel: 25,
    motorSymptoms: ["Significant rigidity and slowness", "Requires walking aid", "Unable to live alone safely"],
    nonMotorSymptoms: ["More pronounced cognitive changes", "Mood and sleep difficulties intensify"],
  },
  {
    stage: 5,
    hoehnYahr: "Stage V",
    title: "Advanced stage",
    description:
      "The most advanced stage. Stiffness in the legs may make standing or walking impossible without assistance, and round-the-clock care is typically needed.",
    dopamineLevel: 10,
    motorSymptoms: ["Unable to stand or walk unaided", "Requires wheelchair or bed rest", "Needs full-time care"],
    nonMotorSymptoms: ["Possible hallucinations or delusions in some cases", "Significant cognitive involvement"],
  },
];

export interface TreatmentOption {
  id: string;
  name: string;
  category: "medication" | "procedure" | "therapy";
  summary: string;
  howItWorks: string;
  considerations: string[];
}

export const treatments: TreatmentOption[] = [
  {
    id: "levodopa",
    name: "Levodopa / Carbidopa",
    category: "medication",
    summary: "The most common and effective Parkinson's medication, often the first prescribed.",
    howItWorks:
      "Levodopa converts into dopamine in the brain, topping up the supply that Parkinson's depletes. Carbidopa is paired with it to stop it breaking down before it reaches the brain.",
    considerations: [
      "Effectiveness can fluctuate as the disease progresses ('wearing-off')",
      "May cause nausea or involuntary movements (dyskinesia) over time",
      "Timing around meals can affect absorption",
    ],
  },
  {
    id: "dopamine-agonists",
    name: "Dopamine agonists",
    category: "medication",
    summary: "Medications that mimic dopamine's effects directly on brain receptors.",
    howItWorks:
      "Rather than being converted into dopamine, these compounds bind to the same receptors dopamine would, tricking the brain into a similar response.",
    considerations: [
      "Often used in earlier stages or alongside levodopa",
      "Can cause impulse-control changes in rare cases",
      "Tends to be less potent than levodopa",
    ],
  },
  {
    id: "dbs",
    name: "Deep Brain Stimulation (DBS)",
    category: "procedure",
    summary: "A surgically implanted device that sends electrical pulses to specific brain regions.",
    howItWorks:
      "Thin electrodes are placed in targeted brain areas involved in movement control. A pacemaker-like device delivers gentle electrical pulses that help regulate abnormal signals causing tremor and stiffness.",
    considerations: [
      "Usually considered when medication effectiveness declines",
      "Requires a surgical procedure and ongoing device adjustments",
      "Can significantly reduce tremor and medication needs for suitable candidates",
    ],
  },
  {
    id: "physical-therapy",
    name: "Physical & speech therapy",
    category: "therapy",
    summary: "Targeted exercise and voice training to maintain mobility and communication.",
    howItWorks:
      "Structured movement programs help maintain flexibility, balance, and gait. Speech therapy techniques (like LSVT LOUD) train vocal loudness and clarity, directly addressing the voice changes Parkinson's causes.",
    considerations: [
      "Most effective when started early and done consistently",
      "Complements medication rather than replacing it",
      "Group classes (boxing, dance, tai chi) show promising engagement and outcomes",
    ],
  },
];

export const voiceBiomarkers = [
  {
    code: "MDVP:Fo(Hz)",
    name: "Average vocal pitch",
    plain: "The average pitch of the voice during a sustained 'ahh' sound.",
  },
  {
    code: "Jitter",
    name: "Pitch instability",
    plain: "How much the pitch wavers from cycle to cycle — Parkinson's can make this less steady.",
  },
  {
    code: "Shimmer",
    name: "Loudness instability",
    plain: "How much the loudness flickers within the same sustained sound.",
  },
  {
    code: "HNR",
    name: "Harmonics-to-noise ratio",
    plain: "How 'clean' versus breathy or noisy the voice sounds.",
  },
  {
    code: "PPE",
    name: "Pitch period entropy",
    plain: "A measure of how unpredictable the pitch pattern is — often the single most informative signal in this kind of model.",
  },
  {
    code: "spread1 / spread2",
    name: "Nonlinear pitch variation",
    plain: "Mathematical measures of how the voice's pitch deviates in complex, non-obvious patterns.",
  },
];
