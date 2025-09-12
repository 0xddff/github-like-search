import { Injectable } from '@angular/core';
import { 
  SearchCriteria, 
  SearchQuery, 
  SearchType, 
  SearchOperator, 
  SearchOperatorType,
  SearchValueType,
  LogicalOperator 
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class QueryParserService {
  
  /**
   * Parse a raw query string into search criteria
   * Examples: 
   * - "branch-name:main iteration:>5"
   * - "status:Active assignee:john created-date:<2023-12-01"
   */
  parseRawQuery(rawQuery: string, availableTypes: SearchType[]): SearchCriteria[] {
    if (!rawQuery.trim()) return [];
    
    const criteria: SearchCriteria[] = [];
    const tokens = this.tokenizeQuery(rawQuery);
    
    for (const token of tokens) {
      const parsedCriteria = this.parseToken(token, availableTypes);
      if (parsedCriteria) {
        criteria.push(parsedCriteria);
      }
    }
    
    return criteria;
  }
  
  /**
   * Generate a raw query string from search criteria
   */
  generateRawQuery(criteria: SearchCriteria[], logicalOperator: LogicalOperator = LogicalOperator.AND): string {
    const validCriteria = criteria.filter(c => c.isValid);
    
    if (validCriteria.length === 0) return '';
    if (validCriteria.length === 1) return this.criteriaToString(validCriteria[0]);
    
    const operator = logicalOperator === LogicalOperator.OR ? ' OR ' : ' ';
    const criteriaStrings = validCriteria.map(c => this.criteriaToString(c));
    
    // If using OR, wrap each criteria in parentheses for clarity when needed
    if (logicalOperator === LogicalOperator.OR) {
      const wrappedCriteria = criteriaStrings.map(str => {
        // Only wrap if the criteria contains spaces (indicating it might be complex)
        return str.includes(' ') ? `(${str})` : str;
      });
      return wrappedCriteria.join(operator);
    }
    
    return criteriaStrings.join(operator);
  }
  
  /**
   * Check if a raw query is valid
   */
  isValidRawQuery(rawQuery: string, availableTypes: SearchType[]): boolean {
    try {
      const parsed = this.parseRawQuery(rawQuery, availableTypes);
      return parsed.length > 0;
    } catch {
      return false;
    }
  }
  
  private tokenizeQuery(query: string): string[] {
    // Split by spaces but preserve quoted strings
    const tokens: string[] = [];
    let currentToken = '';
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < query.length; i++) {
      const char = query[i];
      
      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true;
        quoteChar = char;
        currentToken += char;
      } else if (char === quoteChar && inQuotes) {
        inQuotes = false;
        quoteChar = '';
        currentToken += char;
      } else if (char === ' ' && !inQuotes) {
        if (currentToken.trim()) {
          tokens.push(currentToken.trim());
          currentToken = '';
        }
      } else {
        currentToken += char;
      }
    }
    
    if (currentToken.trim()) {
      tokens.push(currentToken.trim());
    }
    
    return tokens;
  }
  
  private parseToken(token: string, availableTypes: SearchType[]): SearchCriteria | null {
    // Parse tokens like "field:value", "field:>value", "field:<=value", etc.
    const colonIndex = token.indexOf(':');
    if (colonIndex === -1) return null;
    
    const fieldName = token.substring(0, colonIndex);
    const valueWithOperator = token.substring(colonIndex + 1);
    
    const searchType = availableTypes.find(type => 
      type.id === fieldName || type.label.toLowerCase().replace(/\s+/g, '-') === fieldName
    );
    
    if (!searchType) return null;
    
    const { operator, value } = this.parseOperatorAndValue(valueWithOperator, searchType);
    if (!operator) return null;
    
    return {
      id: crypto.randomUUID(),
      type: searchType,
      operator,
      value: this.parseValue(value, searchType),
      displayValue: this.formatDisplayValue(value, searchType),
      isValid: this.validateParsedValue(value, searchType, operator)
    };
  }
  
  private parseOperatorAndValue(input: string, searchType: SearchType): { operator: SearchOperator | null, value: string } {
    // Check for operators: >=, <=, >, <, !=, =, contains, starts-with, ends-with, etc.
    const operatorPatterns = [
      { pattern: /^>=(.+)$/, type: SearchOperatorType.GREATER_EQUAL },
      { pattern: /^<=(.+)$/, type: SearchOperatorType.LESS_EQUAL },
      { pattern: /^>(.+)$/, type: SearchOperatorType.GREATER_THAN },
      { pattern: /^<(.+)$/, type: SearchOperatorType.LESS_THAN },
      { pattern: /^!=(.+)$/, type: SearchOperatorType.NOT_EQUALS },
      { pattern: /^=(.+)$/, type: SearchOperatorType.EQUALS },
      { pattern: /^~(.+)$/, type: SearchOperatorType.CONTAINS },
      { pattern: /^\^(.+)$/, type: SearchOperatorType.STARTS_WITH },
      { pattern: /^\$(.+)$/, type: SearchOperatorType.ENDS_WITH },
    ];
    
    for (const { pattern, type } of operatorPatterns) {
      const match = input.match(pattern);
      if (match) {
        const operator = searchType.supportedOperators.find(op => op.type === type);
        if (operator) {
          return { operator, value: match[1] };
        }
      }
    }
    
    // Special case for empty/not-empty operators
    if (input === 'empty' || input === '') {
      const operator = searchType.supportedOperators.find(op => op.type === SearchOperatorType.IS_EMPTY);
      if (operator) return { operator, value: '' };
    }
    
    if (input === 'not-empty') {
      const operator = searchType.supportedOperators.find(op => op.type === SearchOperatorType.IS_NOT_EMPTY);
      if (operator) return { operator, value: '' };
    }
    
    // Default to the first supported operator (usually 'equals' or 'contains')
    const defaultOperator = searchType.supportedOperators.find(op => 
      op.type === searchType.defaultOperator
    ) || searchType.supportedOperators[0];
    
    return { operator: defaultOperator, value: input };
  }
  
  private parseValue(value: string, searchType: SearchType): any {
    // Remove quotes if present
    const cleanValue = value.replace(/^["']|["']$/g, '');
    
    switch (searchType.valueType) {
      case SearchValueType.NUMBER:
        const num = Number(cleanValue);
        return isNaN(num) ? cleanValue : num;
        
      case SearchValueType.BOOLEAN:
        return cleanValue.toLowerCase() === 'true' || cleanValue === '1';
        
      case SearchValueType.DATE:
        // Try to parse as date
        const date = new Date(cleanValue);
        return isNaN(date.getTime()) ? cleanValue : date.toISOString().split('T')[0];
        
      case SearchValueType.MULTI_SELECT:
        // Split by comma for multi-select
        return cleanValue.split(',').map(v => v.trim()).filter(v => v);
        
      default:
        return cleanValue;
    }
  }
  
  private formatDisplayValue(value: string, searchType: SearchType): string {
    const cleanValue = value.replace(/^["']|["']$/g, '');
    
    if (searchType.valueType === SearchValueType.DATE) {
      const date = new Date(cleanValue);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString();
      }
    }
    
    return cleanValue;
  }
  
  private validateParsedValue(value: string, searchType: SearchType, operator: SearchOperator): boolean {
    if (!operator.requiresValue) return true;
    if (!value || value.trim() === '') return false;
    
    if (searchType.valueType === SearchValueType.NUMBER) {
      return !isNaN(Number(value.replace(/^["']|["']$/g, '')));
    }
    
    return true;
  }
  
  private criteriaToString(criteria: SearchCriteria): string {
    const fieldName = criteria.type.id;
    const operator = criteria.operator;
    
    if (!operator.requiresValue) {
      // Handle operators that don't need values
      if (operator.type === SearchOperatorType.IS_EMPTY) {
        return `${fieldName}:empty`;
      }
      if (operator.type === SearchOperatorType.IS_NOT_EMPTY) {
        return `${fieldName}:not-empty`;
      }
      return fieldName;
    }
    
    let value = criteria.value;
    
    // Format value based on type
    if (criteria.type.valueType === SearchValueType.DATE && value instanceof Date) {
      value = value.toISOString().split('T')[0];
    } else if (Array.isArray(value)) {
      value = value.join(',');
    } else if (typeof value === 'string' && value.includes(' ')) {
      value = `"${value}"`;
    }
    
    // Add operator prefix
    let operatorPrefix = '';
    switch (operator.type) {
      case SearchOperatorType.GREATER_THAN:
        operatorPrefix = '>';
        break;
      case SearchOperatorType.LESS_THAN:
        operatorPrefix = '<';
        break;
      case SearchOperatorType.GREATER_EQUAL:
        operatorPrefix = '>=';
        break;
      case SearchOperatorType.LESS_EQUAL:
        operatorPrefix = '<=';
        break;
      case SearchOperatorType.NOT_EQUALS:
        operatorPrefix = '!=';
        break;
      case SearchOperatorType.EQUALS:
        operatorPrefix = '=';
        break;
      case SearchOperatorType.CONTAINS:
        operatorPrefix = '~';
        break;
      case SearchOperatorType.STARTS_WITH:
        operatorPrefix = '^';
        break;
      case SearchOperatorType.ENDS_WITH:
        operatorPrefix = '$';
        break;
      default:
        // For default operators, no prefix needed
        break;
    }
    
    return `${fieldName}:${operatorPrefix}${value}`;
  }
}