import { Component, input, output, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BulkOperationsService, BulkOperation } from '../services/bulk-operations.service';
import { SearchCriteria } from '../models';

@Component({
  selector: 'app-bulk-operations-toolbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bulk-operations-toolbar" *ngIf="isVisible()" [@slideIn]>
      <div class="toolbar-section selection-info">
        <div class="selection-count">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2.5 7.775a.75.75 0 0 1 0-1.06l1.06-1.061a.75.75 0 1 1 1.061 1.06L3.56 7.775l1.061 1.061a.75.75 0 1 1-1.06 1.061L2.5 8.836l-1.061-1.06z"/>
            <path d="M8 1a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 1z"/>
          </svg>
          {{ selectionStats().total }} selected
        </div>
        
        <div class="selection-details" *ngIf="selectionStats().total > 0">
          <span class="valid-count" *ngIf="selectionStats().valid > 0">
            {{ selectionStats().valid }} valid
          </span>
          <span class="invalid-count" *ngIf="selectionStats().invalid > 0">
            {{ selectionStats().invalid }} invalid
          </span>
        </div>
      </div>

      <div class="toolbar-section selection-actions">
        <button 
          class="quick-action-btn"
          type="button"
          (click)="selectAll()"
          title="Select all criteria">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M0 3.75A.75.75 0 0 1 .75 3h14.5a.75.75 0 0 1 0 1.5H.75A.75.75 0 0 1 0 3.75zM0 8a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H.75A.75.75 0 0 1 0 8zm0 4.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H.75a.75.75 0 0 1-.75-.75z"/>
          </svg>
          All
        </button>

        <button 
          class="quick-action-btn"
          type="button"
          (click)="selectInvalid()"
          [disabled]="selectionStats().invalid === 0"
          title="Select invalid criteria">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M7.938 2.016A.13.13 0 0 1 8.002 2a.13.13 0 0 1 .063.016.146.146 0 0 1 .054.057l6.857 11.667c.036.06.035.124.002.183a.163.163 0 0 1-.054.06.116.116 0 0 1-.066.017H1.146a.115.115 0 0 1-.066-.017.163.163 0 0 1-.054-.06.176.176 0 0 1 .002-.183L7.884 2.073a.147.147 0 0 1 .054-.057zm1.044-.45a1.13 1.13 0 0 0-2.008 0L.127 13.233c-.307.52-.02 1.174.652 1.174h13.442c.672 0 .959-.654.652-1.174L8.982 1.566z"/>
            <path d="M7.002 12a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 5.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995z"/>
          </svg>
          Invalid
        </button>

        <button 
          class="quick-action-btn"
          type="button"
          (click)="deselectAll()"
          [disabled]="selectionStats().total === 0"
          title="Clear selection">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M.293.293a1 1 0 0 1 1.414 0L8 6.586 14.293.293a1 1 0 1 1 1.414 1.414L9.414 8l6.293 6.293a1 1 0 0 1-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 0 1-1.414-1.414L6.586 8 .293 1.707a1 1 0 0 1 0-1.414z"/>
          </svg>
          Clear
        </button>
      </div>

      <div class="toolbar-section bulk-actions">
        @for (operation of availableOperations(); track operation.id) {
          <button 
            class="bulk-action-btn"
            [class]="'action-' + operation.type"
            type="button"
            (click)="executeOperation(operation)"
            [disabled]="!canExecuteOperation(operation)"
            [title]="operation.description">
            @switch (operation.icon) {
              @case ('trash') {
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                  <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                </svg>
              }
              @case ('copy') {
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                  <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                </svg>
              }
              @case ('edit') {
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25a1.75 1.75 0 0 1 .445-.758l8.61-8.61Z"/>
                </svg>
              }
              @case ('check') {
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
                </svg>
              }
              @case ('group') {
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M6 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/>
                </svg>
              }
              @case ('download') {
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                  <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                </svg>
              }
              @default {
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8z"/>
                </svg>
              }
            }
            <span class="action-label">{{ operation.label }}</span>
          </button>
        }
      </div>

      <div class="toolbar-section toolbar-controls">
        <button 
          class="control-btn exit-btn"
          type="button"
          (click)="exitMultiSelect.emit()"
          title="Exit multi-select mode">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M.293.293a1 1 0 0 1 1.414 0L8 6.586 14.293.293a1 1 0 1 1 1.414 1.414L9.414 8l6.293 6.293a1 1 0 0 1-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 0 1-1.414-1.414L6.586 8 .293 1.707a1 1 0 0 1 0-1.414z"/>
          </svg>
          Exit
        </button>
      </div>
    </div>
  `,
  styleUrl: './bulk-operations-toolbar.component.scss',
  animations: [
    // Simple slide-in animation
    // Note: In a real implementation, you'd import Angular animations
  ]
})
export class BulkOperationsToolbarComponent {
  private bulkOpsService = inject(BulkOperationsService);

  // Inputs
  readonly isVisible = input<boolean>(false);
  readonly allCriteria = input.required<SearchCriteria[]>();

  // Outputs
  readonly operationExecuted = output<{ operation: BulkOperation; result: SearchCriteria[] }>();
  readonly exitMultiSelect = output<void>();

  // Computed values
  protected readonly selectionState = computed(() => this.bulkOpsService.getSelectionState()());

  protected readonly selectedCriteria = computed(() => {
    const selectedIds = this.selectionState().selectedIds;
    return this.allCriteria().filter(criteria => selectedIds.has(criteria.id));
  });

  protected readonly selectionStats = computed(() => {
    return this.bulkOpsService.getSelectionStats(this.selectedCriteria());
  });

  protected readonly availableOperations = computed(() => {
    return this.bulkOpsService.getAvailableOperations(this.selectedCriteria());
  });

  protected selectAll(): void {
    this.bulkOpsService.selectAll(this.allCriteria());
  }

  protected deselectAll(): void {
    this.bulkOpsService.deselectAll();
  }

  protected selectInvalid(): void {
    this.bulkOpsService.selectInvalid(this.allCriteria());
  }

  protected canExecuteOperation(operation: BulkOperation): boolean {
    const selectedCount = this.selectedCriteria().length;
    return selectedCount >= operation.minSelection && 
           (!operation.maxSelection || selectedCount <= operation.maxSelection);
  }

  protected async executeOperation(operation: BulkOperation): Promise<void> {
    const selectedCriteria = this.selectedCriteria();
    
    // Show confirmation if required
    if (operation.requiresConfirmation) {
      const confirmMessage = this.getConfirmationMessage(operation, selectedCriteria.length);
      if (!confirm(confirmMessage)) {
        return;
      }
    }

    // Get additional options for certain operations
    let options: any = {};
    if (operation.id === 'modify-operator') {
      options = await this.getModifyOptions();
      if (!options) return; // User cancelled
    } else if (operation.id === 'export-selected') {
      options = await this.getExportOptions();
      if (!options) return; // User cancelled
    }

    try {
      const result = await this.bulkOpsService.executeBulkOperation(
        operation,
        selectedCriteria,
        this.allCriteria(),
        options
      );

      if (result.success) {
        this.operationExecuted.emit({ operation, result: result.result });
        
        // Show success message
        this.showMessage(result.message, 'success');
        
        // Clear selection for destructive operations
        if (operation.type === 'delete') {
          this.bulkOpsService.deselectAll();
        }
      } else {
        this.showMessage(result.message, 'error');
      }
    } catch (error) {
      this.showMessage(`Operation failed: ${error}`, 'error');
    }
  }

  private getConfirmationMessage(operation: BulkOperation, count: number): string {
    switch (operation.type) {
      case 'delete':
        return `Are you sure you want to delete ${count} search criteria? This action cannot be undone.`;
      default:
        return `Are you sure you want to execute "${operation.label}" on ${count} search criteria?`;
    }
  }

  private async getModifyOptions(): Promise<any> {
    // In a real implementation, this would show a modal dialog
    // For now, we'll use a simple prompt
    const operatorChoice = prompt(
      'Select operator type:\n' +
      '0 - Contains\n' +
      '1 - Equals\n' +
      '2 - Greater than\n' +
      '3 - Less than\n' +
      '4 - Starts with\n' +
      '5 - Ends with\n' +
      'Enter number (0-5):'
    );

    if (operatorChoice === null) return null;

    const operatorType = parseInt(operatorChoice);
    if (isNaN(operatorType) || operatorType < 0 || operatorType > 5) {
      alert('Invalid operator choice');
      return null;
    }

    return { operator: operatorType };
  }

  private async getExportOptions(): Promise<any> {
    // In a real implementation, this would show a modal dialog
    const formatChoice = prompt(
      'Select export format:\n' +
      '1 - JSON\n' +
      '2 - Raw Query\n' +
      '3 - Template\n' +
      'Enter number (1-3):'
    );

    if (formatChoice === null) return null;

    const formats = ['json', 'query', 'template'];
    const formatIndex = parseInt(formatChoice) - 1;
    
    if (isNaN(formatIndex) || formatIndex < 0 || formatIndex >= formats.length) {
      alert('Invalid format choice');
      return null;
    }

    return { format: formats[formatIndex] };
  }

  private showMessage(message: string, type: 'success' | 'error' | 'info'): void {
    // In a real implementation, this would show a toast notification
    // For now, we'll use console and alert
    if (type === 'error') {
      alert(`Error: ${message}`);
    } else {
      console.log(`${type.toUpperCase()}: ${message}`);
      // Could show a temporary message in the UI
    }
  }
}