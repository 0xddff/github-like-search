import { Injectable } from '@angular/core';
import { ExtendedSearchTemplate, LogicalOperator } from '../models';

export interface TemplatePreset {
  id: string;
  name: string;
  description: string;
  category: 'issues' | 'pull-requests' | 'repositories' | 'code' | 'general';
  icon: string;
  color: string;
  tags: string[];
  query: {
    criteria: any[];
    rawQuery: string;
    isValid: boolean;
  };
  searchMode: 'visual' | 'raw';
  logicalOperator: LogicalOperator;
}

@Injectable({
  providedIn: 'root'
})
export class TemplatePresetsService {
  
  private readonly presets: TemplatePreset[] = [
    // Issues Category
    {
      id: 'preset-my-open-issues',
      name: 'My Open Issues',
      description: 'Issues assigned to me that are still open',
      category: 'issues',
      icon: '🐛',
      color: '#d1242f',
      tags: ['issues', 'personal', 'open'],
      query: {
        criteria: [],
        rawQuery: 'is:issue is:open assignee:@me',
        isValid: true
      },
      searchMode: 'raw',
      logicalOperator: LogicalOperator.AND
    },
    {
      id: 'preset-high-priority-issues',
      name: 'High Priority Issues',
      description: 'Issues marked as high priority or urgent',
      category: 'issues',
      icon: '⚡',
      color: '#fb8500',
      tags: ['issues', 'priority', 'urgent'],
      query: {
        criteria: [],
        rawQuery: 'is:issue is:open (label:"high priority" OR label:"urgent" OR label:"critical")',
        isValid: true
      },
      searchMode: 'raw',
      logicalOperator: LogicalOperator.OR
    },
    {
      id: 'preset-stale-issues',
      name: 'Stale Issues',
      description: 'Issues that haven\'t been updated in the last 30 days',
      category: 'issues',
      icon: '🕰️',
      color: '#8b5a2b',
      tags: ['issues', 'stale', 'maintenance'],
      query: {
        criteria: [],
        rawQuery: 'is:issue is:open updated:<30days-ago',
        isValid: true
      },
      searchMode: 'raw',
      logicalOperator: LogicalOperator.AND
    },
    {
      id: 'preset-bug-reports',
      name: 'Bug Reports',
      description: 'Issues labeled as bugs',
      category: 'issues',
      icon: '🐞',
      color: '#d1242f',
      tags: ['issues', 'bugs'],
      query: {
        criteria: [],
        rawQuery: 'is:issue is:open label:bug',
        isValid: true
      },
      searchMode: 'raw',
      logicalOperator: LogicalOperator.AND
    },

    // Pull Requests Category
    {
      id: 'preset-my-pull-requests',
      name: 'My Pull Requests',
      description: 'Pull requests created by me',
      category: 'pull-requests',
      icon: '🔄',
      color: '#1f883d',
      tags: ['pull-requests', 'personal'],
      query: {
        criteria: [],
        rawQuery: 'is:pr is:open author:@me',
        isValid: true
      },
      searchMode: 'raw',
      logicalOperator: LogicalOperator.AND
    },
    {
      id: 'preset-pr-review-requests',
      name: 'Review Requests',
      description: 'Pull requests where my review is requested',
      category: 'pull-requests',
      icon: '👀',
      color: '#8250df',
      tags: ['pull-requests', 'review', 'personal'],
      query: {
        criteria: [],
        rawQuery: 'is:pr is:open review-requested:@me',
        isValid: true
      },
      searchMode: 'raw',
      logicalOperator: LogicalOperator.AND
    },
    {
      id: 'preset-ready-for-merge',
      name: 'Ready for Merge',
      description: 'Approved pull requests ready for merging',
      category: 'pull-requests',
      icon: '✅',
      color: '#1f883d',
      tags: ['pull-requests', 'approved', 'merge'],
      query: {
        criteria: [],
        rawQuery: 'is:pr is:open review:approved -draft:true',
        isValid: true
      },
      searchMode: 'raw',
      logicalOperator: LogicalOperator.AND
    },
    {
      id: 'preset-draft-prs',
      name: 'Draft Pull Requests',
      description: 'Pull requests in draft mode',
      category: 'pull-requests',
      icon: '📝',
      color: '#656d76',
      tags: ['pull-requests', 'draft'],
      query: {
        criteria: [],
        rawQuery: 'is:pr is:open draft:true',
        isValid: true
      },
      searchMode: 'raw',
      logicalOperator: LogicalOperator.AND
    },

    // Repositories Category
    {
      id: 'preset-my-repositories',
      name: 'My Repositories',
      description: 'Repositories I own or collaborate on',
      category: 'repositories',
      icon: '📁',
      color: '#0969da',
      tags: ['repositories', 'personal'],
      query: {
        criteria: [],
        rawQuery: 'user:@me',
        isValid: true
      },
      searchMode: 'raw',
      logicalOperator: LogicalOperator.AND
    },
    {
      id: 'preset-starred-repos',
      name: 'Starred Repositories',
      description: 'Repositories I have starred',
      category: 'repositories',
      icon: '⭐',
      color: '#f1e05a',
      tags: ['repositories', 'starred'],
      query: {
        criteria: [],
        rawQuery: 'user:@me starred:>0',
        isValid: true
      },
      searchMode: 'raw',
      logicalOperator: LogicalOperator.AND
    },
    {
      id: 'preset-recently-updated',
      name: 'Recently Updated',
      description: 'Repositories updated in the last 7 days',
      category: 'repositories',
      icon: '🔥',
      color: '#ff6b35',
      tags: ['repositories', 'recent', 'active'],
      query: {
        criteria: [],
        rawQuery: 'pushed:>7days-ago',
        isValid: true
      },
      searchMode: 'raw',
      logicalOperator: LogicalOperator.AND
    },

    // Code Category
    {
      id: 'preset-todo-comments',
      name: 'TODO Comments',
      description: 'Files containing TODO comments',
      category: 'code',
      icon: '📋',
      color: '#f1c40f',
      tags: ['code', 'todo', 'comments'],
      query: {
        criteria: [],
        rawQuery: 'TODO in:file',
        isValid: true
      },
      searchMode: 'raw',
      logicalOperator: LogicalOperator.AND
    },
    {
      id: 'preset-security-issues',
      name: 'Security Issues',
      description: 'Code or issues related to security',
      category: 'code',
      icon: '🔒',
      color: '#e74c3c',
      tags: ['code', 'security', 'vulnerabilities'],
      query: {
        criteria: [],
        rawQuery: '(security OR vulnerability OR CVE) in:file,comments',
        isValid: true
      },
      searchMode: 'raw',
      logicalOperator: LogicalOperator.OR
    },
    {
      id: 'preset-config-files',
      name: 'Configuration Files',
      description: 'Common configuration files',
      category: 'code',
      icon: '⚙️',
      color: '#95a5a6',
      tags: ['code', 'config', 'files'],
      query: {
        criteria: [],
        rawQuery: 'filename:config OR filename:.env OR filename:package.json',
        isValid: true
      },
      searchMode: 'raw',
      logicalOperator: LogicalOperator.OR
    },

    // General Category
    {
      id: 'preset-recent-activity',
      name: 'Recent Activity',
      description: 'All recent activity in the last 24 hours',
      category: 'general',
      icon: '🕒',
      color: '#3498db',
      tags: ['recent', 'activity', 'today'],
      query: {
        criteria: [],
        rawQuery: 'updated:>1day-ago',
        isValid: true
      },
      searchMode: 'raw',
      logicalOperator: LogicalOperator.AND
    },
    {
      id: 'preset-this-week',
      name: 'This Week',
      description: 'Activity from the current week',
      category: 'general',
      icon: '📅',
      color: '#9b59b6',
      tags: ['recent', 'week'],
      query: {
        criteria: [],
        rawQuery: 'updated:>7days-ago',
        isValid: true
      },
      searchMode: 'raw',
      logicalOperator: LogicalOperator.AND
    },
    {
      id: 'preset-needs-attention',
      name: 'Needs Attention',
      description: 'Items requiring immediate attention',
      category: 'general',
      icon: '🚨',
      color: '#e67e22',
      tags: ['urgent', 'attention', 'priority'],
      query: {
        criteria: [],
        rawQuery: '(label:"needs attention" OR label:"urgent" OR label:"breaking") is:open',
        isValid: true
      },
      searchMode: 'raw',
      logicalOperator: LogicalOperator.OR
    }
  ];

  /**
   * Get all available presets
   */
  getAllPresets(): TemplatePreset[] {
    return [...this.presets];
  }

  /**
   * Get presets by category
   */
  getPresetsByCategory(category: TemplatePreset['category']): TemplatePreset[] {
    return this.presets.filter(preset => preset.category === category);
  }

  /**
   * Get preset by ID
   */
  getPresetById(id: string): TemplatePreset | undefined {
    return this.presets.find(preset => preset.id === id);
  }

  /**
   * Get all available categories
   */
  getCategories(): Array<{ id: TemplatePreset['category']; label: string; icon: string }> {
    return [
      { id: 'issues', label: 'Issues', icon: '🐛' },
      { id: 'pull-requests', label: 'Pull Requests', icon: '🔄' },
      { id: 'repositories', label: 'Repositories', icon: '📁' },
      { id: 'code', label: 'Code', icon: '💻' },
      { id: 'general', label: 'General', icon: '📊' }
    ];
  }

  /**
   * Search presets by name or description
   */
  searchPresets(query: string): TemplatePreset[] {
    const searchTerm = query.toLowerCase();
    return this.presets.filter(preset =>
      preset.name.toLowerCase().includes(searchTerm) ||
      preset.description.toLowerCase().includes(searchTerm) ||
      preset.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }

  /**
   * Get popular presets (most commonly used ones)
   */
  getPopularPresets(): TemplatePreset[] {
    const popularIds = [
      'preset-my-open-issues',
      'preset-my-pull-requests',
      'preset-pr-review-requests',
      'preset-high-priority-issues',
      'preset-recent-activity',
      'preset-needs-attention'
    ];
    
    return this.presets.filter(preset => popularIds.includes(preset.id));
  }

  /**
   * Convert a preset to an ExtendedSearchTemplate
   */
  presetToTemplate(preset: TemplatePreset): Partial<ExtendedSearchTemplate> {
    return {
      name: preset.name,
      description: preset.description,
      query: preset.query,
      searchMode: preset.searchMode,
      tags: [...preset.tags],
      icon: preset.icon,
      color: preset.color,
      logicalOperator: preset.logicalOperator,
      isPublic: false,
      isShared: false
    };
  }

  /**
   * Get preset recommendations based on existing templates
   */
  getRecommendations(existingTemplates: ExtendedSearchTemplate[]): TemplatePreset[] {
    const existingTags = new Set<string>();
    const existingCategories = new Set<string>();
    
    // Analyze existing templates
    existingTemplates.forEach(template => {
      template.tags.forEach(tag => existingTags.add(tag.toLowerCase()));
      
      // Try to categorize existing templates based on their content
      const query = template.query.rawQuery?.toLowerCase() || '';
      if (query.includes('is:issue') || query.includes('bug')) {
        existingCategories.add('issues');
      }
      if (query.includes('is:pr') || query.includes('pull')) {
        existingCategories.add('pull-requests');
      }
      if (query.includes('repo:') || query.includes('user:')) {
        existingCategories.add('repositories');
      }
    });

    // Score presets based on relevance
    const scoredPresets = this.presets.map(preset => {
      let score = 0;
      
      // Boost score if category matches existing templates
      if (existingCategories.has(preset.category)) {
        score += 3;
      }
      
      // Boost score for tag overlap
      preset.tags.forEach(tag => {
        if (existingTags.has(tag.toLowerCase())) {
          score += 2;
        }
      });
      
      // Always recommend popular presets
      if (this.getPopularPresets().includes(preset)) {
        score += 1;
      }
      
      return { preset, score };
    });

    // Return top recommendations, excluding presets that are too similar to existing templates
    return scoredPresets
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(item => item.preset);
  }
}