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

// Extended Template Models
export enum LogicalOperator {
  AND = 'AND',
  OR = 'OR'
}

// We'll define this here to avoid circular imports
export interface BaseSearchTemplate {
  id: string;
  name: string;
  description?: string;
  query: SearchQuery;
  searchMode: 'visual' | 'raw';
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
  lastUsedAt?: Date;
  isPublic: boolean;
  color?: string;
  icon?: string;
}

export interface ExtendedSearchTemplate extends BaseSearchTemplate {
  // Add logical operator support to templates
  logicalOperator?: LogicalOperator;
  
  // Template groups for organization
  groupId?: string;
  groupName?: string;
  
  // Enhanced sharing and collaboration
  isShared?: boolean;
  shareUrl?: string;
  collaborators?: string[];
  
  // Template metadata
  version?: number;
  parentTemplateId?: string;
  forkCount?: number;
  
  // Usage analytics
  lastUsed?: Date;
  usageFrequency?: number;
  
  // Template validation
  isValid?: boolean;
  validationErrors?: string[];
}

export interface TemplateGroup {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  templates: ExtendedSearchTemplate[];
  isCollapsed?: boolean;
  createdAt: Date;
}

export interface QuickTemplate {
  id: string;
  label: string;
  description: string;
  icon: string;
  template: ExtendedSearchTemplate;
  color?: string;
  hotkey?: string;
}

export interface DateRangeFilter {
  field: string;
  startDate?: Date | null;
  endDate?: Date | null;
  preset?: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  relative?: {
    value: number;
    unit: 'days' | 'weeks' | 'months' | 'years';
    direction: 'past' | 'future';
  };
}