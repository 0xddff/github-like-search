import { Injectable, signal } from '@angular/core';
import { SearchQuery } from '../models';

export interface SearchTemplate {
  id: string;
  name: string;
  description?: string;
  query: SearchQuery;
  searchMode: 'visual' | 'raw';
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
  lastUsedAt?: Date;
  isPublic: boolean;
  color?: string;
  icon?: string;
}

export interface TemplateFolder {
  id: string;
  name: string;
  description?: string;
  color?: string;
  templateIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class SearchTemplatesService {
  private readonly STORAGE_KEY_TEMPLATES = 'github-search-templates';
  private readonly STORAGE_KEY_FOLDERS = 'github-search-template-folders';
  private readonly MAX_TEMPLATES = 100;
  
  private readonly templates = signal<SearchTemplate[]>([]);
  private readonly folders = signal<TemplateFolder[]>([]);
  
  constructor() {
    this.loadFromStorage();
    this.createDefaultTemplates();
  }
  
  /**
   * Get all templates as a signal
   */
  getTemplates() {
    return this.templates.asReadonly();
  }
  
  /**
   * Get all folders as a signal
   */
  getFolders() {
    return this.folders.asReadonly();
  }
  
  /**
   * Save current search as a template
   */
  saveAsTemplate(
    name: string, 
    query: SearchQuery, 
    searchMode: 'visual' | 'raw',
    options: {
      description?: string;
      tags?: string[];
      folderId?: string;
      color?: string;
      icon?: string;
    } = {}
  ): SearchTemplate {
    const template: SearchTemplate = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: options.description?.trim(),
      query: { ...query },
      searchMode,
      tags: options.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0,
      isPublic: false,
      color: options.color,
      icon: options.icon
    };
    
    const currentTemplates = this.templates();
    
    // Check for duplicate names
    const existingIndex = currentTemplates.findIndex(t => 
      t.name.toLowerCase() === template.name.toLowerCase()
    );
    
    if (existingIndex !== -1) {
      // Update existing template
      const updated = [...currentTemplates];
      updated[existingIndex] = {
        ...template,
        id: updated[existingIndex].id,
        createdAt: updated[existingIndex].createdAt,
        usageCount: updated[existingIndex].usageCount,
        lastUsedAt: updated[existingIndex].lastUsedAt
      };
      this.templates.set(updated);
    } else {
      // Add new template
      if (currentTemplates.length >= this.MAX_TEMPLATES) {
        // Remove least used template
        const sorted = [...currentTemplates].sort((a, b) => a.usageCount - b.usageCount);
        const toRemove = sorted[0];
        this.deleteTemplate(toRemove.id);
      }
      
      this.templates.set([template, ...currentTemplates]);
    }
    
    // Add to folder if specified
    if (options.folderId) {
      this.addTemplateToFolder(template.id, options.folderId);
    }
    
    this.saveToStorage();
    return template;
  }
  
  /**
   * Update an existing template
   */
  updateTemplate(id: string, updates: Partial<SearchTemplate>): boolean {
    const current = this.templates();
    const index = current.findIndex(t => t.id === id);
    
    if (index === -1) return false;
    
    const updated = [...current];
    updated[index] = {
      ...updated[index],
      ...updates,
      id, // Preserve ID
      updatedAt: new Date()
    };
    
    this.templates.set(updated);
    this.saveToStorage();
    return true;
  }
  
  /**
   * Delete a template
   */
  deleteTemplate(id: string): boolean {
    const current = this.templates();
    const filtered = current.filter(t => t.id !== id);
    
    if (filtered.length !== current.length) {
      this.templates.set(filtered);
      
      // Remove from all folders
      this.removeTemplateFromAllFolders(id);
      
      this.saveToStorage();
      return true;
    }
    
    return false;
  }
  
  /**
   * Apply a template to current search
   */
  applyTemplate(id: string): SearchTemplate | null {
    const template = this.getTemplateById(id);
    if (!template) return null;
    
    // Update usage statistics
    this.updateTemplate(id, {
      usageCount: template.usageCount + 1,
      lastUsedAt: new Date()
    });
    
    return template;
  }
  
  /**
   * Use a template (alias for applyTemplate for compatibility)
   */
  useTemplate(id: string): Promise<void> {
    const template = this.applyTemplate(id);
    return Promise.resolve();
  }

  /**
   * Create a template (alias for saveAsTemplate for compatibility)
   */
  async createTemplate(options: {
    name: string;
    description?: string;
    query: SearchQuery;
    searchMode: 'visual' | 'raw';
    tags?: string[];
    color?: string;
    icon?: string;
  }): Promise<SearchTemplate> {
    return this.saveAsTemplate(
      options.name,
      options.query,
      options.searchMode,
      {
        description: options.description,
        tags: options.tags,
        color: options.color,
        icon: options.icon
      }
    );
  }
  
  /**
   * Get template by ID
   */
  getTemplateById(id: string): SearchTemplate | null {
    return this.templates().find(t => t.id === id) || null;
  }
  
  /**
   * Search templates by name, description, or tags
   */
  searchTemplates(searchTerm: string): SearchTemplate[] {
    if (!searchTerm.trim()) {
      return this.templates();
    }
    
    const term = searchTerm.toLowerCase();
    return this.templates().filter(template => 
      template.name.toLowerCase().includes(term) ||
      template.description?.toLowerCase().includes(term) ||
      template.tags.some(tag => tag.toLowerCase().includes(term))
    );
  }
  
  /**
   * Get templates by tags
   */
  getTemplatesByTags(tags: string[]): SearchTemplate[] {
    if (tags.length === 0) return this.templates();
    
    return this.templates().filter(template =>
      tags.some(tag => template.tags.includes(tag))
    );
  }
  
  /**
   * Get most used templates
   */
  getMostUsedTemplates(limit: number = 10): SearchTemplate[] {
    return [...this.templates()]
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }
  
  /**
   * Get recently used templates
   */
  getRecentlyUsedTemplates(limit: number = 10): SearchTemplate[] {
    return [...this.templates()]
      .filter(t => t.lastUsedAt)
      .sort((a, b) => (b.lastUsedAt?.getTime() || 0) - (a.lastUsedAt?.getTime() || 0))
      .slice(0, limit);
  }
  
  /**
   * Get all unique tags
   */
  getAllTags(): string[] {
    const tagSet = new Set<string>();
    this.templates().forEach(template => {
      template.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }
  
  // Folder Management
  
  /**
   * Create a new folder
   */
  createFolder(name: string, description?: string, color?: string): TemplateFolder {
    const folder: TemplateFolder = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: description?.trim(),
      color,
      templateIds: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.folders.set([folder, ...this.folders()]);
    this.saveToStorage();
    return folder;
  }
  
  /**
   * Update folder
   */
  updateFolder(id: string, updates: Partial<TemplateFolder>): boolean {
    const current = this.folders();
    const index = current.findIndex(f => f.id === id);
    
    if (index === -1) return false;
    
    const updated = [...current];
    updated[index] = {
      ...updated[index],
      ...updates,
      id,
      updatedAt: new Date()
    };
    
    this.folders.set(updated);
    this.saveToStorage();
    return true;
  }
  
  /**
   * Delete folder
   */
  deleteFolder(id: string): boolean {
    const current = this.folders();
    const filtered = current.filter(f => f.id !== id);
    
    if (filtered.length !== current.length) {
      this.folders.set(filtered);
      this.saveToStorage();
      return true;
    }
    
    return false;
  }
  
  /**
   * Add template to folder
   */
  addTemplateToFolder(templateId: string, folderId: string): boolean {
    const folder = this.folders().find(f => f.id === folderId);
    if (!folder || folder.templateIds.includes(templateId)) return false;
    
    return this.updateFolder(folderId, {
      templateIds: [...folder.templateIds, templateId]
    });
  }
  
  /**
   * Remove template from folder
   */
  removeTemplateFromFolder(templateId: string, folderId: string): boolean {
    const folder = this.folders().find(f => f.id === folderId);
    if (!folder) return false;
    
    return this.updateFolder(folderId, {
      templateIds: folder.templateIds.filter(id => id !== templateId)
    });
  }
  
  /**
   * Remove template from all folders
   */
  private removeTemplateFromAllFolders(templateId: string): void {
    this.folders().forEach(folder => {
      if (folder.templateIds.includes(templateId)) {
        this.removeTemplateFromFolder(templateId, folder.id);
      }
    });
  }
  
  /**
   * Get templates in folder
   */
  getTemplatesInFolder(folderId: string): SearchTemplate[] {
    const folder = this.folders().find(f => f.id === folderId);
    if (!folder) return [];
    
    return this.templates().filter(t => folder.templateIds.includes(t.id));
  }
  
  /**
   * Export templates as JSON
   */
  exportTemplates(): string {
    const exportData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      templates: this.templates().map(t => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        lastUsedAt: t.lastUsedAt?.toISOString()
      })),
      folders: this.folders().map(f => ({
        ...f,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString()
      }))
    };
    
    return JSON.stringify(exportData, null, 2);
  }
  
  /**
   * Import templates from JSON
   */
  importTemplates(jsonData: string): { success: boolean; message: string; imported: number } {
    try {
      const data = JSON.parse(jsonData);
      
      if (!data.templates || !Array.isArray(data.templates)) {
        return { success: false, message: 'Invalid template format', imported: 0 };
      }
      
      const validTemplates: SearchTemplate[] = [];
      const validFolders: TemplateFolder[] = [];
      
      // Import templates
      for (const template of data.templates) {
        try {
          const importedTemplate: SearchTemplate = {
            ...template,
            id: template.id || crypto.randomUUID(),
            createdAt: new Date(template.createdAt),
            updatedAt: new Date(template.updatedAt),
            lastUsedAt: template.lastUsedAt ? new Date(template.lastUsedAt) : undefined
          };
          
          if (this.isValidTemplate(importedTemplate)) {
            validTemplates.push(importedTemplate);
          }
        } catch (e) {
          continue;
        }
      }
      
      // Import folders if present
      if (data.folders && Array.isArray(data.folders)) {
        for (const folder of data.folders) {
          try {
            const importedFolder: TemplateFolder = {
              ...folder,
              id: folder.id || crypto.randomUUID(),
              createdAt: new Date(folder.createdAt),
              updatedAt: new Date(folder.updatedAt)
            };
            
            if (this.isValidFolder(importedFolder)) {
              validFolders.push(importedFolder);
            }
          } catch (e) {
            continue;
          }
        }
      }
      
      if (validTemplates.length === 0) {
        return { success: false, message: 'No valid templates found', imported: 0 };
      }
      
      // Merge with existing templates
      const currentTemplates = this.templates();
      const currentFolders = this.folders();
      
      // Remove duplicates by name
      const merged = [...validTemplates];
      currentTemplates.forEach(existing => {
        if (!merged.some(t => t.name.toLowerCase() === existing.name.toLowerCase())) {
          merged.push(existing);
        }
      });
      
      const mergedFolders = [...validFolders];
      currentFolders.forEach(existing => {
        if (!mergedFolders.some(f => f.name.toLowerCase() === existing.name.toLowerCase())) {
          mergedFolders.push(existing);
        }
      });
      
      this.templates.set(merged.slice(0, this.MAX_TEMPLATES));
      this.folders.set(mergedFolders);
      
      this.saveToStorage();
      
      return {
        success: true,
        message: `Successfully imported ${validTemplates.length} templates and ${validFolders.length} folders`,
        imported: validTemplates.length
      };
      
    } catch (e) {
      return { success: false, message: 'Invalid JSON format', imported: 0 };
    }
  }
  
  private isValidTemplate(template: SearchTemplate): boolean {
    return !!(
      template.id &&
      template.name &&
      template.query &&
      template.searchMode &&
      template.createdAt &&
      template.updatedAt
    );
  }
  
  private isValidFolder(folder: TemplateFolder): boolean {
    return !!(
      folder.id &&
      folder.name &&
      Array.isArray(folder.templateIds) &&
      folder.createdAt &&
      folder.updatedAt
    );
  }
  
  private createDefaultTemplates(): void {
    const existing = this.templates();
    if (existing.length > 0) return; // Don't create defaults if templates exist
    
    // Create simple default templates with minimal queries to avoid type issues
    const defaultTemplates: SearchTemplate[] = [
      {
        id: crypto.randomUUID(),
        name: 'Active Issues',
        description: 'Template for searching active issues',
        query: {
          criteria: [],
          rawQuery: 'status:Active',
          isValid: true
        },
        searchMode: 'raw',
        tags: ['work', 'issues'],
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0,
        isPublic: false
      },
      {
        id: crypto.randomUUID(),
        name: 'Recent Items',
        description: 'Template for recent items in the last week',
        query: {
          criteria: [],
          rawQuery: `created-date:>${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`,
          isValid: true
        },
        searchMode: 'raw',
        tags: ['recent', 'time-based'],
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0,
        isPublic: false
      }
    ];
    
    this.templates.set(defaultTemplates);
    this.saveToStorage();
  }
  
  private loadFromStorage(): void {
    try {
      // Load templates
      const storedTemplates = localStorage.getItem(this.STORAGE_KEY_TEMPLATES);
      if (storedTemplates) {
        const data = JSON.parse(storedTemplates);
        const templates = data.map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
          lastUsedAt: item.lastUsedAt ? new Date(item.lastUsedAt) : undefined
        }));
        
        const validTemplates = templates.filter((t: any) => this.isValidTemplate(t));
        this.templates.set(validTemplates);
      }
      
      // Load folders
      const storedFolders = localStorage.getItem(this.STORAGE_KEY_FOLDERS);
      if (storedFolders) {
        const data = JSON.parse(storedFolders);
        const folders = data.map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt)
        }));
        
        const validFolders = folders.filter((f: any) => this.isValidFolder(f));
        this.folders.set(validFolders);
      }
    } catch (e) {
      console.warn('Failed to load search templates from storage:', e);
      this.templates.set([]);
      this.folders.set([]);
    }
  }
  
  private saveToStorage(): void {
    try {
      // Save templates
      const templatesData = this.templates().map(template => ({
        ...template,
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
        lastUsedAt: template.lastUsedAt?.toISOString()
      }));
      localStorage.setItem(this.STORAGE_KEY_TEMPLATES, JSON.stringify(templatesData));
      
      // Save folders
      const foldersData = this.folders().map(folder => ({
        ...folder,
        createdAt: folder.createdAt.toISOString(),
        updatedAt: folder.updatedAt.toISOString()
      }));
      localStorage.setItem(this.STORAGE_KEY_FOLDERS, JSON.stringify(foldersData));
    } catch (e) {
      console.warn('Failed to save search templates to storage:', e);
    }
  }
}