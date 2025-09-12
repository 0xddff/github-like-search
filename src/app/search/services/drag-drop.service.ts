import { Injectable } from '@angular/core';
import { SearchCriteria } from '../models';

export interface DragDropState {
  draggedItem: SearchCriteria | null;
  draggedIndex: number;
  dropTargetIndex: number;
  isDragging: boolean;
  dragPreview?: HTMLElement;
}

@Injectable({
  providedIn: 'root'
})
export class DragDropService {
  private dragState: DragDropState = {
    draggedItem: null,
    draggedIndex: -1,
    dropTargetIndex: -1,
    isDragging: false
  };

  /**
   * Start dragging a search criteria item
   */
  startDrag(item: SearchCriteria, index: number, event: DragEvent): void {
    this.dragState = {
      draggedItem: { ...item },
      draggedIndex: index,
      dropTargetIndex: -1,
      isDragging: true
    };

    // Create custom drag preview
    if (event.dataTransfer) {
      const dragPreview = this.createDragPreview(item);
      document.body.appendChild(dragPreview);
      
      // Set the drag image
      event.dataTransfer.setDragImage(dragPreview, 10, 10);
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', item.id);
      
      // Store reference to remove later
      this.dragState.dragPreview = dragPreview;
      
      // Remove preview after a short delay
      setTimeout(() => {
        if (dragPreview.parentNode) {
          dragPreview.parentNode.removeChild(dragPreview);
        }
      }, 0);
    }
  }

  /**
   * Handle drag over event
   */
  onDragOver(index: number, event: DragEvent): void {
    if (!this.dragState.isDragging) return;
    
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
    
    this.dragState.dropTargetIndex = index;
  }

  /**
   * Handle drop event
   */
  onDrop(targetIndex: number, criteria: SearchCriteria[]): SearchCriteria[] {
    if (!this.dragState.isDragging || !this.dragState.draggedItem) {
      return criteria;
    }

    const draggedIndex = this.dragState.draggedIndex;
    
    // Don't do anything if dropped on the same position
    if (draggedIndex === targetIndex) {
      this.endDrag();
      return criteria;
    }

    // Create a new array with reordered items
    const newCriteria = [...criteria];
    const draggedItem = newCriteria[draggedIndex];
    
    // Remove the dragged item from its original position
    newCriteria.splice(draggedIndex, 1);
    
    // Insert it at the new position
    const insertIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
    newCriteria.splice(insertIndex, 0, draggedItem);

    this.endDrag();
    return newCriteria;
  }

  /**
   * End the drag operation
   */
  endDrag(): void {
    // Clean up drag preview if it still exists
    if (this.dragState.dragPreview && this.dragState.dragPreview.parentNode) {
      this.dragState.dragPreview.parentNode.removeChild(this.dragState.dragPreview);
    }

    this.dragState = {
      draggedItem: null,
      draggedIndex: -1,
      dropTargetIndex: -1,
      isDragging: false
    };
  }

  /**
   * Get current drag state
   */
  getDragState(): DragDropState {
    return { ...this.dragState };
  }

  /**
   * Check if an item is currently being dragged
   */
  isDragging(index?: number): boolean {
    if (index !== undefined) {
      return this.dragState.isDragging && this.dragState.draggedIndex === index;
    }
    return this.dragState.isDragging;
  }

  /**
   * Check if an index is the current drop target
   */
  isDropTarget(index: number): boolean {
    return this.dragState.isDragging && this.dragState.dropTargetIndex === index;
  }

  /**
   * Create a custom drag preview element
   */
  private createDragPreview(item: SearchCriteria): HTMLElement {
    const preview = document.createElement('div');
    preview.className = 'drag-preview';
    
    // Create the content
    const content = document.createElement('div');
    content.className = 'drag-preview-content';
    
    const typeSpan = document.createElement('span');
    typeSpan.className = 'drag-preview-type';
    typeSpan.textContent = item.type.label;
    
    const operatorSpan = document.createElement('span');
    operatorSpan.className = 'drag-preview-operator';
    operatorSpan.textContent = item.operator.label;
    
    const valueSpan = document.createElement('span');
    valueSpan.className = 'drag-preview-value';
    if (item.operator.requiresValue && item.value) {
      valueSpan.textContent = item.displayValue || String(item.value);
    }
    
    content.appendChild(typeSpan);
    content.appendChild(operatorSpan);
    if (item.operator.requiresValue && item.value) {
      content.appendChild(valueSpan);
    }
    
    preview.appendChild(content);
    
    // Style the preview
    Object.assign(preview.style, {
      position: 'absolute',
      top: '-1000px',
      left: '-1000px',
      padding: '4px 8px',
      backgroundColor: '#0969da',
      color: 'white',
      borderRadius: '4px',
      fontSize: '12px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif',
      boxShadow: '0 4px 12px rgba(9, 105, 218, 0.3)',
      pointerEvents: 'none',
      zIndex: '10000',
      opacity: '0.9',
      transform: 'rotate(2deg)'
    });
    
    Object.assign(content.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    });
    
    Object.assign(typeSpan.style, {
      fontWeight: '600'
    });
    
    Object.assign(operatorSpan.style, {
      opacity: '0.8'
    });
    
    Object.assign(valueSpan.style, {
      fontWeight: '600',
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      padding: '2px 4px',
      borderRadius: '2px'
    });
    
    return preview;
  }

  /**
   * Animate the reorder operation
   */
  animateReorder(container: HTMLElement, fromIndex: number, toIndex: number): Promise<void> {
    return new Promise((resolve) => {
      const items = Array.from(container.children) as HTMLElement[];
      
      if (!items[fromIndex] || !items[toIndex]) {
        resolve();
        return;
      }

      const fromItem = items[fromIndex];
      const toItem = items[toIndex];
      
      // Get initial positions
      const fromRect = fromItem.getBoundingClientRect();
      const toRect = toItem.getBoundingClientRect();
      
      // Calculate the distance to move
      const deltaY = toRect.top - fromRect.top;
      
      // Apply the animation
      fromItem.style.transform = `translateY(${deltaY}px)`;
      fromItem.style.transition = 'transform 0.2s ease';
      fromItem.style.zIndex = '1000';
      
      // Reset after animation
      setTimeout(() => {
        fromItem.style.transform = '';
        fromItem.style.transition = '';
        fromItem.style.zIndex = '';
        resolve();
      }, 200);
    });
  }

  /**
   * Get visual feedback classes for drag states
   */
  getDragClasses(index: number): string[] {
    const classes: string[] = [];
    
    if (this.isDragging(index)) {
      classes.push('dragging');
    }
    
    if (this.isDropTarget(index)) {
      classes.push('drop-target');
    }
    
    if (this.dragState.isDragging && index !== this.dragState.draggedIndex) {
      classes.push('drag-other');
    }
    
    return classes;
  }
}