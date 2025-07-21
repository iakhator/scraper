#!/bin/bash
# Script to switch between local file: dependencies and published package versions

ACTION=${1:-"local"}

update_package_json() {
    local file=$1
    local action=$2
    
    if [ "$action" == "published" ]; then
        # Switch to published package versions
        sed -i '' 's/"@iakhator\/scraper-\([^"]*\)": "file:[^"]*"/"@iakhator\/scraper-\1": "^1.0.0"/g' "$file"
        echo "Updated $file to use published packages"
    else
        # Switch back to local file: dependencies  
        sed -i '' 's/"@iakhator\/scraper-types": "[^"]*"/"@iakhator\/scraper-types": "file:..\/..\/packages\/types"/g' "$file"
        sed -i '' 's/"@iakhator\/scraper-logger": "[^"]*"/"@iakhator\/scraper-logger": "file:..\/..\/packages\/logger"/g' "$file"
        sed -i '' 's/"@iakhator\/scraper-aws-wrapper": "[^"]*"/"@iakhator\/scraper-aws-wrapper": "file:..\/..\/packages\/aws-wrapper"/g' "$file"
        sed -i '' 's/"@iakhator\/scraper-core": "[^"]*"/"@iakhator\/scraper-core": "file:..\/..\/packages\/core"/g' "$file"
        
        # For packages within packages/ directory, adjust paths
        sed -i '' 's/"@iakhator\/scraper-types": "[^"]*"/"@iakhator\/scraper-types": "file:..\/types"/g' "$file"
        sed -i '' 's/"@iakhator\/scraper-logger": "[^"]*"/"@iakhator\/scraper-logger": "file:..\/logger"/g' "$file"
        sed -i '' 's/"@iakhator\/scraper-aws-wrapper": "[^"]*"/"@iakhator\/scraper-aws-wrapper": "file:..\/aws-wrapper"/g' "$file"
        
        echo "Updated $file to use local file: dependencies"
    fi
}

if [ "$ACTION" == "published" ]; then
    echo "Switching to published package versions..."
    update_package_json "packages/core/package.json" "published"
    update_package_json "apps/queue/package.json" "published"
    update_package_json "apps/worker/package.json" "published"
elif [ "$ACTION" == "local" ]; then
    echo "Switching to local file: dependencies..."
    update_package_json "packages/core/package.json" "local"
    update_package_json "apps/queue/package.json" "local"
    update_package_json "apps/worker/package.json" "local"
else
    echo "Usage: $0 [local|published]"
    echo "  local     - Use file: dependencies for local development (default)"
    echo "  published - Use published package versions for deployment"
    exit 1
fi

echo "Done! Run 'npm install' to update dependencies."
