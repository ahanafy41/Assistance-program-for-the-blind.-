import React from 'react';

export interface Source {
  title: string;
  uri: string;
  snippet?: string;
}

export interface Entity {
  name: string;
  type: 'Person' | 'Organization' | 'Location' | 'Other';
}

export type SummaryLength = 'brief' | 'normal' | 'detailed';

export type ResultTone = 'professional' | 'casual' | 'academic' | 'simple' | '';
export type ResultFormat = 'paragraphs' | 'bullets' | 'table' | '';
export type SourceType = 'any' | 'news' | 'academic' | 'government';

export interface SearchFilters {
  exactPhrase: string;
  excludeWord: string;
  timeRange: 'day' | 'week' | 'month' | '';
  location: string;
  summaryLength: SummaryLength;
  resultLanguage: string;
  minSources: number;
  resultTone: ResultTone;
  resultFormat: ResultFormat;
  sourceType: SourceType;
  siteSearch: string;
}

export interface Insights {
  sentiment: 'Positive' | 'Neutral' | 'Negative' | 'Mixed';
  keywords: string[];
  entities: Entity[];
  summaryPoints: string[];
  trendiness: 'Trending' | 'Stable' | 'Niche' | 'Unspecified';
}

export interface FactCheckClaim {
    claim: string;
    status: 'Well-supported' | 'Single source' | 'Conflicting';
    explanation?: string;
}

export interface FactCheckResult {
    overallConfidence: 'High' | 'Medium' | 'Conflicting';
    claims: FactCheckClaim[];
}

export interface GeneratedImage {
    imageBytes: string;
    altText: string;
}

export type PodcastDuration = 'short' | 'medium' | 'long' | 'very-long' | 'epic';

export interface PodcastScriptLine {
  speaker: 'Joe' | 'Jane';
  line: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}