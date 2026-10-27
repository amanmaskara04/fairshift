// ─── FairShift Hazard Severity Rules ────────────────────────────────
// Certain hazard categories have minimum severity floors.
// An AI hint can raise severity but never lower it below the floor.

import { HazardCategory, HazardSeverity } from './types';

/**
 * Severity levels ordered from lowest to highest.
 */
const SEVERITY_ORDER: HazardSeverity[] = ['low', 'medium', 'high', 'critical'];

function severityIndex(s: HazardSeverity): number {
  return SEVERITY_ORDER.indexOf(s);
}

/**
 * Minimum severity floors for specific hazard categories.
 * Categories not listed here have no floor (default to 'low').
 */
const SEVERITY_FLOORS: Partial<Record<HazardCategory, HazardSeverity>> = {
  // Never below 'high'
  fall_from_height: 'high',
  electrical: 'high',
  needle_stick: 'high',

  // Never below 'medium'
  scaffolding: 'medium',
  chemical_biohazard: 'medium',
  machinery_guard: 'medium',
  fire_exit: 'medium',
};

/**
 * Resolve the effective severity for a hazard report.
 *
 * @param category - The hazard category.
 * @param aiHint - Optional AI-suggested severity. Can raise but not lower below the floor.
 * @returns The resolved severity.
 */
export function resolveSeverity(
  category: HazardCategory,
  aiHint?: HazardSeverity
): HazardSeverity {
  const floor = SEVERITY_FLOORS[category] ?? 'low';

  if (!aiHint) {
    return floor;
  }

  // Return the higher of aiHint and floor
  return severityIndex(aiHint) >= severityIndex(floor) ? aiHint : floor;
}
