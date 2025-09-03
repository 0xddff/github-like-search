export enum SearchOperatorType {
  CONTAINS = 'contains',
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  GREATER_EQUAL = 'greater_equal',
  LESS_EQUAL = 'less_equal',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  IS_EMPTY = 'is_empty',
  IS_NOT_EMPTY = 'is_not_empty',
  IN = 'in',
  NOT_IN = 'not_in'
}

export enum SearchValueType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  BOOLEAN = 'boolean',
  SELECT = 'select',
  MULTI_SELECT = 'multi_select'
}

export interface SearchOperator {
  type: SearchOperatorType;
  label: string;
  description?: string;
  requiresValue: boolean;
}

export interface ValidationRule {
  type: 'required' | 'pattern' | 'min' | 'max' | 'custom';
  value?: any;
  message: string;
  validator?: (value: any) => boolean;
}

export interface SearchType {
  id: string;
  label: string;
  description?: string;
  supportedOperators: SearchOperator[];
  valueType: SearchValueType;
  defaultOperator?: SearchOperatorType;
  validation?: ValidationRule[];
  options?: string[]; // For SELECT and MULTI_SELECT types
}

export interface SearchCriteria {
  id: string;
  type: SearchType;
  operator: SearchOperator;
  value?: any;
  displayValue?: string;
  isValid: boolean;
}

export interface SearchQuery {
  criteria: SearchCriteria[];
  rawQuery?: string;
  isValid: boolean;
}

export interface SearchTheme {
  primaryColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  tagColor?: string;
  tagBackgroundColor?: string;
}

export interface SearchConfiguration {
  availableTypes: SearchType[];
  maxCriteria?: number;
  allowRawQuery?: boolean;
  placeholder?: string;
  theme?: SearchTheme;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings?: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  type: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  type: string;
}