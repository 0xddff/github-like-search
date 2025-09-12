import { Component, signal, computed, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TemplatePresetsService, TemplatePreset } from '../services/template-presets.service';
import { ExtendedTemplatesService } from '../services/extended-templates.service';
import { ExtendedSearchTemplate } from '../models';

@Component({
  selector: 'app-preset-browser',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="preset-browser" [class.open]="isOpen()">
      <div class="browser-backdrop" (click)="close()"></div>
      
      <div class="browser-modal">
        <div class="browser-header">
          <h3 class="browser-title">Browse Template Presets</h3>
          <button 
            class="close-btn"
            (click)="close()"
            type="button">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
            </svg>
          </button>
        </div>

        <div class="browser-toolbar">
          <div class="search-section">
            <input 
              class="search-input"
              [(ngModel)]="searchQuery"
              (input)="onSearchInput($event)"
              placeholder="Search presets..."
              type="text">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
            </svg>
          </div>

          <div class="filter-section">
            <div class="category-filters">
              <button 
                class="category-filter"
                [class.active]="selectedCategory() === null"
                (click)="selectCategory(null)"
                type="button">
                All
              </button>
              @for (category of categories(); track category.id) {
                <button 
                  class="category-filter"
                  [class.active]="selectedCategory() === category.id"
                  (click)="selectCategory(category.id)"
                  type="button">
                  <span class="category-icon">{{ category.icon }}</span>
                  {{ category.label }}
                </button>
              }
            </div>
          </div>
        </div>

        <div class="browser-content">
          @if (filteredPresets().length === 0) {
            <div class="empty-state">
              <div class="empty-state-icon">
                <svg width="48" height="48" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                </svg>
              </div>
              <h3>No presets found</h3>
              <p>Try adjusting your search terms or category filter</p>
            </div>
          } @else {
            <div class="presets-grid">
              @for (preset of filteredPresets(); track preset.id) {
                <div class="preset-card">
                  <div class="preset-header">
                    <div class="preset-info">
                      <span class="preset-icon" [style.color]="preset.color">{{ preset.icon }}</span>
                      <div class="preset-details">
                        <h4 class="preset-name">{{ preset.name }}</h4>
                        <p class="preset-description">{{ preset.description }}</p>
                      </div>
                    </div>
                  </div>

                  <div class="preset-body">
                    <div class="preset-query">
                      <div class="query-label">Query:</div>
                      <code class="query-text">{{ preset.query.rawQuery }}</code>
                    </div>

                    @if (preset.tags.length > 0) {
                      <div class="preset-tags">
                        @for (tag of preset.tags.slice(0, 3); track tag) {
                          <span class="tag">{{ tag }}</span>
                        }
                        @if (preset.tags.length > 3) {
                          <span class="tag-more">+{{ preset.tags.length - 3 }}</span>
                        }
                      </div>
                    }
                  </div>

                  <div class="preset-actions">
                    <button 
                      class="use-preset-btn"
                      (click)="usePreset(preset)"
                      type="button">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                        <path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.061L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z"/>
                      </svg>
                      Use Preset
                    </button>
                    
                    <button 
                      class="save-as-template-btn"
                      (click)="saveAsTemplate(preset)"
                      type="button">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M2 4.75A.75.75 0 0 1 2.75 4h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75zM2 8a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 8zm0 3.25a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75z"/>
                      </svg>
                      Save as Template
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- Recommendations Section -->
        @if (recommendations().length > 0 && !searchQuery().trim()) {
          <div class="recommendations-section">
            <div class="recommendations-header">
              <h4>Recommended for You</h4>
              <p>Based on your existing templates</p>
            </div>
            <div class="recommendations-grid">
              @for (preset of recommendations(); track preset.id) {
                <button 
                  class="recommendation-card"
                  (click)="usePreset(preset)"
                  type="button">
                  <span class="recommendation-icon" [style.color]="preset.color">{{ preset.icon }}</span>
                  <div class="recommendation-info">
                    <span class="recommendation-name">{{ preset.name }}</span>
                    <span class="recommendation-description">{{ preset.description }}</span>
                  </div>
                </button>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './preset-browser.component.scss'
})
export class PresetBrowserComponent {
  private presetsService = inject(TemplatePresetsService);
  private templatesService = inject(ExtendedTemplatesService);

  // Inputs
  readonly isOpen = input<boolean>(false);
  readonly existingTemplates = input<ExtendedSearchTemplate[]>([]);

  // Outputs
  readonly closed = output<void>();
  readonly presetSelected = output<TemplatePreset>();
  readonly templateCreated = output<ExtendedSearchTemplate>();

  // State
  protected readonly searchQuery = signal<string>('');
  protected readonly selectedCategory = signal<TemplatePreset['category'] | null>(null);

  // Computed properties
  protected readonly categories = computed(() => this.presetsService.getCategories());
  protected readonly allPresets = computed(() => this.presetsService.getAllPresets());
  
  protected readonly filteredPresets = computed(() => {
    let presets = this.allPresets();
    
    // Filter by category
    const category = this.selectedCategory();
    if (category) {
      presets = presets.filter(preset => preset.category === category);
    }
    
    // Filter by search query
    const query = this.searchQuery().trim();
    if (query) {
      presets = this.presetsService.searchPresets(query);
      // Also apply category filter if both are active
      if (category) {
        presets = presets.filter(preset => preset.category === category);
      }
    }
    
    return presets;
  });

  protected readonly recommendations = computed(() => {
    return this.presetsService.getRecommendations(this.existingTemplates());
  });

  protected close(): void {
    this.closed.emit();
  }

  protected onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }

  protected selectCategory(category: TemplatePreset['category'] | null): void {
    this.selectedCategory.set(category);
  }

  protected usePreset(preset: TemplatePreset): void {
    this.presetSelected.emit(preset);
    this.close();
  }

  protected async saveAsTemplate(preset: TemplatePreset): Promise<void> {
    try {
      const templateData = this.presetsService.presetToTemplate(preset);
      const template = await this.templatesService.createExtendedTemplate(templateData);
      this.templateCreated.emit(template);
      this.close();
    } catch (error) {
      console.error('Failed to save preset as template:', error);
    }
  }
}