import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SearchComponent, SearchConfigurationService, SearchConfiguration } from './search';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SearchComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('GitHub Search Demo');
  protected readonly searchConfig = signal<SearchConfiguration | null>(null);
  
  private configService = inject(SearchConfigurationService);

  ngOnInit() {
    const config = this.configService.getConfiguration('github-search');
    if (config) {
      this.searchConfig.set(config);
    }
  }

  onQueryChanged(query: any) {
    // Query change handled by search component
  }

  onCriteriaChanged(criteria: any[]) {
    // Criteria change handled by search component
  }
}
