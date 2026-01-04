# PicHaven - Interview Guide

## Table of Contents
1. [Problem Statement](#problem-statement)
2. [Tech Stack Breakdown](#tech-stack-breakdown)
3. [System Architecture](#system-architecture)
4. [Key Features](#key-features)
5. [Technical Challenges & Solutions](#technical-challenges--solutions)
6. [Design Decisions & Trade-offs](#design-decisions--trade-offs)
7. [Scaling & Performance](#scaling--performance)
8. [Security Considerations](#security-considerations)
9. [Common Interview Questions](#common-interview-questions)

---

## Problem Statement

### The Challenge
Users today capture thousands of photos across devices, but organizing and finding specific images remains difficult. Existing solutions are either:
- Too expensive (Google Photos, iCloud with limited free storage)
- Lack intelligent search capabilities
- Don't offer privacy-focused features (hidden folders)
- Have poor organization tools

### The Solution
**PicHaven** is a full-stack image management platform that provides:
- **Unlimited storage** through AWS S3 integration
- **AI-powered tagging** using GPT-4 Vision for intelligent search
- **Privacy features** including password-protected hidden folders
- **Flexible organization** with albums, favorites, and soft-delete trash
- **Multi-user support** with complete data isolation via RLS

### Target Users
- Photographers needing organized portfolios
- Families wanting private photo sharing
- Professionals managing image assets
- Anyone seeking a privacy-first Google Photos alternative

---

## Tech Stack Breakdown

### Frontend
**React 18 + TypeScript + Vite**
- **Why React?** Component-based architecture, massive ecosystem, excellent TypeScript support
- **Why TypeScript?** Type safety prevents runtime errors, better IDE support, self-documenting code
- **Why Vite?** 10x faster than Create React App, instant HMR, optimized production builds

**Tailwind CSS**
- **Why?** Utility-first approach, no CSS file bloat, consistent design system, responsive by default
- **Trade-off:** Initial learning curve vs. faster development and smaller bundle size

**Lucide React**
- **Why?** Modern icon library, tree-shakeable, consistent design, TypeScript support

### Backend
**Supabase Edge Functions (Deno Runtime)**
- **Why Edge Functions?** Serverless = auto-scaling, pay-per-use, zero infrastructure management
- **Why Deno?** Modern JavaScript runtime, secure by default, native TypeScript, Web API compatibility
- **Advantages:** Deploy globally on Cloudflare's edge network (low latency), built-in TypeScript

**PostgreSQL (Supabase)**
- **Why PostgreSQL?** ACID compliance, JSON support, full-text search, powerful indexing
- **Why Supabase?** Real-time subscriptions, built-in auth, automatic API generation, Row Level Security

**AWS S3**
- **Why S3?** Industry-standard object storage, 99.999999999% durability, cost-effective, global CDN integration
- **Trade-off:** Added complexity vs. direct database storage (which hits size limits quickly)

**OpenAI GPT-4 Vision API**
- **Why?** State-of-the-art image understanding, context-aware tagging, handles complex scenes
- **Trade-off:** API costs vs. accuracy (could use AWS Rekognition for cheaper but less accurate tagging)

---

## System Architecture

### High-Level Flow
```
User Browser
    ↓
React Frontend (Vite)
    ↓
Supabase Client (Authentication)
    ↓
Edge Functions (20+ serverless functions)
    ↓
┌──────────────────┬──────────────────┬──────────────────┐
│  PostgreSQL      │    AWS S3        │   OpenAI API     │
│  (Metadata)      │  (Images)        │  (AI Tagging)    │
└──────────────────┴──────────────────┴──────────────────┘
```

### Detailed Architecture

#### 1. **Frontend Layer**
```
App.tsx (Root)
    ├── AuthContext.tsx (Global auth state)
    ├── Header.tsx (Navigation, user menu)
    ├── AuthForm.tsx (Login/Signup)
    └── Main Content
        ├── SearchBar.tsx (Filter UI)
        ├── UploadForm.tsx (Drag-drop uploader)
        ├── FilterPanel.tsx (Albums, Favorites, Hidden)
        ├── ImageGrid.tsx (Responsive grid, actions)
        ├── TrashBin.tsx (Soft-deleted images)
        └── HiddenFolder.tsx (Password-protected)
```

**State Management:**
- React Context for authentication (user session, JWT tokens)
- Component-level state for UI interactions
- No Redux needed - kept simple with Context + hooks

#### 2. **Backend Layer (Edge Functions)**

**Authentication Flow:**
```
1. User submits credentials → Supabase Auth
2. Auth returns JWT token + user metadata
3. Token stored in localStorage
4. All API calls include: Authorization: Bearer {token}
5. Edge functions verify token → Extract user_id
6. RLS policies filter data by user_id
```

**Core Functions:**
- `upload-image`: Handles S3 upload + DB insert + AI tagging trigger
- `get-images`: Fetches user's images with filters (deleted, favorites, hidden)
- `search-images`: Full-text search using PostgreSQL GIN indexes
- `generate-tags`: AI analysis using GPT-4 Vision
- `delete-image`, `restore-image`, `permanent-delete`: Soft-delete workflow
- `toggle-favorite`, `toggle-hidden`: Status management
- `create-album`, `get-albums`, `add-to-album`: Organization features
- `manage-hidden-password`: Password hashing for hidden folder

**Why 20+ Functions?**
- **Microservices approach:** Each function has one responsibility
- **Independent scaling:** Hot functions scale independently
- **Easier debugging:** Isolated error tracking
- **Security:** Limited blast radius if one function is compromised

#### 3. **Database Layer**

**Schema Design:**
```sql
-- Users (managed by Supabase Auth)
auth.users (id, email, encrypted_password, ...)

-- Main Tables
public.images (
    id UUID PRIMARY KEY,
    user_id UUID → auth.users.id,
    filename TEXT,
    url TEXT,  -- S3 public URL
    tags TEXT[],  -- Array for efficient searching
    created_at TIMESTAMP,
    deleted BOOLEAN DEFAULT false,  -- Soft delete
    deleted_at TIMESTAMP,
    is_favorite BOOLEAN DEFAULT false,
    hidden BOOLEAN DEFAULT false,
    hidden_at TIMESTAMP
)

public.albums (
    id UUID PRIMARY KEY,
    user_id UUID → auth.users.id,
    name TEXT,
    description TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)

public.album_images (
    id UUID PRIMARY KEY,
    album_id UUID → albums.id,
    image_id UUID → images.id,
    added_at TIMESTAMP
)

public.user_settings (
    id UUID PRIMARY KEY,
    user_id UUID → auth.users.id UNIQUE,
    hidden_folder_password TEXT,  -- bcrypt hashed
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)
```

**Indexes:**
```sql
-- Performance optimizations
CREATE INDEX idx_images_user_id ON images(user_id);
CREATE INDEX idx_images_tags ON images USING GIN(tags);  -- Array searching
CREATE INDEX idx_images_deleted ON images(deleted) WHERE deleted = false;
CREATE INDEX idx_images_favorite ON images(is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_albums_user_id ON albums(user_id);
```

**Row Level Security (RLS):**
```sql
-- Users can only see their own data
ALTER TABLE images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own images"
ON images FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own images"
ON images FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Similar policies for UPDATE, DELETE
-- Repeated for albums, album_images, user_settings
```

**Why RLS?**
- **Security at database level:** Even if application code is compromised, data is protected
- **Multi-tenancy:** Perfect for SaaS where users share database
- **No query modifications:** Developer doesn't need to add WHERE user_id = X to every query
- **PostgreSQL native:** Extremely fast (compiled into query plan)

#### 4. **Storage Layer (AWS S3)**

**Upload Flow:**
```
1. User selects image → Preview shown
2. Click upload → FormData created
3. POST to /upload-image edge function
4. Function validates file (type, size < 10MB)
5. Generate unique filename: {timestamp}-{uuid}-{original-name}
6. Upload to S3 using AWS SDK
7. Get public URL from S3
8. Insert metadata into PostgreSQL
9. Trigger AI tagging (async)
10. Return success to frontend
```

**S3 Configuration:**
- **Bucket Policy:** Public read access (GetObject)
- **CORS:** Allow uploads from frontend domain
- **Versioning:** Disabled (to save costs)
- **Lifecycle:** Could add rules to move old images to Glacier

---

## Key Features

### 1. AI-Powered Image Tagging
**How it works:**
```javascript
// After S3 upload, call OpenAI API
const response = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{
    role: "user",
    content: [
      { type: "text", text: "Analyze this image and provide 5-10 relevant tags..." },
      { type: "image_url", image_url: { url: imageUrl } }
    ]
  }]
});

// Parse tags from response
const tags = response.choices[0].message.content.split(',').map(t => t.trim());

// Update database
await supabase.from('images').update({ tags }).eq('id', imageId);
```

**Why this approach?**
- **Accuracy:** GPT-4 Vision understands context (e.g., "sunset beach" vs. just "beach")
- **Flexibility:** Can add custom prompts for specific use cases
- **Cost:** GPT-4o-mini is cost-effective ($0.15/1K images)

**Alternative considered:**
- AWS Rekognition: Cheaper but less accurate, limited to object detection

### 2. Hidden Folder with Password Protection
**Implementation:**
```javascript
// Setting password
const hashedPassword = await bcrypt.hash(password, 10);
await supabase.from('user_settings')
  .upsert({ user_id, hidden_folder_password: hashedPassword });

// Verifying access
const isValid = await bcrypt.compare(inputPassword, storedHash);

// Marking images as hidden
await supabase.from('images')
  .update({ hidden: true, hidden_at: new Date() })
  .eq('id', imageId);
```

**Security considerations:**
- Password never stored in plaintext
- Bcrypt with 10 rounds (balance of security vs. performance)
- Separate from main auth (different password)
- RLS ensures users can't access others' hidden images

### 3. Soft Delete with Trash Bin
**Why soft delete?**
- Users can recover accidentally deleted images
- Admin can review before permanent deletion
- Audit trail for compliance

**Implementation:**
```sql
-- Soft delete
UPDATE images SET deleted = true, deleted_at = NOW() WHERE id = $1;

-- Restore
UPDATE images SET deleted = false, deleted_at = NULL WHERE id = $1;

-- Permanent delete (30 days later via scheduled job)
DELETE FROM images WHERE deleted = true AND deleted_at < NOW() - INTERVAL '30 days';
```

### 4. Album Organization
**Design:**
- Many-to-many relationship (image can be in multiple albums)
- Junction table `album_images` for flexibility
- Efficient queries using PostgreSQL joins

### 5. Full-Text Search
**Implementation:**
```sql
-- Using PostgreSQL's pattern matching + GIN index
SELECT * FROM images
WHERE
  user_id = $1
  AND (
    filename ILIKE '%' || $2 || '%'
    OR tags @> ARRAY[$2]::text[]  -- Array contains operator
  )
ORDER BY created_at DESC;
```

**Performance:**
- GIN index on tags array = O(log n) search
- ILIKE uses trigram index for fuzzy matching
- Combined search handles typos gracefully

---

## Technical Challenges & Solutions

### Challenge 1: Large Image Upload Causing Stack Overflow
**Problem:**
```javascript
// Original code - FAILED for large images
const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
// Error: Maximum call stack size exceeded
```

**Root Cause:**
- Spread operator creates too many function arguments (millions)
- JavaScript call stack limit is ~10,000 arguments
- 5MB image = 5,000,000 bytes = stack overflow

**Solution:**
```javascript
// Process in chunks
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 50000;  // Process 50KB at a time

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }

  return btoa(binary);
}
```

**Lesson learned:** Always consider memory limits when processing large files

### Challenge 2: RLS Policies Blocking Service Role
**Problem:**
```javascript
// Using service role key bypassed RLS
const supabase = createClient(url, SERVICE_ROLE_KEY);
// Result: Permission errors, inconsistent behavior
```

**Solution:**
```javascript
// Use anon key + pass user's JWT token
const supabase = createClient(url, ANON_KEY, {
  global: {
    headers: { Authorization: `Bearer ${userToken}` }
  }
});
// Result: RLS works correctly, proper user isolation
```

**Why this works:**
- Service role bypasses RLS = meant for admin operations
- Anon key + user token = RLS enforced properly
- Edge functions verify token, extract user_id, RLS filters automatically

### Challenge 3: CORS Errors on S3 Upload
**Problem:** Browser blocked direct S3 uploads from frontend

**Solution:**
```json
// S3 CORS configuration
{
  "AllowedOrigins": ["*"],
  "AllowedMethods": ["GET", "PUT", "POST"],
  "AllowedHeaders": ["*"],
  "ExposeHeaders": ["ETag"]
}
```

**Plus** using signed URLs or going through edge function (current approach)

### Challenge 4: Search Performance with 10,000+ Images
**Problem:** Full table scans were slow

**Solution:**
```sql
-- GIN index for array searching
CREATE INDEX idx_images_tags ON images USING GIN(tags);

-- Partial indexes for common filters
CREATE INDEX idx_images_not_deleted
ON images(user_id, created_at)
WHERE deleted = false;

-- Result: Query time reduced from 2s → 20ms
```

### Challenge 5: Managing 20+ Edge Functions
**Problem:** Code duplication across functions (CORS, auth, error handling)

**Solution attempted:** Shared utilities via npm package
**Issue:** Deno's import system differs from Node.js
**Final approach:** Accept some duplication for simplicity (each function is self-contained)

**Trade-off:** DRY principle vs. operational simplicity

---

## Design Decisions & Trade-offs

### 1. Edge Functions vs. Traditional Backend
**Decision:** Supabase Edge Functions (serverless)

**Pros:**
- Auto-scaling (handle 0 → 10,000 requests/sec)
- Pay-per-use (no idle server costs)
- Global deployment (Cloudflare's 275+ edge locations)
- Zero infrastructure management

**Cons:**
- Cold starts (~100-300ms for first request)
- Limited execution time (25s timeout)
- Stateless (can't keep in-memory cache)
- More complex debugging

**Why chosen:** For a photo app, read-heavy workload benefits from edge caching. Occasional cold starts acceptable for cost savings.

### 2. S3 vs. Database Blob Storage
**Decision:** AWS S3 for images, PostgreSQL for metadata

**Pros:**
- Unlimited scalability
- Built-in CDN integration (CloudFront)
- Cost-effective ($0.023/GB/month)
- Separate concerns (optimize each independently)

**Cons:**
- Network latency (extra hop)
- Consistency challenges (delete DB record but S3 upload fails)
- More moving parts

**Why chosen:** PostgreSQL has practical storage limits (~1TB). For image platform, need to scale beyond that.

### 3. Client-Side Auth vs. Server-Side Sessions
**Decision:** JWT tokens stored in localStorage

**Pros:**
- Stateless backend (scales infinitely)
- Works with edge functions (no shared session store)
- Cross-domain support
- Offline capability

**Cons:**
- XSS vulnerability (malicious script can read token)
- Can't revoke tokens immediately (until expiry)
- Larger request size (token in every request)

**Why chosen:** Supabase architecture requires JWTs. Mitigated XSS with Content Security Policy headers.

**Alternative:** HttpOnly cookies (more secure but harder with CORS + edge functions)

### 4. Soft Delete vs. Hard Delete
**Decision:** Soft delete with 30-day grace period

**Pros:**
- User can recover mistakes
- Audit trail
- Gradual storage cleanup

**Cons:**
- Database grows larger (deleted records take space)
- Queries need WHERE deleted = false
- Scheduled job needed for cleanup

**Why chosen:** User experience > storage cost. Accidental deletion is common.

### 5. Separate Edge Functions vs. Monolithic API
**Decision:** 20+ specialized functions

**Pros:**
- Independent scaling (upload-image can scale separately)
- Isolated failures
- Faster cold starts (smaller functions)
- Clear responsibilities

**Cons:**
- Code duplication
- More deployment complexity
- Harder to share types

**Why chosen:** Supabase pricing is per-invocation. Small, focused functions optimize costs.

---

## Scaling & Performance

### Current State
- **Database:** PostgreSQL (Supabase Free Tier)
- **Storage:** AWS S3 (unlimited scalability)
- **Functions:** Cloudflare Edge Network (auto-scaling)
- **Estimated capacity:** ~10,000 users, 1M images

### Bottlenecks to Address

#### 1. Database Connection Pooling
**Current:** Each edge function creates new connection
**Problem at scale:** PostgreSQL has connection limit (100-500)
**Solution:**
```javascript
// Use Supabase's connection pooler
const supabase = createClient(POOLER_URL, ANON_KEY);
// Or implement PgBouncer for 10,000+ concurrent connections
```

#### 2. S3 Costs at Scale
**Current:** Standard S3 storage
**At 1M images (avg 2MB):** 2TB = $46/month storage + $90/month transfer
**Optimizations:**
- Compress images on upload (WebP format, 60% smaller)
- Generate thumbnails (serve small version in grid, full size on click)
- Move old images to S3 Glacier (90% cheaper for infrequent access)
- Implement CloudFront CDN (cache at edge, reduce S3 requests)

#### 3. Search Performance
**Current:** GIN index, ~20ms for 10k images
**At 1M images:** ~200ms (noticeable lag)
**Solutions:**
- Implement Elasticsearch for full-text search (sub-10ms)
- Add Redis cache for popular searches
- Use PostgreSQL's `pg_trgm` for fuzzy matching
- Paginate results (load 50 at a time)

#### 4. AI Tagging Costs
**Current:** $0.15 per 1,000 images (GPT-4o-mini)
**At 10K uploads/day:** $1.50/day = $45/month
**Optimizations:**
- Batch multiple images in one API call
- Switch to AWS Rekognition ($1 per 1,000 images)
- Train custom model for common objects (one-time cost)
- Make AI tagging optional/premium feature

### Scaling Strategy

#### Phase 1: 0-10K Users
- Current architecture (Supabase free tier, S3)
- Manual monitoring
- Cost: ~$50/month

#### Phase 2: 10K-100K Users
- Upgrade to Supabase Pro ($25/month)
- Implement CDN (CloudFront)
- Add Redis cache for hot data
- Database read replicas (separate analytics queries)
- Cost: ~$500/month

#### Phase 3: 100K-1M Users
- Move to dedicated PostgreSQL cluster (AWS RDS)
- Multi-region S3 with replication
- Elasticsearch for search
- Microservices for heavy operations (video processing)
- Kubernetes for edge function replacement (more control)
- Cost: ~$5,000/month

#### Phase 4: 1M+ Users
- Sharded database (partition by user_id ranges)
- Object storage across multiple providers (S3, GCS, Azure)
- Own CDN with edge caching
- Machine learning pipeline for recommendations
- Cost: $50,000+/month

### Performance Optimizations

#### Frontend
```javascript
// 1. Lazy loading images
<img loading="lazy" src={url} />

// 2. Virtual scrolling (render only visible images)
import { FixedSizeGrid } from 'react-window';

// 3. Image compression before upload
async function compressImage(file: File): Promise<Blob> {
  const canvas = document.createElement('canvas');
  // Resize to max 1920x1080, quality 0.8
}

// 4. Prefetch on hover
<img
  onMouseEnter={() => {
    const img = new Image();
    img.src = fullSizeUrl;
  }}
/>
```

#### Backend
```javascript
// 1. Batch database queries
const images = await supabase.from('images')
  .select('*, albums!inner(name)')  // Join instead of N+1 queries
  .in('id', imageIds);

// 2. Cache frequent queries
const cached = await redis.get(`user:${userId}:images`);
if (cached) return JSON.parse(cached);

// 3. Parallel processing
await Promise.all([
  uploadToS3(file),
  generateThumbnail(file),
  extractMetadata(file)
]);

// 4. Streaming responses for large datasets
const { data, error } = await supabase
  .from('images')
  .select('*')
  .range(offset, offset + 100);  // Pagination
```

#### Database
```sql
-- 1. Query optimization
EXPLAIN ANALYZE  -- Check query plan
SELECT * FROM images WHERE user_id = '...' AND deleted = false;

-- 2. Materialized views for analytics
CREATE MATERIALIZED VIEW user_stats AS
SELECT user_id, COUNT(*) as total_images, SUM(size) as total_size
FROM images GROUP BY user_id;

REFRESH MATERIALIZED VIEW user_stats;  -- Periodic refresh

-- 3. Partitioning large tables
CREATE TABLE images_2024_01 PARTITION OF images
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

---

## Security Considerations

### 1. Authentication & Authorization
**Implemented:**
- Supabase Auth with bcrypt password hashing
- JWT tokens with 1-hour expiry
- Row Level Security (database-level authorization)
- HTTPS only (TLS 1.3)

**Additional measures for production:**
- Multi-factor authentication (TOTP)
- Rate limiting on login attempts
- Session invalidation on password change
- IP-based anomaly detection

### 2. Input Validation
```javascript
// Edge function validation
if (!file || !file.type.startsWith('image/')) {
  return error('Invalid file type');
}

if (file.size > 10 * 1024 * 1024) {  // 10MB limit
  return error('File too large');
}

// Filename sanitization
const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
```

### 3. SQL Injection Prevention
**Safe (using Supabase client):**
```javascript
// Parameterized queries - SAFE
await supabase.from('images').select('*').eq('user_id', userId);
```

**Unsafe (if using raw SQL):**
```javascript
// String concatenation - VULNERABLE
await supabase.rpc('raw_query', {
  query: `SELECT * FROM images WHERE filename = '${userInput}'`
});
// Attack: userInput = "'; DROP TABLE images; --"
```

### 4. XSS Prevention
```javascript
// React automatically escapes output
<div>{filename}</div>  // Safe

// Dangerous (never do this)
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

### 5. CORS Security
```javascript
// Current: Allow all origins (development)
"Access-Control-Allow-Origin": "*"

// Production: Whitelist specific domains
"Access-Control-Allow-Origin": "https://pichaven.com"
```

### 6. S3 Security
**Implemented:**
- Public read-only (GetObject)
- Write access only via IAM credentials (stored in Edge Functions)
- Unique filenames prevent guessing

**Improvements:**
- Generate pre-signed URLs (time-limited access)
- Encrypt at rest (SSE-S3)
- Enable S3 access logging
- Block public ACLs

---

## Common Interview Questions

### Q1: "Walk me through what happens when a user uploads an image."

**Answer:**
1. **Frontend validation:** Check file type (image/*) and size (<10MB)
2. **Preview generation:** Use FileReader API to show preview
3. **Form submission:** Create FormData, add file, POST to /upload-image edge function
4. **Authentication:** Edge function extracts JWT from Authorization header, verifies with Supabase Auth
5. **File processing:** Generate unique filename (timestamp-uuid-original), validate again
6. **S3 upload:** Use AWS SDK to upload to bucket with public-read ACL
7. **Database insert:** Store metadata (filename, URL, user_id, created_at) in PostgreSQL
8. **AI tagging (async):** Call generate-tags function with image URL
9. **Tag generation:** Send image to GPT-4 Vision API, parse response (5-10 tags)
10. **Database update:** Update image record with AI-generated tags
11. **Response:** Return success with image metadata to frontend
12. **UI update:** Frontend adds image to grid, shows loading spinner until tags arrive

**Follow-up handling:**
- "What if S3 upload succeeds but database insert fails?" → Implement transaction-like behavior: try DB insert first (if fails, don't upload), or cleanup S3 if DB fails
- "What if AI tagging fails?" → Graceful degradation - image still uploads, tags show as empty, user can manually add tags

### Q2: "How does your search functionality work at scale?"

**Answer:**
Currently using PostgreSQL's GIN index for array searching:
```sql
CREATE INDEX idx_images_tags ON images USING GIN(tags);
SELECT * FROM images WHERE tags @> ARRAY['sunset']::text[];
```

This works well up to ~100K images (~50ms response time).

**For scaling beyond that:**
1. **Elasticsearch integration:**
   - Index all images with tags, filename, metadata
   - Full-text search with fuzzy matching
   - Response time <10ms even with millions of images
   - Faceted search (filter by date, favorites, albums)

2. **Caching layer:**
   - Redis cache for popular searches
   - Cache TTL: 5 minutes
   - Invalidate on new uploads

3. **Search optimization:**
   - Autocomplete suggestions (pre-compute popular tags)
   - Search history per user
   - Typo tolerance using Levenshtein distance

**Trade-off:** Elasticsearch adds infrastructure complexity and cost (~$50/month), but necessary for good UX at scale.

### Q3: "Why did you choose serverless Edge Functions over a traditional Node.js backend?"

**Answer:**
**Advantages:**
1. **Auto-scaling:** Handle traffic spikes (0 → 10K requests/sec) without manual intervention
2. **Cost efficiency:** Pay only for execution time (no idle server costs). For side project with variable traffic, this saves ~$200/month
3. **Global distribution:** Deployed on Cloudflare's edge network (275+ locations). User in Tokyo gets <50ms latency vs. 200ms from US-based server
4. **Zero maintenance:** No server patching, no Kubernetes clusters, no DevOps overhead
5. **Built-in TypeScript:** Deno supports TypeScript natively, no build step needed

**Disadvantages:**
1. **Cold starts:** First request after inactivity takes 100-300ms. Mitigated by keeping functions warm with scheduled pings
2. **Stateless:** Can't keep WebSocket connections or in-memory cache. Need Redis for session storage
3. **Vendor lock-in:** Tied to Supabase/Deno Deploy. Could migrate to AWS Lambda but requires code changes

**Why it fits this project:**
Photo apps have read-heavy workload (view images >> upload images). Edge functions cache responses at CDN, reducing database load. For write-heavy apps (chat, collaborative editing), traditional backend might be better.

### Q4: "How do you ensure data security and user privacy?"

**Answer:**
**Multi-layered approach:**

1. **Database level - Row Level Security (RLS):**
```sql
CREATE POLICY "Users can only view own images"
ON images FOR SELECT TO authenticated
USING (auth.uid() = user_id);
```
Even if application has bug, database enforces isolation. Tested by trying to access another user's image ID (returns empty result).

2. **Authentication:**
- Bcrypt hashing for passwords (10 rounds)
- JWT tokens with 1-hour expiry (short-lived to limit stolen token damage)
- Hidden folder has separate password (double protection)

3. **Transport security:**
- All connections use HTTPS (TLS 1.3)
- HSTS header forces HTTPS
- S3 URLs use HTTPS

4. **Input validation:**
- File type checking (magic bytes, not just extension)
- Size limits (prevent DoS via large uploads)
- Filename sanitization (prevent path traversal)

5. **Principle of least privilege:**
- Edge functions use anon key (not service role)
- S3 IAM policy only allows PutObject/GetObject
- Database users have minimal permissions

**Future improvements:**
- End-to-end encryption (encrypt files before S3 upload, user holds key)
- Audit logging (track all access to sensitive images)
- GDPR compliance (data export, right to deletion)

### Q5: "What happens if the OpenAI API is down or rate-limited?"

**Answer:**
**Current behavior:** Graceful degradation
```javascript
try {
  const tags = await generateTagsWithAI(imageUrl);
  await updateImageTags(imageId, tags);
} catch (error) {
  console.error('AI tagging failed:', error);
  // Image still uploaded successfully
  // Tags remain empty or show basic filename-based tags
}
```

**User experience:**
- Image appears in grid immediately
- Loading spinner on tags
- After timeout (10s), shows "Tags unavailable"
- User can manually add tags

**Improvements for production:**

1. **Retry logic with exponential backoff:**
```javascript
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000);  // 1s, 2s, 4s
    }
  }
}
```

2. **Queue system:**
   - Failed tagging jobs go to SQS queue
   - Background worker retries later
   - User gets notification when tags are ready

3. **Fallback provider:**
   - Try OpenAI first
   - If fails, fall back to AWS Rekognition
   - If both fail, queue for later

4. **Rate limit handling:**
   - Implement token bucket algorithm
   - Batch multiple images in one request
   - Cache results for similar images

### Q6: "How would you implement real-time collaboration (multiple users viewing same album)?"

**Answer:**
**Using Supabase Realtime:**
```javascript
// Subscribe to album changes
const subscription = supabase
  .channel(`album:${albumId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'album_images',
    filter: `album_id=eq.${albumId}`
  }, (payload) => {
    if (payload.eventType === 'INSERT') {
      // Another user added image
      addImageToGrid(payload.new);
    } else if (payload.eventType === 'DELETE') {
      // Another user removed image
      removeImageFromGrid(payload.old.image_id);
    }
  })
  .subscribe();
```

**Architecture:**
1. **WebSocket connection:** Supabase maintains persistent connection to browser
2. **Database triggers:** PostgreSQL NOTIFY on INSERT/UPDATE/DELETE
3. **Message broadcasting:** Supabase broadcasts to all subscribed clients
4. **UI update:** React re-renders with new data

**Challenges:**
- **Conflict resolution:** Two users rename same image simultaneously
  - Solution: Last-write-wins with timestamp, or CRDT (Conflict-free Replicated Data Type)
- **Presence:** Show who's currently viewing album
  - Solution: Supabase Presence API (broadcast user metadata)
- **Scalability:** 100 users in same album = 100 WebSocket connections
  - Solution: Supabase handles this via Cloudflare's edge network

### Q7: "Why did you choose this database schema? What are the trade-offs?"

**Answer:**
**Key decisions:**

1. **Many-to-many for albums:**
```sql
images ←→ album_images ←→ albums
```
**Why:** Image can be in multiple albums without duplication. User organizes same vacation photo in "2024 Trips" and "Beach Photos" albums.
**Trade-off:** More complex queries (requires JOIN), but flexible organization.
**Alternative:** One-to-many (image belongs to one album) - simpler queries but limited UX.

2. **Array for tags:**
```sql
tags TEXT[]  -- ['sunset', 'beach', 'nature']
```
**Why:** PostgreSQL has excellent array support. GIN index makes searching O(log n). Can query "contains any" or "contains all".
**Trade-off:** Can't normalize tags (no tag table with descriptions, counts). If needed, could add `tags` table later for autocomplete suggestions.
**Alternative:** Separate `image_tags` junction table - more normalized but slower queries.

3. **Soft delete flag:**
```sql
deleted BOOLEAN DEFAULT false
deleted_at TIMESTAMP
```
**Why:** User can restore accidentally deleted images. Trash bin feature.
**Trade-off:** Table grows larger (deleted records consume space). Need scheduled cleanup job. Every query needs `WHERE deleted = false`.
**Alternative:** Move deleted images to `deleted_images` table - cleaner separation but more complex restore logic.

4. **Denormalized user_id everywhere:**
```sql
images.user_id, albums.user_id, user_settings.user_id
```
**Why:** RLS policies need `user_id` in every table. Duplicating instead of relying on foreign keys simplifies security.
**Trade-off:** Slight redundancy, but massive security and performance benefit.

### Q8: "How do you handle image deletion - what happens to the S3 file?"

**Answer:**
**Current implementation: Two-phase deletion**

**Phase 1: Soft delete (user clicks delete)**
```javascript
// Mark as deleted in database
await supabase.from('images')
  .update({ deleted: true, deleted_at: new Date() })
  .eq('id', imageId);

// S3 file remains untouched
// Image moves to trash bin in UI
```

**Phase 2: Permanent delete (user empties trash OR 30-day expiry)**
```javascript
// Get S3 URL from database
const { data: image } = await supabase.from('images')
  .select('url').eq('id', imageId).single();

// Delete from S3
const filename = extractFilenameFromUrl(image.url);
await s3.deleteObject({ Bucket, Key: filename });

// Delete database record
await supabase.from('images').delete().eq('id', imageId);
```

**Edge case handling:**
- **S3 delete fails but DB succeeds?** Orphaned S3 file (costs money but harmless). Solution: Daily cleanup job that finds orphaned files
- **DB delete fails but S3 succeeds?** Broken database record (points to non-existent file). Solution: Wrap in transaction-like logic (check both succeeded)
- **User deletes image while it's being viewed?** Frontend shows broken image. Solution: Catch 403/404 errors, show placeholder

**Better approach for production:**
```javascript
// Use S3 lifecycle rules
await s3.putBucketLifecycleConfiguration({
  Bucket,
  LifecycleConfiguration: {
    Rules: [{
      Id: 'DeleteOldTrashedImages',
      Status: 'Enabled',
      TagFilters: [{ Key: 'Status', Value: 'Deleted' }],
      Expiration: { Days: 30 }
    }]
  }
});

// Tag file on soft delete
await s3.putObjectTagging({
  Bucket, Key: filename,
  Tagging: { TagSet: [{ Key: 'Status', Value: 'Deleted' }] }
});

// S3 automatically deletes after 30 days
```

### Q9: "What metrics would you track for this application?"

**Answer:**
**User engagement metrics:**
- Daily/Monthly Active Users (DAU/MAU)
- Upload frequency (images per user per week)
- Search usage (% of users who search, avg searches per session)
- Feature adoption (% using albums, hidden folder, favorites)
- Retention (% returning after 1 day, 7 days, 30 days)

**Performance metrics:**
- **P95 latency** for key operations:
  - Upload: <3s
  - Search: <200ms
  - Grid load: <1s
- **Error rates:**
  - Failed uploads (target: <0.1%)
  - AI tagging failures (target: <5%, non-critical)
  - Authentication errors
- **Database performance:**
  - Query time (alert if >500ms)
  - Connection pool usage (alert if >80%)
  - Slow query log

**Business metrics:**
- Storage per user (avg, P95) - affects costs
- API costs (OpenAI, AWS)
- Infrastructure costs per user
- Churn rate

**Technical debt metrics:**
- Test coverage (target: >80%)
- TypeScript strict mode violations
- Security vulnerabilities (Dependabot alerts)

**Implementation:**
```javascript
// Using PostHog for analytics
posthog.capture('image_uploaded', {
  size: file.size,
  format: file.type,
  duration: uploadTime
});

// Using Sentry for error tracking
Sentry.captureException(error, {
  tags: { operation: 'upload', user_id: userId }
});

// Custom metrics to Prometheus/Grafana
metrics.histogram('upload_duration_seconds', uploadTime);
metrics.counter('uploads_total', { status: 'success' });
```

### Q10: "If you had 2 more weeks, what would you improve?"

**Answer:**
**High priority:**

1. **Image optimization pipeline:**
   - Generate thumbnails (200x200) for grid view
   - Convert to WebP (60% smaller than JPEG)
   - Lazy loading with blur-up technique
   - **Impact:** 10x faster page loads, 5x lower bandwidth costs

2. **Testing:**
   - Unit tests for edge functions (Deno's built-in test framework)
   - Integration tests (Playwright for E2E)
   - Load testing (K6 to find breaking points)
   - **Impact:** Catch bugs before production, confidence to refactor

3. **Monitoring & alerting:**
   - Sentry for error tracking
   - PostHog for user analytics
   - Uptime monitoring (Pingdom)
   - **Impact:** Know about issues before users complain

4. **Mobile responsiveness:**
   - Touch gestures (swipe to delete)
   - Mobile upload from camera
   - PWA (install on home screen)
   - **Impact:** 50% of users are mobile

**Nice-to-have:**

5. **Bulk operations:**
   - Multi-select images
   - Batch delete, move to album, add tags
   - **Impact:** Power users can organize faster

6. **Social features:**
   - Share album via link (with expiry)
   - Collaborate on album with friends
   - Comments on images
   - **Impact:** Viral growth, network effects

7. **Advanced search:**
   - Filter by date range
   - Filter by location (if EXIF data available)
   - Visual similarity search (ML embeddings)
   - **Impact:** Better UX for large collections

8. **Admin dashboard:**
   - User management
   - Storage analytics
   - Moderation tools (report inappropriate images)
   - **Impact:** Operational efficiency

---

## Final Tips for Interview

### When explaining your project:
1. **Start with the problem** (why you built it)
2. **Show the demo** (if possible, live or video)
3. **Explain architecture** (draw diagram if whiteboard available)
4. **Highlight technical challenges** (shows problem-solving)
5. **Discuss trade-offs** (shows mature thinking)
6. **Talk about next steps** (shows product sense)

### Red flags to avoid:
- "I used this because tutorial said so" → Always know WHY
- "It just works" → Understand how it works internally
- "No issues so far" → Everything has trade-offs, acknowledge them
- Blaming tools → "React is slow" vs "I optimized React rendering"

### Green flags to demonstrate:
- "I chose X over Y because..." (show decision-making)
- "This works at current scale, but for 10M users I'd..." (show scaling mindset)
- "I considered security by..." (show awareness)
- "I would test this by..." (show quality focus)

### Practice:
- Explain project to non-technical friend (tests clarity)
- Record yourself (catches filler words)
- Prepare for "why" questions 3 levels deep
- Have failure stories ready (learning experiences)

Good luck!
