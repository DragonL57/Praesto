#!/usr/bin/env node

const { execSync } = require('child_process');

/**
 * This script handles the build process on Vercel.
 * It runs migrations separately with a timeout and specific error handling
 * to avoid build failures related to database connectivity issues.
 */

console.log('🚀 Starting Vercel build process...');

try {
  // Run database migrations with a timeout
  console.log('📊 Running database migrations...');
  try {
    execSync('npx tsx lib/db/migrate.ts', { 
      timeout: 30000, // 30 seconds timeout for migrations
      stdio: 'inherit' 
    });
    console.log('✅ Migrations completed successfully');
  } catch (migrationError) {
    console.warn('⚠️ Migration step failed or timed out, continuing with build anyway');
    console.warn('   Error details:', migrationError.message);
  }

  // Run Next.js build regardless of migration success
  console.log('🏗️ Building Next.js application...');
  execSync('next build', { stdio: 'inherit' });
  console.log('✅ Next.js build completed successfully');
} catch (error) {
  console.error('❌ Build process failed:', error.message);
  process.exit(1);
}

console.log('🎉 Build process completed successfully'); 