import { Component, signal, computed, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExtendedTemplatesService } from '../services/extended-templates.service';
import { ExtendedSearchTemplate, TemplateGroup, QuickTemplate, LogicalOperator } from '../models';
import { SearchQuery } from '../models';

@Component({
  selector: 'app-template-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="template-selector" [class.expanded]="isExpanded()">
      <!-- Header -->
      <div class="selector-header">
        <button 
          class="toggle-btn"
          (click)="toggleExpanded()"
          type="button">
          <svg class="expand-icon" [class.rotated]="isExpanded()" width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 1z"/>
          </svg>
          Templates
        </button>
        
        <div class="selector-actions">
          <span class="template-count">{{ totalTemplateCount() }}</span>
          
          <button 
            class="manage-btn"
            (click)="openManager()"
            type="button"
            title="Manage templates">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
              <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319z"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Quick Access Templates -->
      @if (isExpanded()) {
        <div class="selector-content">
          @if (quickTemplates().length > 0) {
            <div class="quick-templates">
              <div class="section-title">Quick Access</div>
              <div class="template-grid">
                @for (quickTemplate of quickTemplates(); track quickTemplate.id) {
                  <button 
                    class="template-quick-btn"
                    [style.--template-color]="quickTemplate.color || '#0969da'"
                    (click)="selectTemplate(quickTemplate.template)"
                    type="button">
                    <span class="template-icon">{{ quickTemplate.icon }}</span>
                    <span class="template-label">{{ quickTemplate.label }}</span>
                    @if (quickTemplate.hotkey) {
                      <kbd class="hotkey">{{ quickTemplate.hotkey }}</kbd>
                    }
                  </button>
                }
              </div>
            </div>
          }

          <!-- Recent Templates -->
          @if (recentTemplates().length > 0) {
            <div class="recent-templates">
              <div class="section-title">Recently Used</div>
              <div class="template-list">
                @for (template of recentTemplates(); track template.id) {
                  <button 
                    class="template-item"
                    (click)="selectTemplate(template)"
                    type="button">
                    <div class="template-info">
                      @if (template.icon) {
                        <span class="template-icon">{{ template.icon }}</span>
                      }
                      <div class="template-details">
                        <div class="template-name">{{ template.name }}</div>
                        @if (template.description) {
                          <div class="template-description">{{ template.description }}</div>
                        }
                      </div>
                    </div>
                    <div class="template-meta">
                      @if (template.logicalOperator) {
                        <span class="logical-operator">{{ template.logicalOperator }}</span>
                      }
                      @if (template.tags && template.tags.length > 0) {
                        <div class="template-tags">
                          @for (tag of template.tags!.slice(0, 2); track tag) {
                            <span class="tag">{{ tag }}</span>
                          }
                        </div>
                      }
                    </div>
                  </button>
                }
              </div>
            </div>
          }

          <!-- Template Groups -->
          @if (templateGroups().length > 0) {
            <div class="template-groups">
              @for (group of templateGroups(); track group.id) {
                @if (getGroupTemplates(group.id).length > 0) {
                  <div class="template-group" [class.collapsed]="group.isCollapsed">
                    <button 
                      class="group-header"
                      (click)="toggleGroup(group.id)"
                      type="button">
                      <div class="group-info">
                        @if (group.icon) {
                          <span class="group-icon">{{ group.icon }}</span>
                        }
                        <span class="group-name">{{ group.name }}</span>
                        <span class="group-count">{{ getGroupTemplates(group.id).length }}</span>
                      </div>
                      <svg class="chevron" [class.rotated]="!group.isCollapsed" width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M4.427 9.573a.25.25 0 0 0 0 .354l3.396 3.396a.25.25 0 0 0 .354 0l3.396-3.396a.25.25 0 0 0-.354-.354L8 12.793 4.781 9.573a.25.25 0 0 0-.354 0z"/>
                      </svg>
                    </button>
                    
                    @if (!group.isCollapsed) {
                      <div class="group-templates">
                        @for (template of getGroupTemplates(group.id); track template.id) {
                          <button 
                            class="template-item group-template"
                            (click)="selectTemplate(template)"
                            type="button">
                            <div class="template-info">
                              @if (template.icon) {
                                <span class="template-icon">{{ template.icon }}</span>
                              }
                              <div class="template-details">
                                <div class="template-name">{{ template.name }}</div>
                                @if (template.description) {
                                  <div class="template-description">{{ template.description }}</div>
                                }
                              </div>
                            </div>
                            <div class="template-meta">
                              @if (template.logicalOperator) {
                                <span class="logical-operator">{{ template.logicalOperator }}</span>
                              }
                            </div>
                          </button>
                        }
                      </div>
                    }
                  </div>
                }
              }
            </div>
          }

          <!-- Ungrouped Templates -->
          @if (ungroupedTemplates().length > 0) {
            <div class="ungrouped-templates">
              <div class="section-title">Other Templates</div>
              <div class="template-list">
                @for (template of ungroupedTemplates(); track template.id) {
                  <button 
                    class="template-item"
                    (click)="selectTemplate(template)"
                    type="button">
                    <div class="template-info">
                      @if (template.icon) {
                        <span class="template-icon">{{ template.icon }}</span>
                      }
                      <div class="template-details">
                        <div class="template-name">{{ template.name }}</div>
                        @if (template.description) {
                          <div class="template-description">{{ template.description }}</div>
                        }
                      </div>
                    </div>
                    <div class="template-meta">
                      @if (template.logicalOperator) {
                        <span class="logical-operator">{{ template.logicalOperator }}</span>
                      }
                    </div>
                  </button>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styleUrl: './template-selector.component.scss'
})
export class TemplateSelectorComponent {
  private templatesService = inject(ExtendedTemplatesService);

  // Inputs
  readonly currentQuery = input<SearchQuery | null>(null);

  // Outputs
  readonly templateSelected = output<ExtendedSearchTemplate>();
  readonly manageRequested = output<void>();

  // State
  protected readonly isExpanded = signal<boolean>(false);

  // Computed properties
  protected readonly quickTemplates = computed(() => this.templatesService.quickAccess());
  protected readonly templateGroups = computed(() => this.templatesService.groups());
  protected readonly recentTemplates = computed(() => this.templatesService.recentTemplates());
  protected readonly ungroupedTemplates = computed(() => this.templatesService.templatesWithoutGroup());
  
  protected readonly totalTemplateCount = computed(() => {
    return this.templatesService.templates().length;
  });

  protected toggleExpanded(): void {
    this.isExpanded.update(expanded => !expanded);
  }

  protected selectTemplate(template: ExtendedSearchTemplate): void {
    // Mark template as used
    this.templatesService.useTemplate(template.id);
    
    // Emit selection
    this.templateSelected.emit(template);
    
    // Collapse selector after selection
    this.isExpanded.set(false);
  }

  protected openManager(): void {
    this.manageRequested.emit();
  }

  protected getGroupTemplates(groupId: string): ExtendedSearchTemplate[] {
    return this.templatesService.templatesByGroup().get(groupId) || [];
  }

  protected async toggleGroup(groupId: string): Promise<void> {
    const group = this.templateGroups().find(g => g.id === groupId);
    if (group) {
      await this.templatesService.updateGroup(groupId, {
        isCollapsed: !group.isCollapsed
      });
    }
  }
}