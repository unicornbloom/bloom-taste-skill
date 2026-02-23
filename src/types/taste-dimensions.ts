/**
 * Taste Spectrum Dimensions
 *
 * 3 continuous spectrums (0-100) that capture HOW users operate:
 *   learning: try-first (0) <-> study-first (100)
 *   energy:   solo (0) <-> social (100)
 *   growth:   curiosity-driven (0) <-> goal-driven (100)
 */

export interface TasteSpectrums {
  learning: number; // 0 = try-first, 100 = study-first
  energy: number;   // 0 = solo, 100 = social
  growth: number;   // 0 = curiosity-driven, 100 = goal-driven
}

export interface DetectedStrengths {
  strengths: string[];
  confidence: number; // 0-100
}

// ─── Keyword sets for spectrum detection ─────────────────────────────────

export const LEARNING_TRY_FIRST_KEYWORDS = [
  'try', 'build', 'ship', 'prototype', 'hack', 'just do it',
  'hands-on', 'learn by doing', 'trial', 'tinker', 'iterate',
  'mvp', 'quick start', 'jump in', 'figure it out',
];

export const LEARNING_STUDY_FIRST_KEYWORDS = [
  'research', 'study', 'understand', 'read', 'analyze',
  'theory', 'documentation', 'whitepaper', 'deep dive', 'literature',
  'systematic', 'methodology', 'framework', 'fundamentals', 'principles',
];

export const ENERGY_SOLO_KEYWORDS = [
  'alone', 'solo', 'quiet', 'independent', 'focus',
  'autonomous', 'self-directed', 'introvert', 'deep work', 'hermit',
  'personal', 'private', 'individual', 'by myself', 'solitary',
];

export const ENERGY_SOCIAL_KEYWORDS = [
  'team', 'community', 'together', 'discuss', 'collaborate',
  'group', 'social', 'meetup', 'pair', 'collective',
  'network', 'conference', 'brainstorm', 'co-create', 'open source',
];

export const GROWTH_CURIOSITY_KEYWORDS = [
  'curious', 'wonder', 'explore', 'interesting', 'fun',
  'play', 'experiment', 'rabbit hole', 'fascinate', 'what if',
  'discover', 'surprise', 'serendipity', 'stumble', 'wander',
];

export const GROWTH_GOAL_KEYWORDS = [
  'goal', 'achieve', 'target', 'milestone', 'ship',
  'deadline', 'kpi', 'metric', 'outcome', 'result',
  'roadmap', 'plan', 'objective', 'deliver', 'roi',
];

// ─── Strength detection patterns ─────────────────────────────────────────

export const STRENGTH_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /i (?:built|created|made|developed|wrote)\s+(?:a |an |the )?(\w[\w\s]{2,20})/i, label: 'Builder' },
  { pattern: /i (?:taught|mentored|coached|trained|helped others)/i, label: 'Teacher' },
  { pattern: /i (?:designed|prototyped|wireframed|styled)/i, label: 'Designer' },
  { pattern: /i (?:analyzed|researched|studied|investigated)/i, label: 'Analyst' },
  { pattern: /i (?:organized|managed|coordinated|led|facilitated)/i, label: 'Organizer' },
  { pattern: /i (?:wrote|published|blogged|documented|authored)/i, label: 'Writer' },
  { pattern: /i (?:automated|optimized|streamlined|improved)/i, label: 'Optimizer' },
  { pattern: /i (?:founded|started|launched|bootstrapped|co-founded)/i, label: 'Founder' },
  { pattern: /(?:open[- ]?source|contributor|maintainer|pull request)/i, label: 'Open Source Contributor' },
  { pattern: /(?:community|moderator|ambassador|advocate)/i, label: 'Community Builder' },
];
