#!/bin/bash

# Create a temporary file
cp src/components/AdminDashboard.tsx src/components/AdminDashboard.tsx.tmp

# Remove duplicate imports (lines 10-13)
sed -i '' '10,13d' src/components/AdminDashboard.tsx.tmp

# Move the fixed file back
mv src/components/AdminDashboard.tsx.tmp src/components/AdminDashboard.tsx

echo "Fixed duplicate imports"
