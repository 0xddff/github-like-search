import { Injectable, signal } from '@angular/core';
import { SearchCriteria, SearchOperatorType, SearchValueType } from '../models';

export interface BulkOperation {
  id: string;
  type: 'delete' | 'modify' | 'validate' | 'group' | 'duplicate' | 'export';
  label: string;
  description: string;
  icon: string;
  requiresConfirmation: boolean;
  minSelection: number;
  maxSelection?: number;
  supportedTypes?: string[];
}

export interface BulkModifyOptions {
  operator?: SearchOperatorType;
  value?: any;
  applyToType?: string;
  preserveValues?: boolean;
}

export interface BulkSelectionState {
  selectedIds: Set<string>;
  isMultiSelectMode: boolean;
  lastSelectedIndex: number;
}

@Injectable({
  providedIn: 'root'
})
export class BulkOperationsService {
  private readonly selectionState = signal<BulkSelectionState>({
    selectedIds: new Set(),
    isMultiSelectMode: false,
    lastSelectedIndex: -1
  });

  private readonly availableOperations: BulkOperation[] = [
    {
      id: 'delete',
      type: 'delete',
      label: 'Delete Selected',
      description: 'Remove selected search criteria',
      icon: 'trash',
      requiresConfirmation: true,
      minSelection: 1
    },
    {
      id: 'duplicate',
      type: 'duplicate',
      label: 'Duplicate Selected',
      description: 'Create copies of selected criteria',
      icon: 'copy',
      requiresConfirmation: false,
      minSelection: 1,
      maxSelection: 5
    },
    {
      id: 'modify-operator',
      type: 'modify',
      label: 'Change Operator',
      description: 'Apply the same operator to all selected criteria',
      icon: 'edit',
      requiresConfirmation: false,
      minSelection: 2
    },
    {
      id: 'validate-all',
      type: 'validate',
      label: 'Validate Selected',
      description: 'Check and fix validation issues in selected criteria',
      icon: 'check',
      requiresConfirmation: false,
      minSelection: 1
    },
    {
      id: 'group-similar',
      type: 'group',
      label: 'Group Similar',
      description: 'Group selected criteria of the same type',
      icon: 'group',
      requiresConfirmation: false,
      minSelection: 2
    },
    {
      id: 'export-selected',
      type: 'export',
      label: 'Export Selected',
      description: 'Export selected criteria as template or query',
      icon: 'download',
      requiresConfirmation: false,
      minSelection: 1
    }
  ];

  /**
   * Get current selection state
   */
  getSelectionState() {
    return this.selectionState.asReadonly();
  }

  /**
   * Toggle multi-select mode
   */
  toggleMultiSelectMode(): void {
    const current = this.selectionState();
    this.selectionState.set({
      ...current,
      isMultiSelectMode: !current.isMultiSelectMode,
      selectedIds: new Set(), // Clear selection when toggling mode
      lastSelectedIndex: -1
    });
  }

  /**
   * Select or deselect a single criteria
   */
  toggleSelection(criteriaId: string, index: number): void {
    const current = this.selectionState();
    const newSelectedIds = new Set(current.selectedIds);
    
    if (newSelectedIds.has(criteriaId)) {
      newSelectedIds.delete(criteriaId);
    } else {
      newSelectedIds.add(criteriaId);
    }

    this.selectionState.set({
      ...current,
      selectedIds: newSelectedIds,
      lastSelectedIndex: index
    });
  }

  /**
   * Select range of criteria (Shift+click behavior)
   */
  selectRange(criteriaId: string, currentIndex: number, allCriteria: SearchCriteria[]): void {
    const current = this.selectionState();
    const newSelectedIds = new Set(current.selectedIds);
    
    if (current.lastSelectedIndex !== -1) {
      const start = Math.min(current.lastSelectedIndex, currentIndex);
      const end = Math.max(current.lastSelectedIndex, currentIndex);
      
      for (let i = start; i <= end; i++) {
        if (i < allCriteria.length) {
          newSelectedIds.add(allCriteria[i].id);
        }
      }
    } else {
      newSelectedIds.add(criteriaId);
    }

    this.selectionState.set({
      ...current,
      selectedIds: newSelectedIds,
      lastSelectedIndex: currentIndex
    });
  }

  /**
   * Select all criteria
   */
  selectAll(allCriteria: SearchCriteria[]): void {
    const current = this.selectionState();
    const newSelectedIds = new Set(allCriteria.map(c => c.id));

    this.selectionState.set({
      ...current,
      selectedIds: newSelectedIds
    });
  }

  /**
   * Deselect all criteria
   */
  deselectAll(): void {
    const current = this.selectionState();
    this.selectionState.set({
      ...current,
      selectedIds: new Set(),
      lastSelectedIndex: -1
    });
  }

  /**
   * Select criteria by type
   */
  selectByType(typeId: string, allCriteria: SearchCriteria[]): void {
    const current = this.selectionState();
    const newSelectedIds = new Set(current.selectedIds);
    
    allCriteria.forEach(criteria => {
      if (criteria.type.id === typeId) {
        newSelectedIds.add(criteria.id);
      }
    });

    this.selectionState.set({
      ...current,
      selectedIds: newSelectedIds
    });
  }

  /**
   * Select invalid criteria
   */
  selectInvalid(allCriteria: SearchCriteria[]): void {
    const current = this.selectionState();
    const newSelectedIds = new Set(current.selectedIds);
    
    allCriteria.forEach(criteria => {
      if (!criteria.isValid) {
        newSelectedIds.add(criteria.id);
      }
    });

    this.selectionState.set({
      ...current,
      selectedIds: newSelectedIds
    });
  }

  /**
   * Get available operations for current selection
   */
  getAvailableOperations(selectedCriteria: SearchCriteria[]): BulkOperation[] {
    const selectedCount = selectedCriteria.length;
    
    return this.availableOperations.filter(operation => {
      // Check minimum selection requirement
      if (selectedCount < operation.minSelection) {
        return false;
      }
      
      // Check maximum selection requirement
      if (operation.maxSelection && selectedCount > operation.maxSelection) {
        return false;
      }
      
      // Check type-specific requirements
      if (operation.supportedTypes) {
        const hasSupported = selectedCriteria.some(criteria => 
          operation.supportedTypes!.includes(criteria.type.id)
        );
        if (!hasSupported) {
          return false;
        }
      }
      
      return true;
    });
  }

  /**
   * Execute bulk operation
   */
  async executeBulkOperation(
    operation: BulkOperation,
    selectedCriteria: SearchCriteria[],
    allCriteria: SearchCriteria[],
    options?: any
  ): Promise<{ success: boolean; result: SearchCriteria[]; message: string }> {
    try {
      switch (operation.type) {
        case 'delete':
          return this.executeBulkDelete(selectedCriteria, allCriteria);
          
        case 'duplicate':
          return this.executeBulkDuplicate(selectedCriteria, allCriteria);
          
        case 'modify':
          return this.executeBulkModify(selectedCriteria, allCriteria, options);
          
        case 'validate':
          return this.executeBulkValidate(selectedCriteria, allCriteria);
          
        case 'group':
          return this.executeBulkGroup(selectedCriteria, allCriteria);
          
        case 'export':
          return this.executeBulkExport(selectedCriteria, allCriteria, options);
          
        default:
          throw new Error(`Unknown operation type: ${operation.type}`);
      }
    } catch (error) {
      return {
        success: false,
        result: allCriteria,
        message: `Operation failed: ${error}`
      };
    }
  }

  /**
   * Get selection statistics
   */
  getSelectionStats(selectedCriteria: SearchCriteria[]): {
    total: number;
    valid: number;
    invalid: number;
    typeBreakdown: { [key: string]: number };
  } {
    const stats = {
      total: selectedCriteria.length,
      valid: selectedCriteria.filter(c => c.isValid).length,
      invalid: selectedCriteria.filter(c => !c.isValid).length,
      typeBreakdown: {} as { [key: string]: number }
    };

    selectedCriteria.forEach(criteria => {
      const typeId = criteria.type.id;
      stats.typeBreakdown[typeId] = (stats.typeBreakdown[typeId] || 0) + 1;
    });

    return stats;
  }

  private executeBulkDelete(
    selectedCriteria: SearchCriteria[],
    allCriteria: SearchCriteria[]
  ): Promise<{ success: boolean; result: SearchCriteria[]; message: string }> {
    const selectedIds = new Set(selectedCriteria.map(c => c.id));
    const result = allCriteria.filter(criteria => !selectedIds.has(criteria.id));
    
    // Clear selection after deletion
    this.deselectAll();
    
    return Promise.resolve({
      success: true,
      result,
      message: `Deleted ${selectedCriteria.length} search criteria`
    });
  }

  private executeBulkDuplicate(
    selectedCriteria: SearchCriteria[],
    allCriteria: SearchCriteria[]
  ): Promise<{ success: boolean; result: SearchCriteria[]; message: string }> {
    const duplicates = selectedCriteria.map(criteria => ({
      ...criteria,
      id: crypto.randomUUID(),
      // Add indicator that it's a duplicate
      displayValue: criteria.displayValue ? `${criteria.displayValue} (copy)` : undefined
    }));

    const result = [...allCriteria, ...duplicates];
    
    return Promise.resolve({
      success: true,
      result,
      message: `Created ${duplicates.length} duplicate criteria`
    });
  }

  private executeBulkModify(
    selectedCriteria: SearchCriteria[],
    allCriteria: SearchCriteria[],
    options: BulkModifyOptions
  ): Promise<{ success: boolean; result: SearchCriteria[]; message: string }> {
    const selectedIds = new Set(selectedCriteria.map(c => c.id));
    
    const result = allCriteria.map(criteria => {
      if (!selectedIds.has(criteria.id)) {
        return criteria;
      }

      // Apply modifications
      const modified = { ...criteria };
      
      if (options.operator !== undefined) {
        // Find compatible operator for this type
        const compatibleOperator = criteria.type.supportedOperators.find(
          op => op.type === options.operator
        );
        if (compatibleOperator) {
          modified.operator = compatibleOperator;
        }
      }

      if (options.value !== undefined && !options.preserveValues) {
        modified.value = options.value;
        modified.displayValue = undefined; // Reset display value
      }

      // Revalidate after modification
      modified.isValid = this.validateCriteria(modified);

      return modified;
    });

    return Promise.resolve({
      success: true,
      result,
      message: `Modified ${selectedCriteria.length} search criteria`
    });
  }

  private executeBulkValidate(
    selectedCriteria: SearchCriteria[],
    allCriteria: SearchCriteria[]
  ): Promise<{ success: boolean; result: SearchCriteria[]; message: string }> {
    const selectedIds = new Set(selectedCriteria.map(c => c.id));
    let fixedCount = 0;

    const result = allCriteria.map(criteria => {
      if (!selectedIds.has(criteria.id)) {
        return criteria;
      }

      const fixed = { ...criteria };
      
      // Attempt to fix common validation issues
      if (!criteria.isValid) {
        // Fix missing values for operators that require them
        if (criteria.operator.requiresValue && !criteria.value) {
          fixed.value = this.getDefaultValue(criteria.type.valueType);
          fixedCount++;
        }
        
        // Revalidate
        fixed.isValid = this.validateCriteria(fixed);
      }

      return fixed;
    });

    return Promise.resolve({
      success: true,
      result,
      message: fixedCount > 0 
        ? `Validated ${selectedCriteria.length} criteria, fixed ${fixedCount} issues`
        : `Validated ${selectedCriteria.length} criteria, no issues found`
    });
  }

  private executeBulkGroup(
    selectedCriteria: SearchCriteria[],
    allCriteria: SearchCriteria[]
  ): Promise<{ success: boolean; result: SearchCriteria[]; message: string }> {
    // Group by type and reorder to place similar types together
    const selectedIds = new Set(selectedCriteria.map(c => c.id));
    const unselected = allCriteria.filter(c => !selectedIds.has(c.id));
    
    // Group selected criteria by type
    const groups = new Map<string, SearchCriteria[]>();
    selectedCriteria.forEach(criteria => {
      const typeId = criteria.type.id;
      if (!groups.has(typeId)) {
        groups.set(typeId, []);
      }
      groups.get(typeId)!.push(criteria);
    });

    // Flatten grouped criteria
    const groupedCriteria = Array.from(groups.values()).flat();
    
    // Combine with unselected criteria
    const result = [...unselected, ...groupedCriteria];

    return Promise.resolve({
      success: true,
      result,
      message: `Grouped ${selectedCriteria.length} criteria by type`
    });
  }

  private executeBulkExport(
    selectedCriteria: SearchCriteria[],
    allCriteria: SearchCriteria[],
    options: { format?: 'json' | 'query' | 'template' }
  ): Promise<{ success: boolean; result: SearchCriteria[]; message: string }> {
    const format = options?.format || 'json';
    
    let exportData: string;
    
    switch (format) {
      case 'json':
        exportData = JSON.stringify(selectedCriteria, null, 2);
        break;
        
      case 'query':
        exportData = this.criteriesToRawQuery(selectedCriteria);
        break;
        
      case 'template':
        exportData = JSON.stringify({
          name: `Bulk Export ${new Date().toLocaleDateString()}`,
          description: `Exported ${selectedCriteria.length} search criteria`,
          criteria: selectedCriteria,
          createdAt: new Date().toISOString()
        }, null, 2);
        break;
        
      default:
        exportData = JSON.stringify(selectedCriteria);
    }

    // Copy to clipboard
    navigator.clipboard.writeText(exportData).then(() => {
      // Successfully copied to clipboard
    }).catch(err => {
      // Failed to copy to clipboard - handled silently
    });

    return Promise.resolve({
      success: true,
      result: allCriteria, // No change to original criteria
      message: `Exported ${selectedCriteria.length} criteria as ${format.toUpperCase()} to clipboard`
    });
  }

  private validateCriteria(criteria: SearchCriteria): boolean {
    // Basic validation logic
    if (criteria.operator.requiresValue) {
      return criteria.value !== null && criteria.value !== undefined && criteria.value !== '';
    }
    return true;
  }

  private getDefaultValue(valueType: SearchValueType): any {
    switch (valueType) {
      case SearchValueType.TEXT:
        return '';
      case SearchValueType.NUMBER:
        return 0;
      case SearchValueType.DATE:
        return new Date().toISOString().split('T')[0];
      case SearchValueType.SELECT:
      case SearchValueType.MULTI_SELECT:
        return null;
      default:
        return '';
    }
  }

  private criteriesToRawQuery(criteria: SearchCriteria[]): string {
    return criteria
      .filter(c => c.isValid)
      .map(c => {
        const operator = this.getOperatorSymbol(c.operator.type);
        const value = c.value || '';
        return `${c.type.id}${operator}${value}`;
      })
      .join(' ');
  }

  private getOperatorSymbol(operatorType: SearchOperatorType): string {
    const symbolMap = new Map([
      [SearchOperatorType.EQUALS, ':'],
      [SearchOperatorType.NOT_EQUALS, '!='],
      [SearchOperatorType.GREATER_THAN, '>'],
      [SearchOperatorType.LESS_THAN, '<'],
      [SearchOperatorType.GREATER_EQUAL, '>='],
      [SearchOperatorType.LESS_EQUAL, '<='],
      [SearchOperatorType.CONTAINS, '~'],
      [SearchOperatorType.STARTS_WITH, '^'],
      [SearchOperatorType.ENDS_WITH, '$'],
      [SearchOperatorType.IN, ':'],
      [SearchOperatorType.IS_EMPTY, ':empty'],
      [SearchOperatorType.IS_NOT_EMPTY, ':!empty']
    ]);
    
    return symbolMap.get(operatorType) || ':';
  }

  /**
   * Clear selection and exit multi-select mode
   */
  exitMultiSelectMode(): void {
    this.selectionState.set({
      selectedIds: new Set(),
      isMultiSelectMode: false,
      lastSelectedIndex: -1
    });
  }

  /**
   * Check if criteria is selected
   */
  isSelected(criteriaId: string): boolean {
    return this.selectionState().selectedIds.has(criteriaId);
  }

  /**
   * Get count of selected items
   */
  getSelectedCount(): number {
    return this.selectionState().selectedIds.size;
  }
}