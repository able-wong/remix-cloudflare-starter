#!/usr/bin/env node

/**
 * Cloudflare Configuration Test Script
 *
 * Tests Cloudflare configuration, authentication, and deployment readiness.
 * Validates Wrangler setup, authentication status, and project configuration.
 *
 * Usage:
 *   node scripts/test-cloudflare-config.js
 *
 * This script will:
 * - Check if Wrangler CLI is installed and authenticated
 * - Validate wrangler.jsonc configuration
 * - Test build process readiness
 * - Check environment variables and secrets
 * - Verify deployment configuration
 * - Provide detailed feedback on any issues
 */

import process from 'process';
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

class CloudflareConfigTester {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.successes = [];
  }

  /**
   * Add success message
   */
  addSuccess(message) {
    this.successes.push(message);
    console.log(`✅ ${message}`);
  }

  /**
   * Add warning message
   */
  addWarning(message) {
    this.warnings.push(message);
    console.log(`⚠️  ${message}`);
  }

  /**
   * Add error message
   */
  addError(message) {
    this.errors.push(message);
    console.log(`❌ ${message}`);
  }

  /**
   * Execute command safely and return result
   */
  executeCommand(command, options = {}) {
    try {
      const result = execSync(command, {
        encoding: 'utf8',
        stdio: 'pipe',
        ...options
      });
      return { success: true, output: result.trim() };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stderr: error.stderr?.toString() || '',
        stdout: error.stdout?.toString() || ''
      };
    }
  }

  /**
   * Check if Wrangler CLI is installed
   */
  checkWranglerInstallation() {
    console.log('\n🔧 Checking Wrangler CLI installation...');

    const result = this.executeCommand('wrangler --version');

    if (result.success) {
      this.addSuccess(`Wrangler CLI installed: ${result.output}`);
      return true;
    } else {
      this.addError('Wrangler CLI is not installed or not in PATH');
      this.addError('Install with: npm install -g wrangler');
      return false;
    }
  }

  /**
   * Check Cloudflare authentication status
   */
  checkAuthentication() {
    console.log('\n🔐 Checking Cloudflare authentication...');

    const result = this.executeCommand('wrangler whoami');

    if (result.success) {
      const output = result.output;
      if (output.includes('You are logged in')) {
        this.addSuccess(`Authenticated: ${output}`);
        return true;
      } else if (output.includes('not authenticated')) {
        this.addError('Not authenticated with Cloudflare');
        this.addError('Run: wrangler auth login');
        return false;
      } else {
        this.addSuccess(`Authentication status: ${output}`);
        return true;
      }
    } else {
      this.addError('Failed to check authentication status');
      this.addError('Run: wrangler auth login');
      return false;
    }
  }

  /**
   * Validate wrangler.jsonc configuration file
   */
  validateWranglerConfig() {
    console.log('\n📋 Validating wrangler.jsonc configuration...');

    const configPath = resolve('wrangler.jsonc');

    if (!existsSync(configPath)) {
      this.addError('wrangler.jsonc file not found');
      return false;
    }

    try {
      const configContent = readFileSync(configPath, 'utf8');

      // Remove comments and parse JSON
      const cleanJson = configContent
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
        .replace(/\/\/.*$/gm, ''); // Remove // comments

      const config = JSON.parse(cleanJson);

      this.addSuccess('wrangler.jsonc file found and valid JSON');

      // Check required fields
      const requiredFields = ['name', 'compatibility_date', 'pages_build_output_dir'];
      const missingFields = [];

      requiredFields.forEach(field => {
        if (!config[field]) {
          missingFields.push(field);
        } else {
          this.addSuccess(`✓ ${field}: ${config[field]}`);
        }
      });

      if (missingFields.length > 0) {
        this.addError(`Missing required fields: ${missingFields.join(', ')}`);
        return false;
      }

      // Check build output directory
      if (config.pages_build_output_dir && !existsSync(config.pages_build_output_dir)) {
        this.addWarning(`Build output directory does not exist: ${config.pages_build_output_dir}`);
        this.addWarning('Run: npm run build');
      } else if (config.pages_build_output_dir) {
        this.addSuccess(`Build output directory exists: ${config.pages_build_output_dir}`);
      }

      return true;
    } catch (error) {
      this.addError(`Failed to parse wrangler.jsonc: ${error.message}`);
      return false;
    }
  }

  /**
   * Check build process
   */
  checkBuildProcess() {
    console.log('\n🏗️  Checking build process...');

    // Check if package.json has build script
    const packagePath = resolve('package.json');

    if (!existsSync(packagePath)) {
      this.addError('package.json not found');
      return false;
    }

    try {
      const packageContent = JSON.parse(readFileSync(packagePath, 'utf8'));

      if (!packageContent.scripts?.build) {
        this.addError('Build script not found in package.json');
        return false;
      }

      this.addSuccess(`Build script found: ${packageContent.scripts.build}`);

      // Check if deploy script exists
      if (packageContent.scripts?.deploy) {
        this.addSuccess(`Deploy script found: ${packageContent.scripts.deploy}`);
      } else {
        this.addWarning('Deploy script not found in package.json');
      }

      return true;
    } catch (error) {
      this.addError(`Failed to parse package.json: ${error.message}`);
      return false;
    }
  }

  /**
   * Test build process (dry run)
   */
  testBuild() {
    console.log('\n🔨 Testing build process...');

    const result = this.executeCommand('npm run build');

    if (result.success) {
      this.addSuccess('Build process completed successfully');
      return true;
    } else {
      this.addError('Build process failed');
      if (result.stderr) {
        console.log('Build error output:');
        console.log(result.stderr);
      }
      return false;
    }
  }

  /**
   * Check Cloudflare Pages project status
   */
  checkPagesProject() {
    console.log('\n📄 Checking Cloudflare Pages project...');

    try {
      const configContent = readFileSync('wrangler.jsonc', 'utf8');
      const cleanJson = configContent
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
      const config = JSON.parse(cleanJson);

      const projectName = config.name;

      if (!projectName) {
        this.addError('Project name not found in wrangler.jsonc');
        return false;
      }

      // Check if using generic name
      const genericNames = ['remix-cloudflare-starter', 'remix-starter', 'starter-template'];
      if (genericNames.includes(projectName)) {
        this.addWarning(`Using generic project name: "${projectName}"`);
        this.addWarning('⚠️  This may conflict with other deployments using the same starter template');
        this.addWarning('Strongly recommend changing to a unique project name before deployment');
      }

      const result = this.executeCommand(`wrangler pages project list`);

      if (result.success) {
        const output = result.output;
        if (output.includes(projectName)) {
          this.addSuccess(`Cloudflare Pages project found: ${projectName}`);
          return true;
        } else {
          this.addWarning(`Cloudflare Pages project '${projectName}' not found`);
          this.addWarning('Project will be created automatically on first deployment');
          return true;
        }
      } else {
        this.addWarning('Unable to check Cloudflare Pages projects');
        this.addWarning('This might be normal for first-time setup');
        return true;
      }
    } catch (error) {
      this.addError(`Failed to check Pages project: ${error.message}`);
      return false;
    }
  }

  /**
   * Check environment variables and secrets
   */
  checkEnvironmentSetup() {
    console.log('\n🔐 Checking environment setup...');

    // Check for .dev.vars file
    const devVarsPath = resolve('.dev.vars');

    if (existsSync(devVarsPath)) {
      this.addSuccess('.dev.vars file found for local development');

      try {
        const devVarsContent = readFileSync(devVarsPath, 'utf8');
        const lines = devVarsContent.split('\n').filter(line =>
          line.trim() && !line.trim().startsWith('#')
        );

        if (lines.length > 0) {
          this.addSuccess(`Found ${lines.length} environment variables in .dev.vars`);

          // Check for common Firebase variables
          const hasFirebaseConfig = lines.some(line => line.includes('FIREBASE_CONFIG'));
          const hasFirebaseProjectId = lines.some(line => line.includes('FIREBASE_PROJECT_ID'));

          if (hasFirebaseConfig && hasFirebaseProjectId) {
            this.addSuccess('Firebase configuration detected in .dev.vars');
          } else if (hasFirebaseConfig || hasFirebaseProjectId) {
            this.addWarning('Partial Firebase configuration detected - ensure all Firebase vars are set');
          }
        } else {
          this.addWarning('.dev.vars file is empty');
        }
      } catch (error) {
        this.addWarning('Unable to read .dev.vars file');
      }
    } else {
      this.addWarning('.dev.vars file not found');
      this.addWarning('Create .dev.vars from .dev.vars.example if you need environment variables');
    }

    // Check for .dev.vars.example
    const examplePath = resolve('.dev.vars.example');
    if (existsSync(examplePath)) {
      this.addSuccess('.dev.vars.example file found');
    } else {
      this.addWarning('.dev.vars.example file not found');
    }

    // Remind about production secrets
    console.log('\n💡 Remember: For production deployment, set environment variables in Cloudflare Pages:');
    console.log('   1. Go to Cloudflare Dashboard > Pages > Your Project > Settings > Environment Variables');
    console.log('   2. Add the same variables from .dev.vars for production use');

    return true;
  }

  /**
   * Test deployment readiness (dry run)
   */
  testDeploymentReadiness() {
    console.log('\n🚀 Testing deployment readiness...');

    // Check if build directory exists and has content
    const buildDir = './build/client';
    if (!existsSync(buildDir)) {
      this.addError('Build directory not found - run npm run build first');
      return false;
    }

    // Check if build directory has content
    try {
      const fs = require('fs');
      const files = fs.readdirSync(buildDir);
      if (files.length === 0) {
        this.addError('Build directory is empty - run npm run build first');
        return false;
      }
      this.addSuccess(`Build directory has ${files.length} files/folders`);
    } catch (error) {
      this.addWarning('Unable to check build directory contents');
    }

    // Test wrangler pages project list to verify connection
    const result = this.executeCommand('wrangler pages project list');

    if (result.success) {
      this.addSuccess('Successfully connected to Cloudflare Pages');
      return true;
    } else {
      this.addWarning('Unable to connect to Cloudflare Pages API');
      this.addWarning('Deployment may still work, but connection should be verified');
      return true; // Don't fail completely as this might be a temporary issue
    }
  }

  /**
   * Check all prerequisites
   */
  checkPrerequisites() {
    console.log('\n📋 Checking prerequisites...');

    // Check Node.js version
    const nodeResult = this.executeCommand('node --version');
    if (nodeResult.success) {
      this.addSuccess(`Node.js version: ${nodeResult.output}`);
    } else {
      this.addError('Node.js not found');
    }

    // Check npm version
    const npmResult = this.executeCommand('npm --version');
    if (npmResult.success) {
      this.addSuccess(`npm version: ${npmResult.output}`);
    } else {
      this.addError('npm not found');
    }

    // Check if node_modules exists
    if (existsSync('node_modules')) {
      this.addSuccess('node_modules directory found');
    } else {
      this.addWarning('node_modules directory not found - run npm install');
    }

    return true;
  }

  /**
   * Check for common deployment issues
   */
  checkCommonIssues() {
    console.log('\n🔍 Checking for common issues...');

    // Check for large files that might cause deployment issues
    const publicDir = resolve('public');
    if (existsSync(publicDir)) {
      this.addSuccess('Public directory found');

      try {
        const fs = require('fs');
        const files = fs.readdirSync(publicDir);
        const largeFiles = [];

        files.forEach(file => {
          const filePath = resolve(publicDir, file);
          try {
            const stats = fs.statSync(filePath);
            if (stats.isFile() && stats.size > 25 * 1024 * 1024) { // 25MB limit
              largeFiles.push(`${file} (${Math.round(stats.size / 1024 / 1024)}MB)`);
            }
          } catch (error) {
            // Ignore files we can't stat
          }
        });

        if (largeFiles.length > 0) {
          this.addWarning(`Large files detected in public/ directory: ${largeFiles.join(', ')}`);
          this.addWarning('Cloudflare Pages has a 25MB file size limit');
        } else {
          this.addSuccess('No large files detected in public/ directory');
        }
      } catch (error) {
        this.addWarning('Unable to check public directory for large files');
      }
    }

    // Check for .env files that shouldn't be deployed
    const envFiles = ['.env', '.env.local', '.env.production'];
    envFiles.forEach(envFile => {
      if (existsSync(envFile)) {
        this.addWarning(`${envFile} file found - ensure it's in .gitignore and not deployed`);
      }
    });

    // Check gitignore
    if (existsSync('.gitignore')) {
      const gitignoreContent = readFileSync('.gitignore', 'utf8');
      if (!gitignoreContent.includes('.dev.vars')) {
        this.addWarning('.dev.vars should be added to .gitignore');
      }
      if (!gitignoreContent.includes('node_modules')) {
        this.addWarning('node_modules should be in .gitignore');
      }
    } else {
      this.addWarning('.gitignore file not found');
    }

    return true;
  }

  /**
   * Check if user has customized the project name
   */
  checkProjectNameCustomization() {
    console.log('\n🏷️  Checking project name customization...');

    const genericNames = ['remix-cloudflare-starter', 'remix-starter', 'starter-template'];
    let hasGenericName = false;

    // Check wrangler.jsonc
    try {
      const configContent = readFileSync('wrangler.jsonc', 'utf8');
      const cleanJson = configContent
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
      const config = JSON.parse(cleanJson);

      if (config.name && genericNames.includes(config.name)) {
        this.addWarning(`Project name in wrangler.jsonc is still generic: "${config.name}"`);
        this.addWarning('Change the "name" field to something unique for your project');
        hasGenericName = true;
      } else if (config.name) {
        this.addSuccess(`✓ Project name customized in wrangler.jsonc: "${config.name}"`);
      }
    } catch (error) {
      this.addWarning('Unable to check project name in wrangler.jsonc');
    }

    // Check package.json
    try {
      const packageContent = JSON.parse(readFileSync('package.json', 'utf8'));

      if (packageContent.name && genericNames.includes(packageContent.name)) {
        this.addWarning(`Package name in package.json is still generic: "${packageContent.name}"`);
        this.addWarning('Change the "name" field to match your wrangler.jsonc name');
        hasGenericName = true;
      } else if (packageContent.name) {
        this.addSuccess(`✓ Package name customized in package.json: "${packageContent.name}"`);
      }
    } catch (error) {
      this.addWarning('Unable to check package name in package.json');
    }

    if (hasGenericName) {
      console.log('\n💡 How to customize your project name:');
      console.log('1. Edit wrangler.jsonc - change "name" field');
      console.log('2. Edit package.json - change "name" field');
      console.log('3. Use a unique name like: my-awesome-app, company-website, etc.');
      console.log('4. This becomes your URL: https://your-project-name.pages.dev');
    }

    return !hasGenericName;
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🌩️  Cloudflare Configuration Test');
    console.log('==================================\n');

    // Run all checks
    this.checkPrerequisites();
    const wranglerInstalled = this.checkWranglerInstallation();

    if (wranglerInstalled) {
      this.checkAuthentication();
      this.checkPagesProject();
    }

    this.validateWranglerConfig();
    this.checkProjectNameCustomization();
    this.checkBuildProcess();
    this.checkEnvironmentSetup();
    this.checkCommonIssues();

    // Test build if everything looks good so far
    if (this.errors.length === 0) {
      this.testBuild();
      this.testDeploymentReadiness();
    }

    this.printSummary();
  }

  /**
   * Print final summary
   */
  printSummary() {
    console.log('\n📊 Summary');
    console.log('==========');

    if (this.successes.length > 0) {
      console.log(`\n✅ Successes (${this.successes.length}):`);
      this.successes.forEach(success => console.log(`   - ${success}`));
    }

    if (this.warnings.length > 0) {
      console.log(`\n⚠️  Warnings (${this.warnings.length}):`);
      this.warnings.forEach(warning => console.log(`   - ${warning}`));
    }

    if (this.errors.length > 0) {
      console.log(`\n❌ Errors (${this.errors.length}):`);
      this.errors.forEach(error => console.log(`   - ${error}`));
    }

    console.log('\n🎯 Deployment Readiness Status:');
    if (this.errors.length === 0) {
      console.log('✅ Ready to deploy! Run: npm run deploy');
    } else {
      console.log('❌ Not ready to deploy. Fix the errors above first.');
    }

    console.log('\n📚 Additional Resources:');
    console.log('- Cloudflare Pages: https://pages.cloudflare.com');
    console.log('- Wrangler Docs: https://developers.cloudflare.com/workers/wrangler/');
    console.log('- Remix Cloudflare Guide: https://remix.run/docs/en/main/guides/deployment#cloudflare-pages');
    console.log('- Project README: README.md');

    // Exit with appropriate code
    process.exit(this.errors.length > 0 ? 1 : 0);
  }
}

// Create and run the tester
const tester = new CloudflareConfigTester();
tester.runAllTests().catch(error => {
  console.error('❌ Test runner failed:', error.message);
  process.exit(1);
});
