/**
 * @hivellm/compression-prompt
 * 
 * Fast statistical compression for LLM prompts
 * 50% token reduction with 91% quality retention
 */

export { StatisticalFilter } from './StatisticalFilter';
export { QualityMetrics } from './QualityMetrics';
export * from './types';

// Re-export for convenience
export { StatisticalFilter as default } from './StatisticalFilter';

