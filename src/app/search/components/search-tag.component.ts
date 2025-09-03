import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchCriteria } from '../models';

@Component({
  selector: 'app-search-tag',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="search-tag" 
         [class.invalid]="!criteria().isValid"
         [class.editable]="editable()"
         (click)="onEdit()">
      <span class="tag-content">
        <span class="tag-type">{{ criteria().type.label }}</span>
        <span class="tag-separator">:</span>
        <span class="tag-operator">{{ criteria().operator.label }}</span>
        @if (criteria().operator.requiresValue && criteria().value !== null && criteria().value !== undefined) {
          <span class="tag-value">{{ displayValue() }}</span>
        }
      </span>
      @if (removable()) {
        <button class="tag-remove" 
                (click)="onRemove($event)"
                [attr.aria-label]="'Remove ' + criteria().type.label + ' filter'"
                type="button">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M6 4.586L10.293.293a1 1 0 111.414 1.414L7.414 6l4.293 4.293a1 1 0 01-1.414 1.414L6 7.414l-4.293 4.293a1 1 0 01-1.414-1.414L4.586 6 .293 1.707A1 1 0 011.707.293L6 4.586z"/>
          </svg>
        </button>
      }
    </div>
  `,
  styleUrl: './search-tag.component.scss'
})
export class SearchTagComponent {
  // Inputs
  readonly criteria = input.required<SearchCriteria>();
  readonly editable = input<boolean>(true);
  readonly removable = input<boolean>(true);

  // Outputs
  readonly edit = output<SearchCriteria>();
  readonly remove = output<SearchCriteria>();

  protected displayValue(): string {
    const value = this.criteria().value;
    const displayValue = this.criteria().displayValue;
    
    if (displayValue) {
      return displayValue;
    }
    
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }
    
    return String(value || '');
  }

  protected onEdit(): void {
    if (this.editable()) {
      this.edit.emit(this.criteria());
    }
  }

  protected onRemove(event: Event): void {
    event.stopPropagation();
    this.remove.emit(this.criteria());
  }
}