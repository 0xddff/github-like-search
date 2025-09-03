import { Component, input, output, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchTagComponent } from './search-tag.component';
import { SearchDefinitionComponent } from './search-definition.component';
import { 
  SearchConfiguration, 
  SearchQuery, 
  SearchCriteria, 
  SearchType,
  SearchOperator,
  SearchOperatorType
} from '../models';
import { SearchConfigurationService, SearchValidationService } from '../services';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, SearchTagComponent, SearchDefinitionComponent],
  template: `
    <div class="search-container" [class.focused]="isFocused()">
      <div class="search-input-wrapper">
        <input 
          #searchInput
          type="text"
          class="search-input"
          [placeholder]="config().placeholder || 'Search...'"
          [value]="currentInput()"
          (focus)="onFocus()"
          (blur)="onBlur()"
          (keydown)="onKeyDown($event)"
          (input)="onInput($event)"
        />
        
        <button 
          class="add-criteria-btn"
          type="button"
          (click)="openDefinitionModal()"
          title="Add search criteria">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z"/>
          </svg>
        </button>
        
        <!-- Search Tags -->
        <div class="search-tags" *ngIf="searchCriteria().length > 0">
          @for (criteria of searchCriteria(); track criteria.id) {
            <app-search-tag
              [criteria]="criteria"
              [editable]="true"
              [removable]="true"
              (edit)="editCriteria($event.id)"
              (remove)="removeCriteria($event.id)">
            </app-search-tag>
          }
        </div>
        
        <!-- Type Suggestions Dropdown -->
        @if (showSuggestions() && filteredTypes().length > 0) {
          <div class="suggestions-dropdown">
            @for (type of filteredTypes(); track type.id) {
              <div class="suggestion-item" 
                   (click)="selectSearchType(type)"
                   [class.highlighted]="selectedSuggestionIndex() === $index">
                <strong>{{ type.label }}</strong>
                @if (type.description) {
                  <span class="suggestion-description">{{ type.description }}</span>
                }
              </div>
            }
          </div>
        }
      </div>
      
      @if (searchQuery().isValid && searchQuery().criteria.length > 0) {
        <div class="query-preview">
          Query: {{ buildReadableQuery() }}
        </div>
      }
      
      @if (validationErrors().length > 0) {
        <div class="validation-errors">
          @for (error of validationErrors(); track error.field) {
            <div class="error">{{ error.message }}</div>
          }
        </div>
      }
    </div>

    <!-- Search Definition Modal -->
    @if (isDefinitionModalOpen()) {
      <app-search-definition
        [criteria]="editingCriteria()"
        [availableTypes]="config().availableTypes"
        (save)="onDefinitionSave($event)"
        (close)="onDefinitionClose()">
      </app-search-definition>
    }
  `,
  styleUrl: './search.component.scss'
})
export class SearchComponent {
  private configService = inject(SearchConfigurationService);
  private validationService = inject(SearchValidationService);

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
  
  // Computed values
  protected readonly searchQuery = computed(() => {
    const query: SearchQuery = {
      criteria: this.searchCriteria(),
      isValid: this.searchCriteria().every(c => c.isValid)
    };
    
    return this.validationService.validateQuery(query).isValid ? query : { ...query, isValid: false };
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
    return this.validationService.validateQuery(this.searchQuery()).errors;
  });

  // Outputs
  readonly queryChanged = output<SearchQuery>();
  readonly criteriaChanged = output<SearchCriteria[]>();

  onFocus(): void {
    this.isFocused.set(true);
    this.showSuggestions.set(true);
  }
  
  onBlur(): void {
    setTimeout(() => {
      this.isFocused.set(false);
      this.showSuggestions.set(false);
    }, 200);
  }
  
  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.currentInput.set(target.value);
    
    if (target.value.length > 0) {
      this.showSuggestions.set(true);
    }
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
  }
  
  addCriteria(criteria: SearchCriteria): void {
    const current = this.searchCriteria();
    
    if (this.config().maxCriteria && current.length >= this.config().maxCriteria!) {
      return;
    }
    
    this.searchCriteria.set([...current, criteria]);
    this.emitChanges();
  }
  
  removeCriteria(id: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    
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
    return this.searchCriteria()
      .filter(c => c.isValid)
      .map(c => {
        const value = c.operator.requiresValue ? ` ${c.displayValue || c.value}` : '';
        return `${c.type.label} ${c.operator.label}${value}`;
      })
      .join(' AND ');
  }
  
  private emitChanges(): void {
    this.criteriaChanged.emit(this.searchCriteria());
    this.queryChanged.emit(this.searchQuery());
  }
}