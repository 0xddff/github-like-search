import { Component, input, output, signal, computed, inject, OnInit, OnDestroy, ElementRef, ViewChild, untracked } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { SearchTagComponent } from './search-tag.component';
import { SearchDefinitionComponent } from './search-definition.component';
import { SearchHistoryDropdownComponent } from './search-history-dropdown.component';
import { TemplateListComponent } from './template-list.component';
import { ExtendedTemplatesService, TemplatePreset } from '../services';
import { ExtendedSearchTemplate } from '../models';
import { SmartSuggestionsDropdownComponent } from './smart-suggestions-dropdown.component';
import { 
  SearchConfiguration, 
  SearchQuery, 
  SearchCriteria, 
  SearchType,
  SearchOperator,
  SearchOperatorType,
  LogicalOperator
} from '../models';
import { SearchConfigurationService, SearchValidationService, QueryParserService, UrlSyncService, SearchHistoryService, SearchHistoryEntry, DragDropService, SearchTemplatesService, SearchTemplate, SearchSuggestionsService, SuggestionItem, BulkOperationsService } from '../services';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, SearchTagComponent, SearchDefinitionComponent, SearchHistoryDropdownComponent, TemplateListComponent, SmartSuggestionsDropdownComponent],
  template: `
    <div class="search-container" [class.focused]="isFocused()">
      <!-- Search Mode Toggle -->
      <div class="search-mode-toggle">
        <button 
          class="mode-toggle-btn"
          [class.active]="!isRawQueryMode()"
          (click)="switchToVisualMode()"
          type="button">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2.5 3.5a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11zm0 4a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11zm0 4a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11z"/>
          </svg>
          Visual
        </button>
        <button 
          class="mode-toggle-btn"
          [class.active]="isRawQueryMode()"
          (click)="switchToRawQueryMode()"
          type="button">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M5.854 4.854a.5.5 0 1 0-.708-.708l-3.5 3.5a.5.5 0 0 0 0 .708l3.5 3.5a.5.5 0 0 0 .708-.708L2.707 8l3.147-3.146zm4.292 0a.5.5 0 0 1 .708-.708l3.5 3.5a.5.5 0 0 1 0 .708l-3.5 3.5a.5.5 0 0 1-.708-.708L13.293 8l-3.147-3.146z"/>
          </svg>
          Raw Query
        </button>
      </div>


      @if (!isRawQueryMode()) {
        <!-- Visual Mode -->
        <!-- Template List -->
        <app-template-list
          [currentCriteria]="searchCriteria()"
          [currentOperator]="currentLogicalOperator()"
          [appliedTemplate]="currentAppliedTemplate()"
          (templateApplied)="onTemplateApplied($event)"
          (templateCreationRequested)="onTemplateCreationRequested()">
        </app-template-list>
        
        <!-- Search Input Bar -->
        <div class="search-input-wrapper">
          <input 
            #searchInput
            type="text"
            class="search-input"
            placeholder="Search..."
            (focus)="onFocus()"
            (blur)="onBlur()"
            (input)="onInput($event)"
          />
          
          <div class="search-actions">
            <button 
              class="add-criteria-btn"
              type="button"
              (click)="openDefinitionModal()"
              title="Add search criteria">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z"/>
              </svg>
            </button>
            
            <button 
              class="history-btn"
              type="button"
              (click)="toggleHistoryDropdown()"
              [class.active]="showHistoryDropdown()"
              title="Search history">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0zM8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zm.5 4.75a.75.75 0 0 0-1.5 0v3.5a.75.75 0 0 0 .471.696l2.5 1a.75.75 0 0 0 .557-1.392L8.5 7.742V4.75z"/>
              </svg>
            </button>
            
          </div>
          
          <!-- Smart Suggestions Dropdown - positioned relative to input -->
          <app-smart-suggestions-dropdown
            [isOpen]="showSuggestions()"
            [context]="getSuggestionContext()"
            (select)="onSmartSuggestionSelect($event)"
            (close)="hideSuggestions()">
          </app-smart-suggestions-dropdown>
        </div>
        
        <!-- Active Search Criteria -->
        @if (searchCriteria().length > 0) {
          <div class="filters-bar">
            <div class="filters-content">
              <span class="filters-label">Filters ({{ searchCriteria().length }})</span>
              
              <div class="filters-tags">
                @for (criteria of searchCriteria(); track criteria.id; let i = $index) {
                  @if (i > 0) {
                    <span class="operator-connector">{{ currentLogicalOperator() }}</span>
                  }
                  <app-search-tag
                    [criteria]="criteria"
                    [index]="i"
                    [editable]="true"
                    [removable]="true"
                    [draggable]="searchCriteria().length > 1"
                    (edit)="editCriteria($event.id)"
                    (remove)="removeCriteria($event.id)"
                    (dragStart)="onCriteriaDragStart($event)"
                    (dragOver)="onCriteriaDragOver($event)"
                    (drop)="onCriteriaDrop($event)"
                    (dragEnd)="onCriteriaDragEnd()">
                  </app-search-tag>
                }
              </div>
            </div>
            
            <div class="filters-actions">
              @if (searchCriteria().length > 1) {
                <div class="operator-toggle">
                  <button 
                    class="operator-btn"
                    [class.active]="currentLogicalOperator() === 'AND'"
                    (click)="setLogicalOperator('AND')"
                    type="button"
                    title="All conditions must match">
                    AND
                  </button>
                  <button 
                    class="operator-btn"
                    [class.active]="currentLogicalOperator() === 'OR'"
                    (click)="setLogicalOperator('OR')"
                    type="button"
                    title="Any condition must match">
                    OR
                  </button>
                </div>
              }
              
              <button 
                class="clear-all-btn"
                type="button"
                (click)="clearAllCriteria()"
                title="Clear all filters">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M11.383 3.07904C11.7658 2.69625 12.3916 2.69625 12.7744 3.07904C13.1572 3.46182 13.1572 4.08758 12.7744 4.47037L8.24477 9L12.7744 13.5296C13.1572 13.9124 13.1572 14.5382 12.7744 14.921C12.3916 15.3037 11.7658 15.3037 11.383 14.921L6.85355 10.3914L2.32389 14.921C1.94111 15.3037 1.31535 15.3037 0.932567 14.921C0.549784 14.5382 0.549784 13.9124 0.932567 13.5296L5.46222 9L0.932567 4.47037C0.549784 4.08758 0.549784 3.46182 0.932567 3.07904C1.31535 2.69625 1.94111 2.69625 2.32389 3.07904L6.85355 7.60869L11.383 3.07904Z"/>
                </svg>
                Clear
              </button>
            </div>
          </div>
        }
        
        <!-- Empty State -->
        @if (searchCriteria().length === 0) {
          <div class="search-empty-state">
            <div class="empty-state-content">
              <svg class="empty-state-icon" width="48" height="48" viewBox="0 0 16 16" fill="currentColor">
                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
              </svg>
              <h3 class="empty-state-title">No search criteria</h3>
              <p class="empty-state-description">
                Add search criteria to filter your results. Click the "+" button above or use the search suggestions.
              </p>
            </div>
          </div>
        }
        
      } @else {
        <!-- Raw Query Mode -->
        <div class="search-input-wrapper raw-query-mode">
          <textarea
            #rawQueryTextarea
            class="raw-query-input"
            placeholder="Enter raw query (e.g., branch-name:main iteration:>5 status:Active)"
            [value]="rawQueryInput()"
            (input)="onRawQueryInput($event)"
            (focus)="onFocus()"
            (blur)="onBlur()"
            rows="1">
          </textarea>
          
          <button 
            class="parse-query-btn"
            type="button"
            (click)="parseAndApplyRawQuery()"
            title="Parse and apply query"
            [disabled]="!rawQueryInput().trim()">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
              <path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.061L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z"/>
            </svg>
          </button>
        </div>
      }
      
      @if (searchQuery().isValid && searchQuery().criteria.length > 0) {
        <div class="query-preview">
          <div class="preview-header">
            <div class="preview-label">
              {{ isRawQueryMode() ? 'Parsed Query:' : 'Raw Query:' }}
            </div>
            <button 
              class="share-btn"
              type="button"
              (click)="copyShareableUrl()"
              title="Copy shareable URL">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M7.775 3.275a.75.75 0 001.06-1.06l1.25-1.25a2 2 0 112.83 2.83l-2.5 2.5a2 2 0 01-2.83 0 .75.75 0 00-1.06 1.06 3.5 3.5 0 004.95 0l2.5-2.5a3.5 3.5 0 00-4.95-4.95l-1.25 1.25zm-4.69 9.64a2 2 0 010-2.83l2.5-2.5a2 2 0 012.83 0 .75.75 0 001.06-1.06 3.5 3.5 0 00-4.95 0l-2.5 2.5a3.5 3.5 0 004.95 4.95l1.25-1.25a.75.75 0 00-1.06-1.06l-1.25 1.25a2 2 0 01-2.83 0z"/>
              </svg>
              Share
            </button>
          </div>
          <div class="preview-content">
            {{ isRawQueryMode() ? buildReadableQuery() : searchQuery().rawQuery }}
          </div>
        </div>
      }
      
      @if (showParsingWarning()) {
        <div class="parsing-warning">
          <div class="warning-content">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" class="warning-icon">
              <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575L6.457 1.047zM8 5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-2.5A.75.75 0 0 1 8 5zm1 6a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
            </svg>
            <span class="warning-message">
              Some parts of your raw query couldn't be parsed. The visual mode shows only the recognized criteria.
            </span>
            <button class="warning-dismiss" (click)="showParsingWarning.set(false)" type="button" title="Dismiss">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
              </svg>
            </button>
          </div>
        </div>
      }

      @if (validationErrors().length > 0) {
        <div class="validation-errors">
          @for (error of validationErrors(); track error.field) {
            <div class="error" [class]="getErrorSeverityClass(error)" 
                 [title]="getErrorTooltip(error)">
              <span class="error-icon">{{ getErrorIcon(error) }}</span>
              <span class="error-message">{{ error.message }}</span>
            </div>
          }
        </div>
      }

    <!-- Search History Dropdown -->
    <app-search-history-dropdown
      [isOpen]="showHistoryDropdown()"
      (select)="onHistorySelect($event)"
      (close)="closeHistoryDropdown()">
    </app-search-history-dropdown>

    <!-- Search Definition Modal -->
    @if (isDefinitionModalOpen()) {
      <app-search-definition
        [criteria]="editingCriteria()"
        [availableTypes]="config().availableTypes"
        (save)="onDefinitionSave($event)"
        (close)="onDefinitionClose()">
      </app-search-definition>
    }
  </div>
  `,
  styleUrl: './search.component.scss'
})
export class SearchComponent implements OnInit, OnDestroy {
  private configService = inject(SearchConfigurationService);
  private validationService = inject(SearchValidationService);
  private queryParserService = inject(QueryParserService);
  private urlSyncService = inject(UrlSyncService);
  private historyService = inject(SearchHistoryService);
  private dragDropService = inject(DragDropService);
  private templatesService = inject(SearchTemplatesService);
  private suggestionsService = inject(SearchSuggestionsService);
  protected bulkOperationsService = inject(BulkOperationsService);
  private extendedTemplatesService = inject(ExtendedTemplatesService);

  // Subscriptions
  private urlSubscription?: Subscription;

  @ViewChild('searchInput') searchInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('rawQueryTextarea') rawQueryTextareaRef!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('searchTagsContainer') searchTagsContainerRef!: ElementRef<HTMLDivElement>;

  // Inputs
  readonly config = input.required<SearchConfiguration>();
  
  // Internal state
  protected readonly searchCriteria = signal<SearchCriteria[]>([]);
  protected readonly isFocused = signal<boolean>(false);
  protected readonly currentInput = signal<string>('');
  protected readonly showSuggestions = signal<boolean>(false);
  protected readonly selectedSuggestionIndex = signal<number>(0);
  protected readonly isDefinitionModalOpen = signal<boolean>(false);
  protected readonly editingCriteria = signal<SearchCriteria | null>(null);
  protected readonly isRawQueryMode = signal<boolean>(false);
  protected readonly rawQueryInput = signal<string>('');
  protected readonly showHistoryDropdown = signal<boolean>(false);
  protected readonly showParsingWarning = signal<boolean>(false);
  protected readonly currentLogicalOperator = signal<LogicalOperator>(LogicalOperator.AND);
  protected readonly currentAppliedTemplate = signal<ExtendedSearchTemplate | null>(null);
  private suppressSuggestions = false;
  
  // Computed values
  protected readonly searchQuery = computed(() => {
    const criteria = this.isRawQueryMode() 
      ? this.queryParserService.parseRawQuery(this.rawQueryInput(), this.config().availableTypes)
      : this.searchCriteria();
    
    const query: SearchQuery = {
      criteria,
      rawQuery: this.isRawQueryMode() 
        ? this.rawQueryInput() 
        : this.queryParserService.generateRawQuery(criteria, this.currentLogicalOperator()),
      isValid: true // Will be updated by validation
    };
    
    // Single validation call - more efficient
    const validationResult = this.validationService.validateQueryWithLogicalOperator(query, this.currentLogicalOperator());
    query.isValid = validationResult.isValid;
    return query;
  });
  
  protected readonly filteredTypes = computed(() => {
    const input = this.currentInput().toLowerCase();
    if (!input) return this.config().availableTypes;
    
    return this.config().availableTypes.filter(type => 
      type.label.toLowerCase().includes(input) || 
      type.id.toLowerCase().includes(input)
    );
  });
  
  protected readonly validationErrors = computed(() => {
    return this.validationService.validateQueryWithLogicalOperator(this.searchQuery(), this.currentLogicalOperator()).errors;
  });

  protected getSuggestionContext() {
    return untracked(() => {
      return {
        currentCriteria: this.searchCriteria(),
        currentInput: this.currentInput(),
        searchType: this.getActiveSearchType(),
        recentSearches: this.historyService.getRecentSearches(10),
        availableTypes: this.config().availableTypes,
        position: this.currentInput().length
      };
    });
  }

  // Outputs
  readonly queryChanged = output<SearchQuery>();
  readonly criteriaChanged = output<SearchCriteria[]>();
  
  private keyboardListener?: (event: KeyboardEvent) => void;

  ngOnInit(): void {
    this.setupKeyboardShortcuts();
    this.loadFromUrl();
    this.subscribeToUrlChanges();
  }
  
  ngOnDestroy(): void {
    if (this.keyboardListener) {
      document.removeEventListener('keydown', this.keyboardListener);
    }
    
    // Unsubscribe from URL changes
    if (this.urlSubscription) {
      this.urlSubscription.unsubscribe();
    }
  }
  
  private setupKeyboardShortcuts(): void {
    this.keyboardListener = (event: KeyboardEvent) => {
      // Ctrl+K or Cmd+K to focus search
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        this.focusSearchInput();
      }
      
      // Escape key handling
      if (event.key === 'Escape') {
        if (this.isDefinitionModalOpen()) {
          this.onDefinitionClose();
        } else if (this.showHistoryDropdown()) {
          this.closeHistoryDropdown();
        } else if (this.showSuggestions()) {
          this.showSuggestions.set(false);
        } else if (this.searchCriteria().length > 0 || this.rawQueryInput().trim()) {
          this.clearSearch();
        }
      }
      
      // / to focus search (like GitHub)
      if (event.key === '/' && !this.isInputFocused()) {
        event.preventDefault();
        this.focusSearchInput();
      }
    };
    
    document.addEventListener('keydown', this.keyboardListener);
  }
  
  private focusSearchInput(): void {
    if (this.isRawQueryMode() && this.rawQueryTextareaRef) {
      this.rawQueryTextareaRef.nativeElement.focus();
    } else if (this.searchInputRef) {
      this.searchInputRef.nativeElement.focus();
    }
  }
  
  private isInputFocused(): boolean {
    const activeElement = document.activeElement;
    return activeElement instanceof HTMLInputElement || 
           activeElement instanceof HTMLTextAreaElement ||
           activeElement instanceof HTMLSelectElement;
  }
  
  private clearSearch(): void {
    if (this.isRawQueryMode()) {
      this.rawQueryInput.set('');
      if (this.rawQueryTextareaRef) {
        this.rawQueryTextareaRef.nativeElement.value = '';
      }
    } else {
      this.searchCriteria.set([]);
      this.currentInput.set('');
      if (this.searchInputRef) {
        this.searchInputRef.nativeElement.value = '';
      }
    }
    this.emitChanges();
  }

  onFocus(): void {
    untracked(() => {
      this.isFocused.set(true);
      if (!this.suppressSuggestions) {
        this.showSuggestions.set(true);
      }
    });
  }
  
  onBlur(): void {
    setTimeout(() => {
      untracked(() => {
        this.isFocused.set(false);
        this.showSuggestions.set(false);
      });
    }, 200);
  }
  
  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    
    // Use untracked to prevent signal updates during computed evaluation
    untracked(() => {
      this.currentInput.set(target.value);
      
      if (target.value.length > 0) {
        this.showSuggestions.set(true);
      } else {
        this.showSuggestions.set(false);
      }
      
      // Track typing behavior for suggestions
      try {
        this.suggestionsService.trackBehavior('typing', {
          input: target.value,
          length: target.value.length,
          criteriaCount: this.searchCriteria().length
        });
      } catch (error) {
        // Ignore tracking errors to prevent console noise
      }
    });
  }
  
  onKeyDown(event: KeyboardEvent): void {
    if (!this.showSuggestions()) return;
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        const nextIndex = Math.min(
          this.selectedSuggestionIndex() + 1, 
          this.filteredTypes().length - 1
        );
        this.selectedSuggestionIndex.set(nextIndex);
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        const prevIndex = Math.max(this.selectedSuggestionIndex() - 1, 0);
        this.selectedSuggestionIndex.set(prevIndex);
        break;
        
      case 'Enter':
        event.preventDefault();
        const selectedType = this.filteredTypes()[this.selectedSuggestionIndex()];
        if (selectedType) {
          this.selectSearchType(selectedType);
        }
        break;
        
      case 'Escape':
        this.showSuggestions.set(false);
        break;
    }
  }
  
  selectSearchType(type: SearchType): void {
    if (!type || !type.supportedOperators || type.supportedOperators.length === 0) {
      // Invalid SearchType - skip selection
      return;
    }
    
    const defaultOperator = type.supportedOperators.find(
      op => op.type === type.defaultOperator
    ) || type.supportedOperators[0];
    
    const newCriteria: SearchCriteria = {
      id: crypto.randomUUID(),
      type,
      operator: defaultOperator,
      value: null,
      isValid: !defaultOperator.requiresValue
    };
    
    this.addCriteria(newCriteria);
    this.currentInput.set('');
    this.showSuggestions.set(false);
    
    // Clear the physical input field
    if (this.searchInputRef) {
      this.searchInputRef.nativeElement.value = '';
    }
  }
  
  addCriteria(criteria: SearchCriteria): void {
    const current = this.searchCriteria();
    
    if (this.config().maxCriteria && current.length >= this.config().maxCriteria!) {
      return;
    }
    
    // Clear applied template since user is manually modifying search
    this.currentAppliedTemplate.set(null);
    
    this.searchCriteria.set([...current, criteria]);
    this.emitChanges();
  }
  
  removeCriteria(id: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    
    // Clear applied template since user is manually modifying search
    this.currentAppliedTemplate.set(null);
    
    const updated = this.searchCriteria().filter(c => c.id !== id);
    this.searchCriteria.set(updated);
    this.emitChanges();
  }
  
  updateCriteria(id: string, updatedCriteria: SearchCriteria): void {
    const current = this.searchCriteria();
    const index = current.findIndex(c => c.id === id);
    
    if (index === -1) return;
    
    const updated = [...current];
    updated[index] = { ...updatedCriteria, id }; // Preserve the original ID
    
    // Validate the updated criteria
    const validation = this.configService.validateCriteria(updated[index]);
    updated[index].isValid = validation.isValid;
    
    this.searchCriteria.set(updated);
    this.emitChanges();
  }
  
  editCriteria(id: string): void {
    const criteria = this.searchCriteria().find(c => c.id === id);
    if (criteria) {
      this.editingCriteria.set(criteria);
      this.isDefinitionModalOpen.set(true);
    }
  }
  
  openDefinitionModal(): void {
    this.editingCriteria.set(null); // null means adding new criteria
    this.isDefinitionModalOpen.set(true);
  }
  
  protected onDefinitionSave(criteria: SearchCriteria): void {
    const existingCriteria = this.editingCriteria();
    
    if (existingCriteria) {
      // Update existing criteria
      this.updateCriteria(existingCriteria.id, criteria);
    } else {
      // Add new criteria
      this.addCriteria(criteria);
    }
    
    this.isDefinitionModalOpen.set(false);
    this.editingCriteria.set(null);
  }
  
  protected onDefinitionClose(): void {
    this.isDefinitionModalOpen.set(false);
    this.editingCriteria.set(null);
  }
  
  protected buildReadableQuery(): string {
    const operator = this.currentLogicalOperator() === LogicalOperator.AND ? ' AND ' : ' OR ';
    return this.searchCriteria()
      .filter(c => c.isValid)
      .map(c => {
        const value = c.operator.requiresValue ? ` ${c.displayValue || c.value}` : '';
        return `${c.type.label} ${c.operator.label}${value}`;
      })
      .join(operator);
  }
  
  // Raw Query Mode Methods
  protected switchToRawQueryMode(): void {
    // Convert current criteria to raw query when switching modes
    if (this.searchCriteria().length > 0) {
      const rawQuery = this.queryParserService.generateRawQuery(this.searchCriteria(), this.currentLogicalOperator());
      this.rawQueryInput.set(rawQuery);
    }
    this.isRawQueryMode.set(true);
    this.showSuggestions.set(false);
  }
  
  protected switchToVisualMode(): void {
    // Parse raw query and convert to criteria when switching modes
    if (this.rawQueryInput().trim()) {
      const rawQuery = this.rawQueryInput().trim();
      const parsedCriteria = this.queryParserService.parseRawQuery(
        rawQuery, 
        this.config().availableTypes
      );
      
      // Check if parsing was successful by comparing input tokens vs parsed criteria
      const inputTokens = rawQuery.split(/\s+/).filter(token => token.includes(':'));
      const parsedCount = parsedCriteria.length;
      
      if (inputTokens.length > parsedCount && parsedCount > 0) {
        // Some tokens couldn't be parsed - show warning
        this.showParsingWarning.set(true);
        setTimeout(() => this.showParsingWarning.set(false), 5000);
      }
      
      this.searchCriteria.set(parsedCriteria);
    }
    this.isRawQueryMode.set(false);
    this.emitChanges();
  }
  
  protected onRawQueryInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.rawQueryInput.set(target.value);
    
    // Auto-resize textarea
    target.style.height = 'auto';
    target.style.height = target.scrollHeight + 'px';
    
    // Real-time parsing for validation feedback
    this.validateRawQuery();
  }
  
  protected parseAndApplyRawQuery(): void {
    const rawQuery = this.rawQueryInput().trim();
    if (!rawQuery) return;
    
    const parsedCriteria = this.queryParserService.parseRawQuery(
      rawQuery, 
      this.config().availableTypes
    );
    
    // Update visual mode with parsed criteria
    this.searchCriteria.set(parsedCriteria);
    this.emitChanges();
  }
  
  private validateRawQuery(): void {
    const isValid = this.queryParserService.isValidRawQuery(
      this.rawQueryInput(),
      this.config().availableTypes
    );
    
    // You could add visual feedback here
    // For now, we'll rely on the computed searchQuery validation
  }

  // URL Synchronization Methods
  private loadFromUrl(): void {
    const urlState = this.urlSyncService.loadFromUrl();
    if (urlState) {
      // Set the mode first
      this.isRawQueryMode.set(urlState.mode === 'raw');
      
      if (urlState.mode === 'raw') {
        // Load raw query
        this.rawQueryInput.set(urlState.query);
      } else {
        // Parse query and load as criteria
        const parsedCriteria = this.queryParserService.parseRawQuery(
          urlState.query,
          this.config().availableTypes
        );
        this.searchCriteria.set(parsedCriteria);
      }
      
      // Emit changes after loading from URL
      this.emitChanges(false); // Don't sync back to URL immediately
    }
  }
  
  private syncToUrl(): void {
    this.urlSyncService.syncToUrl(this.searchQuery(), this.isRawQueryMode());
  }
  
  protected getShareableUrl(): string {
    return this.urlSyncService.generateShareableUrl(this.searchQuery(), this.isRawQueryMode());
  }
  
  private subscribeToUrlChanges(): void {
    this.urlSubscription = this.urlSyncService.watchUrlChanges().subscribe(queryParams => {
      // Parse URL params manually (similar to how UrlSyncService does it)
      const q = queryParams['q'] ? decodeURIComponent(queryParams['q']) : null;
      const mode = queryParams['mode'] as 'visual' | 'raw' || 'visual';
      
      if (q) {
        // Prevent infinite loops by checking if the URL state is different from current state
        const currentQuery = this.isRawQueryMode() 
          ? this.rawQueryInput()
          : this.queryParserService.generateRawQuery(this.searchCriteria());
        
        if (q !== currentQuery || (mode === 'raw') !== this.isRawQueryMode()) {
          this.isRawQueryMode.set(mode === 'raw');
          
          if (mode === 'raw') {
            this.rawQueryInput.set(q);
          } else {
            const parsedCriteria = this.queryParserService.parseRawQuery(
              q,
              this.config().availableTypes
            );
            this.searchCriteria.set(parsedCriteria);
          }
        }
      }
    });
  }
  
  protected copyShareableUrl(): void {
    const url = this.getShareableUrl();
    navigator.clipboard.writeText(url).then(() => {
      // Could show a toast notification here
    }).catch(err => {
      // Silently handle clipboard errors - user can still copy the URL manually
    });
  }

  private emitChanges(shouldSyncUrl: boolean = true): void {
    this.criteriaChanged.emit(this.searchCriteria());
    this.queryChanged.emit(this.searchQuery());
    
    // Add to history when changes occur (except when loading from URL)
    if (shouldSyncUrl) {
      this.addToHistory();
      this.syncToUrl();
      
      // Track search execution for behavior learning
      try {
        untracked(() => {
          this.suggestionsService.trackBehavior('search_executed', {
            criteria: this.searchCriteria(),
            rawQuery: this.searchQuery().rawQuery,
            isValid: this.searchQuery().isValid,
            mode: this.isRawQueryMode() ? 'raw' : 'visual'
          });
        });
      } catch (error) {
        // Ignore tracking errors to prevent console noise
      }
    }
  }

  // Smart Suggestions Methods
  protected getActiveSearchType(): SearchType | undefined {
    // Logic to determine which search type is being actively edited
    // For now, we'll return undefined - could be enhanced to detect context
    return undefined;
  }

  protected onSmartSuggestionSelect(suggestion: SuggestionItem): void {
    switch (suggestion.type) {
      case 'criteria':
        if (suggestion.value && typeof suggestion.value === 'object' && 'id' in suggestion.value) {
          const searchType = suggestion.value as SearchType;
          // Validate that it's a complete SearchType object
          if (searchType.id && searchType.supportedOperators && Array.isArray(searchType.supportedOperators)) {
            this.selectSearchType(searchType);
          } else {
            // Invalid SearchType in suggestion - skip
          }
        }
        break;
        
      case 'value':
        this.currentInput.set(String(suggestion.value));
        break;
        
      case 'completion':
        this.currentInput.set(String(suggestion.value));
        break;
        
      case 'template':
        if (suggestion.value && typeof suggestion.value === 'object' && 'query' in suggestion.value) {
          this.onTemplateSelect(suggestion.value as SearchTemplate);
        }
        break;
        
      default:
        // Handle other suggestion types
        // Unhandled suggestion type - could implement additional types here
        break;
    }
    
    this.hideSuggestions();
  }

  protected hideSuggestions(): void {
    this.showSuggestions.set(false);
  }

  // Error display helper methods
  protected getErrorSeverityClass(error: any): string {
    const severity = this.validationService.getErrorSeverity(error);
    return `error-${severity}`;
  }
  
  protected getErrorIcon(error: any): string {
    return this.validationService.getErrorIcon(error);
  }
  
  protected getErrorTooltip(error: any): string {
    const severity = this.validationService.getErrorSeverity(error);
    const typeMap: { [key: string]: string } = {
      'error': 'This field has an error that must be fixed',
      'warning': 'This field has a potential issue',
      'info': 'Additional information about this field'
    };
    return typeMap[severity] || 'Validation message';
  }

  // Search History Methods
  protected toggleHistoryDropdown(): void {
    if (this.showHistoryDropdown()) {
      this.closeHistoryDropdown();
    } else {
      this.openHistoryDropdown();
    }
  }
  
  private openHistoryDropdown(): void {
    // Close suggestions dropdown when opening history
    this.showSuggestions.set(false);
    this.showHistoryDropdown.set(true);
  }
  
  protected closeHistoryDropdown(): void {
    this.showHistoryDropdown.set(false);
  }
  
  protected onHistorySelect(entry: SearchHistoryEntry): void {
    // Set the search mode first
    this.isRawQueryMode.set(entry.searchMode === 'raw');
    
    if (entry.searchMode === 'raw') {
      // Load raw query
      this.rawQueryInput.set(entry.rawQuery);
    } else {
      // Load criteria
      this.searchCriteria.set([...entry.query.criteria]);
    }
    
    this.closeHistoryDropdown();
    
    // Emit changes and focus input
    this.emitChanges();
    setTimeout(() => {
      this.focusSearchInput();
    }, 50);
  }
  
  private addToHistory(): void {
    const query = this.searchQuery();
    if (query.isValid && (query.criteria.length > 0 || (query.rawQuery && query.rawQuery.trim()))) {
      this.historyService.addToHistory(query, this.isRawQueryMode() ? 'raw' : 'visual');
    }
  }

  // Search Templates Methods (Legacy - kept for backwards compatibility)
  protected onTemplateSelect(template: SearchTemplate): void {
    // Set the search mode first
    this.isRawQueryMode.set(template.searchMode === 'raw');
    
    if (template.searchMode === 'raw') {
      // Load raw query
      this.rawQueryInput.set(template.query.rawQuery || '');
    } else {
      // Load criteria
      this.searchCriteria.set([...template.query.criteria]);
    }
    
    // Emit changes and focus input
    this.emitChanges();
    setTimeout(() => {
      this.focusSearchInput();
    }, 50);
  }

  // Drag and Drop Methods for Search Criteria
  protected onCriteriaDragStart(event: { item: SearchCriteria; index: number; event: DragEvent }): void {
    this.dragDropService.startDrag(event.item, event.index, event.event);
    
    // Close other dropdowns during drag
    this.showSuggestions.set(false);
    this.closeHistoryDropdown();
  }

  protected onCriteriaDragOver(event: { index: number; event: DragEvent }): void {
    this.dragDropService.onDragOver(event.index, event.event);
  }

  protected onCriteriaDrop(event: { index: number; event: DragEvent }): void {
    const currentCriteria = this.searchCriteria();
    const reorderedCriteria = this.dragDropService.onDrop(event.index, currentCriteria);
    
    if (reorderedCriteria !== currentCriteria) {
      // Animate the reorder if container is available
      if (this.searchTagsContainerRef) {
        const dragState = this.dragDropService.getDragState();
        if (dragState.draggedIndex !== -1) {
          this.dragDropService.animateReorder(
            this.searchTagsContainerRef.nativeElement,
            dragState.draggedIndex,
            event.index
          );
        }
      }
      
      this.searchCriteria.set(reorderedCriteria);
      this.emitChanges();
    }
  }

  protected onCriteriaDragEnd(): void {
    this.dragDropService.endDrag();
  }

  // Bulk Operations Methods
  protected toggleMultiSelectMode(): void {
    this.bulkOperationsService.toggleMultiSelectMode();
    
    // Close other dropdowns when entering multi-select mode
    if (this.bulkOperationsService.getSelectionState()().isMultiSelectMode) {
      this.showSuggestions.set(false);
      this.closeHistoryDropdown();
    }
  }

  protected exitMultiSelectMode(): void {
    this.bulkOperationsService.exitMultiSelectMode();
  }

  protected onCriteriaSelect(event: { id: string; index: number; shiftKey?: boolean; ctrlKey?: boolean }): void {
    if (!this.bulkOperationsService.getSelectionState()().isMultiSelectMode) {
      return;
    }

    if (event.shiftKey) {
      // Range selection
      this.bulkOperationsService.selectRange(event.id, event.index, this.searchCriteria());
    } else if (event.ctrlKey) {
      // Toggle individual selection
      this.bulkOperationsService.toggleSelection(event.id, event.index);
    } else {
      // Single selection (clear others first)
      this.bulkOperationsService.deselectAll();
      this.bulkOperationsService.toggleSelection(event.id, event.index);
    }
  }

  protected getSelectedCriteria(): SearchCriteria[] {
    const selectedIds = this.bulkOperationsService.getSelectionState()().selectedIds;
    return this.searchCriteria().filter(criteria => selectedIds.has(criteria.id));
  }

  protected async onBulkOperation(event: { operation: any; options?: any }): Promise<void> {
    const selectedCriteria = this.getSelectedCriteria();
    const allCriteria = this.searchCriteria();
    
    try {
      const result = await this.bulkOperationsService.executeBulkOperation(
        event.operation,
        selectedCriteria,
        allCriteria,
        event.options
      );
      
      if (result.success) {
        // Update the criteria with the result
        this.searchCriteria.set(result.result);
        this.emitChanges();
        
        // Show success message (could implement toast/notification later)
      } else {
        // Handle error (could implement error notification later)
      }
    } catch (error) {
      // Bulk operation error - could show user-friendly error message
    }
  }

  protected clearAllCriteria(): void {
    // Clear applied template since user is manually clearing search
    this.currentAppliedTemplate.set(null);
    
    this.searchCriteria.set([]);
    this.emitChanges();
    
    // Exit multi-select mode if active
    if (this.bulkOperationsService.getSelectionState()().isMultiSelectMode) {
      this.bulkOperationsService.exitMultiSelectMode();
    }
  }

  // Logical Operator Methods
  protected setLogicalOperator(operator: 'AND' | 'OR'): void {
    const logicalOp = operator === 'AND' ? LogicalOperator.AND : LogicalOperator.OR;
    
    // Only clear applied template if the operator actually changed
    const currentOp = this.currentLogicalOperator();
    if (currentOp !== logicalOp) {
      this.currentAppliedTemplate.set(null);
    }
    
    this.currentLogicalOperator.set(logicalOp);
    
    // Emit changes to update the query
    this.emitChanges();
  }

  // Extended Templates Methods
  protected onExtendedTemplateSelected(template: ExtendedSearchTemplate): void {
    // Track the currently applied template
    this.currentAppliedTemplate.set(template);
    
    // Set the search mode first
    this.isRawQueryMode.set(template.searchMode === 'raw');
    
    if (template.searchMode === 'raw') {
      // Load raw query
      this.rawQueryInput.set(template.query.rawQuery || '');
    } else {
      // Load criteria
      this.searchCriteria.set([...template.query.criteria]);
    }
    
    // Set the logical operator from the template
    this.currentLogicalOperator.set(template.logicalOperator || LogicalOperator.AND);
    
    // Update template usage
    this.extendedTemplatesService.useTemplate(template.id);
    
    // Emit changes and focus input without showing suggestions
    this.emitChanges();
    setTimeout(() => {
      this.suppressSuggestions = true;
      this.focusSearchInput();
      // Reset the flag after a short delay
      setTimeout(() => {
        this.suppressSuggestions = false;
      }, 100);
    }, 50);
  }

  protected onPresetApplied(preset: TemplatePreset): void {
    // Convert preset to search query and apply it
    this.isRawQueryMode.set(preset.searchMode === 'raw');
    
    if (preset.searchMode === 'raw') {
      this.rawQueryInput.set(preset.query.rawQuery || '');
    } else {
      this.searchCriteria.set([...preset.query.criteria]);
    }
    
    // Emit changes and focus input
    this.emitChanges();
    setTimeout(() => {
      this.focusSearchInput();
    }, 50);
  }

  protected onTemplateCreated(template: ExtendedSearchTemplate): void {
    // Template was successfully created - could show a notification
  }

  protected onTemplateApplied(template: ExtendedSearchTemplate): void {
    // Apply the selected template
    this.onExtendedTemplateSelected(template);
  }

  protected onTemplateCreationRequested(): void {
    // Open template creation dialog with current search criteria
    this.openTemplateCreationDialog();
  }

  private openTemplateCreationDialog(): void {
    const current = this.searchCriteria();
    const operator = this.currentLogicalOperator();
    const appliedTemplate = this.currentAppliedTemplate();
    
    if (current.length === 0) {
      alert('No search criteria to save. Add some filters first.');
      return;
    }
    
    // If we have an applied template, show three-option dialog
    if (appliedTemplate) {
      this.showTemplateUpdateDialog(appliedTemplate, current, operator);
      return;
    }
    
    // Create a new template
    const name = prompt('Enter template name:');
    if (!name?.trim()) {
      return;
    }
    
    this.createTemplate(name.trim(), current, operator);
  }

  private async createTemplate(name: string, criteria: SearchCriteria[], operator: LogicalOperator): Promise<void> {
    try {
      const newTemplate = await this.extendedTemplatesService.createExtendedTemplate({
        name,
        query: {
          criteria,
          rawQuery: this.isRawQueryMode() ? this.rawQueryInput() : '',
          isValid: true
        },
        searchMode: this.isRawQueryMode() ? 'raw' : 'visual',
        tags: [],
        isPublic: false,
        logicalOperator: operator
      });
      
      // Set the newly created template as the applied template
      this.currentAppliedTemplate.set(newTemplate);
    } catch (error) {
      alert('Failed to create template. Please try again.');
    }
  }

  private async updateTemplate(template: ExtendedSearchTemplate, criteria: SearchCriteria[], operator: LogicalOperator): Promise<void> {
    try {
      await this.extendedTemplatesService.updateExtendedTemplate(template.id, {
        query: {
          criteria,
          rawQuery: this.isRawQueryMode() ? this.rawQueryInput() : '',
          isValid: true
        },
        searchMode: this.isRawQueryMode() ? 'raw' : 'visual',
        logicalOperator: operator,
        updatedAt: new Date()
      });
      
      // Update the currently applied template reference
      this.currentAppliedTemplate.set({
        ...template,
        query: {
          criteria,
          rawQuery: this.isRawQueryMode() ? this.rawQueryInput() : '',
          isValid: true
        },
        logicalOperator: operator,
        updatedAt: new Date()
      });
    } catch (error) {
      alert('Failed to update template. Please try again.');
    }
  }

  private showTemplateUpdateDialog(appliedTemplate: ExtendedSearchTemplate, criteria: SearchCriteria[], operator: LogicalOperator): void {
    // Create a structured dialog using browser APIs
    const message = `You have modified the template "${appliedTemplate.name}". What would you like to do?\n\n` +
                   'Click OK to UPDATE the existing template\n' +
                   'Click Cancel to see more options';
    
    const updateExisting = confirm(message);
    
    if (updateExisting) {
      // User chose to update existing template
      this.updateTemplate(appliedTemplate, criteria, operator);
    } else {
      // Show second dialog with create new or cancel options
      const createNew = confirm('Click OK to CREATE A NEW template\nClick Cancel to cancel this operation');
      
      if (createNew) {
        // User chose to create new template
        const name = prompt('Enter name for new template:');
        if (name?.trim()) {
          this.createTemplate(name.trim(), criteria, operator);
        }
      }
      // If user clicks cancel on second dialog, nothing happens (operation cancelled)
    }
  }

}