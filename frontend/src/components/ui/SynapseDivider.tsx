interface SynapseDividerProps {
  /** When true, nodes fade and connections break — used when transitioning
   * into content about disease progression / neuron loss. */
  fading?: boolean;
}

/**
 * The page's signature visual motif: a line of connected nodes,
 * standing in for a chain of neurons. On most dividers it reads as a
 * calm, intact signal. Where progression/degeneration content begins,
 * `fading` renders the same motif with broken connections and dimmed
 * nodes — a literal depiction of the synaptic loss the content
 * describes, rather than a decorative flourish.
 */
export default function SynapseDivider({ fading = false }: SynapseDividerProps) {
  const nodeX = [40, 140, 240, 340, 440, 540, 640, 740, 840, 940, 1040, 1140];
  const baseY = 32;
  const wave = (i: number) => baseY + Math.sin(i * 1.1) * 10;

  return (
    <svg
      className={`synapse-divider ${fading ? "synapse-divider--fading" : ""}`}
      viewBox="0 0 1180 64"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {nodeX.slice(0, -1).map((x, i) => {
        const broken = fading && i % 3 === 1;
        return (
          <path
            key={`seg-${i}`}
            d={`M ${x} ${wave(i)} L ${nodeX[i + 1]} ${wave(i + 1)}`}
            strokeDasharray={broken ? "2 6" : "0"}
            opacity={broken ? 0.35 : 1}
          />
        );
      })}
      {nodeX.map((x, i) => (
        <circle
          key={`node-${i}`}
          cx={x}
          cy={wave(i)}
          r={fading && i % 4 === 0 ? 2 : 3.5}
          opacity={fading ? 1 - (i / nodeX.length) * 0.6 : 1}
        />
      ))}
    </svg>
  );
}
