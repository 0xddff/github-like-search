import { Injectable } from '@angular/core';
import { SearchQuery, SearchCriteria, ValidationResult, ValidationError, SearchOperatorType, SearchValueType, LogicalOperator } from '../models';

@Injectable({
  providedIn: 'root'
})
export class SearchValidationService {
  
  validateQuery(query: SearchQuery): ValidationResult {
    const errors: ValidationError[] = [];
    
    if (query.criteria.length === 0 && (!query.rawQuery || query.rawQuery.trim() === '')) {
      errors.push({
        field: 'query',
        message: 'Enter a search term or select criteria to search',
        type: 'required'
      });
    }
    
    // Validate individual criteria with more detailed messages
    for (const criteria of query.criteria) {
      const criteriaErrors = this.validateCriteriaDetailed(criteria);
      errors.push(...criteriaErrors);
    }
    
    // Check for duplicate criteria
    const duplicates = this.findDuplicateCriteria(query.criteria);
    if (duplicates.length > 0) {
      errors.push({
        field: 'criteria',
        message: `Duplicate search criteria found: ${duplicates.join(', ')}`,
        type: 'duplicate'
      });
    }
    
    // Check for conflicting criteria
    const conflicts = this.findConflictingCriteria(query.criteria);
    if (conflicts.length > 0) {
      errors.push({
        field: 'criteria',
        message: `Conflicting search criteria: ${conflicts.join('; ')}`,
        type: 'conflict'
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  validateCriteriaDetailed(criteria: SearchCriteria): ValidationError[] {
    const errors: ValidationError[] = [];
    
    if (!criteria.operator.requiresValue) {
      return [];
    }
    
    // Check if value is required but missing
    if (criteria.value === null || criteria.value === undefined || criteria.value === '') {
      errors.push({
        field: `criteria-${criteria.id}`,
        message: this.getValueRequiredMessage(criteria),
        type: 'required'
      });
      return errors; // Return early as other validations depend on having a value
    }
    
    // Type-specific validation
    const typeError = this.validateValueType(criteria);
    if (typeError) {
      errors.push(typeError);
    }
    
    // Operator-specific validation
    const operatorError = this.validateOperatorConstraints(criteria);
    if (operatorError) {
      errors.push(operatorError);
    }
    
    return errors;
  }
  
  private getValueRequiredMessage(criteria: SearchCriteria): string {
    const typeLabel = criteria.type.label.toLowerCase();
    const operatorLabel = criteria.operator.label.toLowerCase();
    
    switch (criteria.type.valueType) {
      case SearchValueType.NUMBER:
        return `Enter a number for ${typeLabel} ${operatorLabel}`;
      case SearchValueType.DATE:
        return `Select a date for ${typeLabel} ${operatorLabel}`;
      case SearchValueType.SELECT:
        return `Choose an option for ${typeLabel} ${operatorLabel}`;
      case SearchValueType.MULTI_SELECT:
        return `Select at least one option for ${typeLabel} ${operatorLabel}`;
      default:
        return `Enter a value for ${typeLabel} ${operatorLabel}`;
    }
  }
  
  private validateValueType(criteria: SearchCriteria): ValidationError | null {
    const value = criteria.value;
    
    switch (criteria.type.valueType) {
      case SearchValueType.NUMBER:
        if (isNaN(Number(value))) {
          return {
            field: `criteria-${criteria.id}`,
            message: `"${value}" is not a valid number for ${criteria.type.label}`,
            type: 'format'
          };
        }
        break;
        
      case SearchValueType.DATE:
        if (value && !this.isValidDate(value)) {
          return {
            field: `criteria-${criteria.id}`,
            message: `"${value}" is not a valid date format`,
            type: 'format'
          };
        }
        break;
        
      case SearchValueType.SELECT:
        if (criteria.type.options && !criteria.type.options.includes(value)) {
          return {
            field: `criteria-${criteria.id}`,
            message: `"${value}" is not a valid option for ${criteria.type.label}`,
            type: 'format'
          };
        }
        break;
        
      case SearchValueType.MULTI_SELECT:
        if (criteria.type.options && Array.isArray(value)) {
          const invalidOptions = value.filter(v => !criteria.type.options!.includes(v));
          if (invalidOptions.length > 0) {
            return {
              field: `criteria-${criteria.id}`,
              message: `Invalid options for ${criteria.type.label}: ${invalidOptions.join(', ')}`,
              type: 'format'
            };
          }
        }
        break;
    }
    
    return null;
  }
  
  private validateOperatorConstraints(criteria: SearchCriteria): ValidationError | null {
    const value = criteria.value;
    const numValue = Number(value);
    
    // Special validation for comparison operators with numbers
    if (criteria.type.valueType === SearchValueType.NUMBER) {
      switch (criteria.operator.type) {
        case SearchOperatorType.GREATER_THAN:
        case SearchOperatorType.GREATER_EQUAL:
          if (numValue < 0 && criteria.type.id === 'iteration') {
            return {
              field: `criteria-${criteria.id}`,
              message: 'Iteration number cannot be negative',
              type: 'constraint'
            };
          }
          break;
          
        case SearchOperatorType.LESS_THAN:
        case SearchOperatorType.LESS_EQUAL:
          if (numValue <= 0 && criteria.type.id === 'iteration') {
            return {
              field: `criteria-${criteria.id}`,
              message: 'Iteration number must be greater than 0',
              type: 'constraint'
            };
          }
          break;
      }
    }
    
    // Validate text length constraints
    if (criteria.type.valueType === SearchValueType.TEXT && typeof value === 'string') {
      if (value.length > 100) {
        return {
          field: `criteria-${criteria.id}`,
          message: `${criteria.type.label} value is too long (maximum 100 characters)`,
          type: 'constraint'
        };
      }
      
      if (value.length < 1) {
        return {
          field: `criteria-${criteria.id}`,
          message: `${criteria.type.label} value cannot be empty`,
          type: 'constraint'
        };
      }
    }
    
    return null;
  }
  
  private findDuplicateCriteria(criteria: SearchCriteria[]): string[] {
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    
    for (const criterion of criteria) {
      // Create a unique key for criteria that shouldn't be duplicated
      const key = `${criterion.type.id}-${criterion.operator.type}`;
      
      if (seen.has(key)) {
        duplicates.add(criterion.type.label);
      } else {
        seen.add(key);
      }
    }
    
    return Array.from(duplicates);
  }
  
  private findConflictingCriteria(criteria: SearchCriteria[]): string[] {
    const conflicts: string[] = [];
    
    // Check for logical conflicts (e.g., status=Active AND status=Completed)
    const statusCriteria = criteria.filter(c => 
      c.type.id === 'status' && 
      c.operator.type === SearchOperatorType.EQUALS
    );
    
    if (statusCriteria.length > 1) {
      const values = statusCriteria.map(c => c.value).join(', ');
      conflicts.push(`Status cannot be both ${values}`);
    }
    
    // Check for date range conflicts
    const beforeDate = criteria.find(c => 
      c.type.id === 'created-date' && 
      c.operator.type === SearchOperatorType.LESS_THAN
    );
    const afterDate = criteria.find(c => 
      c.type.id === 'created-date' && 
      c.operator.type === SearchOperatorType.GREATER_THAN
    );
    
    if (beforeDate && afterDate && beforeDate.value && afterDate.value) {
      const before = new Date(beforeDate.value);
      const after = new Date(afterDate.value);
      
      if (before <= after) {
        conflicts.push('Date range is invalid (before date must be after the after date)');
      }
    }
    
    return conflicts;
  }
  
  private isValidDate(value: any): boolean {
    if (!value) return false;
    const date = new Date(value);
    return date instanceof Date && !isNaN(date.getTime());
  }
  
  getErrorMessage(error: ValidationError): string {
    return error.message;
  }

  /**
   * Validate a query with logical operators
   */
  validateQueryWithLogicalOperator(query: SearchQuery, logicalOperator: LogicalOperator): ValidationResult {
    const baseValidation = this.validateQuery(query);
    const errors = [...baseValidation.errors];
    
    // Additional validation for logical operators
    if (query.criteria.length > 1) {
      // Check for operator compatibility
      const incompatibleOperators = query.criteria.filter(c => {
        // Some operators might not work well with OR logic
        if (logicalOperator === LogicalOperator.OR) {
          return c.operator.type === SearchOperatorType.IS_EMPTY || 
                 c.operator.type === SearchOperatorType.IS_NOT_EMPTY;
        }
        return false;
      });
      
      if (incompatibleOperators.length > 0) {
        errors.push({
          field: 'logicalOperator',
          message: `Some operators may not work as expected with ${logicalOperator} logic`,
          type: 'warning'
        });
      }
      
      // Check for conflicting criteria
      if (logicalOperator === LogicalOperator.AND) {
        const conflicts = this.findCriteriaConflicts(query.criteria);
        conflicts.forEach((conflict: string) => {
          errors.push({
            field: 'criteria',
            message: conflict,
            type: 'warning'
          });
        });
      }
    }
    
    return {
      isValid: errors.filter(e => e.type !== 'warning').length === 0,
      errors,
      warnings: errors.filter(e => e.type === 'warning')
    };
  }

  /**
   * Find potential conflicts between search criteria
   */
  private findCriteriaConflicts(criteria: SearchCriteria[]): string[] {
    const conflicts: string[] = [];
    
    // Group criteria by type
    const criteriaByType = new Map<string, SearchCriteria[]>();
    criteria.forEach(c => {
      const typeId = c.type.id;
      if (!criteriaByType.has(typeId)) {
        criteriaByType.set(typeId, []);
      }
      criteriaByType.get(typeId)!.push(c);
    });
    
    // Check for conflicting values in the same field
    criteriaByType.forEach((typeCriteria, typeId) => {
      if (typeCriteria.length > 1) {
        // Check for opposing operators (equals vs not equals)
        const hasEquals = typeCriteria.some(c => c.operator.type === SearchOperatorType.EQUALS);
        const hasNotEquals = typeCriteria.some(c => c.operator.type === SearchOperatorType.NOT_EQUALS);
        
        if (hasEquals && hasNotEquals) {
          conflicts.push(`Conflicting ${typeId} conditions: cannot both equal and not equal values`);
        }
        
        // Check for impossible range conditions
        const greaterThan = typeCriteria.find(c => c.operator.type === SearchOperatorType.GREATER_THAN);
        const lessThan = typeCriteria.find(c => c.operator.type === SearchOperatorType.LESS_THAN);
        
        if (greaterThan && lessThan) {
          try {
            const gtValue = parseFloat(greaterThan.value);
            const ltValue = parseFloat(lessThan.value);
            if (!isNaN(gtValue) && !isNaN(ltValue) && gtValue >= ltValue) {
              conflicts.push(`Impossible ${typeId} range: greater than ${gtValue} and less than ${ltValue}`);
            }
          } catch {
            // Ignore parsing errors
          }
        }
      }
    });
    
    return conflicts;
  }
  
  getErrorSeverity(error: ValidationError): 'error' | 'warning' | 'info' {
    switch (error.type) {
      case 'required':
      case 'format':
        return 'error';
      case 'constraint':
      case 'conflict':
        return 'warning';
      case 'duplicate':
        return 'info';
      default:
        return 'error';
    }
  }
  
  getErrorIcon(error: ValidationError): string {
    switch (this.getErrorSeverity(error)) {
      case 'error':
        return '⚠️';
      case 'warning':
        return '⚡';
      case 'info':
        return 'ℹ️';
      default:
        return '⚠️';
    }
  }
}