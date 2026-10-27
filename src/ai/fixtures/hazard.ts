import type { Sector } from "@/core/types";
import type { HazardExtraction } from "@/ai/schemas";

/** Recorded-style responses so voice reporting works in demos and tests without an API key. */
export const HAZARD_FIXTURES: Record<Sector, HazardExtraction> = {
  construction: {
    transcript: "மூன்றாவது மாடியில் சாரம் ஆடுகிறது",
    transcriptEn: "The scaffolding on the third floor is shaking",
    category: "scaffolding",
    severityHint: "high",
    locationHint: "Floor 3",
  },
  hospital: {
    transcript: "वार्ड बी में फर्श गीला है, कोई बोर्ड नहीं लगा",
    transcriptEn: "The floor in Ward B is wet and there is no warning sign",
    category: "slip",
    severityHint: "medium",
    locationHint: "Ward B",
  },
  campus: {
    transcript: "Lab 2 has an open chemical bottle",
    transcriptEn: "Lab 2 has an open chemical bottle",
    category: "chemical_labs",
    severityHint: "medium",
    locationHint: "Lab 2",
  },
  factory: {
    transcript: "Line 4 machine guard is missing",
    transcriptEn: "Line 4 machine guard is missing",
    category: "machinery_guard",
    severityHint: "high",
    locationHint: "Line 4",
  },
};
