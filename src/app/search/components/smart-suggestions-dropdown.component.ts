import { Component, input, output, signal, computed, inject, HostListener, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchSuggestionsService, SuggestionItem, SuggestionContext } from '../services/search-suggestions.service';
import { SearchType } from '../models';

@Component({
  selector: 'app-smart-suggestions-dropdown',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="smart-suggestions-dropdown" *ngIf="isOpen() && displayedSuggestions().length > 0" 
         (click)="$event.stopPropagation()">
      <div class="suggestions-header" *ngIf="showHeader()">
        <div class="suggestions-title">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.287 5.906c-.778.324-2.334.994-4.666 2.01-.378.15-.577.298-.595.442-.03.243.275.339.69.47l.175.055c.408.133.958.288 1.243.294.26.006.549-.1.868-.32 2.179-1.471 3.304-2.214 3.374-2.23.05-.012.12-.026.166.016.047.041.042.12.037.141-.03.129-1.227 1.241-1.846 1.817-.193.18-.33.307-.358.336a8.154 8.154 0 0 1-.188.186c-.38.366-.664.64.015 1.088.327.216.589.393.85.571.284.194.568.387.936.629.093.06.183.125.27.187.331.236.63.448.997.414.214-.02.435-.22.547-.82.265-1.417.786-4.486.906-5.751a1.426 1.426 0 0 0-.013-.315.337.337 0 0 0-.114-.217.526.526 0 0 0-.31-.093c-.3.005-.763.166-2.984 1.09z"/>
          </svg>
          Smart Suggestions
        </div>
        <div class="suggestions-info">
          Based on your search patterns
        </div>
      </div>
      
      <div class="suggestions-list">
        @for (suggestion of displayedSuggestions(); track suggestion.id; let i = $index) {
          <div class="suggestion-item" 
               [class.highlighted]="selectedIndex() === i"
               [class]="'suggestion-' + suggestion.type"
               [attr.data-category]="suggestion.category"
               (click)="selectSuggestion(suggestion)"
               (mouseenter)="setSelectedIndex(i)">
            
            <div class="suggestion-icon">
              @if (suggestion.icon) {
                <span class="custom-icon">{{ suggestion.icon }}</span>
              } @else {
                @switch (suggestion.type) {
                  @case ('criteria') {
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M1.5 2.5A1.5 1.5 0 0 1 3 1h10a1.5 1.5 0 0 1 1.5 1.5v3A1.5 1.5 0 0 1 13 7H3a1.5 1.5 0 0 1-1.5-1.5v-3zM3 2a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5H3z"/>
                    </svg>
                  }
                  @case ('value') {
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                    </svg>
                  }
                  @case ('operator') {
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2Z"/>
                    </svg>
                  }
                  @case ('template') {
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M2 4.75A.75.75 0 0 1 2.75 4h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75zM2 8a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 8zm0 3.25a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75z"/>
                    </svg>
                  }
                  @case ('completion') {
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                      <path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z"/>
                    </svg>
                  }
                  @default {
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8z"/>
                    </svg>
                  }
                }
              }
            </div>
            
            <div class="suggestion-content">
              <div class="suggestion-label">
                {{ suggestion.label }}
              </div>
              <div class="suggestion-description" *ngIf="suggestion.description">
                {{ suggestion.description }}
              </div>
              <div class="suggestion-meta" *ngIf="suggestion.reason">
                <span class="suggestion-reason">{{ getReasonLabel(suggestion.reason) }}</span>
                <span class="suggestion-score" *ngIf="showScores()">
                  {{ (suggestion.score * 100) | number:'1.0-0' }}%
                </span>
              </div>
            </div>
            
            <div class="suggestion-badge" [class]="'badge-' + suggestion.type">
              {{ getTypeBadge(suggestion.type) }}
            </div>
          </div>
        }
      </div>
      
      <div class="suggestions-footer" *ngIf="displayedSuggestions().length > 0">
        <div class="suggestions-stats">
          {{ displayedSuggestions().length }} intelligent suggestions
        </div>
        <div class="suggestions-shortcuts">
          <kbd>↑↓</kbd> Navigate <kbd>Enter</kbd> Select <kbd>Tab</kbd> Accept <kbd>Esc</kbd> Close
        </div>
      </div>
      
      <!-- Category separator lines -->
      <div class="category-separators">
        @for (category of getVisibleCategories(); track category) {
          <div class="category-separator" [attr.data-category]="category">
            <span class="category-label">{{ getCategoryLabel(category) }}</span>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './smart-suggestions-dropdown.component.scss'
})
export class SmartSuggestionsDropdownComponent {
  private suggestionsService = inject(SearchSuggestionsService);
  
  constructor() {
    // Reset selected index when suggestions change
    effect(() => {
      const suggestions = this.displayedSuggestions();
      // Reset to 0 when suggestions change, but ensure it's within bounds
      if (suggestions.length > 0 && this.selectedIndex() >= suggestions.length) {
        this.selectedIndex.set(0);
      } else if (suggestions.length === 0) {
        this.selectedIndex.set(0);
      }
    });
  }
  
  // Inputs
  readonly isOpen = input<boolean>(false);
  readonly context = input.required<SuggestionContext>();
  readonly showHeader = input<boolean>(true);
  readonly showScores = input<boolean>(false);
  readonly maxSuggestions = input<number>(8);
  
  // Outputs
  readonly select = output<SuggestionItem>();
  readonly close = output<void>();
  
  // Internal state
  protected readonly selectedIndex = signal<number>(0);
  
  // Computed values
  protected readonly displayedSuggestions = computed(() => {
    const ctx = this.context();
    if (!ctx) return [];
    
    const suggestions = this.suggestionsService.getSuggestions(ctx);
    return suggestions.slice(0, this.maxSuggestions());
  });
  
  protected readonly getVisibleCategories = computed(() => {
    const categories = new Set<string>();
    this.displayedSuggestions().forEach(suggestion => {
      if (suggestion.category) {
        categories.add(suggestion.category);
      }
    });
    return Array.from(categories);
  });
  
  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.isOpen()) return;
    
    const suggestions = this.displayedSuggestions();
    if (suggestions.length === 0) return;
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        const nextIndex = Math.min(this.selectedIndex() + 1, suggestions.length - 1);
        this.selectedIndex.set(nextIndex);
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        const prevIndex = Math.max(this.selectedIndex() - 1, 0);
        this.selectedIndex.set(prevIndex);
        break;
        
      case 'Enter':
      case 'Tab':
        event.preventDefault();
        const selectedSuggestion = suggestions[this.selectedIndex()];
        if (selectedSuggestion) {
          this.selectSuggestion(selectedSuggestion);
        }
        break;
        
      case 'Escape':
        event.preventDefault();
        this.close.emit();
        break;
    }
  }
  
  protected selectSuggestion(suggestion: SuggestionItem): void {
    // Track the selection for learning
    this.suggestionsService.trackBehavior('suggestion_selected', {
      suggestionId: suggestion.id,
      suggestionType: suggestion.type,
      reason: suggestion.reason,
      score: suggestion.score,
      context: this.context()
    });
    
    this.select.emit(suggestion);
  }
  
  protected setSelectedIndex(index: number): void {
    this.selectedIndex.set(index);
  }
  
  protected getReasonLabel(reason: string): string {
    const reasonLabels: { [key: string]: string } = {
      'frequently_used': 'Frequently used',
      'related_pattern': 'Related to current search',
      'auto_complete': 'Auto-completion',
      'frequent_value': 'Common value',
      'operator_pattern': 'Common operator',
      'relevant_template': 'Relevant template',
      'recent_query': 'Recent search',
      'behavior_pattern': 'Based on your patterns'
    };
    
    return reasonLabels[reason] || reason;
  }
  
  protected getTypeBadge(type: string): string {
    const badges: { [key: string]: string } = {
      'criteria': 'Field',
      'value': 'Value',
      'operator': 'Op',
      'template': 'Template',
      'completion': 'Complete'
    };
    
    return badges[type] || type;
  }
  
  protected getCategoryLabel(category: string): string {
    const categoryLabels: { [key: string]: string } = {
      'types': 'Search Fields',
      'values': 'Values',
      'operators': 'Operators',
      'templates': 'Templates',
      'completions': 'Auto-Complete',
      'patterns': 'Patterns'
    };
    
    return categoryLabels[category] || category;
  }
  
}