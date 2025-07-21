# GitHub Packages Setup

This project now uses GitHub Packages for private npm distribution. Here's how to use the packages:

## ✅ Current Status
- **All packages published** to GitHub Packages registry
- **Dependencies updated** to use published versions (`^1.0.1`)
- **Dockerfiles updated** to pull from GitHub Packages
- **Local development** still works with file: references when needed

## Authentication Setup

1. Create a Personal Access Token (PAT) with `packages:read` permission
2. Configure npm to use GitHub Packages for @iakhator scope:

```bash
npm config set @iakhator:registry https://npm.pkg.github.com
npm config set //npm.pkg.github.com/:_authToken YOUR_PERSONAL_ACCESS_TOKEN
```

Or add to your `.npmrc` file:
```
@iakhator:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_PERSONAL_ACCESS_TOKEN
```

## Package Structure

- `@iakhator/scraper-types` - Shared TypeScript types
- `@iakhator/scraper-logger` - Winston-based logging utility  
- `@iakhator/scraper-aws-wrapper` - AWS DynamoDB and SQS operations
- `@iakhator/scraper-core` - Business services layer

## Installation

Once published, you can install packages normally:

```bash
npm install @iakhator/scraper-types
npm install @iakhator/scraper-logger
npm install @iakhator/scraper-aws-wrapper
npm install @iakhator/scraper-core
```

## Local Development

For local development, the packages still use `file:` dependencies so you can make changes and test immediately.

## Publishing

Packages are automatically published when changes are pushed to the `main` branch in the `packages/` directory. You can also manually trigger publishing via the GitHub Actions workflow.

## Docker Build with GitHub Packages

The Dockerfiles are configured to install packages from GitHub Packages during build. You need to provide your GitHub token:

```bash
# For local testing (replace YOUR_TOKEN with actual token)
docker build --build-arg GITHUB_TOKEN=YOUR_TOKEN -t scraper-queue apps/queue

# For production deployment on Render/etc
docker build --build-arg GITHUB_TOKEN=$GITHUB_TOKEN -t scraper-queue apps/queue
```

**Security Note**: The `.npmrc` file is created dynamically during build and removed after installation to avoid persisting the token in the image.

## Deployment (Render)

For deployment on Render, you'll need to:

1. Set the `GITHUB_TOKEN` environment variable in your Render service
2. The Dockerfile will automatically handle authentication during build

**No additional configuration needed** - the Docker build process creates the `.npmrc` file dynamically using the provided `GITHUB_TOKEN` build argument.
