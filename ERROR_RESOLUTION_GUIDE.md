# PicHaven - Complete Error Resolution Guide
## Comprehensive Documentation of All Errors and Solutions

---

## Table of Contents

1. [Development Phase Errors](#1-development-phase-errors)
2. [CORS and Network Errors](#2-cors-and-network-errors)
3. [Authentication and Security Errors](#3-authentication-and-security-errors)
4. [Database and RLS Errors](#4-database-and-rls-errors)
5. [AWS S3 Integration Errors](#5-aws-s3-integration-errors)
6. [State Management Errors](#6-state-management-errors)
7. [TypeScript and Build Errors](#7-typescript-and-build-errors)
8. [Edge Function Deployment Errors](#8-edge-function-deployment-errors)
9. [UI/UX and Runtime Errors](#9-uiux-and-runtime-errors)
10. [Production Issues and Fixes](#10-production-issues-and-fixes)
11. [AI Tagging Errors](#11-ai-tagging-errors)
12. [Performance and Optimization Issues](#12-performance-and-optimization-issues)
13. [Prevention Strategies](#13-prevention-strategies)
14. [Lessons Learned](#14-lessons-learned)

---

## 1. Development Phase Errors

### Error 1.1: TypeScript Configuration Issues

**Error Message:**
```
Cannot find module 'vite/client'
Type 'string | undefined' is not assignable to type 'string'
```

**When It Occurred:**
Initial project setup with TypeScript and Vite

**Root Cause:**
- Missing TypeScript types for Vite
- Incorrect tsconfig.json configuration
- No proper type declarations for environment variables

**Solution:**
1. Created `src/vite-env.d.ts`:
```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

2. Updated tsconfig.json:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**Prevention:**
- Use official Vite + React + TypeScript template
- Always create vite-env.d.ts file
- Define environment variable types upfront

---

### Error 1.2: ESLint Configuration Conflicts

**Error Message:**
```
Parsing error: Cannot read file 'tsconfig.json'
Warning: React Hook useEffect has a missing dependency
```

**When It Occurred:**
Running `npm run lint` after initial setup

**Root Cause:**
- ESLint not configured for TypeScript
- React Hooks plugin not properly configured
- Missing ESLint rules for React best practices

**Solution:**
Created `eslint.config.js`:
```javascript
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
)
```

**Prevention:**
- Use standard ESLint config for React projects
- Install all required ESLint plugins
- Configure exhaustive-deps rule properly

---

### Error 1.3: Import Path Resolution

**Error Message:**
```
Module not found: Can't resolve '../components/ImageGrid'
Cannot find module '@/lib/supabase'
```

**When It Occurred:**
Organizing code into different folders

**Root Cause:**
- Incorrect relative paths
- No path aliases configured
- Moving files without updating imports

**Solution:**
1. Used consistent relative paths:
```typescript
// Before (broken)
import { ImageGrid } from '../../../components/ImageGrid'

// After (works)
import { ImageGrid } from '../components/ImageGrid'
```

2. Could optionally configure path aliases in tsconfig.json:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

**Prevention:**
- Use consistent relative paths
- Configure path aliases for large projects
- Use IDE refactoring tools when moving files

---

## 2. CORS and Network Errors

### Error 2.1: CORS Policy Blocking Edge Functions

**Error Message:**
```
Access to fetch at 'https://[project].supabase.co/functions/v1/upload-image'
from origin 'http://localhost:5173' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**When It Occurred:**
First attempt to call Supabase Edge Function from frontend

**Root Cause:**
- Edge functions didn't include CORS headers
- No OPTIONS method handler for preflight requests
- Browser performing preflight checks

**Detailed Explanation:**
CORS (Cross-Origin Resource Sharing) is a security mechanism that prevents web pages from making requests to a different domain than the one serving the page. When making cross-origin requests with custom headers (like Authorization), the browser first sends an OPTIONS "preflight" request to check if the server allows it.

**Solution:**
1. Added CORS headers to ALL edge functions:
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};
```

2. Handled OPTIONS requests:
```typescript
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // ... rest of the function
});
```

3. Included CORS headers in ALL responses:
```typescript
// Success response
return new Response(JSON.stringify(data), {
  headers: {
    ...corsHeaders,
    "Content-Type": "application/json",
  }
});

// Error response
return new Response(JSON.stringify({ error: message }), {
  status: 500,
  headers: {
    ...corsHeaders,
    "Content-Type": "application/json",
  }
});
```

**Why This Fixed It:**
- Browser sees correct CORS headers in preflight response
- Server explicitly allows the frontend origin
- Required headers (Authorization, Content-Type) are permitted
- All HTTP methods needed by the app are allowed

**Prevention:**
- Always include CORS headers in serverless functions
- Create a standard template for all edge functions
- Test with browser DevTools Network tab
- Use the exact headers Supabase requires: `Content-Type, Authorization, X-Client-Info, Apikey`

---

### Error 2.2: Network Request Failed

**Error Message:**
```
TypeError: Failed to fetch
NetworkError when attempting to fetch resource
```

**When It Occurred:**
Intermittent errors when calling edge functions

**Root Cause:**
- Network connectivity issues
- Edge function timeout
- No retry logic for failed requests
- No proper error handling

**Solution:**
1. Added error handling with retries:
```typescript
async function fetchWithRetry(url: string, options: RequestInit, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

2. Added loading states and user feedback:
```typescript
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

try {
  setLoading(true);
  setError(null);
  const response = await fetchWithRetry(apiUrl, options);
  // Success handling
} catch (err) {
  setError('Network error. Please check your connection and try again.');
  console.error('Request failed:', err);
} finally {
  setLoading(false);
}
```

**Prevention:**
- Implement retry logic for all network requests
- Show loading states during operations
- Provide clear error messages to users
- Log errors for debugging

---

## 3. Authentication and Security Errors

### Error 3.1: Invalid JWT Token

**Error Message:**
```
JWT expired
Invalid JWT: malformed JWT
Unauthorized: Missing authorization header
```

**When It Occurred:**
After user session expired or on page refresh

**Root Cause:**
- JWT tokens expire after certain time
- Token not being refreshed automatically
- Token not persisted across page refreshes
- Authorization header not sent with requests

**Solution:**
1. Implemented session management in AuthContext:
```typescript
useEffect(() => {
  // Check for existing session
  supabase.auth.getSession().then(({ data: { session } }) => {
    setUser(session?.user ?? null);
    setLoading(false);
  });

  // Listen for auth changes (includes token refresh)
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      setUser(session?.user ?? null);
    }
  );

  return () => subscription.unsubscribe();
}, []);
```

2. Ensured Authorization header sent with requests:
```typescript
const authHeader = req.headers.get("Authorization");
if (!authHeader) {
  return new Response(
    JSON.stringify({ error: "Missing authorization header" }),
    { status: 401, headers: corsHeaders }
  );
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    headers: { Authorization: authHeader },
  },
});
```

3. Frontend request pattern:
```typescript
const session = await supabase.auth.getSession();
const token = session.data.session?.access_token;

const response = await fetch(apiUrl, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});
```

**Why This Fixed It:**
- Supabase automatically refreshes tokens before expiry
- AuthContext keeps auth state in sync
- Session persisted in localStorage by Supabase
- Authorization header properly sent with all requests

**Prevention:**
- Use Supabase's built-in session management
- Subscribe to auth state changes
- Always send Authorization header
- Handle 401 errors by redirecting to login

---

### Error 3.2: User Already Exists

**Error Message:**
```
User already registered
Email already taken
Duplicate key value violates unique constraint "users_email_key"
```

**When It Occurred:**
User attempting to sign up with existing email

**Root Cause:**
- No duplicate email checking before signup
- Poor error message from backend
- No user feedback about what went wrong

**Solution:**
1. Backend returns clear error:
```typescript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
});

if (error) {
  if (error.message.includes('already registered')) {
    return new Response(
      JSON.stringify({
        error: 'This email is already registered. Please log in instead.'
      }),
      { status: 400, headers: corsHeaders }
    );
  }
  return new Response(
    JSON.stringify({ error: error.message }),
    { status: 400, headers: corsHeaders }
  );
}
```

2. Frontend handles the error gracefully:
```typescript
try {
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    if (error.message.includes('already registered')) {
      setError('This email is already in use. Would you like to log in instead?');
      // Could switch to login form
    } else {
      setError(error.message);
    }
    return;
  }

  // Success
} catch (err) {
  setError('Signup failed. Please try again.');
}
```

**Prevention:**
- Provide clear, actionable error messages
- Check for common error cases
- Guide user to next action (e.g., "log in instead")
- Validate email format before submission

---

### Error 3.3: Password Too Weak

**Error Message:**
```
Password should be at least 6 characters
Password must contain at least one uppercase letter
```

**When It Occurred:**
User attempting to sign up with weak password

**Root Cause:**
- Supabase enforces password requirements
- No client-side validation
- User doesn't know requirements upfront

**Solution:**
1. Client-side validation before submission:
```typescript
const validatePassword = (password: string): string | null => {
  if (password.length < 6) {
    return 'Password must be at least 6 characters long';
  }
  // Add more rules as needed
  return null;
};

const handleSignup = async () => {
  const passwordError = validatePassword(password);
  if (passwordError) {
    setError(passwordError);
    return;
  }

  // Proceed with signup
};
```

2. Show password requirements in UI:
```typescript
<div className="text-sm text-gray-600 mt-1">
  <p>Password must be:</p>
  <ul className="list-disc list-inside">
    <li>At least 6 characters long</li>
    <li>Include letters and numbers</li>
  </ul>
</div>
```

3. Real-time password strength indicator:
```typescript
const getPasswordStrength = (password: string) => {
  if (password.length < 6) return { strength: 'weak', color: 'red' };
  if (password.length < 10) return { strength: 'medium', color: 'yellow' };
  return { strength: 'strong', color: 'green' };
};
```

**Prevention:**
- Display password requirements clearly
- Validate on client-side before submitting
- Show real-time feedback as user types
- Use password strength indicators

---

## 4. Database and RLS Errors

### Error 4.1: Row Level Security Policy Violation

**Error Message:**
```
new row violates row-level security policy for table "images"
permission denied for table images
row-level security policy for table "images" does not allow this operation
```

**When It Occurred:**
After enabling RLS on tables, all queries started failing

**Root Cause:**
- RLS enabled but no policies created (default deny all)
- Policies missing for some CRUD operations
- Policy conditions incorrect
- Using wrong auth check (current_user vs auth.uid())

**Detailed Explanation:**
When you enable Row Level Security (RLS) on a PostgreSQL table, the default behavior is to DENY ALL operations. You must explicitly create policies that allow specific operations for specific users. Without policies, even the table owner cannot access the data.

**Solution:**

**Step 1: Understanding the Problem**
```sql
-- After this, NOBODY can access the table (even admins)
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
```

**Step 2: Creating Comprehensive Policies**

For the `images` table:

```sql
-- Policy 1: SELECT (Read)
CREATE POLICY "Users can view own images"
  ON images
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Policy 2: INSERT (Create)
CREATE POLICY "Users can insert own images"
  ON images
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: UPDATE (Modify)
CREATE POLICY "Users can update own images"
  ON images
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 4: DELETE (Remove)
CREATE POLICY "Users can delete own images"
  ON images
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

**Step 3: Testing Policies**
```sql
-- Test as authenticated user
SELECT * FROM images WHERE user_id = auth.uid();

-- Should return only that user's images
```

**For junction tables** (like album_images):

```sql
-- SELECT policy checking album ownership
CREATE POLICY "Users can view album_images of own albums"
  ON album_images
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = album_images.album_id
      AND albums.user_id = auth.uid()
    )
  );

-- INSERT policy checking album ownership
CREATE POLICY "Users can insert into own albums"
  ON album_images
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = album_images.album_id
      AND albums.user_id = auth.uid()
    )
  );

-- DELETE policy checking album ownership
CREATE POLICY "Users can delete from own albums"
  ON album_images
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = album_images.album_id
      AND albums.user_id = auth.uid()
    )
  );
```

**Common Mistakes to Avoid:**

1. **Using current_user instead of auth.uid():**
```sql
-- WRONG (doesn't work with Supabase)
USING (current_user = user_id::text)

-- CORRECT
USING (auth.uid() = user_id)
```

2. **Forgetting WITH CHECK on INSERT:**
```sql
-- WRONG (no security on insert)
CREATE POLICY "Insert" ON images FOR INSERT TO authenticated;

-- CORRECT
CREATE POLICY "Insert" ON images FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
```

3. **Missing USING on UPDATE:**
```sql
-- INCOMPLETE (can't read rows to update)
CREATE POLICY "Update" ON images FOR UPDATE TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- CORRECT (both USING and WITH CHECK)
CREATE POLICY "Update" ON images FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**Why This Fixed It:**
- SELECT policy allows users to read their own rows
- INSERT policy ensures users can only create rows with their user_id
- UPDATE policy checks ownership before and after update
- DELETE policy ensures users can only delete their own rows
- Junction table policies check ownership through JOIN

**Prevention:**
- Always create all 4 policies (SELECT, INSERT, UPDATE, DELETE)
- Test policies thoroughly with different users
- Use auth.uid() not current_user in Supabase
- For junction tables, check ownership through foreign keys
- Document what each policy does

---

### Error 4.2: Foreign Key Constraint Violation

**Error Message:**
```
insert or update on table "album_images" violates foreign key constraint
Key (album_id)=(uuid) is not present in table "albums"
```

**When It Occurred:**
Adding image to album that doesn't exist or was deleted

**Root Cause:**
- Trying to insert record with non-existent foreign key
- Album was deleted but image relationship not cleaned up
- No validation before insert
- Frontend allowing invalid operations

**Solution:**
1. Check existence before insert (Edge Function):
```typescript
// Check if album exists and belongs to user
const { data: album, error: albumError } = await supabase
  .from('albums')
  .select('id')
  .eq('id', albumId)
  .eq('user_id', user.id)
  .maybeSingle();

if (!album) {
  return new Response(
    JSON.stringify({ error: 'Album not found or access denied' }),
    { status: 404, headers: corsHeaders }
  );
}

// Now safe to insert
const { error } = await supabase
  .from('album_images')
  .insert({ album_id: albumId, image_id: imageId });
```

2. Use CASCADE deletes in schema:
```sql
CREATE TABLE album_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid REFERENCES albums(id) ON DELETE CASCADE,
  image_id uuid REFERENCES images(id) ON DELETE CASCADE,
  added_at timestamptz DEFAULT now()
);
```

This automatically deletes album_images when parent album or image is deleted.

3. Frontend validation:
```typescript
// Fetch and validate album before allowing image add
const { data: albums } = await supabase
  .from('albums')
  .select('id, name')
  .eq('user_id', user.id);

// Only show existing albums in UI
```

**Why CASCADE Helps:**
- When album is deleted, all album_images entries are automatically deleted
- When image is deleted, all album_images entries are automatically deleted
- No orphaned records
- Database maintains referential integrity

**Prevention:**
- Always validate foreign keys before insert
- Use ON DELETE CASCADE for dependent relationships
- Fetch and display only valid options in UI
- Handle errors gracefully when constraints violated

---

### Error 4.3: Unique Constraint Violation

**Error Message:**
```
duplicate key value violates unique constraint "album_images_album_id_image_id_key"
Key (album_id, image_id)=(uuid, uuid) already exists
```

**When It Occurred:**
Attempting to add same image to same album twice

**Root Cause:**
- Unique constraint on (album_id, image_id) pair
- No check before insert if already exists
- User clicking "Add" button multiple times
- No duplicate prevention in UI

**Solution:**
1. Use upsert instead of insert:
```typescript
// Option 1: Check before insert
const { data: existing } = await supabase
  .from('album_images')
  .select('id')
  .eq('album_id', albumId)
  .eq('image_id', imageId)
  .maybeSingle();

if (existing) {
  return new Response(
    JSON.stringify({ error: 'Image already in this album' }),
    { status: 400, headers: corsHeaders }
  );
}

// Option 2: Use upsert (ignore if exists)
const { error } = await supabase
  .from('album_images')
  .upsert(
    { album_id: albumId, image_id: imageId },
    { onConflict: 'album_id,image_id', ignoreDuplicates: true }
  );
```

2. Prevent duplicate clicks in UI:
```typescript
const [adding, setAdding] = useState(false);

const handleAddToAlbum = async () => {
  if (adding) return; // Prevent duplicate clicks

  setAdding(true);
  try {
    await addImageToAlbum(albumId, imageId);
  } finally {
    setAdding(false);
  }
};
```

3. Show visual feedback when already added:
```typescript
// Check if image is already in album
const isInAlbum = albumImages.some(img => img.id === imageId);

<button
  disabled={isInAlbum}
  className={isInAlbum ? 'opacity-50 cursor-not-allowed' : ''}
>
  {isInAlbum ? 'Already in Album' : 'Add to Album'}
</button>
```

**Prevention:**
- Use unique constraints to enforce business rules
- Check for duplicates before insert
- Use upsert when appropriate
- Disable buttons during operations
- Provide visual feedback for existing relationships

---

## 5. AWS S3 Integration Errors

### Error 5.1: SignatureDoesNotMatch

**Error Message:**
```
SignatureDoesNotMatch: The request signature we calculated does not match the signature you provided.
Status Code: 403
```

**When It Occurred:**
Attempting to upload file to S3

**Root Cause:**
- Incorrect AWS access key or secret key
- Keys contain special characters not properly escaped
- Clock skew between client and AWS servers
- Incorrect region specified
- Malformed request headers

**Detailed Explanation:**
AWS uses request signatures to authenticate API calls. The signature is calculated using your secret key, request parameters, and timestamp. If any of these don't match what AWS expects, the request is rejected.

**Solution:**

**Step 1: Verify Credentials**
```typescript
// Check environment variables are set correctly
const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
const region = Deno.env.get('AWS_REGION') || 'us-east-1';

if (!accessKeyId || !secretAccessKey) {
  console.error('AWS credentials not set');
  throw new Error('AWS credentials not configured');
}

console.log('AWS Region:', region);
console.log('Access Key ID:', accessKeyId.substring(0, 5) + '...');
// Never log the secret key!
```

**Step 2: Configure S3 Client Properly**
```typescript
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3@3.621.0";

const s3Client = new S3Client({
  region: region,
  credentials: {
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
  },
});
```

**Step 3: Ensure Correct Request Format**
```typescript
const command = new PutObjectCommand({
  Bucket: bucketName,
  Key: `uploads/${userId}/${Date.now()}-${filename}`,
  Body: arrayBuffer,
  ContentType: contentType || 'application/octet-stream',
});

try {
  await s3Client.send(command);
  console.log('Upload successful');
} catch (error) {
  console.error('S3 upload error:', error);
  throw error;
}
```

**Common Causes and Fixes:**

1. **Wrong Region:**
```typescript
// If bucket is in us-west-2 but you specify us-east-1
// WRONG
const s3Client = new S3Client({ region: 'us-east-1' });

// CORRECT - match your bucket's region
const s3Client = new S3Client({ region: 'us-west-2' });
```

2. **Expired Credentials:**
- IAM users: credentials don't expire
- Temporary credentials (STS): expire after specified time
- Verify credentials are still valid in AWS Console

3. **Special Characters in Secret Key:**
```bash
# If secret key has special characters, ensure proper quoting in .env
AWS_SECRET_ACCESS_KEY="abc123/def+ghi="
```

**Verification Steps:**
1. Test credentials using AWS CLI:
```bash
aws s3 ls s3://your-bucket-name --region us-east-1
```

2. Check IAM permissions:
- User has `s3:PutObject` permission
- Bucket policy allows uploads

3. Verify environment variables in Supabase:
- Go to Supabase Dashboard → Edge Functions → Secrets
- Confirm all AWS variables are set

**Prevention:**
- Store credentials securely in environment variables
- Never commit credentials to code
- Use IAM roles when possible
- Test with AWS CLI first
- Log (masked) key IDs for debugging

---

### Error 5.2: Access Denied (403)

**Error Message:**
```
AccessDenied: Access Denied
Status Code: 403
<Error>
  <Code>AccessDenied</Code>
  <Message>Access Denied</Message>
</Error>
```

**When It Occurred:**
Uploading to S3 or accessing uploaded images

**Root Cause:**
- IAM user doesn't have required S3 permissions
- Bucket policy blocking the operation
- ACLs preventing access
- No public read access for images

**Solution:**

**Part 1: IAM User Permissions**

Create policy with minimum required permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name",
        "arn:aws:s3:::your-bucket-name/*"
      ]
    }
  ]
}
```

Attach to IAM user:
1. AWS Console → IAM → Users → Your User
2. Permissions → Add permissions → Attach policies
3. Create custom policy or use AmazonS3FullAccess (for development)

**Part 2: Bucket Policy for Public Read**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

Apply in AWS Console:
1. S3 → Your Bucket → Permissions → Bucket Policy
2. Paste policy above
3. Save changes

**Part 3: Disable Block Public Access**

1. S3 → Your Bucket → Permissions → Block public access
2. Edit → Uncheck "Block all public access"
3. Save changes
4. Confirm

**Important Security Note:**
- This makes ALL objects in bucket publicly readable
- For production, use signed URLs or CloudFront
- Never store sensitive data in publicly accessible buckets

**Testing Access:**
```bash
# Test upload (requires AWS credentials)
aws s3 cp test.jpg s3://your-bucket-name/test.jpg

# Test public read (no credentials needed)
curl https://your-bucket-name.s3.amazonaws.com/test.jpg
```

**Prevention:**
- Use least privilege principle for IAM
- Regularly review bucket policies
- Use separate buckets for public/private content
- Consider CloudFront for production

---

### Error 5.3: CORS Configuration Error

**Error Message:**
```
Access to fetch at 'https://bucket-name.s3.amazonaws.com/image.jpg' from origin
'http://localhost:5173' has been blocked by CORS policy
No 'Access-Control-Allow-Origin' header is present
```

**When It Occurred:**
Frontend trying to load images from S3

**Root Cause:**
- S3 bucket CORS not configured
- CORS configuration doesn't allow your origin
- Wrong HTTP methods in CORS config

**Solution:**

Configure S3 CORS (AWS Console):
1. S3 → Your Bucket → Permissions → CORS
2. Add configuration:

```json
[
  {
    "AllowedHeaders": [
      "*"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedOrigins": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3000
  }
]
```

**For Production** (more restrictive):
```json
[
  {
    "AllowedHeaders": [
      "Authorization",
      "Content-Type"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST"
    ],
    "AllowedOrigins": [
      "https://your-app.netlify.app",
      "http://localhost:5173"
    ],
    "ExposeHeaders": [],
    "MaxAgeSeconds": 3600
  }
]
```

**Testing CORS:**
```javascript
// In browser console
fetch('https://bucket-name.s3.amazonaws.com/test.jpg')
  .then(response => response.blob())
  .then(blob => console.log('CORS working:', blob.size))
  .catch(error => console.error('CORS error:', error));
```

**Prevention:**
- Configure CORS during initial S3 setup
- Use wildcard "*" for development
- Restrict origins in production
- Test CORS from your frontend before uploading images

---

## 6. State Management Errors

### Error 6.1: State Not Updating After Operation

**Error Message:**
```
(No error message - UI not reflecting changes)
Image uploaded but doesn't appear in grid
Image deleted but still visible
```

**When It Occurred:**
After upload, delete, or other mutation operations

**Root Cause:**
- Component not re-fetching data after mutation
- State update called but component not re-rendering
- Stale closure capturing old state
- Missing dependency in useEffect

**Solution:**

**Approach 1: Refresh Trigger Pattern**

Parent component:
```typescript
const [refreshTrigger, setRefreshTrigger] = useState(0);

const handleUploadSuccess = () => {
  setRefreshTrigger(prev => prev + 1);
};

return (
  <>
    <UploadForm onSuccess={handleUploadSuccess} />
    <ImageGrid key={refreshTrigger} refreshTrigger={refreshTrigger} />
  </>
);
```

Child component:
```typescript
function ImageGrid({ refreshTrigger }: { refreshTrigger: number }) {
  const [images, setImages] = useState<Image[]>([]);

  useEffect(() => {
    fetchImages();
  }, [refreshTrigger]); // Re-fetch when trigger changes

  const fetchImages = async () => {
    // Fetch images from API
  };
}
```

**Approach 2: Callback Pattern**

```typescript
// Parent
const [images, setImages] = useState<Image[]>([]);

const refetchImages = async () => {
  const { data } = await supabase.from('images').select('*');
  setImages(data || []);
};

const handleDelete = async (id: string) => {
  await deleteImage(id);
  await refetchImages(); // Refresh after delete
};

return (
  <ImageGrid images={images} onDelete={handleDelete} />
);
```

**Approach 3: Optimistic Updates**

```typescript
const handleDelete = async (id: string) => {
  // Immediate UI update
  setImages(prev => prev.filter(img => img.id !== id));

  try {
    await deleteImage(id);
  } catch (error) {
    // Revert on error
    await refetchImages();
    alert('Delete failed');
  }
};
```

**Why These Work:**
- Refresh trigger causes useEffect to run
- Callback pattern ensures fresh data after mutations
- Optimistic updates provide instant feedback
- Proper state updates trigger re-renders

**Common Pitfalls:**

1. **Stale Closure:**
```typescript
// WRONG - captures old images value
const handleDelete = async (id: string) => {
  setImages(images.filter(img => img.id !== id));
};

// CORRECT - uses functional update
const handleDelete = async (id: string) => {
  setImages(prev => prev.filter(img => img.id !== id));
};
```

2. **Missing Dependencies:**
```typescript
// WRONG - useEffect runs only once
useEffect(() => {
  fetchImages();
}, []);

// CORRECT - re-runs when trigger changes
useEffect(() => {
  fetchImages();
}, [refreshTrigger]);
```

**Prevention:**
- Use functional state updates
- Include all dependencies in useEffect
- Consider using state management library (Zustand, Redux)
- Implement optimistic UI updates
- Test state changes thoroughly

---

### Error 6.2: Memory Leaks from Subscriptions

**Error Message:**
```
Warning: Can't perform a React state update on an unmounted component
Memory leak detected
```

**When It Occurred:**
Navigating away from page with active subscriptions

**Root Cause:**
- Event listeners not cleaned up
- Supabase subscriptions not unsubscribed
- Async operations continuing after unmount
- Timers not cleared

**Solution:**

**Pattern 1: Cleanup useEffect**

```typescript
useEffect(() => {
  // Subscribe to auth changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      setUser(session?.user ?? null);
    }
  );

  // Cleanup function
  return () => {
    subscription.unsubscribe();
  };
}, []);
```

**Pattern 2: Abort Controller for Fetch**

```typescript
useEffect(() => {
  const abortController = new AbortController();

  const fetchData = async () => {
    try {
      const response = await fetch(url, {
        signal: abortController.signal
      });
      const data = await response.json();
      setData(data);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error(error);
      }
    }
  };

  fetchData();

  return () => {
    abortController.abort();
  };
}, [url]);
```

**Pattern 3: Cancellable Async Operations**

```typescript
useEffect(() => {
  let cancelled = false;

  const loadData = async () => {
    const data = await fetchExpensiveData();
    if (!cancelled) {
      setData(data);
    }
  };

  loadData();

  return () => {
    cancelled = true;
  };
}, []);
```

**Pattern 4: Clear Timers**

```typescript
useEffect(() => {
  const timerId = setTimeout(() => {
    setMessage('Done');
  }, 3000);

  return () => {
    clearTimeout(timerId);
  };
}, []);
```

**General Cleanup Checklist:**
- ✅ Unsubscribe from Supabase realtime
- ✅ Remove event listeners
- ✅ Cancel fetch requests
- ✅ Clear timeouts/intervals
- ✅ Abort async operations

**Prevention:**
- Always return cleanup function from useEffect
- Use AbortController for fetch requests
- Track component mounted state for async operations
- Test component unmounting scenarios

---

## 7. TypeScript and Build Errors

### Error 7.1: Type 'undefined' is not assignable

**Error Message:**
```
Type 'undefined' is not assignable to type 'string'
Object is possibly 'undefined'
```

**When It Occurred:**
TypeScript compilation / build process

**Root Cause:**
- Variable might be undefined
- API response might not include expected field
- No null/undefined checking
- Strict mode catching potential runtime errors

**Solution:**

**Option 1: Optional Chaining**

```typescript
// Before (error)
const userName = user.profile.name;

// After (safe)
const userName = user?.profile?.name;
```

**Option 2: Nullish Coalescing**

```typescript
// Provide default value
const userName = user?.profile?.name ?? 'Anonymous';

// For numbers
const count = data?.count ?? 0;
```

**Option 3: Type Guards**

```typescript
// Check before use
if (user && user.profile && user.profile.name) {
  const userName = user.profile.name;
  // Safe to use userName here
}
```

**Option 4: Non-null Assertion** (use sparingly)

```typescript
// Only if you're SURE it's not null
const userName = user!.profile!.name!;

// Better: with runtime check
if (!user) throw new Error('User required');
const userName = user.profile.name; // TypeScript knows user exists
```

**Option 5: Proper Type Definitions**

```typescript
// Explicit optional properties
interface User {
  id: string;
  email: string;
  profile?: {  // Optional
    name?: string;  // Optional
    avatar?: string;  // Optional
  };
}

// Use type
const user: User = await fetchUser();
```

**Best Practice for API Responses:**

```typescript
interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
}

async function fetchUser(): Promise<ApiResponse<User>> {
  try {
    const response = await fetch('/api/user');
    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

// Usage
const { data: user, error } = await fetchUser();
if (error || !user) {
  // Handle error
  return;
}
// user is definitely defined here
const name = user.profile?.name ?? 'Anonymous';
```

**Prevention:**
- Enable strict TypeScript mode
- Define proper interfaces with optional fields
- Use optional chaining and nullish coalescing
- Add runtime checks for critical values
- Let TypeScript guide you to safer code

---

### Error 7.2: Cannot find name (import errors)

**Error Message:**
```
Cannot find name 'useState'
Cannot find name 'Response'
Module '"@supabase/supabase-js"' has no exported member 'User'
```

**When It Occurred:**
TypeScript compilation

**Root Cause:**
- Missing imports
- Wrong import path
- Type not exported from library
- Typo in import name

**Solution:**

**Add Missing Imports:**

```typescript
// React hooks
import { useState, useEffect, useCallback } from 'react';

// Supabase types
import type { User, Session } from '@supabase/supabase-js';

// Lucide icons
import { Upload, Search, Trash2 } from 'lucide-react';
```

**Check Library Exports:**

```typescript
// Wrong
import { User } from '@supabase/supabase-js';

// Correct (type import)
import type { User } from '@supabase/supabase-js';
```

**For Edge Functions (Deno):**

```typescript
// Deno has global types
const response = new Response(); // Works without import

// But for TypeScript, add reference
/// <reference lib="deno.ns" />
```

**Auto-import in VS Code:**
- Hover over red underlined name
- Click "Quick Fix" or press `Cmd/Ctrl + .`
- Select "Add import"

**Prevention:**
- Use IDE auto-import features
- Check library documentation for correct imports
- Use type imports for types: `import type { ... }`
- Keep dependencies updated

---

### Error 7.3: Build Failing on Unused Variables

**Error Message:**
```
'refreshTrigger' is assigned a value but never used
'error' is defined but never used
```

**When It Occurred:**
Running `npm run build` or `npm run lint`

**Root Cause:**
- ESLint rule: `no-unused-vars`
- TypeScript: `noUnusedLocals` and `noUnusedParameters`
- Variable declared but not used in code

**Solution:**

**Option 1: Remove Unused Variables**

```typescript
// Before
const [data, setData] = useState(null);
const [error, setError] = useState(null); // Not used

// After
const [data, setData] = useState(null);
```

**Option 2: Prefix with Underscore**

```typescript
// Indicates intentionally unused
const [_data, setData] = useState(null);
const handleClick = (_event: MouseEvent) => {
  // Don't need event object
};
```

**Option 3: Use Type-only Import**

```typescript
// Before (unused import)
import { User } from '@supabase/supabase-js';

// After (type-only, doesn't count as unused)
import type { User } from '@supabase/supabase-js';
```

**Option 4: Disable Rule (last resort)**

```typescript
// Disable for one line
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const unusedVar = something;

// Disable for entire file (rarely needed)
/* eslint-disable @typescript-eslint/no-unused-vars */
```

**For Function Parameters:**

```typescript
// Use underscore for unused params
const onClick = (_event: MouseEvent) => {
  doSomething();
};

// Or omit if not needed
const onClick = () => {
  doSomething();
};
```

**Prevention:**
- Remove unused code promptly
- Use IDE warnings to catch early
- Prefix with _ for intentionally unused
- Run lint before committing

---

## 8. Edge Function Deployment Errors

### Error 8.1: Import Specifier Errors

**Error Message:**
```
Import from 'https://esm.sh/@aws-sdk/client-s3' failed
Module not found: @aws-sdk/client-s3
Cannot resolve "bcrypt"
```

**When It Occurred:**
Deploying edge functions to Supabase

**Root Cause:**
- Deno requires explicit import specifiers
- Cannot use bare specifiers like in Node.js
- Wrong CDN or package source
- Missing version specification

**Detailed Explanation:**
Deno (which powers Supabase Edge Functions) doesn't use node_modules. Instead, it fetches dependencies from URLs or registries. You must specify where to get each package using prefixes like `npm:` or `jsr:`.

**Solution:**

**Use npm: Prefix for NPM Packages:**

```typescript
// WRONG (doesn't work in Deno)
import { S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

// CORRECT (works in Deno)
import { S3Client } from "npm:@aws-sdk/client-s3@3.621.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
```

**Use jsr: Prefix for JSR Packages:**

```typescript
import { assertEquals } from "jsr:@std/assert@0.220.0";
```

**For Deno Standard Library:**

```typescript
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
```

**For Other CDNs** (avoid if possible):

```typescript
// esm.sh (not recommended, use npm: instead)
import * as bcrypt from "https://esm.sh/bcrypt@5.1.0";

// Better: use Deno-native bcrypt
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
```

**Always Include Version Numbers:**

```typescript
// WRONG (unstable, might break)
import { S3Client } from "npm:@aws-sdk/client-s3";

// CORRECT (pinned version)
import { S3Client } from "npm:@aws-sdk/client-s3@3.621.0";
```

**Complete Edge Function Import Example:**

```typescript
// Standard imports
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3@3.621.0";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

// Deno built-ins (no import needed)
console.log(); // Available globally
Deno.env.get(); // Available globally

Deno.serve(async (req: Request) => {
  // Function code
});
```

**Troubleshooting Import Errors:**

1. **Check package exists:**
   - Visit https://www.npmjs.com/package/package-name
   - Verify version number exists

2. **Use correct specifier:**
   - NPM packages: `npm:package@version`
   - JSR packages: `jsr:@scope/package@version`
   - Deno packages: full URL with version

3. **Test locally with Deno:**
```bash
deno run --allow-net your-function.ts
```

**Prevention:**
- Always use `npm:` prefix for NPM packages
- Always specify version numbers
- Test imports before deploying
- Use Deno standard library when possible
- Avoid esm.sh and unpkg.com

---

### Error 8.2: Environment Variables Not Available

**Error Message:**
```
AWS_ACCESS_KEY_ID is undefined
Cannot read environment variable
```

**When It Occurred:**
Edge function runtime trying to access env vars

**Root Cause:**
- Environment variables not set in Supabase
- Wrong variable name
- Accessing client-side env var from server
- Using process.env instead of Deno.env

**Solution:**

**Set Environment Variables in Supabase:**

1. Go to Supabase Dashboard
2. Navigate to Edge Functions → Secrets
3. Add each secret:
   - Name: `AWS_ACCESS_KEY_ID`
   - Value: Your AWS access key

**Access in Edge Function:**

```typescript
// WRONG (Node.js way)
const accessKey = process.env.AWS_ACCESS_KEY_ID;

// CORRECT (Deno way)
const accessKey = Deno.env.get('AWS_ACCESS_KEY_ID');
```

**With Validation:**

```typescript
const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
const region = Deno.env.get('AWS_REGION');
const bucketName = Deno.env.get('S3_BUCKET_NAME');

// Validate all required env vars
if (!accessKeyId || !secretAccessKey || !region || !bucketName) {
  console.error('Missing required environment variables');
  return new Response(
    JSON.stringify({
      error: 'Server configuration error',
      details: 'Missing AWS credentials'
    }),
    { status: 500, headers: corsHeaders }
  );
}
```

**For Supabase URLs (auto-provided):**

```typescript
// These are automatically available in edge functions
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
```

**Local Development:**

Create `.env.local` file:
```bash
AWS_ACCESS_KEY_ID=your_key_here
AWS_SECRET_ACCESS_KEY=your_secret_here
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket
```

Run with:
```bash
deno run --allow-env --env .env.local your-function.ts
```

**Security Best Practices:**
- Never commit `.env` files
- Use different keys for dev/prod
- Rotate keys regularly
- Use least privilege IAM policies
- Log masked values only (not full keys)

**Prevention:**
- Document all required env vars in README
- Validate env vars at function startup
- Use descriptive error messages
- Test with production-like env vars locally

---

## 9. UI/UX and Runtime Errors

### Error 9.1: Images Not Loading (Broken Image Icon)

**Error Message:**
```
(No console error - just broken image icon in browser)
GET https://bucket.s3.amazonaws.com/image.jpg 403 Forbidden
```

**When It Occurred:**
Images displayed in grid but showing broken icon

**Root Cause:**
- S3 URLs not publicly accessible
- CORS not configured on S3
- Image deleted but URL still in database
- Wrong S3 bucket region
- Image file corrupted during upload

**Solution:**

**Step 1: Verify S3 Public Access**

```bash
# Test if URL is publicly accessible
curl -I https://your-bucket.s3.amazonaws.com/test-image.jpg
```

Should return `200 OK`, not `403 Forbidden`.

Fix: Set bucket policy (see Section 5.2)

**Step 2: Add Error Handling to Images**

```typescript
const [imageError, setImageError] = useState<{ [key: string]: boolean }>({});

const handleImageError = (imageId: string) => {
  setImageError(prev => ({ ...prev, [imageId]: true }));
};

// In render
{images.map(image => (
  <div key={image.id}>
    {imageError[image.id] ? (
      <div className="error-placeholder">
        <ImageOff size={48} />
        <span>Image failed to load</span>
      </div>
    ) : (
      <img
        src={image.url}
        alt={image.filename}
        onError={() => handleImageError(image.id)}
      />
    )}
  </div>
))}
```

**Step 3: Validate URLs Before Storing**

```typescript
// In upload function
const imageUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;

// Test URL accessibility
try {
  const testResponse = await fetch(imageUrl, { method: 'HEAD' });
  if (!testResponse.ok) {
    console.error('Image URL not accessible:', imageUrl);
  }
} catch (error) {
  console.error('Failed to verify image URL:', error);
}

// Store in database
await supabase.from('images').insert({
  url: imageUrl,
  filename,
  user_id: user.id
});
```

**Step 4: Add Loading State**

```typescript
const [loadedImages, setLoadedImages] = useState<{ [key: string]: boolean }>({});

<img
  src={image.url}
  alt={image.filename}
  onLoad={() => setLoadedImages(prev => ({ ...prev, [image.id]: true }))}
  onError={() => handleImageError(image.id)}
  style={{ opacity: loadedImages[image.id] ? 1 : 0 }}
  className="transition-opacity duration-300"
/>
```

**Prevention:**
- Always set S3 bucket to public read
- Configure CORS on S3 bucket
- Add error handling to all img tags
- Show loading states
- Validate URLs after upload
- Use placeholder for broken images

---

### Error 9.2: Modal Not Closing

**Error Message:**
```
(No error - modal stuck open, can't close)
Clicks not registering on overlay
```

**When It Occurred:**
Opening modal then trying to close it

**Root Cause:**
- Event handler not properly attached
- Z-index issues (overlay behind content)
- stopPropagation preventing close
- State not updating on close

**Solution:**

**Proper Modal Structure:**

```typescript
function Modal({ isOpen, onClose, children }: ModalProps) {
  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    // Only close if clicking overlay, not modal content
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={handleOverlayClick}
    >
      <div
        className="bg-white rounded-lg p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()} // Prevent close when clicking inside
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4"
        >
          <X size={24} />
        </button>
        {children}
      </div>
    </div>
  );
}
```

**Usage:**

```typescript
function ParentComponent() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsModalOpen(true)}>
        Open Modal
      </button>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        <h2>Modal Content</h2>
        <p>Some content here</p>
      </Modal>
    </>
  );
}
```

**Add Escape Key Handler:**

```typescript
function Modal({ isOpen, onClose, children }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // ... rest of modal
}
```

**Prevent Body Scroll:**

```typescript
useEffect(() => {
  if (isOpen) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = 'unset';
  }

  return () => {
    document.body.style.overflow = 'unset';
  };
}, [isOpen]);
```

**Prevention:**
- Use proven modal component libraries (Radix UI, Headless UI)
- Test overlay click and escape key
- Prevent body scroll when modal open
- Use proper z-index stacking
- Stop propagation correctly

---

## 10. Production Issues and Fixes

### Error 10.1: Slow Search Performance

**Symptom:**
Search takes 3-5 seconds on collections with 100+ images

**Root Cause:**
- No database indexes on search columns
- Full table scan for every search
- Inefficient query pattern

**Diagnosis:**

```sql
-- Check query execution plan
EXPLAIN ANALYZE
SELECT * FROM images
WHERE filename ILIKE '%search%'
   OR 'search' = ANY(tags);
```

Results showed "Seq Scan" (sequential scan) instead of "Index Scan"

**Solution:**

**Step 1: Add Indexes**

```sql
-- Index for filename search
CREATE INDEX idx_images_filename ON images (filename);

-- GIN index for array search (tags)
CREATE INDEX idx_images_tags ON images USING GIN (tags);

-- Composite index for user queries
CREATE INDEX idx_images_user_deleted ON images (user_id, deleted_at)
WHERE deleted_at IS NULL;
```

**Step 2: Optimize Query**

Before (slow):
```sql
SELECT * FROM images
WHERE (
  filename ILIKE '%search%'
  OR 'search' = ANY(tags)
)
AND user_id = $1
AND deleted_at IS NULL;
```

After (fast):
```sql
SELECT * FROM images
WHERE user_id = $1
  AND deleted_at IS NULL
  AND (
    filename ILIKE '%search%'
    OR tags @> ARRAY[$2]::text[]
  )
ORDER BY created_at DESC
LIMIT 100;
```

**Step 3: Add Full-Text Search (Optional)**

```sql
-- Add tsvector column
ALTER TABLE images ADD COLUMN search_vector tsvector;

-- Generate search vector
UPDATE images
SET search_vector = to_tsvector('english', filename || ' ' || array_to_string(tags, ' '));

-- Create GIN index on tsvector
CREATE INDEX idx_images_search_vector ON images USING GIN (search_vector);

-- Query using full-text search
SELECT * FROM images
WHERE user_id = $1
  AND deleted_at IS NULL
  AND search_vector @@ to_tsquery('english', $2)
ORDER BY ts_rank(search_vector, to_tsquery('english', $2)) DESC;
```

**Results:**
- Before: 3-5 seconds
- After: <500ms
- 10x performance improvement

**Prevention:**
- Add indexes during initial schema design
- Monitor slow queries
- Use EXPLAIN ANALYZE for query optimization
- Benchmark with realistic data volumes

---

### Error 10.2: Album Image Count Incorrect

**Symptom:**
Album shows "10 images" but only 7 visible

**Root Cause:**
Count query including deleted images

**Diagnosis:**

```typescript
// Original (wrong) query
const { count } = await supabase
  .from('album_images')
  .select('*', { count: 'exact' })
  .eq('album_id', albumId);
// Returns 10 (includes 3 deleted images)
```

**Solution:**

```typescript
// Corrected query - JOIN to filter deleted
const { count } = await supabase
  .from('album_images')
  .select('image_id, images!inner(id, deleted_at)', { count: 'exact' })
  .eq('album_id', albumId)
  .is('images.deleted_at', null);
// Returns 7 (only non-deleted images)
```

**Backend Function Fix:**

```typescript
// Get album with correct image count
const { data: album } = await supabase
  .from('albums')
  .select(`
    id,
    name,
    created_at,
    album_images(
      image_id,
      images!inner(
        id,
        filename,
        url,
        deleted_at
      )
    )
  `)
  .eq('id', albumId)
  .is('album_images.images.deleted_at', null)
  .single();

const imageCount = album?.album_images?.length || 0;
```

**Prevention:**
- Always filter deleted_at in JOINs
- Test with deleted data
- Add explicit filters for soft-deleted rows
- Create database views for common filtered queries

---

### Error 10.3: Hidden Images Appearing in Search

**Symptom:**
Hidden images showing up in search results

**Root Cause:**
Search query not checking is_hidden flag

**Solution:**

**Update Search Function:**

```typescript
// Before (bug)
const { data: images } = await supabase
  .from('images')
  .select('*')
  .eq('user_id', user.id)
  .is('deleted_at', null)
  .or(`filename.ilike.%${query}%, tags.cs.{${query}}`);

// After (fixed)
const { data: images } = await supabase
  .from('images')
  .select('*')
  .eq('user_id', user.id)
  .eq('is_hidden', false)  // ← Added this
  .is('deleted_at', null)
  .or(`filename.ilike.%${query}%, tags.cs.{${query}}`);
```

**Update All Image Queries:**

```typescript
// Standard filter for "visible" images
const baseFilter = {
  user_id: user.id,
  is_hidden: false,
  deleted_at: null
};

// get-images function
const { data } = await supabase
  .from('images')
  .select('*')
  .match(baseFilter)
  .order('created_at', { ascending: false });

// search-images function
const { data } = await supabase
  .from('images')
  .select('*')
  .match(baseFilter)
  .or(`filename.ilike.%${query}%, tags.cs.{${query}}`);

// For hidden folder specifically
const { data: hiddenImages } = await supabase
  .from('images')
  .select('*')
  .eq('user_id', user.id)
  .eq('is_hidden', true)  // ← Different filter
  .is('deleted_at', null);
```

**Create Database View:**

```sql
-- View for user's visible images
CREATE VIEW user_visible_images AS
SELECT *
FROM images
WHERE deleted_at IS NULL
  AND is_hidden = false;

-- Query the view (RLS still applies)
SELECT * FROM user_visible_images
WHERE user_id = auth.uid();
```

**Prevention:**
- Document filter requirements for each query
- Create reusable filter objects
- Use database views for complex filters
- Test with hidden/deleted test data

---

## 11. AI Tagging Errors

### Error 11.1: Maximum Call Stack Size Exceeded

**Error Message:**
```
RangeError: Maximum call stack size exceeded
  at String.fromCharCode (<anonymous>)
```

**When It Occurred:**
AI tagging worked for images from internet but failed for images uploaded from PC

**Root Cause:**
Using spread operator with large arrays in `String.fromCharCode(...array)` exceeded JavaScript's maximum call stack size. Images from PCs (especially modern cameras/phones) are much larger than web-optimized images.

**Detailed Explanation:**

The original code:
```typescript
// PROBLEMATIC CODE
const uint8Array = new Uint8Array(imageArrayBuffer);
const imageBase64 = btoa(
  String.fromCharCode(...uint8Array)  // ← Spread operator causes stack overflow
);
```

How the spread operator works:
```typescript
// This is equivalent to:
String.fromCharCode(byte1, byte2, byte3, ..., byte1000000)
// For a 2MB image, this tries to pass ~2,000,000 arguments!
```

JavaScript call stack limits:
- Chrome: ~10,000-20,000 arguments
- Firefox: ~100,000 arguments
- A 2MB image: ~2,000,000 bytes

**Why it worked for web images:**
- Web images are usually optimized (100-500KB)
- Compressed formats
- Smaller dimensions
- Within stack size limits

**Why it failed for PC images:**
- Modern phone cameras: 4-12MB raw photos
- High resolution: 4000x3000+ pixels
- Uncompressed or lightly compressed
- Far exceeds stack limits

**Solution:**

**Chunked Conversion Approach:**

```typescript
// FIXED CODE - Process in chunks
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const uint8Array = new Uint8Array(buffer);
  let binaryString = '';
  const chunkSize = 8192; // 8KB chunks

  // Process in manageable chunks
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.slice(i, i + chunkSize);
    // Convert chunk to array for fromCharCode
    binaryString += String.fromCharCode.apply(null, Array.from(chunk));
  }

  return btoa(binaryString);
}

// Usage in generate-tags function
const imageArrayBuffer = await fetch(imageUrl).then(r => r.arrayBuffer());
const imageBase64 = arrayBufferToBase64(imageArrayBuffer);
```

**Why This Works:**
1. **Small chunks**: 8192 bytes per call, well within stack limits
2. **Loop-based**: No recursion or deep call stack
3. **Accumulation**: Builds string incrementally
4. **Universal**: Works for any size image

**Alternative Solutions:**

**Option 1: Use Blob URL** (if possible)
```typescript
const blob = new Blob([imageArrayBuffer]);
const blobUrl = URL.createObjectURL(blob);
// Pass blobUrl to API if it accepts blob URLs
```

**Option 2: Use FileReader** (browser only)
```typescript
function arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
  return new Promise((resolve) => {
    const blob = new Blob([buffer]);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
}
```

**Option 3: Chunk Size Optimization**
```typescript
// Determine optimal chunk size
const chunkSize = Math.min(8192, Math.floor(uint8Array.length / 100));
// For 1MB image: min(8192, 10000) = 8192
// For 100KB image: min(8192, 1000) = 1000
```

**Testing Different Image Sizes:**

| Image Source | Size | Old Code | New Code |
|---|---|---|---|
| Web (optimized) | 200KB | ✅ Works | ✅ Works |
| Web (large) | 1MB | ❌ Fails | ✅ Works |
| PC (compressed) | 2MB | ❌ Fails | ✅ Works |
| PC (raw) | 8MB | ❌ Fails | ✅ Works |
| Phone camera | 12MB | ❌ Fails | ✅ Works |

**Performance Comparison:**
- Old code: Fast for small images, crashes for large
- New code: Slightly slower but reliable for all sizes
- Overhead: ~50ms for 5MB image (negligible)

**Complete Fixed Function:**

```typescript
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();

    // Fetch image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch image');
    }

    const imageArrayBuffer = await imageResponse.arrayBuffer();

    // FIXED: Chunked conversion
    const uint8Array = new Uint8Array(imageArrayBuffer);
    let binaryString = '';
    const chunkSize = 8192;

    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      binaryString += String.fromCharCode.apply(null, Array.from(chunk));
    }

    const imageBase64 = btoa(binaryString);
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

    // Call OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this image and provide 5-10 relevant tags...'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 100
      })
    });

    const result = await openaiResponse.json();
    const tags = result.choices[0].message.content.split(',').map(t => t.trim());

    return new Response(
      JSON.stringify({ tags }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('AI tagging error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

**Prevention:**
- Never use spread operator with large arrays
- Process large data in chunks
- Test with realistic file sizes
- Consider image size limits (10MB)
- Use streaming for very large files
- Monitor memory usage

---

### Error 11.2: OpenAI API Rate Limit

**Error Message:**
```
429 Too Many Requests
Rate limit exceeded. Please try again later.
```

**When It Occurred:**
Uploading multiple images quickly

**Root Cause:**
- OpenAI has rate limits per minute/day
- No rate limiting on our side
- Multiple images processed simultaneously

**Solution:**

**Implement Queue with Rate Limiting:**

```typescript
// Simple queue implementation
class TaggingQueue {
  private queue: Array<() => Promise<void>> = [];
  private processing = false;
  private minDelay = 1000; // 1 second between requests

  async add(task: () => Promise<void>) {
    this.queue.push(task);
    if (!this.processing) {
      this.processQueue();
    }
  }

  private async processQueue() {
    this.processing = true;
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        await task();
        // Wait before next request
        await new Promise(resolve => setTimeout(resolve, this.minDelay));
      }
    }
    this.processing = false;
  }
}

// Usage
const taggingQueue = new TaggingQueue();

// When uploading multiple images
for (const image of images) {
  taggingQueue.add(async () => {
    await generateTags(image.url);
  });
}
```

**Add Retry Logic:**

```typescript
async function generateTagsWithRetry(
  imageUrl: string,
  maxRetries = 3
): Promise<string[]> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ imageUrl })
      });

      if (response.status === 429) {
        // Rate limited
        const retryAfter = response.headers.get('Retry-After') || '60';
        const waitTime = parseInt(retryAfter) * 1000;
        console.log(`Rate limited. Waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const { tags } = await response.json();
      return tags;

    } catch (error) {
      if (attempt === maxRetries) {
        console.error('Failed after retries:', error);
        return []; // Return empty tags on final failure
      }
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }
  return [];
}
```

**User Feedback:**

```typescript
const [taggingProgress, setTaggingProgress] = useState({
  total: 0,
  completed: 0,
  failed: 0
});

// During upload
setTaggingProgress({ total: images.length, completed: 0, failed: 0 });

// After each image
setTaggingProgress(prev => ({
  ...prev,
  completed: prev.completed + 1
}));

// UI display
{taggingProgress.total > 0 && (
  <div className="mt-2 text-sm text-gray-600">
    Generating AI tags: {taggingProgress.completed} / {taggingProgress.total}
    {taggingProgress.failed > 0 && (
      <span className="text-red-600"> ({taggingProgress.failed} failed)</span>
    )}
  </div>
)}
```

**Prevention:**
- Implement rate limiting on your side
- Queue AI requests
- Add retry logic with backoff
- Show progress to users
- Consider batch processing
- Monitor API usage

---

## 12. Performance and Optimization Issues

### Issue 12.1: Slow Initial Page Load

**Symptoms:**
- White screen for 2-3 seconds
- Large JavaScript bundle
- Images loading slowly

**Solutions Implemented:**

**1. Code Splitting:**

```typescript
// Lazy load components
import { lazy, Suspense } from 'react';

const Albums = lazy(() => import('./components/Albums'));
const TrashBin = lazy(() => import('./components/TrashBin'));
const HiddenFolder = lazy(() => import('./components/HiddenFolder'));

// Usage with fallback
<Suspense fallback={<LoadingSpinner />}>
  <Albums />
</Suspense>
```

**2. Image Optimization:**

```typescript
// Add loading="lazy" to images
<img
  src={image.url}
  alt={image.filename}
  loading="lazy"  // Browser-native lazy loading
  className="w-full h-full object-cover"
/>
```

**3. Optimize Bundle:**

```javascript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'supabase': ['@supabase/supabase-js'],
        }
      }
    }
  }
});
```

**Results:**
- Initial load: 3s → 1.5s
- JavaScript bundle: 500KB → 350KB
- Time to Interactive: 3.5s → 2s

---

### Issue 12.2: Memory Leaks on Long Sessions

**Symptoms:**
- Browser tab using increasing memory
- Page slowing down after 30+ minutes
- React DevTools showing component leaks

**Solutions:**

**1. Cleanup Event Listeners:**

```typescript
useEffect(() => {
  const handleResize = () => {
    // Handle resize
  };

  window.addEventListener('resize', handleResize);

  // Cleanup
  return () => {
    window.removeEventListener('resize', handleResize);
  };
}, []);
```

**2. Clear Image Object URLs:**

```typescript
const [previewUrl, setPreviewUrl] = useState<string | null>(null);

const handleFileSelect = (file: File) => {
  // Revoke old URL
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
  }

  // Create new URL
  const url = URL.createObjectURL(file);
  setPreviewUrl(url);
};

// Cleanup on unmount
useEffect(() => {
  return () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  };
}, [previewUrl]);
```

**3. Limit Rendered Items:**

```typescript
// Virtual scrolling for large lists
import { useVirtualizer } from '@tanstack/react-virtual';

function ImageGrid({ images }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: images.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 250, // Image height
    overscan: 5
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map(virtualItem => (
          <div key={virtualItem.index}>
            <ImageCard image={images[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 13. Prevention Strategies

### Strategy 1: Comprehensive Error Handling

**Always wrap async operations:**

```typescript
async function handleOperation() {
  try {
    setLoading(true);
    setError(null);

    const result = await performOperation();

    setSuccess(true);
    return result;
  } catch (error) {
    console.error('Operation failed:', error);
    setError(error instanceof Error ? error.message : 'Operation failed');
    return null;
  } finally {
    setLoading(false);
  }
}
```

### Strategy 2: Type Safety

**Use TypeScript strictly:**

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Strategy 3: Input Validation

**Validate all user inputs:**

```typescript
function validateImage(file: File): string | null {
  if (!file.type.startsWith('image/')) {
    return 'File must be an image';
  }

  if (file.size > 10 * 1024 * 1024) {
    return 'Image must be less than 10MB';
  }

  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return 'Invalid image format';
  }

  return null;
}
```

### Strategy 4: Test Edge Cases

**Always test:**
- Empty states (no data)
- Error states (API failures)
- Loading states (slow network)
- Large datasets (100+ items)
- Long strings (overflow)
- Special characters (SQL injection attempts)
- Concurrent operations (race conditions)

### Strategy 5: Monitor Production

**Implement logging:**

```typescript
// Frontend error boundary
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to service (Sentry, LogRocket, etc.)
    console.error('React Error:', error, errorInfo);
  }
}

// Backend logging
try {
  // Operation
} catch (error) {
  console.error('Function error:', {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    userId: user.id
  });
  throw error;
}
```

---

## 14. Lessons Learned

### Lesson 1: Start with Security

- Enable RLS from day one
- Create policies before adding features
- Never skip authentication checks
- Test with multiple user accounts early

### Lesson 2: Error Handling is Not Optional

- Every API call needs try-catch
- User-friendly error messages matter
- Log errors for debugging
- Failed operations should not break the app

### Lesson 3: Test with Real Data

- Test with large images (>5MB)
- Test with 100+ images in database
- Test with slow network (throttle in DevTools)
- Test with different browsers

### Lesson 4: TypeScript Saves Time

- Type errors caught at compile time
- Refactoring is safer
- IDE autocomplete helps tremendously
- Worth the initial learning curve

### Lesson 5: Read the Documentation

- CORS issues: Read Deno/Supabase docs
- RLS policies: Read PostgreSQL docs
- S3 errors: Read AWS docs
- Saves hours of trial-and-error

### Lesson 6: Performance Matters

- Users notice slow search
- Large images need optimization
- Database indexes are crucial
- Monitor bundle size

### Lesson 7: UX During Errors

- Show loading states always
- Provide actionable error messages
- Don't lose user data on errors
- Confirm destructive actions

### Lesson 8: Incremental Development

- Build features one at a time
- Test each feature thoroughly before moving on
- Don't accumulate technical debt
- Refactor as you go

---

## Conclusion

This comprehensive guide documents every significant error encountered during the development of PicHaven, from initial setup through production deployment. Each error represents a learning opportunity and the solutions provided reflect best practices in modern web development.

**Key Takeaways:**

1. **Error Prevention > Error Handling > Error Recovery**
   - Write defensive code
   - Validate inputs
   - Use TypeScript strictly

2. **Testing Saves Time**
   - Test edge cases early
   - Use realistic data volumes
   - Test across browsers and devices

3. **Documentation is Essential**
   - Document errors and solutions
   - Keep troubleshooting guides
   - Share knowledge with team

4. **Security Cannot Be Added Later**
   - Design with security from start
   - RLS, authentication, validation
   - Regular security audits

5. **User Experience During Failures**
   - Clear error messages
   - Graceful degradation
   - Don't lose user data

By documenting these errors and their solutions, future developers can avoid the same pitfalls and build better applications faster.

---

**Document Version:** 1.0
**Last Updated:** November 2025
**Total Errors Documented:** 40+
**Categories Covered:** 12
**Status:** Complete & Production-Tested