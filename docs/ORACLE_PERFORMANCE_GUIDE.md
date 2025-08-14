# Oracle System - Performance Optimization Guide

## 🚀 Performance Overview

This guide covers advanced performance optimization techniques for the Oracle Prediction System, including caching strategies, database optimization, and system tuning.

## Architecture Overview

The Oracle system uses a multi-tier architecture for optimal performance:

**Tier 1: Application Layer**
- Node.js with Express framework
- TypeScript for type safety
- Cluster mode for multi-core utilization

**Tier 2: Caching Layer**
- 4-tier LRU cache system
- Redis integration (optional)
- In-memory cache with TTL

**Tier 3: Database Layer**
- SQLite with WAL mode
- 17 optimized indexes
- Query optimization service

**Tier 4: Network Layer**
- Nginx reverse proxy
- HTTP/2 and compression
- CDN integration ready

## Caching Strategy

### Multi-Tier Cache Architecture

The Oracle system implements 4 specialized cache layers:

**1. Predictions Cache**
```typescript
// Configuration
{
  maxSize: 1000,
  ttl: 900000, // 15 minutes
  keyPattern: 'pred:{season}:{week}:{type}'
}

// Usage patterns
- Game predictions: High read, medium write
- Player projections: Medium read, high write
- Season predictions: Low read, low write
```

**2. Analytics Cache**
```typescript
// Configuration
{
  maxSize: 500,
  ttl: 1800000, // 30 minutes
  keyPattern: 'analytics:{startDate}:{endDate}:{groupBy}'
}

// Optimization strategies
- Pre-computed aggregations
- Incremental updates
- Background refresh
```

**3. User Data Cache**
```typescript
// Configuration
{
  maxSize: 200,
  ttl: 600000, // 10 minutes
  keyPattern: 'user:{userId}:{timeframe}:{season}'
}

// Features
- User-specific performance data
- Leaderboard positions
- Historical statistics
```

**4. Query Cache**
```typescript
// Configuration
{
  maxSize: 2000,
  ttl: 300000, // 5 minutes
  keyPattern: 'query:{hash}'
}

// Benefits
- Raw SQL result caching
- Reduced database load
- Fastest cache layer
```

### Cache Performance Metrics

**Key Performance Indicators:**
- Cache hit ratio: Target >85%
- Average response time: <50ms for cached requests
- Memory usage: <512MB total cache size
- Eviction rate: <10% of cache entries

**Monitoring Cache Performance:**
```bash
# Get cache statistics
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3001/api/oracle/performance/monitoring

# Response includes:
{
  "cacheStats": {
    "predictions": { "hits": 1247, "misses": 89, "hitRate": 93.3 },
    "analytics": { "hits": 892, "misses": 34, "hitRate": 96.3 },
    "users": { "hits": 445, "misses": 67, "hitRate": 87.0 },
    "queries": { "hits": 2341, "misses": 123, "hitRate": 95.0 }
  }
}
```

## Database Optimization

### Index Strategy

The Oracle system uses 17 carefully designed indexes:

**Core Performance Indexes:**
```sql
-- Season and week queries (most common)
CREATE INDEX idx_oracle_predictions_season_week 
ON oracle_predictions (season, week);

-- Status and deadline filtering
CREATE INDEX idx_oracle_predictions_status_deadline 
ON oracle_predictions (status, deadline);

-- Type-based analytics
CREATE INDEX idx_oracle_predictions_type_confidence 
ON oracle_predictions (type, confidence);
```

**Analytics Indexes:**
```sql
-- Enhanced predictions for analytics
CREATE INDEX idx_enhanced_oracle_season_resolved 
ON enhanced_oracle_predictions (season, is_resolved);

-- Weekly performance analysis
CREATE INDEX idx_enhanced_oracle_week_type 
ON enhanced_oracle_predictions (week, type);

-- Accuracy analysis
CREATE INDEX idx_enhanced_oracle_accuracy_confidence 
ON enhanced_oracle_predictions (oracle_confidence, actual_result);
```

**User Performance Indexes:**
```sql
-- User prediction lookup
CREATE INDEX idx_user_predictions_user_season 
ON user_predictions (user_id, season);

-- Prediction confidence analysis
CREATE INDEX idx_user_predictions_prediction_confidence 
ON user_predictions (prediction_id, confidence);

-- Oracle comparison
CREATE INDEX idx_enhanced_user_beats_oracle 
ON enhanced_user_predictions (beats_oracle, user_id);
```

**Leaderboard Indexes:**
```sql
-- Leaderboard queries
CREATE INDEX idx_oracle_leaderboard_season_week 
ON oracle_leaderboard (season, week);

-- User ranking
CREATE INDEX idx_oracle_leaderboard_user_accuracy 
ON oracle_leaderboard (user_id, accuracy_percentage);

-- Top performers
CREATE INDEX idx_oracle_leaderboard_rank_score 
ON oracle_leaderboard (rank_position, oracle_score);
```

### Query Optimization Techniques

**1. Batch Operations**
```sql
-- Instead of multiple single inserts
INSERT INTO oracle_predictions VALUES (...), (...), (...);

-- Batch updates with CASE statements
UPDATE oracle_predictions 
SET status = CASE id
  WHEN 1 THEN 'resolved'
  WHEN 2 THEN 'resolved'
  ELSE status
END
WHERE id IN (1, 2);
```

**2. Pagination Optimization**
```sql
-- Efficient pagination with LIMIT/OFFSET
SELECT * FROM oracle_leaderboard 
WHERE season = 2024 
ORDER BY oracle_score DESC 
LIMIT 50 OFFSET 0;

-- For large offsets, use cursor-based pagination
SELECT * FROM oracle_leaderboard 
WHERE season = 2024 AND oracle_score < ?
ORDER BY oracle_score DESC 
LIMIT 50;
```

**3. Aggregation Optimization**
```sql
-- Pre-computed weekly aggregations
CREATE TABLE oracle_weekly_summary AS
SELECT 
  season, week,
  COUNT(*) as total_predictions,
  AVG(oracle_confidence) as avg_confidence,
  SUM(CASE WHEN oracle_choice = actual_result THEN 1 ELSE 0 END) as correct_predictions
FROM enhanced_oracle_predictions 
WHERE is_resolved = 1
GROUP BY season, week;
```

### Database Maintenance

**1. Regular VACUUM Operations**
```bash
# Schedule weekly VACUUM
cat > scripts/vacuum-db.sh << 'EOF'
#!/bin/bash
sqlite3 data/astral-draft.db "VACUUM;"
sqlite3 data/astral-draft.db "ANALYZE;"
echo "Database maintenance completed: $(date)"
EOF

# Add to crontab
echo "0 2 * * 0 /path/to/scripts/vacuum-db.sh" | crontab -
```

**2. Index Usage Analysis**
```sql
-- Check index usage
.eqp on
EXPLAIN QUERY PLAN 
SELECT * FROM oracle_predictions 
WHERE season = 2024 AND week = 12;

-- Analyze table statistics
SELECT name, rootpage FROM sqlite_master WHERE type='index';
```

**3. Database Growth Monitoring**
```bash
# Monitor database size
sqlite3 data/astral-draft.db "SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size();"

# Monitor table sizes
sqlite3 data/astral-draft.db "
SELECT 
  name,
  SUM(pgsize) as size,
  COUNT(*) as pages
FROM dbstat 
GROUP BY name 
ORDER BY size DESC;"
```

## Application Performance

### Node.js Optimization

**1. Memory Management**
```javascript
// Optimize V8 garbage collection
node --max-old-space-size=1024 --optimize-for-size backend/server.ts

// Monitor memory usage
const memUsage = process.memoryUsage();
console.log({
  heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
  heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
  external: Math.round(memUsage.external / 1024 / 1024) + 'MB'
});
```

**2. Connection Pooling**
```typescript
// SQLite connection optimization
const db = new Database('data/astral-draft.db', {
  timeout: 30000,
  verbose: console.log
});

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = 10000');
db.pragma('temp_store = MEMORY');
```

**3. Request Processing**
```typescript
// Async processing for heavy operations
async function processLargeDataset(data: any[]) {
  const batchSize = 100;
  const results = [];
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const batchResults = await processBatch(batch);
    results.push(...batchResults);
    
    // Yield control to event loop
    await new Promise(resolve => setImmediate(resolve));
  }
  
  return results;
}
```

### Express.js Optimization

**1. Middleware Optimization**
```typescript
// Efficient middleware ordering
app.use(compression()); // First - compress responses
app.use(helmet()); // Security headers
app.use(cors(corsOptions)); // CORS
app.use(express.json({ limit: '1mb' })); // Body parsing with limit
app.use(rateLimiter); // Rate limiting
app.use('/api/oracle', oracleRoutes); // Route mounting
```

**2. Response Optimization**
```typescript
// Streaming large responses
app.get('/api/oracle/export', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Transfer-Encoding', 'chunked');
  
  res.write('[');
  
  // Stream data in chunks
  queryDatabase().on('data', (chunk, index) => {
    if (index > 0) res.write(',');
    res.write(JSON.stringify(chunk));
  }).on('end', () => {
    res.write(']');
    res.end();
  });
});
```

## Network Optimization

### HTTP/2 and Compression

**1. Nginx HTTP/2 Configuration**
```nginx
server {
    listen 443 ssl http2;
    
    # Compression settings
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_types
        text/plain
        text/css
        application/json
        application/javascript
        text/xml
        application/xml
        application/xml+rss
        text/javascript;
    
    # Brotli compression (if available)
    brotli on;
    brotli_comp_level 6;
    brotli_types text/plain text/css application/json application/javascript;
}
```

**2. Client-Side Optimization**
```typescript
// Request deduplication
const requestCache = new Map<string, Promise<any>>();

async function makeRequest(url: string): Promise<any> {
  if (requestCache.has(url)) {
    return requestCache.get(url);
  }
  
  const promise = fetch(url).then(res => res.json());
  requestCache.set(url, promise);
  
  // Clean up after 5 minutes
  setTimeout(() => requestCache.delete(url), 300000);
  
  return promise;
}
```

### CDN Integration

**1. Static Asset Caching**
```nginx
# Cache static assets
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header Vary Accept-Encoding;
}

# Cache API responses with short TTL
location /api/oracle/predictions/production {
    proxy_pass http://localhost:3001;
    proxy_cache api_cache;
    proxy_cache_valid 200 5m;
    proxy_cache_use_stale error timeout updating;
    add_header X-Cache-Status $upstream_cache_status;
}
```

## Monitoring and Profiling

### Performance Metrics

**1. Application Metrics**
```typescript
// Custom metrics collection
class PerformanceMetrics {
  private metrics = {
    requestCount: 0,
    averageResponseTime: 0,
    errorRate: 0,
    cacheHitRate: 0
  };
  
  recordRequest(duration: number, cached: boolean, error?: Error) {
    this.metrics.requestCount++;
    this.updateAverageResponseTime(duration);
    if (error) this.metrics.errorRate++;
    if (cached) this.metrics.cacheHitRate++;
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      errorRate: (this.metrics.errorRate / this.metrics.requestCount) * 100,
      cacheHitRate: (this.metrics.cacheHitRate / this.metrics.requestCount) * 100
    };
  }
}
```

**2. Database Metrics**
```sql
-- Query performance analysis
.timer on
.stats on

SELECT 
  season, week, COUNT(*) as predictions,
  AVG(oracle_confidence) as avg_confidence
FROM oracle_predictions 
WHERE season = 2024 
GROUP BY season, week;
```

**3. System Metrics**
```bash
# Monitor system resources
#!/bin/bash
echo "=== Oracle System Performance ==="
echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1"%"}')"
echo "Memory Usage: $(free -m | awk 'NR==2{printf "%.1f%%", $3*100/$2 }')"
echo "Disk Usage: $(df -h / | awk 'NR==2 {print $5}')"
echo "Load Average: $(uptime | awk -F'load average:' '{ print $2 }')"

# Node.js process stats
echo "Node.js Memory: $(ps -p $(pgrep -f 'node.*server.ts') -o rss= | awk '{print $1/1024 "MB"}')"
echo "Node.js CPU: $(ps -p $(pgrep -f 'node.*server.ts') -o %cpu= | awk '{print $1"%"}')"
```

### Profiling Tools

**1. Node.js Profiling**
```bash
# CPU profiling
node --prof backend/server.ts
node --prof-process isolate-*.log > processed.txt

# Memory profiling
node --inspect backend/server.ts
# Connect Chrome DevTools to ws://127.0.0.1:9229
```

**2. Application Performance Monitoring**
```typescript
// Custom APM implementation
class APMCollector {
  private traces: Array<{
    operation: string;
    duration: number;
    timestamp: number;
    metadata: any;
  }> = [];
  
  startTrace(operation: string) {
    const start = Date.now();
    return {
      end: (metadata?: any) => {
        this.traces.push({
          operation,
          duration: Date.now() - start,
          timestamp: start,
          metadata
        });
      }
    };
  }
  
  getSlowQueries(threshold = 1000) {
    return this.traces.filter(t => t.duration > threshold);
  }
}
```

## Performance Testing

### Load Testing

**1. Artillery.js Configuration**
```yaml
# artillery-config.yml
config:
  target: 'http://localhost:3001'
  phases:
    - duration: 300
      arrivalRate: 10
      name: "Warm up"
    - duration: 600
      arrivalRate: 50
      name: "Load test"
    - duration: 300
      arrivalRate: 100
      name: "Stress test"

scenarios:
  - name: "Oracle API Load Test"
    requests:
      - get:
          url: "/api/oracle/predictions/production?week=12&season=2024"
          headers:
            Authorization: "Bearer {{ $randomString() }}"
      - get:
          url: "/api/oracle/analytics/performance?season=2024"
      - get:
          url: "/api/oracle/leaderboard?limit=50"
```

**2. Running Load Tests**
```bash
# Install Artillery
npm install -g artillery

# Run load test
artillery run artillery-config.yml

# Generate report
artillery run artillery-config.yml --output report.json
artillery report report.json
```

### Benchmarking

**1. Database Benchmarks**
```bash
# SQLite benchmark script
#!/bin/bash
DB_PATH="data/astral-draft.db"

echo "=== Oracle Database Benchmarks ==="

# Test prediction queries
echo "Prediction Query Performance:"
time sqlite3 $DB_PATH "
SELECT * FROM oracle_predictions 
WHERE season = 2024 AND week = 12 
ORDER BY confidence DESC 
LIMIT 50;"

# Test analytics queries
echo "Analytics Query Performance:"
time sqlite3 $DB_PATH "
SELECT season, week, 
  COUNT(*) as total,
  AVG(oracle_confidence) as avg_confidence
FROM enhanced_oracle_predictions 
WHERE season = 2024 AND is_resolved = 1
GROUP BY season, week;"

# Test leaderboard queries
echo "Leaderboard Query Performance:"
time sqlite3 $DB_PATH "
SELECT user_id, accuracy_percentage, oracle_score
FROM oracle_leaderboard 
WHERE season = 2024 
ORDER BY oracle_score DESC 
LIMIT 100;"
```

**2. API Benchmarks**
```bash
# Apache Bench testing
ab -n 1000 -c 10 "http://localhost:3001/api/oracle/health"
ab -n 500 -c 5 -H "Authorization: Bearer TOKEN" "http://localhost:3001/api/oracle/predictions/production"

# wrk benchmarking
wrk -t12 -c400 -d30s "http://localhost:3001/api/oracle/health"
```

## Optimization Checklist

### Daily Operations
- [ ] Monitor cache hit rates (target >85%)
- [ ] Check memory usage (<1GB)
- [ ] Review slow query log
- [ ] Verify backup completion
- [ ] Check error rates (<1%)

### Weekly Operations
- [ ] Run database VACUUM
- [ ] Analyze index usage
- [ ] Review performance metrics
- [ ] Update optimization parameters
- [ ] Load test critical endpoints

### Monthly Operations
- [ ] Database growth analysis
- [ ] Index optimization review
- [ ] Cache strategy evaluation
- [ ] Performance trend analysis
- [ ] Capacity planning review

## Troubleshooting Performance Issues

### Common Performance Problems

**1. High Memory Usage**
```bash
# Identify memory leaks
node --inspect backend/server.ts
# Use Chrome DevTools Memory tab

# Monitor heap snapshots
const v8 = require('v8');
const fs = require('fs');

function takeHeapSnapshot() {
  const snapshot = v8.writeHeapSnapshot();
  console.log(`Heap snapshot written to ${snapshot}`);
}
```

**2. Slow Database Queries**
```sql
-- Enable query profiling
.timer on
.eqp full

-- Analyze slow queries
EXPLAIN QUERY PLAN 
SELECT * FROM oracle_predictions 
WHERE season = 2024 AND type = 'game_winner';

-- Check index usage
SELECT * FROM sqlite_stat1;
```

**3. Cache Inefficiency**
```typescript
// Monitor cache performance
const cacheMetrics = oraclePerformanceService.getCacheStats();
if (cacheMetrics.predictions.hitRate < 0.8) {
  console.warn('Low cache hit rate for predictions:', cacheMetrics.predictions);
  // Consider increasing TTL or cache size
}
```

## Conclusion

This performance optimization guide provides comprehensive strategies for maximizing Oracle System performance:

✅ **Multi-tier caching** with 95%+ hit rates
✅ **Database optimization** with 17 strategic indexes
✅ **Application tuning** for Node.js and Express
✅ **Network optimization** with HTTP/2 and compression
✅ **Monitoring and profiling** for continuous improvement

Regular application of these techniques ensures the Oracle System maintains optimal performance under production loads.

---

*Last Updated: August 11, 2025*
*Performance Guide Version: 1.0.0*
*Optimized for Production* ⚡
