/**
 * Recommendation Pipeline (Standalone)
 *
 * Extracted from BloomIdentitySkillV2 so the backend can refresh
 * recommendations independently via Bull queue jobs.
 *
 * Sources: GitHub repos (quality-gated) + Claude Code awesome-lists.
 * Deduplicates by URL, groups by user categories, applies personality scoring.
 */

import { ClaudeCodeClient, createClaudeCodeClient } from './integrations/claude-code-client';
import { GitHubRecommendations } from './github-recommendations';
import { PersonalityType } from './types/personality';
import { CATEGORY_KEYWORDS } from './types/categories';

export interface RefreshIdentityInput {
  mainCategories: string[];
  subCategories: string[];
  personalityType: string;
  dimensions?: {
    conviction: number;
    intuition: number;
    contribution: number;
  };
}

export interface SkillRecommendation {
  skillId: string;
  skillName: string;
  description: string;
  url: string;
  categories: string[];
  matchScore: number;
  reason?: string;
  creator?: string;
  creatorUserId?: number | string;
  source?: 'ClaudeCode' | 'GitHub';
  stars?: number;
  language?: string;
  categoryGroup?: string;
}

/**
 * Run the full recommendation pipeline: fetch, score, deduplicate, group.
 * Stateless — creates fresh client instances each call.
 */
export async function refreshRecommendations(
  identity: RefreshIdentityInput,
  options?: { githubToken?: string },
): Promise<SkillRecommendation[]> {
  const claudeCodeClient = createClaudeCodeClient();
  const githubRecommendations = new GitHubRecommendations(options?.githubToken);

  // Adapt to IdentityData shape expected by GitHub client
  const identityData = {
    personalityType: identity.personalityType as PersonalityType,
    customTagline: '',
    customDescription: '',
    mainCategories: identity.mainCategories,
    subCategories: identity.subCategories,
    dimensions: identity.dimensions,
  };

  console.log(`[recommendation-pipeline] Searching for ${identity.personalityType}...`);

  try {
    // Search both sources in parallel
    const [claudeCodeSkills, githubRepos] = await Promise.all([
      getClaudeCodeRecommendations(claudeCodeClient, identity),
      githubRecommendations.getRecommendations(identityData, 20).catch(err => {
        console.error('[recommendation-pipeline] GitHub search failed:', err);
        return [] as SkillRecommendation[];
      }),
    ]);

    // Merge and deduplicate by URL — keep highest-scoring entry
    const all = [...claudeCodeSkills, ...githubRepos];
    const byUrl = new Map<string, SkillRecommendation>();
    for (const rec of all) {
      const key = rec.url.toLowerCase().replace(/\/+$/, '');
      const existing = byUrl.get(key);
      if (!existing || rec.matchScore > existing.matchScore) {
        byUrl.set(key, rec);
      }
    }
    const deduplicated = Array.from(byUrl.values());

    // Group by user's main categories (3-7 per category)
    const grouped = groupByCategory(deduplicated, identity.mainCategories);

    console.log(
      `[recommendation-pipeline] ${claudeCodeSkills.length} Claude Code + ${githubRepos.length} GitHub => ${grouped.length} grouped`,
    );

    return grouped;
  } catch (error) {
    console.error('[recommendation-pipeline] Failed:', error);
    return [];
  }
}

// ─── Internal helpers (extracted from BloomIdentitySkillV2) ─────────────

async function getClaudeCodeRecommendations(
  client: ClaudeCodeClient,
  identity: RefreshIdentityInput,
): Promise<SkillRecommendation[]> {
  try {
    const claudeCodeSkills = await client.getRecommendations({
      mainCategories: identity.mainCategories,
      subCategories: identity.subCategories,
      limit: 20,
    });

    return claudeCodeSkills.map(skill => {
      const CLAUDE_CODE_SCORE_CEILING = 30;
      const rawScore = skill.matchScore || 0;
      const normalizedScore = Math.min(Math.round((rawScore / CLAUDE_CODE_SCORE_CEILING) * 100), 100);

      const searchText = `${skill.skillName} ${skill.description} ${skill.category || ''}`.toLowerCase();
      const matchedCategory = [...identity.mainCategories, ...identity.subCategories]
        .find(c => searchText.includes(c.toLowerCase()));

      const { boost, matchedKeywords } = calculatePersonalityBoost(
        { description: skill.description, categories: skill.category ? [skill.category] : [] },
        identity,
      );

      const typeName = identity.personalityType.replace(/^The /, '');
      const reason = matchedCategory && matchedKeywords.length > 0
        ? `Because you're into ${matchedCategory} — fits your ${typeName} style`
        : matchedCategory
          ? `Because you're into ${matchedCategory}`
          : matchedKeywords.length > 0
            ? `Fits your ${typeName} style`
            : `Fits your ${typeName} profile`;

      return {
        skillId: skill.url,
        skillName: skill.skillName,
        matchScore: Math.min(normalizedScore + boost, 100),
        reason,
        description: skill.description,
        url: skill.url,
        categories: skill.category ? [skill.category] : ['General'],
        creator: skill.creator,
        source: 'ClaudeCode' as const,
      };
    });
  } catch (error) {
    console.error('[recommendation-pipeline] Claude Code search failed:', error);
    return [];
  }
}

function groupByCategory(
  skills: SkillRecommendation[],
  mainCategories: string[],
): SkillRecommendation[] {
  const MIN_PER_CATEGORY = 3;
  const MAX_PER_CATEGORY = 7;
  const SCORE_THRESHOLD = 25;

  const buckets = new Map<string, SkillRecommendation[]>();
  for (const cat of mainCategories) {
    buckets.set(cat, []);
  }

  for (const skill of skills) {
    const bestCategory = findBestCategory(skill, mainCategories);
    if (bestCategory) {
      buckets.get(bestCategory)!.push({ ...skill, categoryGroup: bestCategory });
    }
  }

  const result: SkillRecommendation[] = [];
  for (const cat of mainCategories) {
    const bucket = buckets.get(cat)!;
    bucket.sort((a, b) => b.matchScore - a.matchScore);

    let count = bucket.filter(s => s.matchScore >= SCORE_THRESHOLD).length;
    count = Math.max(Math.min(count, MAX_PER_CATEGORY), Math.min(MIN_PER_CATEGORY, bucket.length));

    result.push(...bucket.slice(0, count));
  }

  return result;
}

function findBestCategory(skill: SkillRecommendation, mainCategories: string[]): string | null {
  const skillText = [
    ...skill.categories,
    skill.description,
    skill.skillName,
  ].join(' ').toLowerCase();

  let bestCat: string | null = null;
  let bestScore = 0;

  for (const cat of mainCategories) {
    let score = 0;

    if (skill.categories.some(c => c.toLowerCase() === cat.toLowerCase())) {
      score += 10;
    }

    const keywords = CATEGORY_KEYWORDS[cat as keyof typeof CATEGORY_KEYWORDS] || [];
    for (const kw of keywords) {
      if (skillText.includes(kw)) {
        score += 2;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestCat = cat;
    }
  }

  if (bestScore === 0 && mainCategories.length > 0) {
    bestCat = mainCategories[0];
  }

  return bestCat;
}

function calculatePersonalityBoost(
  skill: { description: string; categories?: string[]; stars?: number },
  identity: RefreshIdentityInput,
): { boost: number; matchedKeywords: string[] } {
  const personalityKeywords = getPersonalityKeywords(identity.personalityType as PersonalityType);
  const descLower = skill.description.toLowerCase();
  const catText = (skill.categories || []).join(' ').toLowerCase();
  const searchText = `${descLower} ${catText}`;

  const matchedKeywords = personalityKeywords.filter(k => searchText.includes(k));
  let keywordBoost = 0;
  for (let i = 0; i < matchedKeywords.length; i++) {
    if (i < 3) keywordBoost += 3;
    else if (i < 6) keywordBoost += 2;
    else keywordBoost += 1;
  }
  keywordBoost = Math.min(keywordBoost, 15);

  let dimensionBoost = 0;
  const dims = identity.dimensions;
  if (dims) {
    if (dims.conviction > 65) {
      const hasExactCategory = (skill.categories || []).some(c => {
        const lower = c.toLowerCase();
        return identity.mainCategories.some(mc => mc.toLowerCase() === lower) ||
               identity.subCategories.some(sc => sc.toLowerCase() === lower);
      });
      if (hasExactCategory) dimensionBoost += 8;
    }

    if (dims.conviction < 35) {
      const hasNovelCategory = (skill.categories || []).some(c => {
        const lower = c.toLowerCase();
        return !identity.mainCategories.some(mc => mc.toLowerCase() === lower) &&
               !identity.subCategories.some(sc => sc.toLowerCase() === lower);
      });
      if (hasNovelCategory) dimensionBoost += 5;
    }

    if (dims.intuition > 65) {
      const earlyKeywords = /\b(early|beta|alpha|experimental)\b/i;
      const isEarlyStage = (skill.stars != null && skill.stars < 500) ||
        earlyKeywords.test(searchText);
      if (isEarlyStage) dimensionBoost += 6;
    }

    if (dims.intuition < 35) {
      const isEstablished = skill.stars != null && skill.stars > 5000;
      if (isEstablished) dimensionBoost += 6;
    }

    if (dims.contribution > 55) {
      const isCommunity = searchText.includes('community') || searchText.includes('collaborat') ||
        searchText.includes('contribut') || searchText.includes('open-source') || searchText.includes('governance');
      if (isCommunity) dimensionBoost += 6;
    }

    dimensionBoost = Math.min(dimensionBoost, 15);
  }

  return { boost: keywordBoost + dimensionBoost, matchedKeywords };
}

function getPersonalityKeywords(type: PersonalityType): string[] {
  const keywordMap: Record<string, string[]> = {
    [PersonalityType.THE_VISIONARY]: [
      'innovative', 'early-stage', 'vision', 'future', 'paradigm',
      'pioneer', 'disrupt', 'bold', 'ambitious', 'frontier', 'emerging', 'breakthrough',
    ],
    [PersonalityType.THE_EXPLORER]: [
      'diverse', 'experimental', 'discovery', 'research', 'explore',
      'curiosity', 'variety', 'breadth', 'survey', 'sandbox', 'prototype', 'tinker',
    ],
    [PersonalityType.THE_CULTIVATOR]: [
      'community', 'social', 'collaborate', 'nurture', 'build',
      'ecosystem', 'mentor', 'contribute', 'share', 'governance', 'collective', 'stewardship',
    ],
    [PersonalityType.THE_OPTIMIZER]: [
      'efficiency', 'data-driven', 'optimize', 'systematic', 'analytics',
      'performance', 'metrics', 'roi', 'benchmark', 'refine', 'precision', 'reliable',
    ],
    [PersonalityType.THE_INNOVATOR]: [
      'technology', 'ai', 'automation', 'creative', 'cutting-edge',
      'novel', 'hybrid', 'synthesis', 'interdisciplinary', 'integrate', 'cross-domain', 'generative',
    ],
  };
  return keywordMap[type] || [];
}
