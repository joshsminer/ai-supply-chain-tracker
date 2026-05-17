import type { Severity } from './types';

export const severityLabel: Record<Severity, string> = {
  critical: 'Critical',
  tight: 'Tight',
  balanced: 'Balanced',
  monitoring: 'Monitoring',
};

export const severityOrder: Record<Severity, number> = {
  critical: 0,
  tight: 1,
  balanced: 2,
  monitoring: 3,
};

export const severityDotClass: Record<Severity, string> = {
  critical: 'bg-severity-critical',
  tight: 'bg-severity-tight',
  balanced: 'bg-severity-balanced',
  monitoring: 'bg-severity-monitoring',
};

export const severityBadgeClass: Record<Severity, string> = {
  critical: 'bg-severity-critical-bg text-severity-critical-fg',
  tight: 'bg-severity-tight-bg text-severity-tight-fg',
  balanced: 'bg-severity-balanced-bg text-severity-balanced-fg',
  monitoring: 'bg-severity-monitoring-bg text-severity-monitoring-fg',
};
