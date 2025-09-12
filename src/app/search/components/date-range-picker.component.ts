import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DateRangeFilter } from '../models';

type DatePreset = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

interface RelativeDateOption {
  value: number;
  unit: 'days' | 'weeks' | 'months' | 'years';
  direction: 'past' | 'future';
  label: string;
}

@Component({
  selector: 'app-date-range-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="date-range-picker" [class.open]="isOpen()">
      <div class="picker-header">
        <div class="field-info">
          <span class="field-name">{{ fieldLabel() }}</span>
          <span class="field-description" *ngIf="fieldDescription()">{{ fieldDescription() }}</span>
        </div>
        <button 
          class="close-btn"
          type="button"
          (click)="close()"
          title="Close date picker">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
          </svg>
        </button>
      </div>

      <div class="picker-content">
        <!-- Preset Options -->
        <div class="preset-section">
          <h4 class="section-title">Quick Options</h4>
          <div class="preset-grid">
            @for (preset of datePresets; track preset.value) {
              <button 
                class="preset-btn"
                type="button"
                [class.active]="selectedPreset() === preset.value"
                (click)="selectPreset(preset.value)"
                [title]="preset.description">
                <span class="preset-icon">{{ preset.icon }}</span>
                <span class="preset-label">{{ preset.label }}</span>
                <small class="preset-description">{{ preset.description }}</small>
              </button>
            }
          </div>
        </div>

        <!-- Relative Date Options -->
        <div class="relative-section" *ngIf="selectedPreset() === 'custom'">
          <h4 class="section-title">Relative Date</h4>
          <div class="relative-controls">
            <div class="direction-selector">
              <button 
                class="direction-btn"
                type="button"
                [class.active]="relativeDirection() === 'past'"
                (click)="setRelativeDirection('past')">
                Past
              </button>
              <button 
                class="direction-btn"
                type="button"
                [class.active]="relativeDirection() === 'future'"
                (click)="setRelativeDirection('future')">
                Future
              </button>
            </div>

            <div class="value-input">
              <input 
                type="number"
                class="relative-value-input"
                [value]="relativeValue()"
                (input)="setRelativeValue(+$event.target.value)"
                min="1"
                max="999"
                placeholder="Enter number">
            </div>

            <div class="unit-selector">
              <select 
                class="unit-select"
                [value]="relativeUnit()"
                (change)="onUnitChange($event)">
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
                <option value="years">Years</option>
              </select>
            </div>
          </div>

          <div class="relative-preview" *ngIf="relativeValue() > 0">
            <span class="preview-label">Preview:</span>
            <span class="preview-date">{{ getRelativePreview() }}</span>
          </div>
        </div>

        <!-- Custom Date Range -->
        <div class="custom-section" *ngIf="selectedPreset() === 'custom'">
          <h4 class="section-title">Custom Range</h4>
          <div class="date-inputs">
            <div class="date-input-group">
              <label class="date-label">Start Date</label>
              <input 
                type="date"
                class="date-input"
                [value]="getDateString(startDate())"
                (change)="setStartDate($event.target.value)"
                [max]="getDateString(endDate())">
            </div>
            
            <div class="date-range-separator">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4.427 9.427l3.396 3.396a.25.25 0 0 0 .354 0l3.396-3.396A.25.25 0 0 0 11.396 9H4.604a.25.25 0 0 0-.177.427z"/>
              </svg>
            </div>
            
            <div class="date-input-group">
              <label class="date-label">End Date</label>
              <input 
                type="date"
                class="date-input"
                [value]="getDateString(endDate())"
                (change)="setEndDate($event.target.value)"
                [min]="getDateString(startDate())">
            </div>
          </div>
        </div>

        <!-- Current Selection Summary -->
        <div class="selection-summary" *ngIf="hasValidSelection()">
          <div class="summary-content">
            <span class="summary-label">Selected:</span>
            <span class="summary-value">{{ getSelectionSummary() }}</span>
          </div>
          <div class="summary-meta" *ngIf="getDayCount() > 0">
            <span class="day-count">{{ getDayCount() }} days</span>
          </div>
        </div>
      </div>

      <div class="picker-actions">
        <button 
          class="action-btn secondary"
          type="button"
          (click)="clearSelection()"
          [disabled]="!hasValidSelection()">
          Clear
        </button>
        <button 
          class="action-btn primary"
          type="button"
          (click)="applySelection()"
          [disabled]="!hasValidSelection()">
          Apply
        </button>
      </div>
    </div>
  `,
  styleUrl: './date-range-picker.component.scss'
})
export class DateRangePickerComponent {
  // Inputs
  readonly isOpen = input<boolean>(false);
  readonly fieldLabel = input<string>('Date');
  readonly fieldDescription = input<string>('');
  readonly initialValue = input<DateRangeFilter | null>(null);

  // Outputs
  readonly dateRangeChanged = output<DateRangeFilter>();
  readonly closed = output<void>();

  // Internal state
  protected readonly selectedPreset = signal<DatePreset>('today');
  protected readonly startDate = signal<Date | null>(null);
  protected readonly endDate = signal<Date | null>(null);
  protected readonly relativeDirection = signal<'past' | 'future'>('past');
  protected readonly relativeValue = signal<number>(1);
  protected readonly relativeUnit = signal<'days' | 'weeks' | 'months' | 'years'>('days');

  // Preset configurations
  protected readonly datePresets = [
    {
      value: 'today' as DatePreset,
      label: 'Today',
      description: 'Items from today',
      icon: '📅'
    },
    {
      value: 'week' as DatePreset,
      label: 'This Week',
      description: 'Items from this week',
      icon: '📆'
    },
    {
      value: 'month' as DatePreset,
      label: 'This Month',
      description: 'Items from this month',
      icon: '🗓️'
    },
    {
      value: 'quarter' as DatePreset,
      label: 'This Quarter',
      description: 'Items from this quarter',
      icon: '📊'
    },
    {
      value: 'year' as DatePreset,
      label: 'This Year',
      description: 'Items from this year',
      icon: '🎉'
    },
    {
      value: 'custom' as DatePreset,
      label: 'Custom',
      description: 'Define custom date range',
      icon: '⚙️'
    }
  ];

  // Computed properties
  protected readonly hasValidSelection = computed(() => {
    const preset = this.selectedPreset();
    if (preset !== 'custom') return true;
    
    const start = this.startDate();
    const end = this.endDate();
    return start !== null && end !== null && start <= end;
  });

  constructor() {
    // Initialize with current date if no initial value
    const now = new Date();
    this.startDate.set(now);
    this.endDate.set(now);
  }

  // Actions
  protected selectPreset(preset: DatePreset): void {
    this.selectedPreset.set(preset);
    
    if (preset !== 'custom') {
      const range = this.calculatePresetRange(preset);
      this.startDate.set(range.start);
      this.endDate.set(range.end);
    }
  }

  protected setRelativeDirection(direction: 'past' | 'future'): void {
    this.relativeDirection.set(direction);
  }

  protected setRelativeValue(value: number): void {
    if (value > 0) {
      this.relativeValue.set(value);
    }
  }

  protected setRelativeUnit(unit: 'days' | 'weeks' | 'months' | 'years'): void {
    this.relativeUnit.set(unit);
  }

  protected onUnitChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.setRelativeUnit(target.value as 'days' | 'weeks' | 'months' | 'years');
  }

  protected setStartDate(dateString: string): void {
    if (dateString) {
      this.startDate.set(new Date(dateString));
    }
  }

  protected setEndDate(dateString: string): void {
    if (dateString) {
      this.endDate.set(new Date(dateString));
    }
  }

  protected clearSelection(): void {
    this.selectedPreset.set('today');
    this.startDate.set(new Date());
    this.endDate.set(new Date());
    this.relativeValue.set(1);
    this.relativeUnit.set('days');
    this.relativeDirection.set('past');
  }

  protected applySelection(): void {
    if (!this.hasValidSelection()) return;

    const filter: DateRangeFilter = {
      field: this.fieldLabel(),
      startDate: this.startDate(),
      endDate: this.endDate(),
      preset: this.selectedPreset() !== 'custom' ? this.selectedPreset() : undefined
    };

    // Add relative info if using custom with relative values
    if (this.selectedPreset() === 'custom' && this.relativeValue() > 0) {
      filter.relative = {
        value: this.relativeValue(),
        unit: this.relativeUnit(),
        direction: this.relativeDirection()
      };
    }

    this.dateRangeChanged.emit(filter);
    this.close();
  }

  protected close(): void {
    this.closed.emit();
  }

  // Helper methods
  protected getDateString(date: Date | null): string {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  }

  protected getRelativePreview(): string {
    const value = this.relativeValue();
    const unit = this.relativeUnit();
    const direction = this.relativeDirection();
    
    const now = new Date();
    let targetDate = new Date(now);
    
    const multiplier = direction === 'past' ? -1 : 1;
    
    switch (unit) {
      case 'days':
        targetDate.setDate(now.getDate() + (value * multiplier));
        break;
      case 'weeks':
        targetDate.setDate(now.getDate() + (value * 7 * multiplier));
        break;
      case 'months':
        targetDate.setMonth(now.getMonth() + (value * multiplier));
        break;
      case 'years':
        targetDate.setFullYear(now.getFullYear() + (value * multiplier));
        break;
    }
    
    return direction === 'past' 
      ? `Since ${targetDate.toLocaleDateString()}`
      : `Until ${targetDate.toLocaleDateString()}`;
  }

  protected getSelectionSummary(): string {
    const preset = this.selectedPreset();
    
    if (preset !== 'custom') {
      const presetInfo = this.datePresets.find(p => p.value === preset);
      return presetInfo?.label || preset;
    }
    
    const start = this.startDate();
    const end = this.endDate();
    
    if (start && end) {
      if (start.toDateString() === end.toDateString()) {
        return start.toLocaleDateString();
      }
      return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    }
    
    return '';
  }

  protected getDayCount(): number {
    const start = this.startDate();
    const end = this.endDate();
    
    if (start && end) {
      const diffTime = Math.abs(end.getTime() - start.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
    }
    
    return 0;
  }

  private calculatePresetRange(preset: DatePreset): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    
    switch (preset) {
      case 'today':
        // Already set to today
        break;
        
      case 'week':
        // Start of week (Monday)
        const dayOfWeek = now.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday is 0
        start.setDate(now.getDate() - daysToMonday);
        end.setDate(start.getDate() + 6);
        break;
        
      case 'month':
        start.setDate(1);
        end.setMonth(now.getMonth() + 1, 0); // Last day of current month
        break;
        
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        start.setMonth(quarter * 3, 1);
        end.setMonth((quarter + 1) * 3, 0);
        break;
        
      case 'year':
        start.setMonth(0, 1); // January 1st
        end.setMonth(11, 31); // December 31st
        break;
    }
    
    // Reset time to start/end of day
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    
    return { start, end };
  }
}