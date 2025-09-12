import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchCriteria } from '../models';
import { DragDropService } from '../services/drag-drop.service';

@Component({
  selector: 'app-search-tag',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="search-tag" 
         [class.invalid]="!criteria().isValid"
         [class.editable]="editable()"
         [class.draggable]="draggable()"
         [class]="getDragClasses().join(' ')"
         [draggable]="draggable()"
         (click)="onEdit()"
         (dragstart)="onDragStart($event)"
         (dragover)="onDragOver($event)"
         (drop)="onDrop($event)"
         (dragend)="onDragEnd()">
      
      @if (draggable()) {
        <div class="drag-handle" 
             title="Drag to reorder"
             (mousedown)="$event.stopPropagation()">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M10 13a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM6 13a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM10 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM6 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM10 3a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM6 3a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
          </svg>
        </div>
      }
      
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
      
      <!-- Drop indicator -->
      <div class="drop-indicator" *ngIf="showDropIndicator"></div>
    </div>
  `,
  styleUrl: './search-tag.component.scss'
})
export class SearchTagComponent {
  private dragDropService = inject(DragDropService);

  // Inputs
  readonly criteria = input.required<SearchCriteria>();
  readonly editable = input<boolean>(true);
  readonly removable = input<boolean>(true);
  readonly draggable = input<boolean>(true);
  readonly index = input<number>(-1);

  // Outputs
  readonly edit = output<SearchCriteria>();
  readonly remove = output<SearchCriteria>();
  readonly dragStart = output<{ item: SearchCriteria; index: number; event: DragEvent }>();
  readonly dragOver = output<{ index: number; event: DragEvent }>();
  readonly drop = output<{ index: number; event: DragEvent }>();
  readonly dragEnd = output<void>();

  // Internal state
  protected showDropIndicator = false;

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
    if (this.editable() && !this.dragDropService.isDragging()) {
      this.edit.emit(this.criteria());
    }
  }

  protected onRemove(event: Event): void {
    event.stopPropagation();
    this.remove.emit(this.criteria());
  }

  // Drag and Drop Methods
  protected onDragStart(event: DragEvent): void {
    if (!this.draggable()) {
      event.preventDefault();
      return;
    }

    this.dragStart.emit({ 
      item: this.criteria(), 
      index: this.index(), 
      event 
    });
  }

  protected onDragOver(event: DragEvent): void {
    if (!this.draggable()) return;
    
    event.preventDefault();
    this.showDropIndicator = true;
    
    this.dragOver.emit({ 
      index: this.index(), 
      event 
    });
  }

  protected onDrop(event: DragEvent): void {
    if (!this.draggable()) return;
    
    event.preventDefault();
    this.showDropIndicator = false;
    
    this.drop.emit({ 
      index: this.index(), 
      event 
    });
  }

  protected onDragEnd(): void {
    this.showDropIndicator = false;
    this.dragEnd.emit();
  }

  protected getDragClasses(): string[] {
    if (!this.draggable()) return [];
    return this.dragDropService.getDragClasses(this.index());
  }
}