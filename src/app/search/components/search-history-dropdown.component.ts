import { Component, input, output, signal, computed, inject, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchHistoryService, SearchHistoryEntry } from '../services/search-history.service';
import { SearchQuery } from '../models';

@Component({
  selector: 'app-search-history-dropdown',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="history-dropdown" *ngIf="isOpen()" (click)="$event.stopPropagation()">
      <div class="history-header">
        <div class="history-title">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0zM8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zm.5 4.75a.75.75 0 0 0-1.5 0v3.5a.75.75 0 0 0 .471.696l2.5 1a.75.75 0 0 0 .557-1.392L8.5 7.742V4.75z"/>
          </svg>
          Recent Searches
        </div>
        
        <div class="history-actions">
          <button 
            class="action-btn"
            type="button"
            (click)="toggleSearchMode()"
            [title]="showAllHistory() ? 'Show recent only' : 'Show all history'">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path *ngIf="!showAllHistory()" d="M6.5 1a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1 0-1h2.5V1.5a.5.5 0 0 1 .5-.5zm4.243 2.757a.5.5 0 0 1 0 .707L9.536 5.671l1.207 1.207a.5.5 0 0 1-.707.707L8.829 6.378 7.622 7.585a.5.5 0 1 1-.707-.707L8.122 5.671 6.915 4.464a.5.5 0 0 1 .707-.707L8.829 4.964l1.207-1.207a.5.5 0 0 1 .707 0z"/>
              <path *ngIf="showAllHistory()" d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
            </svg>
          </button>
          
          <button 
            class="action-btn"
            type="button"
            (click)="clearHistory()"
            title="Clear all history"
            [disabled]="displayedEntries().length === 0">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
              <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
            </svg>
          </button>
        </div>
      </div>
      
      <div class="history-search" *ngIf="showAllHistory()">
        <input
          class="history-search-input"
          type="text"
          placeholder="Search history..."
          [value]="searchTerm()"
          (input)="onSearchInput($event)"
          (keydown)="onSearchKeyDown($event)">
      </div>
      
      <div class="history-list">
        @if (displayedEntries().length === 0) {
          <div class="no-history">
            <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
              <path d="M5 6.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0zm0 3.5a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0zm4.75-3.5a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0zm0 3.5a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0z"/>
            </svg>
            <span>{{ searchTerm() ? 'No matching searches found' : 'No recent searches' }}</span>
          </div>
        } @else {
          @for (entry of displayedEntries(); track entry.id) {
            <div class="history-item" 
                 (click)="selectHistoryEntry(entry)"
                 [class.highlighted]="selectedIndex() === $index">
              <div class="history-item-main">
                <div class="history-display-text">{{ entry.displayText }}</div>
                <div class="history-metadata">
                  <span class="history-mode" [class]="'mode-' + entry.searchMode">
                    {{ entry.searchMode === 'raw' ? 'Raw' : 'Visual' }}
                  </span>
                  <span class="history-time">{{ formatTime(entry.timestamp) }}</span>
                </div>
              </div>
              
              <button 
                class="remove-history-btn"
                type="button"
                (click)="removeHistoryEntry(entry, $event)"
                title="Remove from history">
                <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M.293.293a1 1 0 011.414 0L8 6.586 14.293.293a1 1 0 111.414 1.414L9.414 8l6.293 6.293a1 1 0 01-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 01-1.414-1.414L6.586 8 .293 1.707a1 1 0 010-1.414z"/>
                </svg>
              </button>
            </div>
          }
        }
      </div>
      
      <div class="history-footer" *ngIf="displayedEntries().length > 0">
        <div class="history-stats">
          {{ displayedEntries().length }} of {{ allHistoryEntries().length }} searches
        </div>
        <div class="history-shortcuts">
          <kbd>↑↓</kbd> Navigate <kbd>Enter</kbd> Select <kbd>Esc</kbd> Close
        </div>
      </div>
    </div>
  `,
  styleUrl: './search-history-dropdown.component.scss'
})
export class SearchHistoryDropdownComponent {
  private historyService = inject(SearchHistoryService);
  
  // Inputs
  readonly isOpen = input<boolean>(false);
  
  // Outputs
  readonly select = output<SearchHistoryEntry>();
  readonly close = output<void>();
  
  // Internal state
  protected readonly showAllHistory = signal<boolean>(false);
  protected readonly searchTerm = signal<string>('');
  protected readonly selectedIndex = signal<number>(0);
  
  // Computed values
  protected readonly allHistoryEntries = computed(() => this.historyService.getHistory()());
  
  protected readonly displayedEntries = computed(() => {
    const entries = this.allHistoryEntries();
    
    if (!this.showAllHistory()) {
      return entries.slice(0, 5); // Show recent 5
    }
    
    const term = this.searchTerm().trim();
    if (!term) {
      return entries;
    }
    
    return this.historyService.searchHistory(term);
  });
  
  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.isOpen()) return;
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        const nextIndex = Math.min(
          this.selectedIndex() + 1, 
          this.displayedEntries().length - 1
        );
        this.selectedIndex.set(nextIndex);
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        const prevIndex = Math.max(this.selectedIndex() - 1, 0);
        this.selectedIndex.set(prevIndex);
        break;
        
      case 'Enter':
        event.preventDefault();
        const selectedEntry = this.displayedEntries()[this.selectedIndex()];
        if (selectedEntry) {
          this.selectHistoryEntry(selectedEntry);
        }
        break;
        
      case 'Escape':
        event.preventDefault();
        this.close.emit();
        break;
    }
  }
  
  protected selectHistoryEntry(entry: SearchHistoryEntry): void {
    this.select.emit(entry);
  }
  
  protected removeHistoryEntry(entry: SearchHistoryEntry, event: Event): void {
    event.stopPropagation();
    this.historyService.removeFromHistory(entry.id);
    
    // Adjust selected index if needed
    const currentSelected = this.selectedIndex();
    const entries = this.displayedEntries();
    if (currentSelected >= entries.length - 1) {
      this.selectedIndex.set(Math.max(0, entries.length - 2));
    }
  }
  
  protected clearHistory(): void {
    if (confirm('Are you sure you want to clear all search history? This action cannot be undone.')) {
      this.historyService.clearHistory();
      this.selectedIndex.set(0);
      this.searchTerm.set('');
    }
  }
  
  protected toggleSearchMode(): void {
    this.showAllHistory.set(!this.showAllHistory());
    this.searchTerm.set('');
    this.selectedIndex.set(0);
  }
  
  protected onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
    this.selectedIndex.set(0);
  }
  
  protected onSearchKeyDown(event: KeyboardEvent): void {
    // Let parent handle navigation keys
    if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(event.key)) {
      return;
    }
  }
  
  protected formatTime(timestamp: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return timestamp.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: timestamp.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }
}