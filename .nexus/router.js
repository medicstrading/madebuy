/**
 * NEXUS Model Router
 *
 * Intelligent routing of tasks to appropriate model tiers based on
 * complexity analysis, domain detection, and historical patterns.
 */

const fs = require('fs');
const path = require('path');

class NexusRouter {
  constructor(nexusPath = '.nexus') {
    this.nexusPath = nexusPath;
    this.models = this.loadConfig('models.json');
    this.classifier = this.loadConfig('task-classifier.json');
    this.memory = this.loadConfig('memory.json');
  }

  loadConfig(filename) {
    const filePath = path.join(this.nexusPath, filename);
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
      console.error(`Failed to load ${filename}:`, error.message);
      return null;
    }
  }

  saveMemory() {
    const filePath = path.join(this.nexusPath, 'memory.json');
    fs.writeFileSync(filePath, JSON.stringify(this.memory, null, 2));
  }

  route(task) {
    const classification = this.classifyTask(task);
    const selectedTier = this.selectTier(classification, task);
    const model = this.models.tiers[selectedTier];

    const decision = {
      task_description: task.description,
      classification,
      selected_tier: selectedTier,
      model_id: model.model_id,
      timestamp: new Date().toISOString(),
      reasoning: this.generateReasoning(classification, selectedTier)
    };

    this.logDecision(decision);
    return decision;
  }

  classifyTask(task) {
    const signals = this.extractSignals(task);
    const domains = this.detectDomains(task);
    const patternMatch = this.matchPatterns(task);

    let complexityScore = this.calculateBaseScore(signals, patternMatch);
    const domainWeight = this.calculateDomainWeight(domains);
    complexityScore = Math.min(5, complexityScore + domainWeight);

    const forcedTier = this.checkForcedTier(domains);
    const confidence = this.calculateConfidence(signals, domains, patternMatch);

    return {
      complexity_score: complexityScore,
      complexity_level: this.scoreToLevel(complexityScore),
      signals,
      domains,
      pattern_match: patternMatch,
      forced_tier: forcedTier,
      confidence
    };
  }

  extractSignals(task) {
    const desc = (task.description || '').toLowerCase();
    const files = task.files || [];

    return {
      file_count: files.length,
      single_file: files.length <= 1,
      multi_file_small: files.length >= 2 && files.length <= 5,
      multi_file_large: files.length > 5,
      is_formatting: /format|lint|style|prettier|eslint/i.test(desc),
      is_documentation: /doc|readme|comment|jsdoc/i.test(desc),
      is_typo_fix: /typo|spelling|rename/i.test(desc),
      is_config: /config|env|setting/i.test(desc),
      is_security: /auth|security|encrypt|password|token|permission/i.test(desc),
      is_architecture: /architect|design|system|infrastructure|scale/i.test(desc),
      is_migration: /migrate|migration|upgrade/i.test(desc),
      is_performance: /performance|optimize|speed|cache/i.test(desc),
      is_refactor: /refactor|restructure|reorganize/i.test(desc),
      is_new_feature: /add|create|implement|build|new/i.test(desc),
      is_bug_fix: /fix|bug|issue|error|broken/i.test(desc),
      is_test: /test|spec|coverage/i.test(desc)
    };
  }

  detectDomains(task) {
    const desc = (task.description || '').toLowerCase();
    const detected = [];

    for (const [domain, config] of Object.entries(this.classifier.domain_weights)) {
      const keywords = config.keywords || [];
      const matches = keywords.filter(kw => desc.includes(kw.toLowerCase()));

      if (matches.length > 0) {
        detected.push({
          domain,
          matches,
          weight: config.base_complexity,
          forced_tier: config.force_minimum_tier
        });
      }
    }

    return detected;
  }

  matchPatterns(task) {
    const desc = (task.description || '').toLowerCase();
    const matches = { low: [], medium: [], high: [] };

    for (const [level, config] of Object.entries(this.classifier.complexity_signals)) {
      for (const pattern of config.patterns || []) {
        if (desc.includes(pattern.toLowerCase())) {
          matches[level].push(pattern);
        }
      }
    }

    if (matches.high.length > 0) return { level: 'high', patterns: matches.high };
    if (matches.medium.length > 0) return { level: 'medium', patterns: matches.medium };
    if (matches.low.length > 0) return { level: 'low', patterns: matches.low };

    return { level: 'unknown', patterns: [] };
  }

  calculateBaseScore(signals, patternMatch) {
    let score = 2;

    if (patternMatch.level === 'high') score = 5;
    else if (patternMatch.level === 'medium') score = 3;
    else if (patternMatch.level === 'low') score = 1;

    if (signals.is_formatting || signals.is_typo_fix) score = Math.min(score, 1);
    if (signals.is_documentation && !signals.is_new_feature) score = Math.min(score, 1);
    if (signals.is_config && signals.single_file) score = Math.min(score, 1);

    if (signals.is_security) score = Math.max(score, 4);
    if (signals.is_architecture) score = Math.max(score, 5);
    if (signals.is_migration) score = Math.max(score, 4);
    if (signals.is_performance) score = Math.max(score, 4);

    if (signals.multi_file_large) score = Math.max(score, 3);
    if (signals.multi_file_small && signals.is_refactor) score = Math.max(score, 3);

    return Math.max(1, Math.min(5, score));
  }

  calculateDomainWeight(domains) {
    if (domains.length === 0) return 0;
    const maxWeight = Math.max(...domains.map(d => d.weight));
    const multiDomainBonus = domains.length > 1 ? 0.5 : 0;
    return Math.min(2, (maxWeight - 2) + multiDomainBonus);
  }

  checkForcedTier(domains) {
    const tierPriority = { haiku: 0, sonnet: 1, opus: 2 };
    let forcedTier = null;
    let maxPriority = -1;

    for (const domain of domains) {
      if (domain.forced_tier) {
        const priority = tierPriority[domain.forced_tier] || 0;
        if (priority > maxPriority) {
          maxPriority = priority;
          forcedTier = domain.forced_tier;
        }
      }
    }

    return forcedTier;
  }

  calculateConfidence(signals, domains, patternMatch) {
    let confidence = 0.5;

    if (patternMatch.level !== 'unknown') {
      confidence += 0.2;
      confidence += Math.min(0.1, patternMatch.patterns.length * 0.03);
    }

    if (domains.length > 0) confidence += 0.15;

    const strongSignals = [
      signals.is_security,
      signals.is_architecture,
      signals.is_formatting,
      signals.is_documentation,
      signals.is_typo_fix
    ].filter(Boolean).length;

    confidence += strongSignals * 0.05;

    return Math.min(1, confidence);
  }

  scoreToLevel(score) {
    if (score <= 2) return 'low';
    if (score <= 4) return 'medium';
    return 'high';
  }

  selectTier(classification, task) {
    if (task.override_tier && this.models.tiers[task.override_tier]) {
      return task.override_tier;
    }

    if (classification.forced_tier) {
      return classification.forced_tier;
    }

    if (this.shouldEscalate(classification)) {
      return 'opus';
    }

    if (this.shouldDelegate(classification)) {
      return 'haiku';
    }

    const score = classification.complexity_score;

    if (score <= this.models.tiers.haiku.max_complexity) return 'haiku';
    if (score <= this.models.tiers.sonnet.max_complexity) return 'sonnet';
    return 'opus';
  }

  shouldEscalate(classification) {
    if (!this.models.escalation_policy?.enabled) return false;

    const triggers = this.models.escalation_policy.auto_escalate_on || [];
    const signals = classification.signals;

    if (triggers.includes('security_sensitive') && signals.is_security) return true;
    if (triggers.includes('architectural_decision') && signals.is_architecture) return true;
    if (triggers.includes('confidence_below_threshold')) {
      const threshold = this.models.escalation_policy.confidence_threshold || 0.7;
      if (classification.confidence < threshold && classification.complexity_score >= 3) {
        return true;
      }
    }

    return false;
  }

  shouldDelegate(classification) {
    if (!this.models.delegation_policy?.enabled) return false;

    const triggers = this.models.delegation_policy.auto_delegate_on || [];
    const signals = classification.signals;

    if (triggers.includes('formatting_only') && signals.is_formatting && !signals.is_refactor) {
      return true;
    }
    if (triggers.includes('documentation_only') && signals.is_documentation && signals.single_file) {
      return true;
    }
    if (triggers.includes('config_change') && signals.is_config && signals.single_file) {
      return true;
    }

    return false;
  }

  generateReasoning(classification, selectedTier) {
    const reasons = [];

    reasons.push(`Complexity score: ${classification.complexity_score}/5 (${classification.complexity_level})`);

    if (classification.forced_tier) {
      reasons.push(`Domain requires minimum tier: ${classification.forced_tier}`);
    }

    if (classification.domains.length > 0) {
      const domainNames = classification.domains.map(d => d.domain).join(', ');
      reasons.push(`Detected domains: ${domainNames}`);
    }

    if (classification.pattern_match.level !== 'unknown') {
      reasons.push(`Pattern match: ${classification.pattern_match.patterns.join(', ')}`);
    }

    reasons.push(`Confidence: ${(classification.confidence * 100).toFixed(0)}%`);
    reasons.push(`Selected tier: ${selectedTier}`);

    return reasons;
  }

  logDecision(decision) {
    if (!this.memory) return;

    if (!this.memory.routing_decisions) {
      this.memory.routing_decisions = [];
    }

    this.memory.routing_decisions.push({
      timestamp: decision.timestamp,
      task: decision.task_description.substring(0, 100),
      tier: decision.selected_tier,
      complexity: decision.classification.complexity_score,
      confidence: decision.classification.confidence
    });

    if (this.memory.routing_decisions.length > 100) {
      this.memory.routing_decisions = this.memory.routing_decisions.slice(-100);
    }

    this.saveMemory();
  }

  getStats() {
    const decisions = this.memory?.routing_decisions || [];

    const stats = {
      total_decisions: decisions.length,
      by_tier: { haiku: 0, sonnet: 0, opus: 0 },
      avg_complexity: 0,
      avg_confidence: 0
    };

    if (decisions.length === 0) return stats;

    let totalComplexity = 0;
    let totalConfidence = 0;

    for (const d of decisions) {
      stats.by_tier[d.tier] = (stats.by_tier[d.tier] || 0) + 1;
      totalComplexity += d.complexity;
      totalConfidence += d.confidence;
    }

    stats.avg_complexity = (totalComplexity / decisions.length).toFixed(2);
    stats.avg_confidence = (totalConfidence / decisions.length).toFixed(2);

    return stats;
  }
}

function routeTask(description, options = {}) {
  const router = new NexusRouter(options.nexusPath);
  return router.route({
    description,
    files: options.files || [],
    override_tier: options.override_tier
  });
}

module.exports = { NexusRouter, routeTask };
