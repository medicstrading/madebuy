/**
 * NEXUS - Intelligent Model Routing System
 *
 * Main entry point for the NEXUS system.
 */

const fs = require('fs');
const path = require('path');
const { NexusRouter, routeTask } = require('./router');

class Nexus {
  constructor(basePath = '.nexus') {
    this.basePath = basePath;
    this.router = new NexusRouter(basePath);
    this.config = {
      models: this.loadJson('models.json'),
      rules: this.loadJson('rules.json'),
      classifier: this.loadJson('task-classifier.json'),
      memory: this.loadJson('memory.json')
    };
  }

  loadJson(filename) {
    const filePath = path.join(this.basePath, filename);
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
      console.error(`[NEXUS] Failed to load ${filename}:`, error.message);
      return null;
    }
  }

  saveJson(filename, data) {
    const filePath = path.join(this.basePath, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  route(description, options = {}) {
    const decision = this.router.route({
      description,
      files: options.files || [],
      override_tier: options.override_tier
    });

    this.updateStats(decision);
    return decision;
  }

  quickRoute(description) {
    const decision = this.route(description);
    return decision.selected_tier;
  }

  getModel(tier) {
    return this.config.models?.tiers?.[tier] || null;
  }

  escalate(fromTier, reason, context = {}) {
    const tierPriority = ['haiku', 'sonnet', 'opus'];
    const currentIndex = tierPriority.indexOf(fromTier);
    const toTier = currentIndex < 2 ? tierPriority[currentIndex + 1] : 'opus';

    const handoff = {
      id: `esc-${Date.now()}`,
      handoff_type: 'escalation',
      from_tier: fromTier,
      to_tier: toTier,
      timestamp: new Date().toISOString(),
      reason,
      context,
      status: 'pending'
    };

    this.logHandoff(handoff);
    return handoff;
  }

  delegate(fromTier, task, spec = {}) {
    const tierPriority = ['haiku', 'sonnet', 'opus'];
    const currentIndex = tierPriority.indexOf(fromTier);
    const toTier = currentIndex > 0 ? tierPriority[currentIndex - 1] : 'haiku';

    const handoff = {
      id: `del-${Date.now()}`,
      handoff_type: 'delegation',
      from_tier: fromTier,
      to_tier: toTier,
      timestamp: new Date().toISOString(),
      task,
      specification: spec,
      status: 'pending'
    };

    this.logHandoff(handoff);
    return handoff;
  }

  logHandoff(handoff) {
    if (!this.config.memory) return;

    if (!this.config.memory.handoff_history) {
      this.config.memory.handoff_history = {
        active_handoffs: [],
        completed_handoffs: [],
        failed_handoffs: []
      };
    }

    this.config.memory.handoff_history.active_handoffs.push(handoff);

    if (handoff.handoff_type === 'escalation') {
      this.config.memory.model_routing.escalation_events.push({
        timestamp: handoff.timestamp,
        from: handoff.from_tier,
        to: handoff.to_tier,
        reason: handoff.reason
      });
      this.config.memory.model_routing.statistics.escalations++;
    } else {
      this.config.memory.model_routing.delegation_events.push({
        timestamp: handoff.timestamp,
        from: handoff.from_tier,
        to: handoff.to_tier,
        task: handoff.task?.substring?.(0, 50)
      });
      this.config.memory.model_routing.statistics.delegations++;
    }

    this.saveJson('memory.json', this.config.memory);
  }

  updateStats(decision) {
    if (!this.config.memory?.model_routing) return;

    const stats = this.config.memory.model_routing.statistics;
    stats.total_routed++;
    stats.by_tier[decision.selected_tier]++;

    const n = stats.total_routed;
    stats.avg_complexity = (
      (stats.avg_complexity * (n - 1) + decision.classification.complexity_score) / n
    ).toFixed(2);
    stats.avg_confidence = (
      (stats.avg_confidence * (n - 1) + decision.classification.confidence) / n
    ).toFixed(2);

    this.saveJson('memory.json', this.config.memory);
  }

  getStats() {
    return this.config.memory?.model_routing?.statistics || {
      total_routed: 0,
      by_tier: { haiku: 0, sonnet: 0, opus: 0 },
      escalations: 0,
      delegations: 0
    };
  }

  estimateSavings() {
    const stats = this.getStats();
    const models = this.config.models?.tiers;
    if (!models) return 0;

    const avgTokensPerTask = 2000;

    const opusCost = stats.total_routed * avgTokensPerTask *
      (models.opus.cost_per_1k_tokens.input + models.opus.cost_per_1k_tokens.output) / 1000;

    const actualCost =
      stats.by_tier.haiku * avgTokensPerTask *
        (models.haiku.cost_per_1k_tokens.input + models.haiku.cost_per_1k_tokens.output) / 1000 +
      stats.by_tier.sonnet * avgTokensPerTask *
        (models.sonnet.cost_per_1k_tokens.input + models.sonnet.cost_per_1k_tokens.output) / 1000 +
      stats.by_tier.opus * avgTokensPerTask *
        (models.opus.cost_per_1k_tokens.input + models.opus.cost_per_1k_tokens.output) / 1000;

    return Math.max(0, opusCost - actualCost).toFixed(4);
  }

  isEnabled() {
    return this.config.rules?.model_routing?.enabled ?? false;
  }

  summary() {
    const stats = this.getStats();
    const savings = this.estimateSavings();

    return {
      enabled: this.isEnabled(),
      total_tasks_routed: stats.total_routed,
      distribution: stats.by_tier,
      escalations: stats.escalations,
      delegations: stats.delegations,
      avg_complexity: stats.avg_complexity,
      avg_confidence: stats.avg_confidence,
      estimated_savings: `$${savings}`
    };
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const nexus = new Nexus(__dirname);

  if (args[0] === 'route' && args[1]) {
    const decision = nexus.route(args.slice(1).join(' '));
    console.log(JSON.stringify(decision, null, 2));
  } else if (args[0] === 'stats') {
    console.log(JSON.stringify(nexus.summary(), null, 2));
  } else if (args[0] === 'quick' && args[1]) {
    console.log(nexus.quickRoute(args.slice(1).join(' ')));
  } else {
    console.log('NEXUS Model Routing System');
    console.log('');
    console.log('Usage:');
    console.log('  node index.js route "task description"  - Route a task');
    console.log('  node index.js quick "task description"  - Quick route (tier only)');
    console.log('  node index.js stats                     - Show statistics');
  }
}

module.exports = { Nexus, NexusRouter, routeTask };
