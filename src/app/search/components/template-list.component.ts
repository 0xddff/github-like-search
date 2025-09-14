import { Component, input, output, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExtendedTemplatesService } from '../services/extended-templates.service';
import { ExtendedSearchTemplate, SearchCriteria, LogicalOperator } from '../models';

@Component({
  selector: 'app-template-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="template-bar">
      @if (availableTemplates().length > 0) {
        <div class="template-items">
          @for (template of availableTemplates(); track template.id) {
            @if (editingTemplate() === template.id) {
              <!-- Edit Mode -->
              <div class="template-item editing">
                <input 
                  class="edit-input"
                  [(ngModel)]="editName"
                  (keydown.enter)="saveEdit()"
                  (keydown.escape)="cancelEdit()"
                  (blur)="saveEdit()"
                  #nameInput>
              </div>
            } @else {
              <!-- Normal Mode -->
              <div class="template-item" [class.applied]="appliedTemplate()?.id === template.id">
                <button 
                  class="template-btn"
                  type="button"
                  (click)="applyTemplate(template)"
                  [title]="'Apply template: ' + template.name">
                  {{ template.name }}
                </button>
                <button 
                  class="edit-btn"
                  type="button"
                  (click)="startEdit(template)"
                  title="Edit template name">
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10z"/>
                  </svg>
                </button>
                <button 
                  class="delete-btn"
                  type="button"
                  (click)="deleteTemplate(template)"
                  title="Delete template">
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5ZM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.506a.58.58 0 0 0-.01 0H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1h-.995a.59.59 0 0 0-.01 0H11Z"/>
                  </svg>
                </button>
              </div>
            }
          }
        </div>
        
        <button 
          class="save-btn"
          type="button"
          (click)="createNewTemplate()"
          title="Save current search as template">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2z"/>
          </svg>
          Save
        </button>
      } @else {
        <!-- Empty state -->
        <div class="empty-template-bar">
          <span class="empty-text">No saved templates</span>
          <button 
            class="save-btn"
            type="button"
            (click)="createNewTemplate()"
            title="Save current search as template">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2z"/>
            </svg>
            Save Current Search
          </button>
        </div>
      }
    </div>
  `,
  styleUrl: './template-list.component.scss'
})
export class TemplateListComponent {
  private templatesService = inject(ExtendedTemplatesService);

  // Inputs
  readonly currentCriteria = input<SearchCriteria[]>([]);
  readonly currentOperator = input<LogicalOperator>(LogicalOperator.AND);
  readonly appliedTemplate = input<ExtendedSearchTemplate | null>(null);

  // Outputs  
  readonly templateApplied = output<ExtendedSearchTemplate>();
  readonly templateCreationRequested = output<void>();

  // State
  protected readonly editingTemplate = signal<string | null>(null);
  protected editName = '';

  // Computed properties
  protected readonly availableTemplates = computed(() => {
    return this.templatesService.templates().slice().sort((a: ExtendedSearchTemplate, b: ExtendedSearchTemplate) =>
      new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
    );
  });

  protected applyTemplate(template: ExtendedSearchTemplate): void {
    this.templateApplied.emit(template);
  }

  protected createNewTemplate(): void {
    this.templateCreationRequested.emit();
  }

  protected startEdit(template: ExtendedSearchTemplate): void {
    this.editingTemplate.set(template.id);
    this.editName = template.name;
    
    // Focus the input after the view updates
    setTimeout(() => {
      const input = document.querySelector('.edit-input') as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    });
  }

  protected async saveEdit(): Promise<void> {
    const templateId = this.editingTemplate();
    if (!templateId || !this.editName.trim()) {
      return;
    }

    const template = this.availableTemplates().find((t: ExtendedSearchTemplate) => t.id === templateId);
    if (!template) {
      return;
    }

    try {
      await this.templatesService.updateExtendedTemplate(templateId, {
        ...template,
        name: this.editName.trim(),
        updatedAt: new Date()
      });
      
      this.cancelEdit();
    } catch (error) {
      // Error handled by service - could show user notification here
    }
  }

  protected cancelEdit(): void {
    this.editingTemplate.set(null);
    this.editName = '';
  }

  protected async deleteTemplate(template: ExtendedSearchTemplate): Promise<void> {
    if (confirm(`Are you sure you want to delete "${template.name}"?`)) {
      try {
        await this.templatesService.deleteExtendedTemplate(template.id);
      } catch (error) {
        // Error handled by service - could show user notification here
      }
    }
  }
}