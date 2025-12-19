import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import {
  Activity,
  Clock,
  Download,
  AlertTriangle,
  CheckCircle,
  Zap,
  HardDrive,
  Wifi,
  TrendingUp,
  Brain // Using Brain instead of Memory
} from 'lucide-react';
import performanceMonitor from '../lib/performance-monitor';

const PerformanceDashboard = ({ isOpen, onClose }) => {
  const [metrics, setMetrics] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [refreshInterval, setRefreshInterval] = useState(null);

  useEffect(() => {
    if (isOpen) {
      updateMetrics();
      // Refresh every 5 seconds while open
      const interval = setInterval(updateMetrics, 5000);
      setRefreshInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }

    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [isOpen]);

  const updateMetrics = () => {
    const report = performanceMonitor.getPerformanceReport();
    const recs = performanceMonitor.getRecommendations();
    setMetrics(report);
    setRecommendations(recs);
  };

  const formatTime = (ms) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1048576).toFixed(1)}MB`;
  };

  const getPerformanceScore = () => {
    if (!metrics) return 0;

    let score = 100;

    // Deduct points for slow performance
    if (metrics.loadTime > 3000) score -= 20;
    if (metrics.llmInitTime > 10000) score -= 15;
    if (metrics.avgMessageLatency > 5000) score -= 15;
    if (metrics.memoryUsage.used > metrics.memoryUsage.limit * 0.8) score -= 25;
    if (metrics.errorCount > 0) score -= metrics.errorCount * 5;

    return Math.max(0, score);
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!metrics) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Performance Dashboard
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const score = getPerformanceScore();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Dashboard
            <Badge className={`ml-auto ${getScoreColor(score)}`}>
              Score: {score}/100
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Load Time</span>
              </div>
              <div className="text-2xl font-bold">{formatTime(metrics.loadTime)}</div>
              <div className="text-xs text-muted-foreground">Page load complete</div>
            </div>

            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">LLM Init</span>
              </div>
              <div className="text-2xl font-bold">{formatTime(metrics.llmInitTime)}</div>
              <div className="text-xs text-muted-foreground">Model initialization</div>
            </div>

            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Avg Latency</span>
              </div>
              <div className="text-2xl font-bold">{formatTime(metrics.avgMessageLatency)}</div>
              <div className="text-xs text-muted-foreground">Message processing</div>
            </div>

            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Memory</span>
              </div>
              <div className="text-2xl font-bold">{metrics.memoryUsage.used}MB</div>
              <div className="text-xs text-muted-foreground">
                {metrics.memoryUsage.total}MB total
              </div>
            </div>
          </div>

          {/* Bundle Size Analysis */}
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Bundle Size Analysis
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-medium">Main Bundle</div>
                <div className="text-muted-foreground">{metrics.bundleSize.main}</div>
                <div className="text-xs text-muted-foreground">({metrics.bundleSize.mainGzip} gzipped)</div>
              </div>
              <div>
                <div className="font-medium">React DOM</div>
                <div className="text-muted-foreground">{metrics.bundleSize.reactDom}</div>
                <div className="text-xs text-muted-foreground">({metrics.bundleSize.reactDomGzip} gzipped)</div>
              </div>
              <div>
                <div className="font-medium">Vendor</div>
                <div className="text-muted-foreground">{metrics.bundleSize.vendor}</div>
                <div className="text-xs text-muted-foreground">({metrics.bundleSize.vendorGzip} gzipped)</div>
              </div>
              <div>
                <div className="font-medium">Total</div>
                <div className="text-muted-foreground font-semibold">{metrics.bundleSize.total}</div>
                <div className="text-xs text-muted-foreground">({metrics.bundleSize.totalGzip} gzipped)</div>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="bg-card border rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Performance Recommendations
              </h3>
              <div className="space-y-3">
                {recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${getSeverityColor(rec.severity)}`}
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-medium">{rec.message}</div>
                        <div className="text-xs mt-1">
                          {rec.metric}: {formatTime(rec.value)}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {rec.severity}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Network Activity */}
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              Network Activity
            </h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="font-medium">Total Requests</div>
                <div className="text-2xl font-bold">{metrics.networkRequests}</div>
              </div>
              <div>
                <div className="font-medium">Error Count</div>
                <div className="text-2xl font-bold">{metrics.errorCount}</div>
              </div>
              <div>
                <div className="font-medium">Memory Leaks</div>
                <div className={`text-2xl font-bold ${metrics.memoryLeakCount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {metrics.memoryLeakCount || 0}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={() => performanceMonitor.exportMetrics()}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export Metrics
            </Button>
            <Button
              variant="outline"
              onClick={updateMetrics}
              className="flex items-center gap-2"
            >
              <Activity className="h-4 w-4" />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                performanceMonitor.forceGarbageCollection();
                setTimeout(updateMetrics, 1500);
              }}
              className="flex items-center gap-2"
            >
              <Brain className="h-4 w-4" />
              Force GC
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PerformanceDashboard;