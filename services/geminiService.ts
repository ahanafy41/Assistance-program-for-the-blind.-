// This file acts as a barrel file, aggregating and re-exporting all Gemini API services.
// This allows other components to import all necessary functions from a single, consistent location
// while keeping the actual implementation organized into smaller, feature-specific files.

export * from './api/audio';
export * from './api/document';
export * from './api/image';
export * from './api/textAnalysis';
export * from './api/video';
export * from './api/webSearch';
export * from './api/fileGeneration';