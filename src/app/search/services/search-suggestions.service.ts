import { Injectable, signal, computed } from '@angular/core';
import { SearchCriteria, SearchQuery, SearchType, SearchOperatorType, SearchValueType } from '../models';
import { SearchHistoryService, SearchHistoryEntry } from './search-history.service';
import { SearchTemplatesService, SearchTemplate } from './search-templates.service';

export interface SuggestionItem {
  id: string;
  type: 'criteria' | 'value' | 'operator' | 'template' | 'completion';
  label: string;
  description?: string;
  value: any;
  score: number;
  reason?: string;
  icon?: string;
  category?: string;
}

export interface BehaviorPattern {
  id: string;
  pattern: string;
  frequency: number;
  lastUsed: Date;
  confidence: number;
  relatedTypes: string[];
  commonValues: { [key: string]: number };
}

export interface SuggestionContext {
  currentCriteria: SearchCriteria[];
  currentInput: string;
  searchType?: SearchType;
  recentSearches: SearchHistoryEntry[];
  availableTypes: SearchType[];
  position: number;
}

@Injectable({
  providedIn: 'root'
})
export class SearchSuggestionsService {
  private readonly STORAGE_KEY = 'github-search-behavior-patterns';
  private readonly MAX_SUGGESTIONS = 10;
  private readonly MIN_CONFIDENCE = 0.3;
  
  private readonly behaviorPatterns = signal<BehaviorPattern[]>([]);
  private readonly recentInteractions = signal<string[]>([]);
  
  constructor(
    private historyService: SearchHistoryService,
    private templatesService: SearchTemplatesService
  ) {
    this.loadFromStorage();
    this.initializeBehaviorTracking();
  }
  
  /**
   * Generate a unique key for deduplication of suggestions
   */
  private generateSuggestionKey(suggestion: SuggestionItem): string {
    const valueKey = suggestion.value && typeof suggestion.value === 'object' && 'id' in suggestion.value
      ? (suggestion.value as any).id 
      : String(suggestion.value);
    
    return `${suggestion.type}-${suggestion.label}-${valueKey}`;
  }

  /**
   * Get intelligent suggestions based on context
   */
  getSuggestions(context: SuggestionContext): SuggestionItem[] {
    const suggestions: SuggestionItem[] = [];
    
    // Add different types of suggestions
    suggestions.push(...this.getTypeSuggestions(context));
    suggestions.push(...this.getValueSuggestions(context));
    suggestions.push(...this.getOperatorSuggestions(context));
    suggestions.push(...this.getTemplateSuggestions(context));
    suggestions.push(...this.getCompletionSuggestions(context));
    suggestions.push(...this.getBehaviorBasedSuggestions(context));
    
    // Remove duplicates based on a combination of type, label, and value
    const uniqueSuggestions = new Map<string, SuggestionItem>();
    suggestions.forEach(suggestion => {
      const key = this.generateSuggestionKey(suggestion);
      const existing = uniqueSuggestions.get(key);
      
      // Keep the suggestion with the higher score
      if (!existing || suggestion.score > existing.score) {
        uniqueSuggestions.set(key, suggestion);
      }
    });
    
    // Sort by relevance score and return top suggestions
    return Array.from(uniqueSuggestions.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, this.MAX_SUGGESTIONS);
  }
  
  /**
   * Track user behavior for learning
   */
  trackBehavior(action: string, context: any): void {
    const timestamp = new Date().toISOString();
    const interaction = `${action}:${JSON.stringify(context)}:${timestamp}`;
    
    const recent = this.recentInteractions();
    this.recentInteractions.set([interaction, ...recent.slice(0, 99)]);
    
    this.updateBehaviorPatterns(action, context);
    this.saveToStorage();
  }
  
  /**
   * Get frequently used search types
   */
  getFrequentTypes(): { type: SearchType; frequency: number }[] {
    const history = this.historyService.getHistory()();
    const typeFrequency = new Map<string, { type: SearchType; count: number }>();
    
    history.forEach(entry => {
      entry.query.criteria.forEach(criteria => {
        const key = criteria.type.id;
        const existing = typeFrequency.get(key);
        if (existing) {
          existing.count++;
        } else {
          typeFrequency.set(key, { type: criteria.type, count: 1 });
        }
      });
    });
    
    return Array.from(typeFrequency.values())
      .map(item => ({ type: item.type, frequency: item.count }))
      .sort((a, b) => b.frequency - a.frequency);
  }
  
  /**
   * Get frequently used values for a search type
   */
  getFrequentValues(typeId: string, limit: number = 5): { value: any; frequency: number }[] {
    const history = this.historyService.getHistory()();
    const valueFrequency = new Map<string, number>();
    
    history.forEach(entry => {
      entry.query.criteria.forEach(criteria => {
        if (criteria.type.id === typeId && criteria.value) {
          const key = String(criteria.value);
          valueFrequency.set(key, (valueFrequency.get(key) || 0) + 1);
        }
      });
    });
    
    return Array.from(valueFrequency.entries())
      .map(([value, frequency]) => ({ value, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit);
  }
  
  /**
   * Get smart completions for partial input
   */
  getSmartCompletions(input: string, searchType?: SearchType): string[] {
    if (!input || input.length < 2) return [];
    
    const completions = new Set<string>();
    const inputLower = input.toLowerCase();
    
    // Get completions from history
    const history = this.historyService.getHistory()();
    history.forEach(entry => {
      entry.query.criteria.forEach(criteria => {
        if (!searchType || criteria.type.id === searchType.id) {
          const value = String(criteria.value || '').toLowerCase();
          if (value.includes(inputLower) && value !== inputLower) {
            completions.add(String(criteria.value));
          }
        }
      });
    });
    
    // Get completions from templates
    const templates = this.templatesService.getTemplates()();
    templates.forEach(template => {
      template.query.criteria.forEach(criteria => {
        if (!searchType || criteria.type.id === searchType.id) {
          const value = String(criteria.value || '').toLowerCase();
          if (value.includes(inputLower) && value !== inputLower) {
            completions.add(String(criteria.value));
          }
        }
      });
    });
    
    return Array.from(completions).slice(0, 8);
  }
  
  
  private getTypeSuggestions(context: SuggestionContext): SuggestionItem[] {
    const suggestions: SuggestionItem[] = [];
    const currentTypeIds = context.currentCriteria.map(c => c.type.id);
    
    // Use availableTypes from context instead of potentially corrupted types from history
    const availableTypesMap = new Map(context.availableTypes.map(type => [type.id, type]));
    
    // Suggest frequently used types not already in use
    const frequentTypes = this.getFrequentTypes();
    frequentTypes.forEach(({ type, frequency }) => {
      if (!currentTypeIds.includes(type.id)) {
        // Get the complete SearchType from availableTypes instead of using the one from history
        const completeType = availableTypesMap.get(type.id);
        if (completeType) {
          suggestions.push({
            id: `type-${completeType.id}`,
            type: 'criteria',
            label: completeType.label,
            description: `Used ${frequency} times recently`,
            value: completeType, // Use the complete type object
            score: Math.min(frequency * 0.1, 1.0),
            reason: 'frequently_used',
            category: 'types'
          });
        }
      }
    });
    
    // Suggest related types based on patterns
    const relatedTypes = this.getRelatedTypes(context.currentCriteria, context.availableTypes);
    relatedTypes.forEach(type => {
      if (!currentTypeIds.includes(type.id)) {
        suggestions.push({
          id: `related-${type.id}`,
          type: 'criteria',
          label: type.label,
          description: type.description,
          value: type,
          score: 0.8,
          reason: 'related_pattern',
          category: 'types'
        });
      }
    });
    
    return suggestions;
  }
  
  private getValueSuggestions(context: SuggestionContext): SuggestionItem[] {
    const suggestions: SuggestionItem[] = [];
    
    if (!context.searchType || !context.currentInput) return suggestions;
    
    // Smart completions
    const completions = this.getSmartCompletions(context.currentInput, context.searchType);
    completions.forEach((completion, index) => {
      suggestions.push({
        id: `completion-${index}`,
        type: 'completion',
        label: completion,
        description: 'From your search history',
        value: completion,
        score: 0.9 - (index * 0.1),
        reason: 'auto_complete',
        category: 'values'
      });
    });
    
    // Frequent values for this type
    const frequentValues = this.getFrequentValues(context.searchType.id);
    frequentValues.forEach(({ value, frequency }) => {
      if (!context.currentInput || 
          String(value).toLowerCase().includes(context.currentInput.toLowerCase())) {
        suggestions.push({
          id: `frequent-${context.searchType!.id}-${value}`,
          type: 'value',
          label: String(value),
          description: `Used ${frequency} times`,
          value: value,
          score: Math.min(frequency * 0.2, 0.8),
          reason: 'frequent_value',
          category: 'values'
        });
      }
    });
    
    return suggestions;
  }
  
  private getOperatorSuggestions(context: SuggestionContext): SuggestionItem[] {
    const suggestions: SuggestionItem[] = [];
    
    if (!context.searchType) return suggestions;
    
    // Get operator usage patterns for this type
    const patterns = this.behaviorPatterns();
    const operatorUsage = new Map<SearchOperatorType, number>();
    
    patterns.forEach(pattern => {
      if (pattern.relatedTypes.includes(context.searchType!.id)) {
        // Extract operator usage from pattern (simplified)
        Object.entries(pattern.commonValues).forEach(([key, count]) => {
          if (key.startsWith('operator:')) {
            const operatorType = parseInt(key.split(':')[1]) as unknown as SearchOperatorType;
            operatorUsage.set(operatorType, (operatorUsage.get(operatorType) || 0) + count);
          }
        });
      }
    });
    
    // Convert to suggestions (simplified - would need full operator definitions)
    operatorUsage.forEach((count, operatorType) => {
      suggestions.push({
        id: `operator-${operatorType}`,
        type: 'operator',
        label: this.getOperatorLabel(operatorType),
        description: `Used ${count} times with ${context.searchType!.label}`,
        value: operatorType,
        score: Math.min(count * 0.1, 0.7),
        reason: 'operator_pattern',
        category: 'operators'
      });
    });
    
    return suggestions;
  }
  
  private getTemplateSuggestions(context: SuggestionContext): SuggestionItem[] {
    const suggestions: SuggestionItem[] = [];
    const templates = this.templatesService.getMostUsedTemplates(3);
    
    templates.forEach(template => {
      // Check if template is relevant to current context
      const relevanceScore = this.calculateTemplateRelevance(template, context);
      
      if (relevanceScore > 0.3) {
        suggestions.push({
          id: `template-${template.id}`,
          type: 'template',
          label: template.name,
          description: template.description || `Used ${template.usageCount} times`,
          value: template,
          score: relevanceScore,
          reason: 'relevant_template',
          category: 'templates',
          icon: template.icon
        });
      }
    });
    
    return suggestions;
  }
  
  private getCompletionSuggestions(context: SuggestionContext): SuggestionItem[] {
    const suggestions: SuggestionItem[] = [];
    
    if (context.currentInput && context.currentInput.length > 1) {
      const input = context.currentInput.toLowerCase();
      
      // Search through recent queries for completions
      context.recentSearches.forEach(entry => {
        if (entry.rawQuery.toLowerCase().includes(input)) {
          suggestions.push({
            id: `recent-query-${entry.id}`,
            type: 'completion',
            label: entry.rawQuery,
            description: `From ${this.formatDate(entry.timestamp)}`,
            value: entry.rawQuery,
            score: 0.6,
            reason: 'recent_query',
            category: 'completions'
          });
        }
      });
    }
    
    return suggestions;
  }
  
  private getBehaviorBasedSuggestions(context: SuggestionContext): SuggestionItem[] {
    const suggestions: SuggestionItem[] = [];
    const patterns = this.behaviorPatterns();
    const availableTypesMap = new Map(context.availableTypes.map(type => [type.id, type]));
    
    // Find patterns that match current context and suggest missing types from those patterns
    patterns.forEach(pattern => {
      if (pattern.confidence > this.MIN_CONFIDENCE) {
        const currentTypes = context.currentCriteria.map(c => c.type.id);
        const hasOverlap = currentTypes.some(type => pattern.relatedTypes.includes(type));
        
        if (hasOverlap || currentTypes.length === 0) {
          // Suggest the individual types from this pattern that aren't already selected
          pattern.relatedTypes.forEach(typeId => {
            if (!currentTypes.includes(typeId)) {
              const completeType = availableTypesMap.get(typeId);
              if (completeType) {
                suggestions.push({
                  id: `pattern-type-${pattern.id}-${typeId}`,
                  type: 'criteria',
                  label: completeType.label,
                  description: `From pattern "${pattern.pattern}" (used ${pattern.frequency} times)`,
                  value: completeType,
                  score: pattern.confidence * 0.6,
                  reason: 'behavior_pattern',
                  category: 'patterns'
                });
              }
            }
          });
        }
      }
    });
    
    return suggestions;
  }
  
  private updateBehaviorPatterns(action: string, context: any): void {
    if (action === 'search_executed' && context.criteria) {
      const typeIds = context.criteria.map((c: SearchCriteria) => c.type.id).sort();
      const patternId = typeIds.join('+');
      
      const patterns = this.behaviorPatterns();
      const existingIndex = patterns.findIndex(p => p.id === patternId);
      
      if (existingIndex >= 0) {
        // Update existing pattern
        const updated = [...patterns];
        updated[existingIndex] = {
          ...updated[existingIndex],
          frequency: updated[existingIndex].frequency + 1,
          lastUsed: new Date(),
          confidence: Math.min(updated[existingIndex].confidence + 0.1, 1.0)
        };
        this.behaviorPatterns.set(updated);
      } else {
        // Create new pattern
        const newPattern: BehaviorPattern = {
          id: patternId,
          pattern: typeIds.map((id: string) => this.getTypeLabel(id)).join(' + '),
          frequency: 1,
          lastUsed: new Date(),
          confidence: 0.5,
          relatedTypes: typeIds,
          commonValues: {}
        };
        
        this.behaviorPatterns.set([newPattern, ...patterns.slice(0, 49)]);
      }
    }
  }
  
  private calculateTemplateRelevance(template: SearchTemplate, context: SuggestionContext): number {
    let score = 0;
    
    // Base score from usage
    score += Math.min(template.usageCount * 0.1, 0.4);
    
    // Boost if template has similar types to current criteria
    const templateTypes = template.query.criteria.map(c => c.type.id);
    const currentTypes = context.currentCriteria.map(c => c.type.id);
    const overlap = templateTypes.filter(t => currentTypes.includes(t)).length;
    
    if (overlap > 0) {
      score += overlap * 0.3;
    }
    
    // Boost if recently used
    if (template.lastUsedAt) {
      const daysSinceUsed = (Date.now() - template.lastUsedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUsed < 7) {
        score += 0.2;
      }
    }
    
    return Math.min(score, 1.0);
  }
  
  private initializeBehaviorTracking(): void {
    // Clean up old interactions (keep only last 100)
    const recent = this.recentInteractions();
    if (recent.length > 100) {
      this.recentInteractions.set(recent.slice(0, 100));
    }
    
    // Clean up old patterns
    const patterns = this.behaviorPatterns();
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days
    const activePatterns = patterns.filter(p => p.lastUsed > cutoffDate);
    
    if (activePatterns.length !== patterns.length) {
      this.behaviorPatterns.set(activePatterns);
    }
  }
  
  private getTypeLabel(typeId: string): string {
    const labelMap: { [key: string]: string } = {
      'branch-name': 'Branch Name',
      'iteration': 'Iteration',
      'status': 'Status',
      'created-date': 'Created Date',
      'assignee': 'Assignee'
    };
    return labelMap[typeId] || typeId;
  }
  
  private getOperatorLabel(operatorType: SearchOperatorType): string {
    const labelMap = new Map<SearchOperatorType, string>([
      [SearchOperatorType.CONTAINS, 'contains'],
      [SearchOperatorType.EQUALS, 'equals'],
      [SearchOperatorType.GREATER_THAN, 'greater than'],
      [SearchOperatorType.LESS_THAN, 'less than'],
      [SearchOperatorType.STARTS_WITH, 'starts with'],
      [SearchOperatorType.ENDS_WITH, 'ends with'],
      [SearchOperatorType.NOT_EQUALS, 'not equals'],
      [SearchOperatorType.GREATER_EQUAL, 'greater than or equal'],
      [SearchOperatorType.LESS_EQUAL, 'less than or equal'],
      [SearchOperatorType.IN, 'in'],
      [SearchOperatorType.IS_EMPTY, 'is empty'],
      [SearchOperatorType.IS_NOT_EMPTY, 'is not empty']
    ]);
    return labelMap.get(operatorType) || 'unknown';
  }
  
  private formatDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  }
  
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        const patterns = data.patterns?.map((p: any) => ({
          ...p,
          lastUsed: new Date(p.lastUsed)
        })) || [];
        
        this.behaviorPatterns.set(patterns);
        this.recentInteractions.set(data.interactions || []);
      }
    } catch (e) {
      console.warn('Failed to load behavior patterns from storage:', e);
      this.behaviorPatterns.set([]);
      this.recentInteractions.set([]);
    }
  }
  
  private saveToStorage(): void {
    try {
      const data = {
        patterns: this.behaviorPatterns().map(p => ({
          ...p,
          lastUsed: p.lastUsed.toISOString()
        })),
        interactions: this.recentInteractions(),
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save behavior patterns to storage:', e);
    }
  }

  /**
   * Get related search types based on behavior patterns
   * Uses availableTypes to ensure complete SearchType objects
   */
  private getRelatedTypes(currentCriteria: SearchCriteria[], availableTypes: SearchType[]): SearchType[] {
    const patterns = this.behaviorPatterns();
    const currentTypeIds = currentCriteria.map(c => c.type.id);
    const relatedTypeIds = new Set<string>();
    const availableTypesMap = new Map(availableTypes.map(type => [type.id, type]));
    
    // Find patterns that include current types
    patterns.forEach(pattern => {
      const hasOverlap = currentTypeIds.some(typeId => 
        pattern.relatedTypes.includes(typeId)
      );
      
      if (hasOverlap && pattern.confidence > this.MIN_CONFIDENCE) {
        pattern.relatedTypes.forEach(typeId => {
          if (!currentTypeIds.includes(typeId)) {
            relatedTypeIds.add(typeId);
          }
        });
      }
    });
    
    // Return complete SearchType objects from availableTypes
    return Array.from(relatedTypeIds)
      .map(typeId => availableTypesMap.get(typeId))
      .filter((type): type is SearchType => type !== undefined);
  }
}