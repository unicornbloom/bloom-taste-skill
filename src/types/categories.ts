/**
 * Canonical Category List
 *
 * Single source of truth for category names used across:
 * - Personality analyzer (detectCategories)
 * - CategoryMapper (fallback)
 * - GitHub recommendations (topic mapping)
 * - Recommendation grouping (findBestCategory)
 *
 * Categories represent WHAT the user is interested in (detected from conversation).
 * They are independent of personality type (which represents HOW the user thinks).
 */

export const CANONICAL_CATEGORIES = [
  'AI Tools',
  'Productivity',
  'Wellness',
  'Education',
  'Crypto',
  'Lifestyle',
  'Design',
  'Development',
  'Marketing',
  'Finance',
] as const;

export type CanonicalCategory = (typeof CANONICAL_CATEGORIES)[number];

/**
 * Keyword lists for detecting categories from conversation text.
 * Used by personality-analyzer's detectCategories() and by findBestCategory().
 */
export const CATEGORY_KEYWORDS: Record<CanonicalCategory, string[]> = {
  'AI Tools': ['ai', 'gpt', 'llm', 'machine learning', 'neural', 'model', 'chatbot', 'openai', 'anthropic', 'claude', 'copilot', 'prompt', 'inference', 'transformer', 'agent'],
  'Productivity': ['productivity', 'workflow', 'automation', 'efficiency', 'task management', 'notion', 'calendar', 'time tracking', 'optimize', 'systematic'],
  'Wellness': ['wellness', 'health', 'fitness', 'meditation', 'mindfulness', 'mental health', 'yoga', 'sleep', 'nutrition', 'self-care', 'wellbeing'],
  'Education': ['education', 'learning', 'course', 'teach', 'knowledge', 'tutorial', 'study', 'mentor', 'curriculum', 'workshop', 'training'],
  'Crypto': ['crypto', 'defi', 'web3', 'blockchain', 'token', 'dao', 'nft', 'onchain', 'smart contract', 'wallet', 'protocol', 'ethereum', 'solana', 'base'],
  'Lifestyle': ['lifestyle', 'fashion', 'travel', 'personal brand', 'food', 'photography'],
  'Design': ['design', 'ui', 'ux', 'figma', 'creative', 'visual', 'typography', 'layout', 'prototype'],
  'Development': ['development', 'coding', 'programming', 'software', 'engineering', 'code', 'developer', 'api', 'framework', 'architecture', 'debugging', 'typescript', 'python', 'rust'],
  'Marketing': ['marketing', 'growth', 'seo', 'content strategy', 'advertising', 'brand', 'conversion', 'funnel', 'campaign', 'audience'],
  'Finance': ['finance', 'investing', 'trading', 'portfolio', 'wealth', 'stock', 'market', 'budget', 'revenue'],
};

/**
 * GitHub search topics for each canonical category.
 * Used by GitHubRecommendations to build search queries.
 */
export const CATEGORY_GITHUB_TOPICS: Record<CanonicalCategory, string[]> = {
  'AI Tools': ['ai', 'artificial-intelligence', 'machine-learning', 'llm', 'chatgpt', 'gpt'],
  'Productivity': ['productivity', 'automation', 'workflow', 'tools', 'utilities'],
  'Wellness': ['health', 'fitness', 'wellness', 'meditation', 'mindfulness', 'mental-health'],
  'Education': ['education', 'learning', 'tutorial', 'course', 'teaching'],
  'Crypto': ['blockchain', 'web3', 'crypto', 'ethereum', 'solana', 'defi', 'smart-contracts'],
  'Lifestyle': ['lifestyle', 'travel', 'food', 'photography', 'personal'],
  'Design': ['design', 'ui', 'ux', 'figma', 'design-tools', 'creative'],
  'Development': ['developer-tools', 'devtools', 'cli', 'sdk', 'library', 'framework'],
  'Marketing': ['marketing', 'seo', 'analytics', 'growth', 'content'],
  'Finance': ['finance', 'fintech', 'trading', 'investing', 'budgeting'],
};

/**
 * Default fallback categories when conversation analysis detects nothing.
 * These are the broadest, most universally populated categories across all sources.
 */
export const DEFAULT_FALLBACK_CATEGORIES: CanonicalCategory[] = [
  'AI Tools',
  'Development',
  'Productivity',
];
