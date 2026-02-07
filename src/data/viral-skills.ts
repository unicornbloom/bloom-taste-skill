/**
 * Curated skills with active X creators for viral marketing
 * 
 * Strategy: When bot recommends these skills, it tags the creator
 * → Creator sees mention → likely to RT → viral loop!
 */

export interface ViralSkill {
  skillId: string;
  skillName: string;
  description: string;
  category: string;
  creatorX: string;  // X handle (without @)
  creatorUserId?: string;
  clawhubUrl: string;
  isActive: boolean;  // Creator actively posts on X
}

/**
 * Hand-picked skills with active creators on X
 * Update this list as we discover more active creators
 */
export const VIRAL_SKILLS: ViralSkill[] = [
  // AI Tools Category
  {
    skillId: 'meow-finder',
    skillName: 'Meow Finder',
    description: 'Discover AI tools by category, pricing, and use case',
    category: 'AI Tools',
    creatorX: 'placeholder_creator1',  // TODO: Find real creator
    clawhubUrl: 'https://clawhub.ai/skills/meow-finder',
    isActive: true,
  },
  
  // DeFi Category
  {
    skillId: 'defi',
    skillName: 'DeFi Protocol Tools',
    description: 'Swap tokens, check yields across chains',
    category: 'DeFi',
    creatorX: 'placeholder_creator2',  // TODO: Find real creator
    clawhubUrl: 'https://clawhub.ai/skills/defi',
    isActive: true,
  },
  
  // Developer Tools
  {
    skillId: 'javascript-sdk',
    skillName: 'JavaScript SDK',
    description: 'Build AI apps with 150+ models',
    category: 'Developer Tools',
    creatorX: 'placeholder_creator3',  // TODO: Find real creator
    clawhubUrl: 'https://clawhub.ai/skills/javascript-sdk',
    isActive: true,
  },
  
  // Add more as we discover active creators...
];

/**
 * Get viral-friendly skills for a given personality/categories
 * Prioritizes skills with active X creators for better engagement
 */
export function getViralSkills(
  categories: string[],
  personalityType: string,
  limit: number = 3
): ViralSkill[] {
  // Filter by category match
  const matches = VIRAL_SKILLS.filter(skill => 
    categories.includes(skill.category) && skill.isActive
  );
  
  // Sort by some scoring logic (can enhance later)
  // For now, just return first N matches
  return matches.slice(0, limit);
}

/**
 * Format skill for X reply (with creator tag)
 */
export function formatSkillForX(skill: ViralSkill, matchScore: number): string {
  return `${skill.skillName} (${matchScore}%) by @${skill.creatorX}`;
}
