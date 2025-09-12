import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExtendedTemplatesService } from '../services/extended-templates.service';
import { ExtendedSearchTemplate, TemplateGroup, QuickTemplate, LogicalOperator } from '../models';

@Component({
  selector: 'app-template-manager',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="template-manager" [class.open]="isOpen()">
      <div class="manager-backdrop" (click)="close()"></div>
      
      <div class="manager-modal">
        <div class="manager-header">
          <div class="header-info">
            <h2 class="manager-title">Template Manager</h2>
            <p class="manager-description">Organize and manage your search templates</p>
          </div>
          <div class="header-actions">
            <button 
              class="header-action-btn"
              type="button"
              (click)="showCreateTemplate()"
              title="Create new template">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2z"/>
              </svg>
              New Template
            </button>
            <button 
              class="close-btn"
              type="button"
              (click)="close()"
              title="Close template manager">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="manager-content">
          <!-- Sidebar Navigation -->
          <div class="sidebar">
            <div class="sidebar-section">
              <div class="section-header">
                <h3 class="section-title">Quick Access</h3>
              </div>
              <div class="quick-templates">
                @for (quickTemplate of quickTemplates(); track quickTemplate.id) {
                  <button 
                    class="quick-template-btn"
                    type="button"
                    [style.--template-color]="quickTemplate.color"
                    (click)="useQuickTemplate(quickTemplate)"
                    [title]="quickTemplate.description">
                    <span class="template-icon">{{ quickTemplate.icon }}</span>
                    <span class="template-label">{{ quickTemplate.label }}</span>
                    @if (quickTemplate.hotkey) {
                      <span class="template-hotkey">{{ quickTemplate.hotkey }}</span>
                    }
                  </button>
                }
              </div>
            </div>

            <div class="sidebar-section">
              <div class="section-header">
                <h3 class="section-title">Browse</h3>
              </div>
              <nav class="nav-menu">
                <button 
                  class="nav-item"
                  type="button"
                  [class.active]="currentView() === 'all'"
                  (click)="setView('all')">
                  <span class="nav-icon">📚</span>
                  All Templates
                  <span class="nav-count">{{ allTemplates().length }}</span>
                </button>
                <button 
                  class="nav-item"
                  type="button"
                  [class.active]="currentView() === 'recent'"
                  (click)="setView('recent')">
                  <span class="nav-icon">🕒</span>
                  Recent
                  <span class="nav-count">{{ recentTemplates().length }}</span>
                </button>
                <button 
                  class="nav-item"
                  type="button"
                  [class.active]="currentView() === 'favorites'"
                  (click)="setView('favorites')">
                  <span class="nav-icon">⭐</span>
                  Most Used
                  <span class="nav-count">{{ mostUsedTemplates().length }}</span>
                </button>
                <button 
                  class="nav-item"
                  type="button"
                  [class.active]="currentView() === 'shared'"
                  (click)="setView('shared')">
                  <span class="nav-icon">🤝</span>
                  Shared
                  <span class="nav-count">{{ sharedTemplates().length }}</span>
                </button>
              </nav>
            </div>

            <div class="sidebar-section">
              <div class="section-header">
                <h3 class="section-title">Groups</h3>
                <button 
                  class="section-action"
                  type="button"
                  (click)="showCreateGroup()"
                  title="Create new group">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2z"/>
                  </svg>
                </button>
              </div>
              <div class="groups-list">
                @for (group of templateGroups(); track group.id) {
                  <div class="group-item">
                    <button 
                      class="group-header"
                      type="button"
                      [class.active]="currentView() === 'group' && selectedGroupId() === group.id"
                      (click)="setGroupView(group.id)">
                      <span class="group-icon" [style.color]="group.color">{{ group.icon }}</span>
                      <span class="group-name">{{ group.name }}</span>
                      <span class="group-count">{{ getGroupTemplateCount(group.id) }}</span>
                    </button>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Main Content Area -->
          <div class="main-content">
            <div class="content-header">
              <div class="view-info">
                <h3 class="view-title">{{ getViewTitle() }}</h3>
                <p class="view-description">{{ getViewDescription() }}</p>
              </div>
              <div class="content-actions">
                <div class="search-box">
                  <input 
                    type="text"
                    class="search-input"
                    placeholder="Search templates..."
                    [value]="searchQuery()"
                    (input)="setSearchQuery($event.target.value)">
                  <svg class="search-icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM2.5 8a5.5 5.5 0 1 0 11 0 5.5 5.5 0 0 0-11 0z"/>
                    <path d="m12.02 12.02 4.95 4.95a.75.75 0 1 0 1.06-1.06l-4.95-4.95a.75.75 0 1 0-1.06 1.06z"/>
                  </svg>
                </div>
                <div class="view-controls">
                  <button 
                    class="view-toggle-btn"
                    type="button"
                    [class.active]="viewMode() === 'grid'"
                    (click)="setViewMode('grid')"
                    title="Grid view">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zM2.5 2a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zM1 10.5A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3z"/>
                    </svg>
                  </button>
                  <button 
                    class="view-toggle-btn"
                    type="button"
                    [class.active]="viewMode() === 'list'"
                    (click)="setViewMode('list')"
                    title="List view">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path fill-rule="evenodd" d="M2.5 3.5a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11zm0 4a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11zm0 4a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div class="templates-container" [class.grid-view]="viewMode() === 'grid'" [class.list-view]="viewMode() === 'list'">
              @if (filteredTemplates().length === 0) {
                <div class="empty-state">
                  <div class="empty-icon">📝</div>
                  <h4 class="empty-title">No Templates Found</h4>
                  <p class="empty-description">
                    @if (searchQuery()) {
                      No templates match your search. Try a different term or create a new template.
                    } @else {
                      You haven't created any templates yet. Create your first template to get started.
                    }
                  </p>
                  <button 
                    class="create-first-btn"
                    type="button"
                    (click)="showCreateTemplate()">
                    Create Template
                  </button>
                </div>
              } @else {
                @for (template of filteredTemplates(); track template.id) {
                  <div class="template-card" [class.invalid]="!template.isValid">
                    <div class="template-header">
                      <div class="template-info">
                        <div class="template-icon" [style.color]="template.color">
                          {{ template.icon || '📄' }}
                        </div>
                        <div class="template-meta">
                          <h4 class="template-name">{{ template.name }}</h4>
                          @if (template.description) {
                            <p class="template-description">{{ template.description }}</p>
                          }
                        </div>
                      </div>
                      <div class="template-actions">
                        <button 
                          class="template-action-btn"
                          type="button"
                          (click)="useTemplate(template)"
                          title="Use this template">
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8.354 4.646a.5.5 0 0 0-.708 0l-3 3a.5.5 0 0 0 0 .708l3 3a.5.5 0 0 0 .708-.708L6.207 8l2.147-2.146a.5.5 0 0 0 0-.708z"/>
                          </svg>
                        </button>
                        <div class="template-menu">
                          <button 
                            class="template-menu-trigger"
                            type="button"
                            (click)="toggleTemplateMenu(template.id)">
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                              <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
                            </svg>
                          </button>
                          @if (openMenuId() === template.id) {
                            <div class="template-menu-dropdown">
                              <button class="menu-item" (click)="editTemplate(template)">
                                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                                  <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708L9.708 9.708a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l6-6zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                                </svg>
                                Edit
                              </button>
                              <button class="menu-item" (click)="duplicateTemplate(template)">
                                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                                  <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2H9v1h4a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                                  <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                                </svg>
                                Duplicate
                              </button>
                              <button class="menu-item" (click)="shareTemplate(template)">
                                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                                  <path d="M13.5 1a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5zm-8.5 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm11 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/>
                                </svg>
                                Share
                              </button>
                              <div class="menu-divider"></div>
                              <button class="menu-item danger" (click)="deleteTemplate(template)">
                                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                                  <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5zM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.506a.58.58 0 0 0-.01 0H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84L14.462 3.5H15a.5.5 0 0 0 0-1h-4zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5h9.916zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47ZM8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5Z"/>
                                </svg>
                                Delete
                              </button>
                            </div>
                          }
                        </div>
                      </div>
                    </div>
                    
                    <div class="template-content">
                      @if (template.tags.length > 0) {
                        <div class="template-tags">
                          @for (tag of template.tags; track tag) {
                            <span class="template-tag">{{ tag }}</span>
                          }
                        </div>
                      }
                      
                      <div class="template-stats">
                        <div class="stat">
                          <span class="stat-label">Criteria:</span>
                          <span class="stat-value">{{ template.query.criteria.length }}</span>
                        </div>
                        <div class="stat">
                          <span class="stat-label">Logic:</span>
                          <span class="stat-value logic-{{ template.logicalOperator?.toLowerCase() }}">
                            {{ template.logicalOperator || 'AND' }}
                          </span>
                        </div>
                        <div class="stat">
                          <span class="stat-label">Used:</span>
                          <span class="stat-value">{{ template.usageCount }}×</span>
                        </div>
                      </div>
                      
                      @if (!template.isValid) {
                        <div class="template-errors">
                          <div class="error-icon">⚠️</div>
                          <div class="error-message">
                            Template has validation errors
                          </div>
                        </div>
                      }
                      
                      @if (template.isShared) {
                        <div class="template-shared-indicator">
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M13.5 1a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5zm-8.5 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm11 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/>
                          </svg>
                          Shared
                        </div>
                      }
                    </div>
                  </div>
                }
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './template-manager.component.scss'
})
export class TemplateManagerComponent {
  constructor(private extendedTemplatesService: ExtendedTemplatesService) {}

  // Inputs
  readonly isOpen = input<boolean>(false);

  // Outputs
  readonly closed = output<void>();
  readonly templateSelected = output<ExtendedSearchTemplate>();

  // Internal state
  protected readonly currentView = signal<'all' | 'recent' | 'favorites' | 'shared' | 'group'>('all');
  protected readonly selectedGroupId = signal<string | null>(null);
  protected readonly searchQuery = signal<string>('');
  protected readonly viewMode = signal<'grid' | 'list'>('grid');
  protected readonly openMenuId = signal<string | null>(null);

  // Data from service
  protected readonly allTemplates = computed(() => this.extendedTemplatesService.templates());
  protected readonly templateGroups = computed(() => this.extendedTemplatesService.groups());
  protected readonly quickTemplates = computed(() => this.extendedTemplatesService.quickAccess());
  protected readonly recentTemplates = computed(() => this.extendedTemplatesService.recentTemplates());
  protected readonly mostUsedTemplates = computed(() => this.extendedTemplatesService.mostUsedTemplates());

  protected readonly sharedTemplates = computed(() => 
    this.allTemplates().filter(t => t.isShared)
  );

  // Filtered templates based on current view
  protected readonly filteredTemplates = computed(() => {
    let templates: ExtendedSearchTemplate[] = [];

    switch (this.currentView()) {
      case 'all':
        templates = this.allTemplates();
        break;
      case 'recent':
        templates = this.recentTemplates();
        break;
      case 'favorites':
        templates = this.mostUsedTemplates();
        break;
      case 'shared':
        templates = this.sharedTemplates();
        break;
      case 'group':
        const groupId = this.selectedGroupId();
        if (groupId) {
          templates = this.extendedTemplatesService.getTemplatesByGroup(groupId);
        }
        break;
    }

    // Apply search filter
    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      templates = templates.filter(template =>
        template.name.toLowerCase().includes(query) ||
        template.description?.toLowerCase().includes(query) ||
        template.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return templates;
  });

  // View management
  protected setView(view: 'all' | 'recent' | 'favorites' | 'shared'): void {
    this.currentView.set(view);
    this.selectedGroupId.set(null);
  }

  protected setGroupView(groupId: string): void {
    this.currentView.set('group');
    this.selectedGroupId.set(groupId);
  }

  protected setSearchQuery(query: string): void {
    this.searchQuery.set(query);
  }

  protected setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode.set(mode);
  }

  protected getViewTitle(): string {
    switch (this.currentView()) {
      case 'all':
        return 'All Templates';
      case 'recent':
        return 'Recent Templates';
      case 'favorites':
        return 'Most Used';
      case 'shared':
        return 'Shared Templates';
      case 'group':
        const group = this.templateGroups().find(g => g.id === this.selectedGroupId());
        return group ? group.name : 'Group Templates';
      default:
        return 'Templates';
    }
  }

  protected getViewDescription(): string {
    switch (this.currentView()) {
      case 'all':
        return 'All your saved search templates';
      case 'recent':
        return 'Templates you\'ve used recently';
      case 'favorites':
        return 'Your most frequently used templates';
      case 'shared':
        return 'Templates shared with others';
      case 'group':
        const group = this.templateGroups().find(g => g.id === this.selectedGroupId());
        return group?.description || 'Templates in this group';
      default:
        return '';
    }
  }

  protected getGroupTemplateCount(groupId: string): number {
    return this.extendedTemplatesService.getTemplatesByGroup(groupId).length;
  }

  // Template actions
  protected useTemplate(template: ExtendedSearchTemplate): void {
    this.extendedTemplatesService.useTemplate(template.id);
    this.templateSelected.emit(template);
    this.close();
  }

  protected useQuickTemplate(quickTemplate: QuickTemplate): void {
    this.useTemplate(quickTemplate.template);
  }

  protected editTemplate(template: ExtendedSearchTemplate): void {
    // TODO: Open template editor
    this.closeMenu();
  }

  protected duplicateTemplate(template: ExtendedSearchTemplate): void {
    this.extendedTemplatesService.forkTemplate(template.id, `${template.name} (Copy)`);
    this.closeMenu();
  }

  protected shareTemplate(template: ExtendedSearchTemplate): void {
    this.extendedTemplatesService.shareTemplate(template.id);
    this.closeMenu();
    // TODO: Show share dialog
  }

  protected deleteTemplate(template: ExtendedSearchTemplate): void {
    if (confirm(`Are you sure you want to delete "${template.name}"?`)) {
      this.extendedTemplatesService.deleteExtendedTemplate(template.id);
    }
    this.closeMenu();
  }

  protected showCreateTemplate(): void {
    // TODO: Open template creation dialog
  }

  protected showCreateGroup(): void {
    // TODO: Open group creation dialog
  }

  protected toggleTemplateMenu(templateId: string): void {
    this.openMenuId.set(this.openMenuId() === templateId ? null : templateId);
  }

  protected closeMenu(): void {
    this.openMenuId.set(null);
  }

  protected close(): void {
    this.closeMenu();
    this.closed.emit();
  }
}