/**
 * Workflow Automation System - Main Entry Point
 * 
 * Exports all workflow components and provides initialization
 */

export { workflowEngine, WorkflowEngine } from './workflow-engine';
export { autoSeverityClassifier, AutoSeverityClassifier } from './auto-severity';
export { stormModeDetector, StormModeDetector, STORM_MODE_DEFAULTS } from './storm-mode';
export { escalationProcessor, EscalationProcessor, ESCALATION_DEFAULTS } from './escalation-processor';
export { patternDetector, PatternDetector, PATTERN_DEFAULTS } from './pattern-detection';
export { alertProcessor, AlertProcessor } from './alert-processor';
export { cooldownManager, CooldownManager, COOLDOWN_DEFAULTS } from './cooldown-manager';
export { falsePositiveHandler, FalsePositiveHandler, CONFIDENCE_THRESHOLDS } from './false-positive-handler';
export { shiftGracePeriodHandler, ShiftGracePeriodHandler, GRACE_PERIOD_DEFAULTS } from './shift-grace-period';

import { escalationProcessor } from './escalation-processor';

/**
 * Initialize all workflow automation systems
 */
export function initializeWorkflowAutomation() {
  console.log('[Workflow Automation] Initializing...');
  
  // Start escalation processor (checks every minute for unacknowledged alerts)
  escalationProcessor.start();
  
  console.log('[Workflow Automation] Initialization complete');
}

/**
 * Shutdown all workflow automation systems
 */
export function shutdownWorkflowAutomation() {
  console.log('[Workflow Automation] Shutting down...');
  
  escalationProcessor.stop();
  
  console.log('[Workflow Automation] Shutdown complete');
}

// Auto-initialize if in server context
if (typeof window === 'undefined') {
  // Server-side only
  initializeWorkflowAutomation();
}

