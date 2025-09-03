import { Injectable } from '@angular/core';
import {
  SearchConfiguration,
  SearchType,
  SearchOperator,
  SearchCriteria,
  ValidationResult,
  ValidationError,
  SearchOperatorType,
  SearchValueType
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class SearchConfigurationService {
  private configurations = new Map<string, SearchConfiguration>();

  constructor() {
    this.initializeDefaultConfigurations();
  }

  registerConfiguration(key: string, config: SearchConfiguration): void {
    this.configurations.set(key, config);
  }

  getConfiguration(key: string): SearchConfiguration | null {
    return this.configurations.get(key) || null;
  }

  getAvailableOperators(searchType: SearchType): SearchOperator[] {
    return searchType.supportedOperators;
  }

  validateCriteria(criteria: SearchCriteria): ValidationResult {
    const errors: ValidationError[] = [];

    if (!criteria.operator.requiresValue) {
      return { isValid: true, errors: [] };
    }

    if (criteria.value === null || criteria.value === undefined || criteria.value === '') {
      errors.push({
        field: 'value',
        message: `Value is required for ${criteria.operator.label} operator`,
        type: 'required'
      });
    }

    if (criteria.type.validation) {
      for (const rule of criteria.type.validation) {
        const validationError = this.validateRule(criteria.value, rule);
        if (validationError) {
          errors.push(validationError);
        }
      }
    }

    if (criteria.type.valueType === SearchValueType.NUMBER && criteria.value) {
      if (isNaN(Number(criteria.value))) {
        errors.push({
          field: 'value',
          message: 'Value must be a valid number',
          type: 'format'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateRule(value: any, rule: any): ValidationError | null {
    switch (rule.type) {
      case 'required':
        if (!value) {
          return {
            field: 'value',
            message: rule.message,
            type: 'required'
          };
        }
        break;
      case 'pattern':
        if (value && !new RegExp(rule.value).test(value)) {
          return {
            field: 'value',
            message: rule.message,
            type: 'pattern'
          };
        }
        break;
      case 'min':
        if (value && Number(value) < rule.value) {
          return {
            field: 'value',
            message: rule.message,
            type: 'min'
          };
        }
        break;
      case 'max':
        if (value && Number(value) > rule.value) {
          return {
            field: 'value',
            message: rule.message,
            type: 'max'
          };
        }
        break;
      case 'custom':
        if (rule.validator && !rule.validator(value)) {
          return {
            field: 'value',
            message: rule.message,
            type: 'custom'
          };
        }
        break;
    }
    return null;
  }

  private initializeDefaultConfigurations(): void {
    const gitHubSearchConfig: SearchConfiguration = {
      availableTypes: [
        {
          id: 'branch-name',
          label: 'Branch Name',
          description: 'Search by branch name',
          supportedOperators: [
            { type: SearchOperatorType.CONTAINS, label: 'contains', requiresValue: true },
            { type: SearchOperatorType.EQUALS, label: 'is', requiresValue: true },
            { type: SearchOperatorType.STARTS_WITH, label: 'starts with', requiresValue: true },
            { type: SearchOperatorType.ENDS_WITH, label: 'ends with', requiresValue: true }
          ],
          valueType: SearchValueType.TEXT,
          defaultOperator: SearchOperatorType.CONTAINS
        },
        {
          id: 'iteration',
          label: 'Iteration',
          description: 'Search by iteration number',
          supportedOperators: [
            { type: SearchOperatorType.EQUALS, label: 'is', requiresValue: true },
            { type: SearchOperatorType.GREATER_THAN, label: 'greater than', requiresValue: true },
            { type: SearchOperatorType.LESS_THAN, label: 'less than', requiresValue: true },
            { type: SearchOperatorType.GREATER_EQUAL, label: 'greater than or equal', requiresValue: true },
            { type: SearchOperatorType.LESS_EQUAL, label: 'less than or equal', requiresValue: true }
          ],
          valueType: SearchValueType.NUMBER,
          defaultOperator: SearchOperatorType.EQUALS,
          validation: [
            { type: 'min', value: 1, message: 'Iteration must be at least 1' }
          ]
        },
        {
          id: 'status',
          label: 'Status',
          description: 'Search by status',
          supportedOperators: [
            { type: SearchOperatorType.EQUALS, label: 'is', requiresValue: true },
            { type: SearchOperatorType.NOT_EQUALS, label: 'is not', requiresValue: true },
            { type: SearchOperatorType.IN, label: 'is one of', requiresValue: true }
          ],
          valueType: SearchValueType.SELECT,
          defaultOperator: SearchOperatorType.EQUALS,
          options: ['Active', 'Completed', 'Cancelled', 'In Progress', 'Pending']
        },
        {
          id: 'created-date',
          label: 'Created Date',
          description: 'Search by creation date',
          supportedOperators: [
            { type: SearchOperatorType.EQUALS, label: 'is', requiresValue: true },
            { type: SearchOperatorType.GREATER_THAN, label: 'after', requiresValue: true },
            { type: SearchOperatorType.LESS_THAN, label: 'before', requiresValue: true }
          ],
          valueType: SearchValueType.DATE,
          defaultOperator: SearchOperatorType.EQUALS
        },
        {
          id: 'assignee',
          label: 'Assignee',
          description: 'Search by assigned user',
          supportedOperators: [
            { type: SearchOperatorType.EQUALS, label: 'is', requiresValue: true },
            { type: SearchOperatorType.NOT_EQUALS, label: 'is not', requiresValue: true },
            { type: SearchOperatorType.IS_EMPTY, label: 'is empty', requiresValue: false },
            { type: SearchOperatorType.IS_NOT_EMPTY, label: 'is not empty', requiresValue: false }
          ],
          valueType: SearchValueType.TEXT,
          defaultOperator: SearchOperatorType.EQUALS
        }
      ],
      maxCriteria: 10,
      allowRawQuery: true,
      placeholder: 'Search projects...'
    };

    this.registerConfiguration('github-search', gitHubSearchConfig);
  }
}