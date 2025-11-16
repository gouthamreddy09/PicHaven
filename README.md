# PicHaven


A full-stack image upload and search application similar to Google Photos, built with React, Supabase Edge Functions, and AWS S3.

## Features

### Core Features
- **Upload images** with drag-and-drop interface
- **🤖 AI-Powered Image Tagging** - Automatic content analysis using OpenAI GPT-4 Vision
- Real-time image preview before upload
- **Smart Search** by filename or AI-generated tags (case-insensitive)
- Responsive grid layout with hover animations (2-5 columns)
- Cloud storage using AWS S3
- PostgreSQL database for metadata storage

### Organization Features
- **Albums** - Create, manage, and organize images into albums
- **Favorites** - Mark important images for quick access
- **Hidden Folder** - Password-protected private storage
- **Trash Bin** - Soft delete with restore and permanent delete options

### User Features
- **User Authentication** - Secure login/signup with JWT
- **Data Isolation** - Row Level Security ensures complete privacy
- **Rename Images** - Update image names directly
- **Filter Options** - Show all, favorites, or hidden images

### Technical Features
- Modern, clean UI with Tailwind CSS
- 20 serverless Edge Functions for scalability
- Optimized database queries with GIN indexes
- Cross-browser compatible (Chrome, Firefox, Safari, Edge)
- Fully responsive (mobile, tablet, desktop)

## Tech Stack

**Frontend:**
- React 18 with TypeScript
- Vite for fast development and building
- Tailwind CSS for styling
- Lucide React for icons

**Backend:**
- Supabase Edge Functions (Deno runtime)
- Supabase PostgreSQL database
- AWS S3 for image storage
- OpenAI GPT-4 Vision API for AI tagging

## Prerequisites

Before you begin, ensure you have:

1. **AWS Account** with S3 bucket created
   - Access Key ID
   - Secret Access Key
   - S3 Bucket Name
   - AWS Region

2. **Supabase Project** (already configured in this project)

3. **OpenAI API Key** for AI-powered image tagging
   - Get your API key from: https://platform.openai.com/api-keys
   - Required for automatic tag generation

## Setup Instructions

### 1. Configure AWS Credentials

Edit the `.env` file and add your AWS credentials:

```bash
AWS_ACCESS_KEY_ID=your_actual_access_key_id
AWS_SECRET_ACCESS_KEY=your_actual_secret_access_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your_bucket_name
```

**Important:** Make sure your S3 bucket has the correct CORS configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

### 2. Configure S3 Bucket Policy

Your S3 bucket should allow public read access for uploaded images. Add this bucket policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your_bucket_name/*"
    }
  ]
}
```

### 3. Configure OpenAI API Key

The OpenAI API key should be set in your Supabase Edge Function Secrets (not in .env file):

1. Go to your Supabase Dashboard
2. Navigate to Settings → Edge Functions → Secrets
3. Add a new secret:
   - Name: `OPENAI_API_KEY`
   - Value: Your OpenAI API key from https://platform.openai.com/api-keys

Note: If the API key is not configured, image uploads will still work but won't have AI-generated tags.

### 4. Install Dependencies

```bash
npm install
```

### 5. Run Development Server

The development server is automatically started for you in this environment.

## Project Structure

```
/
├── src/
│   ├── components/
│   │   ├── UploadForm.tsx      # Image upload with preview
│   │   ├── SearchBar.tsx       # Search functionality
│   │   └── ImageGrid.tsx       # Responsive image grid
│   ├── App.tsx                 # Main application component
│   └── main.tsx                # Application entry point
├── supabase/
│   └── functions/
│       ├── upload-image/       # Handles S3 upload and DB insert
│       ├── search-images/      # Search images by keyword
│       └── get-images/         # Fetch all images
└── .env                        # Environment variables
```

## API Endpoints

### 1. Upload Image
- **Endpoint:** `POST /functions/v1/upload-image`
- **Body:** FormData with 'image' file
- **Description:** Uploads image to S3 and stores metadata in database
- **Auto-generates tags** from filename
- **AI Enhancement:** Automatically calls generate-tags to analyze image content and add intelligent tags

### 2. Get All Images
- **Endpoint:** `GET /functions/v1/get-images`
- **Description:** Retrieves all uploaded images from database

### 3. Search Images
- **Endpoint:** `GET /functions/v1/search-images?query=keyword`
- **Description:** Searches images by filename or AI-generated tags (case-insensitive)

### 4. Generate Tags (AI)
- **Endpoint:** `POST /functions/v1/generate-tags`
- **Body:** `{ "imageUrl": "https://..." }`
- **Description:** Analyzes image content using OpenAI GPT-4 Vision and returns relevant tags
- **AI Model:** GPT-4o-mini with vision capabilities
- **Returns:** 5-10 contextually relevant tags based on image content

## Database Schema

### Images Table
```sql
CREATE TABLE images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  url text NOT NULL,
  tags text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now()
);
```

## How It Works

1. **Upload Process:**
   - User selects an image file
   - Preview is shown before upload
   - File is sent to `upload-image` Edge Function
   - Edge Function uploads to S3 using AWS SDK
   - Initial metadata (filename, URL) is stored in PostgreSQL
   - Basic tags are extracted from filename
   - **AI Analysis:** Image is sent to OpenAI GPT-4 Vision API
   - **Smart Tagging:** AI analyzes image content and generates 5-10 relevant tags
   - Combined tags (filename + AI-generated) are saved to database
   - Tags appear with sparkle icon ✨ in the UI

2. **Search Process:**
   - User enters search keyword
   - Frontend calls `search-images` with query parameter
   - Backend filters images by matching filename or AI-generated tags
   - Results are displayed in responsive grid with AI tag indicators

3. **Display:**
   - Images load in responsive grid (2-5 columns)
   - Hover animations show filename and tags
   - Lazy loading for performance

### AI Tagging Technical Details

The AI tagging feature uses a chunked base64 conversion approach to handle images of all sizes:

- **For web URLs:** Direct URL passing to OpenAI Vision API
- **For uploaded files:** Chunked base64 encoding to prevent stack overflow
- **Solution:** Processes large images in 50KB chunks instead of using spread operator
- **Result:** Reliable tagging for images up to 10MB

This approach solves the "Maximum call stack size exceeded" error that occurred with large image files when using `String.fromCharCode(...new Uint8Array(buffer))`.

## Deployment

### Frontend (Netlify)

1. Connect your GitHub repository to Netlify
2. Configure build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
3. Add environment variables in Netlify dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### Backend (Supabase Edge Functions)

The Edge Functions are already deployed in your Supabase project. To update them:

1. Make changes to function files in `supabase/functions/`
2. Functions are automatically deployed through the Supabase dashboard

### Environment Variables for Production

Add these to your Netlify deployment:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Add these to your Supabase Edge Functions:
```
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
S3_BUCKET_NAME=your_bucket_name
```

## Features Demo

- **Clean UI:** Minimalist white design with blue accents
- **Responsive:** Works on mobile, tablet, and desktop
- **Fast Upload:** Direct S3 upload with progress feedback
- **Smart Search:** Keyword matching across filenames and tags
- **Auto-tagging:** Extracts tags from filename automatically
- **Grid Layout:** Beautiful responsive grid with hover effects

## Security

- Row Level Security (RLS) enabled on database
- Public access policies for demo purposes
- CORS configured for cross-origin requests
- Environment variables for sensitive credentials

## Future Enhancements

### AI & Intelligence
- AWS Rekognition integration for enhanced object detection
- Face detection and grouping
- Scene detection and classification
- Smart recommendations based on usage

### Sharing & Collaboration
- Share links for images/albums with expiration
- Collaborative albums (multi-user)
- Download albums as ZIP
- Public gallery mode

### Advanced Organization
- Nested albums (sub-albums)
- Custom tags management UI
- Bulk operations (multi-select actions)
- Drag-and-drop reorganization

### Image Editing
- Crop, rotate, flip
- Filters and effects
- Text and drawing overlay
- Image compression settings

### Performance & Storage
- Image CDN for faster delivery
- WebP format conversion
- Thumbnail generation
- Storage usage dashboard
- Duplicate detection

### Mobile
- Native iOS/Android apps
- Auto-upload from camera
- Offline access
- Push notifications

## Troubleshooting

### Images not uploading:
- Check AWS credentials in `.env`
- Verify S3 bucket CORS configuration
- Check S3 bucket policy allows PUT operations
- Ensure file size is under 10MB limit
- Verify file type is a valid image format

### Images not displaying:
- Verify S3 bucket policy allows public read access
- Check that uploaded images are publicly accessible
- Clear browser cache and reload
- Check browser console for CORS errors

### Search not working:
- Ensure database has image records
- Check that tags are being generated correctly
- Verify PostgreSQL GIN index exists on tags column
- Test with simple single-word queries first

### AI Tagging Issues:

**AI tags not generating:**
- Verify `OPENAI_API_KEY` is set in Supabase Edge Function Secrets
- Check OpenAI API key has sufficient credits
- Review `generate-tags` function logs in Supabase dashboard
- Note: Image uploads work without AI tags, they're optional

**Stack overflow error with large images:**
- This was fixed in the latest version using chunked base64 conversion
- If still occurring, ensure you're using the latest `generate-tags` function
- The function now processes images in 50KB chunks
- Maximum supported image size: 10MB

### Authentication Issues:
- Clear browser localStorage and retry login
- Check Supabase auth configuration
- Verify RLS policies are properly set up
- Try incognito/private browsing mode

### Performance Issues:
- Check network connection speed
- Verify Supabase and S3 are accessible
- Clear browser cache
- Check for console errors indicating failed requests

## License

MIT

## Support

For issues and questions, please check the console logs for detailed error messages.
