import { Component, input, output, signal, computed, inject, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SearchTemplatesService, SearchTemplate, TemplateFolder } from '../services/search-templates.service';
import { SearchQuery } from '../models';

type TemplateView = 'all' | 'recent' | 'popular' | 'folders';

@Component({
  selector: 'app-search-templates-dropdown',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="templates-dropdown" *ngIf="isOpen()" (click)="$event.stopPropagation()">
      <div class="templates-header">
        <div class="templates-title">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 4.75A.75.75 0 0 1 2.75 4h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75zM2 8a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 8zm0 3.25a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75z"/>
          </svg>
          Search Templates
        </div>
        
        <div class="templates-actions">
          <button 
            class="action-btn"
            type="button"
            (click)="toggleSaveMode()"
            [class.active]="showSaveMode()"
            title="Save current search as template">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z"/>
            </svg>
          </button>
          
          <div class="view-selector">
            <select 
              class="view-select"
              [value]="currentView()"
              (change)="onViewChange($event)">
              <option value="all">All</option>
              <option value="recent">Recent</option>
              <option value="popular">Popular</option>
              <option value="folders">Folders</option>
            </select>
          </div>
        </div>
      </div>
      
      @if (showSaveMode()) {
        <div class="save-template-form">
          <input
            class="template-name-input"
            type="text"
            placeholder="Template name"
            [(ngModel)]="templateName"
            (keydown)="onSaveFormKeydown($event)"
            maxlength="50">
          
          <input
            class="template-description-input"
            type="text"
            placeholder="Description (optional)"
            [(ngModel)]="templateDescription"
            (keydown)="onSaveFormKeydown($event)"
            maxlength="200">
          
          <div class="template-tags-input">
            <input
              type="text"
              placeholder="Tags (comma separated)"
              [(ngModel)]="templateTagsInput"
              (keydown)="onSaveFormKeydown($event)">
          </div>
          
          <div class="save-form-actions">
            <button 
              class="save-btn"
              type="button"
              (click)="saveTemplate()"
              [disabled]="!templateName.trim()">
              Save
            </button>
            <button 
              class="cancel-btn"
              type="button"
              (click)="cancelSave()">
              Cancel
            </button>
          </div>
        </div>
      }
      
      <div class="templates-search" *ngIf="!showSaveMode() && currentView() === 'all'">
        <input
          class="templates-search-input"
          type="text"
          placeholder="Search templates..."
          [value]="searchTerm()"
          (input)="onSearchInput($event)"
          (keydown)="onSearchKeyDown($event)">
      </div>
      
      <div class="templates-list">
        @if (displayedTemplates().length === 0) {
          <div class="no-templates">
            <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 4.75A.75.75 0 0 1 2.75 4h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75zM2 8a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 8zm0 3.25a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75z"/>
            </svg>
            <span>{{ getNoTemplatesMessage() }}</span>
          </div>
        } @else {
          @for (template of displayedTemplates(); track template.id) {
            <div class="template-item" 
                 (click)="selectTemplate(template)"
                 [class.highlighted]="selectedIndex() === $index">
              <div class="template-item-main">
                <div class="template-name">
                  @if (template.icon) {
                    <span class="template-icon">{{ template.icon }}</span>
                  }
                  {{ template.name }}
                </div>
                <div class="template-description" *ngIf="template.description">
                  {{ template.description }}
                </div>
                <div class="template-metadata">
                  <span class="template-mode" [class]="'mode-' + template.searchMode">
                    {{ template.searchMode === 'raw' ? 'Raw' : 'Visual' }}
                  </span>
                  <span class="template-usage" *ngIf="template.usageCount > 0">
                    Used {{ template.usageCount }} times
                  </span>
                  <span class="template-date">
                    {{ formatDate(template.updatedAt) }}
                  </span>
                </div>
                <div class="template-tags" *ngIf="template.tags.length > 0">
                  @for (tag of template.tags; track tag) {
                    <span class="template-tag">{{ tag }}</span>
                  }
                </div>
              </div>
              
              <div class="template-actions">
                <button 
                  class="template-action-btn"
                  type="button"
                  (click)="editTemplate(template, $event)"
                  title="Edit template">
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25a1.75 1.75 0 0 1 .445-.758l8.61-8.61Z"/>
                  </svg>
                </button>
                
                <button 
                  class="template-action-btn delete-btn"
                  type="button"
                  (click)="deleteTemplate(template, $event)"
                  title="Delete template">
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M.293.293a1 1 0 011.414 0L8 6.586 14.293.293a1 1 0 111.414 1.414L9.414 8l6.293 6.293a1 1 0 01-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 01-1.414-1.414L6.586 8 .293 1.707a1 1 0 010-1.414z"/>
                  </svg>
                </button>
              </div>
            </div>
          }
        }
      </div>
      
      <div class="templates-footer" *ngIf="displayedTemplates().length > 0">
        <div class="templates-stats">
          {{ displayedTemplates().length }} of {{ allTemplates().length }} templates
        </div>
        <div class="templates-shortcuts">
          <kbd>↑↓</kbd> Navigate <kbd>Enter</kbd> Apply <kbd>Esc</kbd> Close
        </div>
      </div>
    </div>
  `,
  styleUrl: './search-templates-dropdown.component.scss'
})
export class SearchTemplatesDropdownComponent {
  private templatesService = inject(SearchTemplatesService);
  
  // Inputs
  readonly isOpen = input<boolean>(false);
  readonly currentQuery = input<SearchQuery | null>(null);
  readonly currentSearchMode = input<'visual' | 'raw'>('visual');
  
  // Outputs
  readonly select = output<SearchTemplate>();
  readonly close = output<void>();
  
  // Internal state
  protected readonly currentView = signal<TemplateView>('all');
  protected readonly searchTerm = signal<string>('');
  protected readonly selectedIndex = signal<number>(0);
  protected readonly showSaveMode = signal<boolean>(false);
  protected templateName = '';
  protected templateDescription = '';
  protected templateTagsInput = '';
  
  // Computed values
  protected readonly allTemplates = computed(() => this.templatesService.getTemplates()());
  
  protected readonly displayedTemplates = computed(() => {
    const view = this.currentView();
    const term = this.searchTerm().trim();
    
    let templates = this.allTemplates();
    
    // Filter by view
    switch (view) {
      case 'recent':
        templates = this.templatesService.getRecentlyUsedTemplates(20);
        break;
      case 'popular':
        templates = this.templatesService.getMostUsedTemplates(20);
        break;
      case 'all':
      default:
        // Apply search filter
        if (term) {
          templates = this.templatesService.searchTemplates(term);
        }
        break;
    }
    
    return templates;
  });
  
  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.isOpen() || this.showSaveMode()) return;
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        const nextIndex = Math.min(
          this.selectedIndex() + 1, 
          this.displayedTemplates().length - 1
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
        const selectedTemplate = this.displayedTemplates()[this.selectedIndex()];
        if (selectedTemplate) {
          this.selectTemplate(selectedTemplate);
        }
        break;
        
      case 'Escape':
        event.preventDefault();
        this.close.emit();
        break;
    }
  }
  
  protected selectTemplate(template: SearchTemplate): void {
    const appliedTemplate = this.templatesService.applyTemplate(template.id);
    if (appliedTemplate) {
      this.select.emit(appliedTemplate);
    }
  }
  
  protected editTemplate(template: SearchTemplate, event: Event): void {
    event.stopPropagation();
    // For now, just populate the save form with the template data
    this.templateName = template.name;
    this.templateDescription = template.description || '';
    this.templateTagsInput = template.tags.join(', ');
    this.showSaveMode.set(true);
  }
  
  protected deleteTemplate(template: SearchTemplate, event: Event): void {
    event.stopPropagation();
    
    if (confirm(`Are you sure you want to delete the template "${template.name}"? This action cannot be undone.`)) {
      this.templatesService.deleteTemplate(template.id);
      
      // Adjust selected index if needed
      const currentSelected = this.selectedIndex();
      const templates = this.displayedTemplates();
      if (currentSelected >= templates.length - 1) {
        this.selectedIndex.set(Math.max(0, templates.length - 2));
      }
    }
  }
  
  protected onViewChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.currentView.set(target.value as TemplateView);
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
  
  protected toggleSaveMode(): void {
    if (this.showSaveMode()) {
      this.cancelSave();
    } else {
      this.showSaveMode.set(true);
    }
  }
  
  protected saveTemplate(): void {
    const name = this.templateName.trim();
    if (!name || !this.currentQuery()) return;
    
    const tags = this.templateTagsInput
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
    
    this.templatesService.saveAsTemplate(
      name,
      this.currentQuery()!,
      this.currentSearchMode(),
      {
        description: this.templateDescription.trim() || undefined,
        tags
      }
    );
    
    this.cancelSave();
  }
  
  protected cancelSave(): void {
    this.showSaveMode.set(false);
    this.templateName = '';
    this.templateDescription = '';
    this.templateTagsInput = '';
  }
  
  protected onSaveFormKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (this.templateName.trim()) {
        this.saveTemplate();
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelSave();
    }
  }
  
  protected getNoTemplatesMessage(): string {
    if (this.searchTerm()) {
      return 'No templates match your search';
    }
    
    switch (this.currentView()) {
      case 'recent':
        return 'No recently used templates';
      case 'popular':
        return 'No popular templates yet';
      case 'folders':
        return 'No template folders';
      default:
        return 'No templates saved yet';
    }
  }
  
  protected formatDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }
}