/**
 * Project Matcher
 *
 * Matches user interests with early-stage projects from Product Hunt
 */

import { PersonalityType } from '../skills/bloom-identity-skill';
import { ProjectRecommendation } from '../skills/bloom-identity-skill';

export class ProjectMatcher {
  /**
   * Find matching projects based on user's categories and personality
   */
  async findMatches(
    subCategories: string[],
    personalityType: PersonalityType
  ): Promise<ProjectRecommendation[]> {
    console.log(`🔍 Finding projects matching: ${subCategories.join(', ')}`);

    // TODO: Integrate with Product Hunt API
    // For hackathon demo, return mock recommendations
    return this.getMockRecommendations(personalityType);
  }

  /**
   * Mock recommendations for demo
   */
  private getMockRecommendations(personalityType: PersonalityType): ProjectRecommendation[] {
    const mockProjects: Record<PersonalityType, ProjectRecommendation[]> = {
      [PersonalityType.THE_VISIONARY]: [
        {
          name: 'DeFi Protocol X',
          description: 'Next-gen DeFi protocol for cross-chain liquidity',
          url: 'https://example.com/defi-x',
          categories: ['DeFi', 'Crypto'],
          matchScore: 95,
        },
        {
          name: 'Web3 Social',
          description: 'Decentralized social network built on Base',
          url: 'https://example.com/web3-social',
          categories: ['Web3', 'Social'],
          matchScore: 88,
        },
      ],
      [PersonalityType.THE_INNOVATOR]: [
        {
          name: 'AI Content Studio',
          description: 'AI-powered content creation platform',
          url: 'https://example.com/ai-studio',
          categories: ['AI Tools', 'Content'],
          matchScore: 96,
        },
        {
          name: 'ML Workflow',
          description: 'Automate your ML pipelines',
          url: 'https://example.com/ml-workflow',
          categories: ['Machine Learning', 'Tools'],
          matchScore: 90,
        },
      ],
      [PersonalityType.THE_OPTIMIZER]: [
        {
          name: 'TaskFlow Pro',
          description: 'Smart task management with AI prioritization',
          url: 'https://example.com/taskflow',
          categories: ['Productivity', 'Tools'],
          matchScore: 94,
        },
        {
          name: 'AutoMate',
          description: 'No-code automation for daily workflows',
          url: 'https://example.com/automate',
          categories: ['Automation', 'Productivity'],
          matchScore: 89,
        },
      ],
      [PersonalityType.THE_EXPLORER]: [
        {
          name: 'LearnHub',
          description: 'Personalized learning paths powered by AI',
          url: 'https://example.com/learnhub',
          categories: ['Education', 'AI'],
          matchScore: 92,
        },
        {
          name: 'KnowledgeGraph',
          description: 'Visual knowledge mapping tool',
          url: 'https://example.com/knowledge-graph',
          categories: ['Learning', 'Tools'],
          matchScore: 87,
        },
      ],
      [PersonalityType.THE_CULTIVATOR]: [
        {
          name: 'MindfulSpace',
          description: 'Daily meditation and mindfulness companion',
          url: 'https://example.com/mindful-space',
          categories: ['Wellness', 'Mental Health'],
          matchScore: 93,
        },
        {
          name: 'FitTrack AI',
          description: 'AI fitness coach for personalized workouts',
          url: 'https://example.com/fittrack',
          categories: ['Fitness', 'Health'],
          matchScore: 88,
        },
      ],
    };

    return mockProjects[personalityType] || [];
  }
}
