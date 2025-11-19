# CSV Logo Examples

This document provides examples of how to add company logos to your CSV files.

## Logo URL Column

You can add a logo to your company CSV by including one of these column names:
- `logo_url` (recommended)
- `company_logo`
- `logo`

## Example CSV with Logo

```csv
company_id,company_name,industry,learning_path_approval,primary_KPIs,logo_url,department_id,department_name,...
1,My Company,Technology,Automatic,Employee Growth,https://example.com/logo.png,ENG,Engineering,...
```

## Logo URL Options

### 1. External Image URLs
You can use any publicly accessible image URL:
- `https://example.com/logo.png`
- `https://example.com/logo.jpg`
- `https://example.com/logo.svg`

### 2. Logo Services
You can use logo services like:
- **Clearbit Logo API**: `https://logo.clearbit.com/example.com`
  - Automatically fetches company logos based on domain
  - Example: `https://logo.clearbit.com/github.com`
  
- **Google Logo Search**: Use Google's logo search results
- **Company Website**: Direct link to logo on company website

### 3. Image Hosting Services
- **Imgur**: Upload logo and use direct image link
- **Cloudinary**: Use Cloudinary CDN URLs
- **AWS S3**: If you have S3 bucket with public access
- **GitHub**: Use GitHub raw file URLs

## Sample CSV Files

Two sample CSV files with logos are provided:
1. `techflow_with_logo_sample.csv` - Uses Clearbit logo API
2. `cloudsync_with_logo_sample.csv` - Uses Clearbit logo API

## Notes

- Logo URL must be publicly accessible (no authentication required)
- Supported image formats: PNG, JPG, JPEG, SVG, GIF
- Logo will be displayed at 80x80px in the Company Profile
- If logo fails to load, the system will show the first letter of the company name as a fallback
- Logo is optional - if not provided, the initial letter placeholder will be shown

## Testing

1. Use one of the provided sample CSV files
2. Register a company with the CSV
3. Check the Company Profile page to see the logo displayed

