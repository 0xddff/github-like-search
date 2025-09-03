import { Injectable } from '@angular/core';
import { SearchQuery, SearchCriteria, ValidationResult, ValidationError } from '../models';

@Injectable({
  providedIn: 'root'
})
export class SearchValidationService {
  
  validateQuery(query: SearchQuery): ValidationResult {
    const errors: ValidationError[] = [];
    
    if (query.criteria.length === 0 && !query.rawQuery) {
      errors.push({
        field: 'query',
        message: 'At least one search criteria is required',
        type: 'required'
      });
    }
    
    for (const criteria of query.criteria) {
      if (!criteria.isValid) {
        errors.push({
          field: `criteria-${criteria.id}`,
          message: `Invalid criteria: ${criteria.type.label}`,
          type: 'validation'
        });
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  getErrorMessage(error: ValidationError): string {
    return error.message;
  }
}