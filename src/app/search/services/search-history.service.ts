import { Injectable, signal } from '@angular/core';
import { SearchQuery } from '../models';

export interface SearchHistoryEntry {
  id: string;
  query: SearchQuery;
  searchMode: 'visual' | 'raw';
  timestamp: Date;
  displayText: string;
  rawQuery: string;
}

@Injectable({
  providedIn: 'root'
})
export class SearchHistoryService {
  private readonly STORAGE_KEY = 'github-search-history';
  private readonly MAX_HISTORY_SIZE = 20;
  
  private readonly historyEntries = signal<SearchHistoryEntry[]>([]);
  
  constructor() {
    this.loadFromStorage();
  }
  
  /**
   * Get all history entries as a signal
   */
  getHistory() {
    return this.historyEntries.asReadonly();
  }
  
  /**
   * Add a new search to history
   */
  addToHistory(query: SearchQuery, searchMode: 'visual' | 'raw'): void {
    // Don't add empty queries
    if (query.criteria.length === 0 && (!query.rawQuery || query.rawQuery.trim() === '')) {
      return;
    }
    
    // Don't add duplicate consecutive entries
    const currentHistory = this.historyEntries();
    if (currentHistory.length > 0) {
      const lastEntry = currentHistory[0];
      if (lastEntry.rawQuery === query.rawQuery && lastEntry.searchMode === searchMode) {
        return;
      }
    }
    
    const entry: SearchHistoryEntry = {
      id: crypto.randomUUID(),
      query: { ...query },
      searchMode,
      timestamp: new Date(),
      displayText: this.generateDisplayText(query, searchMode),
      rawQuery: query.rawQuery || ''
    };
    
    // Add to beginning of array (most recent first)
    const updated = [entry, ...currentHistory].slice(0, this.MAX_HISTORY_SIZE);
    this.historyEntries.set(updated);
    
    this.saveToStorage();
  }
  
  /**
   * Remove a specific entry from history
   */
  removeFromHistory(id: string): void {
    const updated = this.historyEntries().filter(entry => entry.id !== id);
    this.historyEntries.set(updated);
    this.saveToStorage();
  }
  
  /**
   * Clear all history
   */
  clearHistory(): void {
    this.historyEntries.set([]);
    this.saveToStorage();
  }
  
  /**
   * Get recent searches (last 5)
   */
  getRecentSearches(limit: number = 5): SearchHistoryEntry[] {
    return this.historyEntries().slice(0, limit);
  }
  
  /**
   * Search through history entries
   */
  searchHistory(searchTerm: string): SearchHistoryEntry[] {
    if (!searchTerm.trim()) {
      return this.historyEntries();
    }
    
    const term = searchTerm.toLowerCase();
    return this.historyEntries().filter(entry => 
      entry.displayText.toLowerCase().includes(term) ||
      entry.rawQuery.toLowerCase().includes(term)
    );
  }
  
  /**
   * Get frequently used search types
   */
  getFrequentSearchTypes(): { type: string; count: number }[] {
    const typeCounts = new Map<string, number>();
    
    this.historyEntries().forEach(entry => {
      entry.query.criteria.forEach(criteria => {
        const key = criteria.type.id;
        typeCounts.set(key, (typeCounts.get(key) || 0) + 1);
      });
    });
    
    return Array.from(typeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
  
  /**
   * Export history as JSON
   */
  exportHistory(): string {
    const exportData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      entries: this.historyEntries().map(entry => ({
        ...entry,
        timestamp: entry.timestamp.toISOString()
      }))
    };
    
    return JSON.stringify(exportData, null, 2);
  }
  
  /**
   * Import history from JSON
   */
  importHistory(jsonData: string): { success: boolean; message: string; imported: number } {
    try {
      const data = JSON.parse(jsonData);
      
      if (!data.entries || !Array.isArray(data.entries)) {
        return { success: false, message: 'Invalid history format', imported: 0 };
      }
      
      const validEntries: SearchHistoryEntry[] = [];
      
      for (const entry of data.entries) {
        try {
          const historyEntry: SearchHistoryEntry = {
            id: entry.id || crypto.randomUUID(),
            query: entry.query,
            searchMode: entry.searchMode || 'visual',
            timestamp: new Date(entry.timestamp),
            displayText: entry.displayText || this.generateDisplayText(entry.query, entry.searchMode),
            rawQuery: entry.rawQuery || ''
          };
          
          if (this.isValidHistoryEntry(historyEntry)) {
            validEntries.push(historyEntry);
          }
        } catch (e) {
          // Skip invalid entries
          continue;
        }
      }
      
      if (validEntries.length === 0) {
        return { success: false, message: 'No valid history entries found', imported: 0 };
      }
      
      // Merge with existing history, removing duplicates
      const currentHistory = this.historyEntries();
      const merged = [...validEntries, ...currentHistory];
      const deduped = this.removeDuplicates(merged);
      const final = deduped.slice(0, this.MAX_HISTORY_SIZE);
      
      this.historyEntries.set(final);
      this.saveToStorage();
      
      return { 
        success: true, 
        message: `Successfully imported ${validEntries.length} history entries`, 
        imported: validEntries.length 
      };
      
    } catch (e) {
      return { success: false, message: 'Invalid JSON format', imported: 0 };
    }
  }
  
  private generateDisplayText(query: SearchQuery, searchMode: 'visual' | 'raw'): string {
    if (searchMode === 'raw' && query.rawQuery && query.rawQuery.trim()) {
      return query.rawQuery;
    }
    
    if (query.criteria.length > 0) {
      return query.criteria
        .filter(c => c.isValid)
        .map(c => {
          const value = c.operator.requiresValue ? ` ${c.displayValue || c.value}` : '';
          return `${c.type.label} ${c.operator.label}${value}`;
        })
        .join(' AND ');
    }
    
    return query.rawQuery || 'Empty search';
  }
  
  private isValidHistoryEntry(entry: SearchHistoryEntry): boolean {
    return !!(
      entry.id &&
      entry.query &&
      entry.searchMode &&
      entry.timestamp &&
      entry.displayText &&
      (entry.query.criteria.length > 0 || entry.rawQuery.trim())
    );
  }
  
  private removeDuplicates(entries: SearchHistoryEntry[]): SearchHistoryEntry[] {
    const seen = new Set<string>();
    return entries.filter(entry => {
      const key = `${entry.rawQuery}-${entry.searchMode}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
  
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        const entries = data.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
        
        // Validate entries
        const validEntries = entries.filter((entry: any) => this.isValidHistoryEntry(entry));
        this.historyEntries.set(validEntries);
      }
    } catch (e) {
      console.warn('Failed to load search history from storage:', e);
      this.historyEntries.set([]);
    }
  }
  
  private saveToStorage(): void {
    try {
      const data = this.historyEntries().map(entry => ({
        ...entry,
        timestamp: entry.timestamp.toISOString()
      }));
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save search history to storage:', e);
    }
  }
}