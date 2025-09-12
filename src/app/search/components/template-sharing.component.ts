import { Component, signal, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExtendedTemplatesService } from '../services/extended-templates.service';
import { ExtendedSearchTemplate } from '../models';

@Component({
  selector: 'app-template-sharing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="sharing-modal" [class.open]="isOpen()">
      <div class="modal-backdrop" (click)="close()"></div>
      
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">Share Template</h3>
          <button 
            class="close-btn"
            (click)="close()"
            type="button">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
            </svg>
          </button>
        </div>

        @if (template()) {
          <div class="modal-body">
            <div class="template-info">
              <div class="template-header">
                @if (template()!.icon) {
                  <span class="template-icon">{{ template()!.icon }}</span>
                }
                <div class="template-details">
                  <h4 class="template-name">{{ template()!.name }}</h4>
                  @if (template()!.description) {
                    <p class="template-description">{{ template()!.description }}</p>
                  }
                </div>
              </div>
              
              @if (template()!.tags && template()!.tags.length > 0) {
                <div class="template-tags">
                  @for (tag of template()!.tags; track tag) {
                    <span class="tag">{{ tag }}</span>
                  }
                </div>
              }
            </div>

            <!-- Share URL Section -->
            <div class="share-section">
              <div class="section-title">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M7.775 3.275a.75.75 0 001.06-1.06l1.25-1.25a2 2 0 112.83 2.83l-2.5 2.5a2 2 0 01-2.83 0 .75.75 0 00-1.06 1.06 3.5 3.5 0 004.95 0l2.5-2.5a3.5 3.5 0 00-4.95-4.95l-1.25 1.25zm-4.69 9.64a2 2 0 010-2.83l2.5-2.5a2 2 0 012.83 0 .75.75 0 001.06-1.06 3.5 3.5 0 00-4.95 0l-2.5 2.5a3.5 3.5 0 004.95 4.95l1.25-1.25a.75.75 0 00-1.06-1.06l-1.25 1.25a2 2 0 01-2.83 0z"/>
                </svg>
                Share Link
              </div>
              
              @if (!template()!.isShared) {
                <div class="share-actions">
                  <p class="share-description">Generate a shareable link for this template</p>
                  <button 
                    class="generate-link-btn"
                    (click)="generateShareLink()"
                    [disabled]="isGeneratingLink()"
                    type="button">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M3.75 2a.75.75 0 0 1 .75.75V4.5h1.5a.75.75 0 0 1 0 1.5H4.5v1.75a.75.75 0 0 1-1.5 0V6H1.25a.75.75 0 0 1 0-1.5H3V2.75A.75.75 0 0 1 3.75 2z"/>
                      <path d="M6.5 2a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 .5.5v11a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5V2z"/>
                    </svg>
                    {{ isGeneratingLink() ? 'Generating...' : 'Generate Share Link' }}
                  </button>
                </div>
              } @else {
                <div class="share-link-section">
                  <div class="share-link-container">
                    <input 
                      #shareUrlInput
                      class="share-url-input"
                      [value]="template()!.shareUrl || ''"
                      readonly
                      type="text">
                    <button 
                      class="copy-link-btn"
                      (click)="copyShareLink(shareUrlInput)"
                      type="button">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M7.775 3.275a.75.75 0 001.06-1.06l1.25-1.25a2 2 0 112.83 2.83l-2.5 2.5a2 2 0 01-2.83 0 .75.75 0 00-1.06 1.06 3.5 3.5 0 004.95 0l2.5-2.5a3.5 3.5 0 00-4.95-4.95l-1.25 1.25zm-4.69 9.64a2 2 0 010-2.83l2.5-2.5a2 2 0 012.83 0 .75.75 0 001.06-1.06 3.5 3.5 0 00-4.95 0l-2.5 2.5a3.5 3.5 0 004.95 4.95l1.25-1.25a.75.75 0 00-1.06-1.06l-1.25 1.25a2 2 0 01-2.83 0z"/>
                      </svg>
                      Copy
                    </button>
                  </div>
                  <p class="share-description">Anyone with this link can use this template</p>
                </div>
              }
            </div>

            <!-- Collaboration Section -->
            <div class="collaboration-section">
              <div class="section-title">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 5.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM4.5 8a3.5 3.5 0 1 0 7 0 3.5 3.5 0 0 0-7 0z"/>
                  <path d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8zm7-6a6 6 0 1 0 0 12A6 6 0 0 0 8 2z"/>
                </svg>
                Collaborators
              </div>

              @if (template()!.collaborators && template()!.collaborators!.length > 0) {
                <div class="collaborators-list">
                  @for (collaborator of template()!.collaborators!; track collaborator) {
                    <div class="collaborator-item">
                      <div class="collaborator-info">
                        <div class="collaborator-avatar">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 5.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM4.5 8a3.5 3.5 0 1 0 7 0 3.5 3.5 0 0 0-7 0z"/>
                            <path d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8zm7-6a6 6 0 1 0 0 12A6 6 0 0 0 8 2z"/>
                          </svg>
                        </div>
                        <span class="collaborator-email">{{ collaborator }}</span>
                      </div>
                      <button 
                        class="remove-collaborator-btn"
                        (click)="removeCollaborator(collaborator)"
                        type="button">
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                        </svg>
                      </button>
                    </div>
                  }
                </div>
              } @else {
                <p class="no-collaborators">No collaborators added yet</p>
              }

              <div class="add-collaborator-section">
                <div class="add-collaborator-form">
                  <input 
                    class="collaborator-email-input"
                    [(ngModel)]="newCollaboratorEmail"
                    placeholder="Enter email address"
                    type="email">
                  <button 
                    class="add-collaborator-btn"
                    (click)="addCollaborator()"
                    [disabled]="!isValidEmail(newCollaboratorEmail())"
                    type="button">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z"/>
                    </svg>
                    Add
                  </button>
                </div>
              </div>
            </div>

            <!-- Export Section -->
            <div class="export-section">
              <div class="section-title">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8.5 1.75a.75.75 0 0 0-1.5 0V8.5L4.854 6.354a.5.5 0 1 0-.708.708l3.5 3.5a.5.5 0 0 0 .708 0l3.5-3.5a.5.5 0 0 0-.708-.708L8.5 8.293V1.75z"/>
                  <path d="M3.5 9.75a.75.75 0 0 0-1.5 0v1.5A2.75 2.75 0 0 0 4.75 14h6.5A2.75 2.75 0 0 0 14 11.25v-1.5a.75.75 0 0 0-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5z"/>
                </svg>
                Export Template
              </div>
              
              <div class="export-actions">
                <button 
                  class="export-btn"
                  (click)="exportTemplate()"
                  type="button">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8.5 1.75a.75.75 0 0 0-1.5 0V8.5L4.854 6.354a.5.5 0 1 0-.708.708l3.5 3.5a.5.5 0 0 0 .708 0l3.5-3.5a.5.5 0 0 0-.708-.708L8.5 8.293V1.75z"/>
                    <path d="M3.5 9.75a.75.75 0 0 0-1.5 0v1.5A2.75 2.75 0 0 0 4.75 14h6.5A2.75 2.75 0 0 0 14 11.25v-1.5a.75.75 0 0 0-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5z"/>
                  </svg>
                  Export as JSON
                </button>
                <p class="export-description">Download template configuration</p>
              </div>
            </div>
          </div>
        }

        <div class="modal-footer">
          <button 
            class="close-footer-btn"
            (click)="close()"
            type="button">
            Close
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrl: './template-sharing.component.scss'
})
export class TemplateSharingComponent {
  private templatesService = inject(ExtendedTemplatesService);

  // Inputs
  readonly isOpen = input<boolean>(false);
  readonly template = input<ExtendedSearchTemplate | null>(null);

  // Outputs
  readonly closed = output<void>();

  // State
  protected readonly isGeneratingLink = signal<boolean>(false);
  protected readonly newCollaboratorEmail = signal<string>('');

  protected close(): void {
    this.closed.emit();
  }

  protected async generateShareLink(): Promise<void> {
    const template = this.template();
    if (!template) return;

    this.isGeneratingLink.set(true);
    try {
      await this.templatesService.shareTemplate(template.id);
    } catch (error) {
      console.error('Failed to generate share link:', error);
    } finally {
      this.isGeneratingLink.set(false);
    }
  }

  protected copyShareLink(input: HTMLInputElement): void {
    input.select();
    navigator.clipboard.writeText(input.value).then(() => {
      console.log('Share link copied to clipboard');
      // Could show a toast notification here
    }).catch(err => {
      console.error('Failed to copy link:', err);
    });
  }

  protected async addCollaborator(): Promise<void> {
    const template = this.template();
    const email = this.newCollaboratorEmail().trim();
    
    if (!template || !email || !this.isValidEmail(email)) return;

    try {
      await this.templatesService.addCollaborator(template.id, email);
      this.newCollaboratorEmail.set('');
    } catch (error) {
      console.error('Failed to add collaborator:', error);
    }
  }

  protected async removeCollaborator(email: string): Promise<void> {
    const template = this.template();
    if (!template) return;

    try {
      await this.templatesService.removeCollaborator(template.id, email);
    } catch (error) {
      console.error('Failed to remove collaborator:', error);
    }
  }

  protected isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  protected async exportTemplate(): Promise<void> {
    const template = this.template();
    if (!template) return;

    try {
      const exportData = await this.templatesService.exportTemplate(template.id);
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${template.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_template.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export template:', error);
    }
  }
}