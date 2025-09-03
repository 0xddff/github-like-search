import { Component, input, output, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  SearchCriteria, 
  SearchType, 
  SearchOperator, 
  SearchValueType,
  SearchOperatorType 
} from '../models';
import { SearchConfigurationService } from '../services';

@Component({
  selector: 'app-search-definition',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="onOverlayClick($event)">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>{{ isEditing() ? 'Edit' : 'Add' }} Search Criteria</h3>
          <button class="close-button" (click)="onClose()" type="button">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 6.586L12.293 2.293a1 1 0 111.414 1.414L9.414 8l4.293 4.293a1 1 0 01-1.414 1.414L8 9.414l-4.293 4.293a1 1 0 01-1.414-1.414L6.586 8 2.293 3.707a1 1 0 011.414-1.414L8 6.586z"/>
            </svg>
          </button>
        </div>
        
        <div class="modal-body">
          <!-- Search Type Selection -->
          <div class="form-group">
            <label for="searchType">Search Type</label>
            <select 
              id="searchType" 
              class="form-control"
              [value]="selectedType()?.id || ''"
              (change)="onTypeChange($event)"
              [disabled]="isEditing()">
              <option value="">Select a search type</option>
              @for (type of availableTypes(); track type.id) {
                <option [value]="type.id">{{ type.label }}</option>
              }
            </select>
          </div>

          @if (selectedType()) {
            <!-- Operator Selection -->
            <div class="form-group">
              <label for="operator">Operator</label>
              <select 
                id="operator" 
                class="form-control"
                [value]="selectedOperator()?.type || ''"
                (change)="onOperatorChange($event)">
                @for (operator of selectedType()!.supportedOperators; track operator.type) {
                  <option [value]="operator.type">{{ operator.label }}</option>
                }
              </select>
            </div>

            <!-- Value Input (if operator requires value) -->
            @if (selectedOperator()?.requiresValue) {
              <div class="form-group">
                <label for="value">Value</label>
                
                @switch (selectedType()!.valueType) {
                  @case (SearchValueType.TEXT) {
                    <input 
                      id="value"
                      type="text" 
                      class="form-control"
                      [value]="currentValue()"
                      (input)="onValueChange($event)"
                      placeholder="Enter text value"
                    />
                  }
                  @case (SearchValueType.NUMBER) {
                    <input 
                      id="value"
                      type="number" 
                      class="form-control"
                      [value]="currentValue()"
                      (input)="onValueChange($event)"
                      placeholder="Enter number"
                    />
                  }
                  @case (SearchValueType.DATE) {
                    <input 
                      id="value"
                      type="date" 
                      class="form-control"
                      [value]="currentValue()"
                      (input)="onValueChange($event)"
                    />
                  }
                  @case (SearchValueType.SELECT) {
                    <select 
                      id="value"
                      class="form-control"
                      [value]="currentValue()"
                      (change)="onValueChange($event)">
                      <option value="">Select an option</option>
                      @for (option of selectedType()!.options; track option) {
                        <option [value]="option">{{ option }}</option>
                      }
                    </select>
                  }
                  @case (SearchValueType.MULTI_SELECT) {
                    <div class="multi-select">
                      @for (option of selectedType()!.options; track option) {
                        <label class="checkbox-label">
                          <input 
                            type="checkbox" 
                            [checked]="isOptionSelected(option)"
                            (change)="onMultiSelectChange(option, $event)"
                          />
                          {{ option }}
                        </label>
                      }
                    </div>
                  }
                  @case (SearchValueType.BOOLEAN) {
                    <select 
                      id="value"
                      class="form-control"
                      [value]="currentValue()"
                      (change)="onValueChange($event)">
                      <option value="">Select...</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  }
                }
              </div>
            }

            <!-- Validation Errors -->
            @if (validationErrors().length > 0) {
              <div class="validation-errors">
                @for (error of validationErrors(); track error.field) {
                  <div class="error">{{ error.message }}</div>
                }
              </div>
            }

            <!-- Preview -->
            <div class="preview-section">
              <h4>Preview</h4>
              <div class="preview-tag">
                <span class="tag-type">{{ selectedType()!.label }}</span>
                <span class="tag-separator">:</span>
                <span class="tag-operator">{{ selectedOperator()!.label }}</span>
                @if (selectedOperator()!.requiresValue && currentValue()) {
                  <span class="tag-value">{{ displayValue() }}</span>
                }
              </div>
            </div>
          }
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" (click)="onClose()">
            Cancel
          </button>
          <button 
            type="button" 
            class="btn btn-primary" 
            (click)="onSave()"
            [disabled]="!isValid()">
            {{ isEditing() ? 'Update' : 'Add' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrl: './search-definition.component.scss'
})
export class SearchDefinitionComponent implements OnInit {
  private configService = inject(SearchConfigurationService);
  
  // Inputs
  readonly criteria = input<SearchCriteria | null>(null);
  readonly availableTypes = input.required<SearchType[]>();
  
  // Internal state
  protected readonly selectedType = signal<SearchType | null>(null);
  protected readonly selectedOperator = signal<SearchOperator | null>(null);
  protected readonly currentValue = signal<any>(null);
  protected readonly validationErrors = signal<any[]>([]);
  
  // Computed values
  protected readonly isEditing = computed(() => this.criteria() !== null);
  protected readonly isValid = computed(() => {
    const type = this.selectedType();
    const operator = this.selectedOperator();
    
    if (!type || !operator) return false;
    
    if (operator.requiresValue) {
      const value = this.currentValue();
      if (value === null || value === undefined || value === '') return false;
    }
    
    return this.validationErrors().length === 0;
  });
  
  protected readonly displayValue = computed(() => {
    const value = this.currentValue();
    const type = this.selectedType();
    
    if (!value || !type) return '';
    
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    if (type.valueType === SearchValueType.BOOLEAN) {
      return value === 'true' ? 'Yes' : 'No';
    }
    
    if (type.valueType === SearchValueType.DATE && value) {
      return new Date(value).toLocaleDateString();
    }
    
    return String(value);
  });
  
  // Outputs
  readonly save = output<SearchCriteria>();
  readonly close = output<void>();
  
  readonly SearchValueType = SearchValueType;

  ngOnInit() {
    const existingCriteria = this.criteria();
    if (existingCriteria) {
      // Editing existing criteria
      this.selectedType.set(existingCriteria.type);
      this.selectedOperator.set(existingCriteria.operator);
      this.currentValue.set(existingCriteria.value);
    } else {
      // Adding new criteria - pre-select first type and operator if available
      const types = this.availableTypes();
      if (types.length > 0) {
        const firstType = types[0];
        this.selectedType.set(firstType);
        if (firstType.supportedOperators.length > 0) {
          const defaultOperator = firstType.supportedOperators.find(
            op => op.type === firstType.defaultOperator
          ) || firstType.supportedOperators[0];
          this.selectedOperator.set(defaultOperator);
        }
      }
    }
  }

  protected onTypeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const typeId = target.value;
    
    if (!typeId) {
      this.selectedType.set(null);
      this.selectedOperator.set(null);
      this.currentValue.set(null);
      return;
    }
    
    const type = this.availableTypes().find(t => t.id === typeId);
    if (type) {
      this.selectedType.set(type);
      
      // Set default operator
      const defaultOperator = type.supportedOperators.find(
        op => op.type === type.defaultOperator
      ) || type.supportedOperators[0];
      this.selectedOperator.set(defaultOperator);
      
      // Reset value
      this.currentValue.set(null);
    }
  }
  
  protected onOperatorChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const operatorType = target.value as SearchOperatorType;
    
    const type = this.selectedType();
    if (!type) return;
    
    const operator = type.supportedOperators.find(op => op.type === operatorType);
    if (operator) {
      this.selectedOperator.set(operator);
      
      // Reset value if operator doesn't require value
      if (!operator.requiresValue) {
        this.currentValue.set(null);
      }
    }
  }
  
  protected onValueChange(event: Event): void {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    let value: any = target.value;
    
    const type = this.selectedType();
    if (!type) return;
    
    // Convert value based on type
    if (type.valueType === SearchValueType.NUMBER && value) {
      value = Number(value);
    } else if (type.valueType === SearchValueType.BOOLEAN) {
      value = value === 'true';
    }
    
    this.currentValue.set(value);
    this.validateCurrentValue();
  }
  
  protected onMultiSelectChange(option: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    const currentValues = Array.isArray(this.currentValue()) ? this.currentValue() : [];
    
    if (target.checked) {
      this.currentValue.set([...currentValues, option]);
    } else {
      this.currentValue.set(currentValues.filter((v: string) => v !== option));
    }
    
    this.validateCurrentValue();
  }
  
  protected isOptionSelected(option: string): boolean {
    const values = this.currentValue();
    return Array.isArray(values) && values.includes(option);
  }
  
  private validateCurrentValue(): void {
    const type = this.selectedType();
    const operator = this.selectedOperator();
    const value = this.currentValue();
    
    if (!type || !operator) {
      this.validationErrors.set([]);
      return;
    }
    
    const tempCriteria: SearchCriteria = {
      id: 'temp',
      type,
      operator,
      value,
      isValid: true
    };
    
    const validation = this.configService.validateCriteria(tempCriteria);
    this.validationErrors.set(validation.errors);
  }
  
  protected onOverlayClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }
  
  protected onClose(): void {
    this.close.emit();
  }
  
  protected onSave(): void {
    const type = this.selectedType();
    const operator = this.selectedOperator();
    
    if (!type || !operator || !this.isValid()) return;
    
    const existingCriteria = this.criteria();
    const criteria: SearchCriteria = {
      id: existingCriteria?.id || crypto.randomUUID(),
      type,
      operator,
      value: this.currentValue(),
      displayValue: this.displayValue(),
      isValid: true
    };
    
    this.save.emit(criteria);
  }
}