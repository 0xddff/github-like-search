import { Injectable, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { SearchQuery, SearchCriteria } from '../models';
import { QueryParserService } from './query-parser.service';

interface UrlSearchState {
  q?: string; // Raw query
  mode?: 'visual' | 'raw'; // Search mode
  v?: string; // Version for backward compatibility
}

@Injectable({
  providedIn: 'root'
})
export class UrlSyncService {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private queryParserService = inject(QueryParserService);
  
  private readonly URL_VERSION = '1';
  private readonly MAX_URL_LENGTH = 2000; // Reasonable URL length limit

  /**
   * Sync search state to URL parameters
   */
  syncToUrl(searchQuery: SearchQuery, isRawMode: boolean): void {
    const urlState: UrlSearchState = {
      v: this.URL_VERSION,
      mode: isRawMode ? 'raw' : 'visual'
    };

    // Use raw query if available, otherwise generate from criteria
    if (searchQuery.rawQuery && searchQuery.rawQuery.trim()) {
      urlState.q = searchQuery.rawQuery;
    } else if (searchQuery.criteria.length > 0) {
      urlState.q = this.queryParserService.generateRawQuery(searchQuery.criteria);
    }

    // Only update URL if there's a query
    if (urlState.q) {
      const urlString = this.buildUrlString(urlState);
      
      // Check URL length limit
      if (urlString.length <= this.MAX_URL_LENGTH) {
        this.updateUrlParams(urlState);
      } else {
        console.warn('Search query too long for URL, skipping sync');
      }
    } else {
      // Clear URL params if no query
      this.clearUrlParams();
    }
  }

  /**
   * Load search state from URL parameters
   */
  loadFromUrl(): { query: string; mode: 'visual' | 'raw' } | null {
    const queryParams = this.route.snapshot.queryParams;
    const urlState = this.parseUrlParams(queryParams);
    
    if (!urlState.q) {
      return null;
    }

    return {
      query: urlState.q,
      mode: urlState.mode || 'visual'
    };
  }

  /**
   * Subscribe to URL changes and return observable of search state
   */
  watchUrlChanges() {
    return this.route.queryParams;
  }

  /**
   * Generate shareable URL for current search
   */
  generateShareableUrl(searchQuery: SearchQuery, isRawMode: boolean): string {
    const urlState: UrlSearchState = {
      v: this.URL_VERSION,
      mode: isRawMode ? 'raw' : 'visual'
    };

    if (searchQuery.rawQuery && searchQuery.rawQuery.trim()) {
      urlState.q = searchQuery.rawQuery;
    } else if (searchQuery.criteria.length > 0) {
      urlState.q = this.queryParserService.generateRawQuery(searchQuery.criteria);
    }

    if (!urlState.q) {
      return window.location.origin + window.location.pathname;
    }

    const params = new URLSearchParams();
    Object.entries(urlState).forEach(([key, value]) => {
      if (value !== undefined) {
        params.set(key, value);
      }
    });

    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  }

  /**
   * Clear all search-related URL parameters
   */
  clearUrlParams(): void {
    const currentParams = { ...this.route.snapshot.queryParams };
    
    // Remove search-related params
    delete currentParams['q'];
    delete currentParams['mode'];
    delete currentParams['v'];

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: Object.keys(currentParams).length > 0 ? currentParams : {},
      replaceUrl: true
    });
  }

  /**
   * Check if URL contains search parameters
   */
  hasSearchParams(): boolean {
    const params = this.route.snapshot.queryParams;
    return !!(params['q'] || params['query']); // Support legacy 'query' param
  }

  /**
   * Validate if URL state is compatible
   */
  isUrlStateValid(urlState: UrlSearchState): boolean {
    // Check version compatibility
    if (urlState.v && urlState.v !== this.URL_VERSION) {
      console.warn(`URL version ${urlState.v} may not be fully compatible with current version ${this.URL_VERSION}`);
    }

    // Validate mode
    if (urlState.mode && !['visual', 'raw'].includes(urlState.mode)) {
      return false;
    }

    // Validate query length
    if (urlState.q && urlState.q.length > 1000) {
      return false;
    }

    return true;
  }

  private updateUrlParams(urlState: UrlSearchState): void {
    const queryParams: any = {};
    
    Object.entries(urlState).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams[key] = value;
      }
    });

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl: true // Use replaceUrl to avoid cluttering browser history
    });
  }

  private parseUrlParams(params: any): UrlSearchState {
    const urlState: UrlSearchState = {};

    // Support both 'q' and legacy 'query' parameter
    if (params['q']) {
      urlState.q = decodeURIComponent(params['q']);
    } else if (params['query']) {
      urlState.q = decodeURIComponent(params['query']);
    }

    if (params['mode']) {
      urlState.mode = params['mode'];
    }

    if (params['v']) {
      urlState.v = params['v'];
    }

    return urlState;
  }

  private buildUrlString(urlState: UrlSearchState): string {
    const params = new URLSearchParams();
    Object.entries(urlState).forEach(([key, value]) => {
      if (value !== undefined) {
        params.set(key, value);
      }
    });
    
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  }

  /**
   * Decode search query from various URL formats
   * Supports multiple encoding formats for better compatibility
   */
  decodeSearchQuery(encodedQuery: string): string {
    try {
      // Try decodeURIComponent first
      return decodeURIComponent(encodedQuery);
    } catch (e) {
      try {
        // Fallback to regular decode
        return decodeURI(encodedQuery);
      } catch (e2) {
        // If all else fails, return as-is
        console.warn('Could not decode search query from URL:', encodedQuery);
        return encodedQuery;
      }
    }
  }

  /**
   * Encode search query for URL
   * Uses encodeURIComponent for proper URL encoding
   */
  encodeSearchQuery(query: string): string {
    try {
      return encodeURIComponent(query);
    } catch (e) {
      console.warn('Could not encode search query for URL:', query);
      return query;
    }
  }
}