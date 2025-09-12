import { Injectable, signal, computed } from '@angular/core';
import { SearchTemplatesService, SearchTemplate } from './search-templates.service';
import { ExtendedSearchTemplate, TemplateGroup, QuickTemplate, LogicalOperator } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ExtendedTemplatesService {
  private initialized = false;
  
  constructor(private baseTemplatesService: SearchTemplatesService) {
    this.initializeIfNeeded();
  }

  // Extended template storage
  private readonly extendedTemplates = signal<ExtendedSearchTemplate[]>([]);
  private readonly templateGroups = signal<TemplateGroup[]>([]);
  private readonly quickTemplates = signal<QuickTemplate[]>([]);
  
  // Public signals
  readonly templates = computed(() => this.extendedTemplates());
  readonly groups = computed(() => this.templateGroups());
  readonly quickAccess = computed(() => this.quickTemplates());
  
  // Computed properties for organization
  readonly templatesWithoutGroup = computed(() => 
    this.templates().filter(t => !t.groupId)
  );
  
  readonly templatesByGroup = computed(() => {
    const grouped = new Map<string, ExtendedSearchTemplate[]>();
    this.templates()
      .filter(t => t.groupId)
      .forEach(template => {
        const groupId = template.groupId!;
        if (!grouped.has(groupId)) {
          grouped.set(groupId, []);
        }
        grouped.get(groupId)!.push(template);
      });
    return grouped;
  });
  
  readonly mostUsedTemplates = computed(() => 
    [...this.templates()]
      .sort((a, b) => (b.usageFrequency || 0) - (a.usageFrequency || 0))
      .slice(0, 5)
  );
  
  readonly recentTemplates = computed(() => 
    [...this.templates()]
      .filter(t => t.lastUsed)
      .sort((a, b) => (b.lastUsed?.getTime() || 0) - (a.lastUsed?.getTime() || 0))
      .slice(0, 5)
  );

  // Template management methods
  async createExtendedTemplate(template: Partial<ExtendedSearchTemplate>): Promise<ExtendedSearchTemplate> {
    const now = new Date();
    const extended: ExtendedSearchTemplate = {
      id: this.generateId(),
      name: template.name || 'Untitled Template',
      description: template.description,
      query: template.query!,
      searchMode: template.searchMode || 'visual',
      tags: template.tags || [],
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
      isPublic: template.isPublic || false,
      color: template.color,
      icon: template.icon,
      
      // Extended properties
      logicalOperator: template.logicalOperator || LogicalOperator.AND,
      groupId: template.groupId,
      groupName: template.groupName,
      isShared: template.isShared || false,
      shareUrl: template.shareUrl,
      collaborators: template.collaborators || [],
      version: template.version || 1,
      parentTemplateId: template.parentTemplateId,
      forkCount: template.forkCount || 0,
      lastUsed: template.lastUsed,
      usageFrequency: template.usageFrequency || 0,
      isValid: template.isValid !== false,
      validationErrors: template.validationErrors || []
    };

    // Add to storage
    this.extendedTemplates.update(templates => [...templates, extended]);
    
    // Also create in base service for compatibility
    await this.baseTemplatesService.createTemplate({
      name: extended.name,
      description: extended.description,
      query: extended.query,
      searchMode: extended.searchMode,
      tags: extended.tags,
      color: extended.color,
      icon: extended.icon
    });
    
    return extended;
  }

  async updateExtendedTemplate(id: string, updates: Partial<ExtendedSearchTemplate>): Promise<void> {
    this.extendedTemplates.update(templates => 
      templates.map(t => 
        t.id === id 
          ? { ...t, ...updates, updatedAt: new Date() }
          : t
      )
    );
  }

  async deleteExtendedTemplate(id: string): Promise<void> {
    this.extendedTemplates.update(templates => 
      templates.filter(t => t.id !== id)
    );
    
    // Also delete from base service
    await this.baseTemplatesService.deleteTemplate(id);
  }

  async useTemplate(id: string): Promise<void> {
    const now = new Date();
    this.extendedTemplates.update(templates => 
      templates.map(t => 
        t.id === id 
          ? { 
              ...t, 
              lastUsed: now, 
              usageCount: t.usageCount + 1,
              usageFrequency: (t.usageFrequency || 0) + 1
            }
          : t
      )
    );
    
    // Also update base service
    await this.baseTemplatesService.useTemplate(id);
  }

  // Group management methods
  async createGroup(group: Omit<TemplateGroup, 'id' | 'createdAt' | 'templates'>): Promise<TemplateGroup> {
    const newGroup: TemplateGroup = {
      id: this.generateId(),
      name: group.name,
      description: group.description,
      color: group.color,
      icon: group.icon,
      templates: [],
      isCollapsed: group.isCollapsed || false,
      createdAt: new Date()
    };

    this.templateGroups.update(groups => [...groups, newGroup]);
    return newGroup;
  }

  async updateGroup(id: string, updates: Partial<TemplateGroup>): Promise<void> {
    this.templateGroups.update(groups => 
      groups.map(g => 
        g.id === id 
          ? { ...g, ...updates }
          : g
      )
    );
  }

  async deleteGroup(id: string, moveTemplatesToRoot = true): Promise<void> {
    if (moveTemplatesToRoot) {
      // Move all templates in this group to root level
      this.extendedTemplates.update(templates => 
        templates.map(t => 
          t.groupId === id 
            ? { ...t, groupId: undefined, groupName: undefined }
            : t
        )
      );
    } else {
      // Delete all templates in the group
      this.extendedTemplates.update(templates => 
        templates.filter(t => t.groupId !== id)
      );
    }

    this.templateGroups.update(groups => 
      groups.filter(g => g.id !== id)
    );
  }

  async addTemplateToGroup(templateId: string, groupId: string): Promise<void> {
    const group = this.templateGroups().find(g => g.id === groupId);
    if (!group) return;

    this.extendedTemplates.update(templates => 
      templates.map(t => 
        t.id === templateId 
          ? { ...t, groupId, groupName: group.name, updatedAt: new Date() }
          : t
      )
    );
  }

  async removeTemplateFromGroup(templateId: string): Promise<void> {
    this.extendedTemplates.update(templates => 
      templates.map(t => 
        t.id === templateId 
          ? { ...t, groupId: undefined, groupName: undefined, updatedAt: new Date() }
          : t
      )
    );
  }

  // Quick templates management
  async createQuickTemplate(quickTemplate: Omit<QuickTemplate, 'id'>): Promise<QuickTemplate> {
    const newQuickTemplate: QuickTemplate = {
      id: this.generateId(),
      ...quickTemplate
    };

    this.quickTemplates.update(templates => [...templates, newQuickTemplate]);
    return newQuickTemplate;
  }

  async updateQuickTemplate(id: string, updates: Partial<QuickTemplate>): Promise<void> {
    this.quickTemplates.update(templates => 
      templates.map(t => 
        t.id === id 
          ? { ...t, ...updates }
          : t
      )
    );
  }

  async deleteQuickTemplate(id: string): Promise<void> {
    this.quickTemplates.update(templates => 
      templates.filter(t => t.id !== id)
    );
  }

  // Template sharing and collaboration
  async shareTemplate(id: string): Promise<string> {
    const template = this.templates().find(t => t.id === id);
    if (!template) throw new Error('Template not found');

    const shareUrl = `${window.location.origin}/search/template/${id}`;
    
    this.extendedTemplates.update(templates => 
      templates.map(t => 
        t.id === id 
          ? { ...t, isShared: true, shareUrl, updatedAt: new Date() }
          : t
      )
    );

    return shareUrl;
  }

  async forkTemplate(id: string, newName?: string): Promise<ExtendedSearchTemplate> {
    const original = this.templates().find(t => t.id === id);
    if (!original) throw new Error('Template not found');

    const forked = await this.createExtendedTemplate({
      ...original,
      name: newName || `${original.name} (Copy)`,
      id: undefined, // Will be generated
      parentTemplateId: id,
      version: 1,
      forkCount: 0,
      isShared: false,
      shareUrl: undefined,
      collaborators: []
    });

    // Increment fork count on original
    this.extendedTemplates.update(templates => 
      templates.map(t => 
        t.id === id 
          ? { ...t, forkCount: (t.forkCount || 0) + 1 }
          : t
      )
    );

    return forked;
  }

  async addCollaborator(templateId: string, collaboratorEmail: string): Promise<void> {
    this.extendedTemplates.update(templates => 
      templates.map(t => 
        t.id === templateId 
          ? { 
              ...t, 
              collaborators: [...(t.collaborators || []), collaboratorEmail],
              updatedAt: new Date()
            }
          : t
      )
    );
  }

  async removeCollaborator(templateId: string, collaboratorEmail: string): Promise<void> {
    this.extendedTemplates.update(templates => 
      templates.map(t => 
        t.id === templateId 
          ? { 
              ...t, 
              collaborators: (t.collaborators || []).filter(c => c !== collaboratorEmail),
              updatedAt: new Date()
            }
          : t
      )
    );
  }

  // Template validation
  async validateTemplate(template: ExtendedSearchTemplate): Promise<string[]> {
    const errors: string[] = [];

    // Basic validation
    if (!template.name.trim()) {
      errors.push('Template name is required');
    }

    if (!template.query || template.query.criteria.length === 0) {
      errors.push('Template must have at least one search criteria');
    }

    // Check for invalid criteria
    if (template.query) {
      template.query.criteria.forEach((criteria, index) => {
        if (!criteria.type || !criteria.type.id) {
          errors.push(`Criteria ${index + 1}: Search type is required`);
        }
        if (!criteria.operator || !criteria.operator.type) {
          errors.push(`Criteria ${index + 1}: Operator is required`);
        }
        if (!criteria.value && criteria.operator?.requiresValue) {
          errors.push(`Criteria ${index + 1}: Value is required for this operator`);
        }
      });
    }

    // Update template validation status
    await this.updateExtendedTemplate(template.id, {
      isValid: errors.length === 0,
      validationErrors: errors
    });

    return errors;
  }

  // Search and filter methods
  searchTemplates(query: string): ExtendedSearchTemplate[] {
    const lowercaseQuery = query.toLowerCase();
    return this.templates().filter(template => 
      template.name.toLowerCase().includes(lowercaseQuery) ||
      template.description?.toLowerCase().includes(lowercaseQuery) ||
      template.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }

  getTemplatesByTag(tag: string): ExtendedSearchTemplate[] {
    return this.templates().filter(template => 
      template.tags.includes(tag)
    );
  }

  getTemplatesByGroup(groupId: string): ExtendedSearchTemplate[] {
    return this.templates().filter(template => 
      template.groupId === groupId
    );
  }

  // Import/Export functionality
  async exportTemplate(id: string): Promise<string> {
    const template = this.templates().find(t => t.id === id);
    if (!template) throw new Error('Template not found');

    return JSON.stringify(template, null, 2);
  }

  async importTemplate(jsonData: string): Promise<ExtendedSearchTemplate> {
    try {
      const templateData = JSON.parse(jsonData);
      return await this.createExtendedTemplate({
        ...templateData,
        id: undefined, // Generate new ID
        name: `${templateData.name} (Imported)`
      });
    } catch (error) {
      throw new Error('Invalid template format');
    }
  }

  // Initialize with default templates
  async initializeDefaults(): Promise<void> {
    // Create default groups
    const personalGroup = await this.createGroup({
      name: 'Personal',
      description: 'Your personal templates',
      icon: '👤',
      color: '#0969da'
    });

    const workGroup = await this.createGroup({
      name: 'Work',
      description: 'Work-related templates',
      icon: '💼',
      color: '#1f883d'
    });

    // Create default templates
    const defaultTemplates = [
      {
        name: 'My Open Issues',
        description: 'Issues assigned to me that are still open',
        groupId: personalGroup.id,
        icon: '🐛',
        color: '#d1242f',
        tags: ['issues', 'personal'],
        logicalOperator: LogicalOperator.AND
      },
      {
        name: 'Recent PRs',
        description: 'Pull requests created in the last 7 days',
        groupId: workGroup.id,
        icon: '🔄',
        color: '#1f883d',
        tags: ['pull-requests', 'recent'],
        logicalOperator: LogicalOperator.AND
      },
      {
        name: 'High Priority',
        description: 'High priority items across all repositories',
        icon: '⚡',
        color: '#fb8500',
        tags: ['priority', 'urgent'],
        logicalOperator: LogicalOperator.OR
      }
    ];

    // Create default quick templates
    const quickTemplates = [
      {
        label: 'My Items',
        description: 'Items assigned to me',
        icon: '👤',
        hotkey: 'Ctrl+1',
        color: '#0969da'
      },
      {
        label: 'Recent',
        description: 'Recently updated items',
        icon: '🕒',
        hotkey: 'Ctrl+2',
        color: '#1f883d'
      },
      {
        label: 'Urgent',
        description: 'High priority items',
        icon: '⚡',
        hotkey: 'Ctrl+3',
        color: '#fb8500'
      }
    ];

    // Create default templates with actual search queries
    for (const templateConfig of defaultTemplates) {
      await this.createExtendedTemplate({
        name: templateConfig.name,
        description: templateConfig.description,
        query: {
          criteria: [],
          rawQuery: templateConfig.name === 'My Open Issues' 
            ? 'assignee:@me state:open' 
            : templateConfig.name === 'Recent PRs'
            ? 'type:pr created:>7days-ago'
            : 'label:"high priority" OR label:"urgent"',
          isValid: true
        },
        searchMode: 'raw',
        tags: templateConfig.tags,
        groupId: templateConfig.groupId,
        icon: templateConfig.icon,
        color: templateConfig.color,
        logicalOperator: templateConfig.logicalOperator
      });
    }
    
    // Create default quick templates with actual functionality
    for (const quickConfig of quickTemplates) {
      await this.createQuickTemplate({
        label: quickConfig.label,
        description: quickConfig.description,
        icon: quickConfig.icon,
        hotkey: quickConfig.hotkey,
        color: quickConfig.color,
        template: await this.createExtendedTemplate({
          name: quickConfig.label,
          description: quickConfig.description,
          query: {
            criteria: [],
            rawQuery: quickConfig.label === 'My Items' 
              ? 'assignee:@me' 
              : quickConfig.label === 'Recent'
              ? 'updated:>7days-ago'
              : 'label:"high priority" OR label:"urgent"',
            isValid: true
          },
          searchMode: 'raw',
          tags: ['quick-access'],
          icon: quickConfig.icon,
          color: quickConfig.color,
          logicalOperator: LogicalOperator.AND
        })
      });
    }
  }

  private generateId(): string {
    return `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async initializeIfNeeded(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Only initialize if there are no templates yet
      if (this.extendedTemplates().length === 0) {
        await this.initializeDefaults();
      }
      this.initialized = true;
    } catch (error) {
      console.warn('Failed to initialize extended templates:', error);
      this.initialized = true; // Mark as initialized to avoid repeated attempts
    }
  }
}