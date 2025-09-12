import { Component, signal, computed, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TemplateSelectorComponent } from './template-selector.component';
import { TemplateManagerComponent } from './template-manager.component';
import { TemplateSharingComponent } from './template-sharing.component';
import { PresetBrowserComponent } from './preset-browser.component';
import { ExtendedTemplatesService } from '../services/extended-templates.service';
import { TemplatePresetsService, TemplatePreset } from '../services/template-presets.service';
import { ExtendedSearchTemplate, SearchQuery } from '../models';

@Component({
  selector: 'app-search-templates-interface',
  standalone: true,
  imports: [
    CommonModule,
    TemplateSelectorComponent,
    TemplateManagerComponent,
    TemplateSharingComponent,
    PresetBrowserComponent
  ],
  template: `
    <!-- Template Selector (Always Visible) -->
    <app-template-selector
      [currentQuery]="currentQuery()"
      (templateSelected)="onTemplateSelected($event)"
      (manageRequested)="openManager()">
    </app-template-selector>

    <!-- Floating Action Button for Quick Actions -->
    <div class="template-fab" [class.expanded]="showQuickActions()">
      <button 
        class="fab-main"
        (click)="toggleQuickActions()"
        type="button">
        <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2 4.75A.75.75 0 0 1 2.75 4h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75zM2 8a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 8zm0 3.25a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75z"/>
        </svg>
      </button>

      @if (showQuickActions()) {
        <div class="fab-actions">
          <button 
            class="fab-action"
            (click)="openPresetBrowser()"
            title="Browse Presets">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
              <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319z"/>
            </svg>
            <span>Presets</span>
          </button>
          
          <button 
            class="fab-action"
            (click)="openManager()"
            title="Manage Templates">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0zM8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zm.5 4.75a.75.75 0 0 0-1.5 0v3.5a.75.75 0 0 0 .471.696l2.5 1a.75.75 0 0 0 .557-1.392L8.5 7.742V4.75z"/>
            </svg>
            <span>Manage</span>
          </button>
          
          @if (canSaveCurrentSearch()) {
            <button 
              class="fab-action save-action"
              (click)="saveCurrentAsTemplate()"
              title="Save Current Search">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z"/>
              </svg>
              <span>Save Search</span>
            </button>
          }
        </div>
      }
    </div>

    <!-- Template Manager Modal -->
    <app-template-manager
      [isOpen]="showManager()"
      (closed)="closeManager()"
      (templateSelected)="onTemplateSelected($event)">
    </app-template-manager>

    <!-- Template Sharing Modal -->
    <app-template-sharing
      [isOpen]="showSharing()"
      [template]="templateToShare()"
      (closed)="closeSharing()">
    </app-template-sharing>

    <!-- Preset Browser Modal -->
    <app-preset-browser
      [isOpen]="showPresetBrowser()"
      [existingTemplates]="existingTemplates()"
      (closed)="closePresetBrowser()"
      (presetSelected)="onPresetSelected($event)"
      (templateCreated)="onTemplateCreated($event)">
    </app-preset-browser>
  `,
  styleUrl: './search-templates-interface.component.scss'
})
export class SearchTemplatesInterfaceComponent {
  private templatesService = inject(ExtendedTemplatesService);
  private presetsService = inject(TemplatePresetsService);

  // Inputs
  readonly currentQuery = input<SearchQuery | null>(null);
  readonly searchMode = input<'visual' | 'raw'>('visual');

  // Outputs
  readonly templateSelected = output<ExtendedSearchTemplate>();
  readonly presetApplied = output<TemplatePreset>();
  readonly templateCreated = output<ExtendedSearchTemplate>();

  // State
  protected readonly showQuickActions = signal<boolean>(false);
  protected readonly showManager = signal<boolean>(false);
  protected readonly showSharing = signal<boolean>(false);
  protected readonly showPresetBrowser = signal<boolean>(false);
  protected readonly templateToShare = signal<ExtendedSearchTemplate | null>(null);

  // Computed properties
  protected readonly existingTemplates = computed(() => this.templatesService.templates());
  protected readonly canSaveCurrentSearch = computed(() => {
    const query = this.currentQuery();
    return query && query.isValid && (
      query.criteria.length > 0 || 
      (query.rawQuery && query.rawQuery.trim().length > 0)
    );
  });

  protected toggleQuickActions(): void {
    this.showQuickActions.update(show => !show);
  }

  protected openManager(): void {
    this.showManager.set(true);
    this.showQuickActions.set(false);
  }

  protected closeManager(): void {
    this.showManager.set(false);
  }

  protected openPresetBrowser(): void {
    this.showPresetBrowser.set(true);
    this.showQuickActions.set(false);
  }

  protected closePresetBrowser(): void {
    this.showPresetBrowser.set(false);
  }

  protected openSharing(): void {
    this.showSharing.set(true);
    this.showQuickActions.set(false);
  }

  protected closeSharing(): void {
    this.showSharing.set(false);
    this.templateToShare.set(null);
  }

  protected onTemplateSelected(template: ExtendedSearchTemplate): void {
    this.templateSelected.emit(template);
  }

  protected onPresetSelected(preset: TemplatePreset): void {
    this.presetApplied.emit(preset);
  }

  protected onTemplateCreated(template: ExtendedSearchTemplate): void {
    this.templateCreated.emit(template);
  }

  protected onShareTemplate(template: ExtendedSearchTemplate): void {
    this.templateToShare.set(template);
    this.showSharing.set(true);
  }

  protected async saveCurrentAsTemplate(): Promise<void> {
    const query = this.currentQuery();
    if (!query || !this.canSaveCurrentSearch()) {
      return;
    }

    try {
      // Generate a default name based on the query
      const queryText = query.rawQuery || query.criteria.map(c => c.type.label).join(', ');
      const defaultName = `Search: ${queryText.length > 30 ? queryText.substring(0, 30) + '...' : queryText}`;

      const template = await this.templatesService.createExtendedTemplate({
        name: defaultName,
        description: 'Saved search template',
        query: query,
        searchMode: this.searchMode(),
        tags: ['saved-search'],
        isPublic: false
      });

      this.showQuickActions.set(false);
      this.templateCreated.emit(template);

      // Could show a toast notification here
      console.log('Search saved as template:', template.name);
    } catch (error) {
      console.error('Failed to save search as template:', error);
    }
  }

  // Quick access methods for keyboard shortcuts
  public openManagerWithKeyboard(): void {
    this.openManager();
  }

  public openPresetBrowserWithKeyboard(): void {
    this.openPresetBrowser();
  }

  public saveCurrentWithKeyboard(): void {
    if (this.canSaveCurrentSearch()) {
      this.saveCurrentAsTemplate();
    }
  }
}