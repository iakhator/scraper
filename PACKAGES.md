# GitHub Packages Setup

This project now uses GitHub Packages for private npm distribution. Here's how to use the packages:

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

## Deployment (Render)

For deployment on Render, you'll need to:

1. Set the `GITHUB_TOKEN` environment variable in your Render service
2. Add `.npmrc` configuration to your Dockerfile:

```dockerfile
# In your Dockerfile
COPY .npmrc ./
RUN npm ci
```

Where `.npmrc` contains:
```
@iakhator:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```
