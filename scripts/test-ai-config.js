#!/usr/bin/env node

/**
 * AI Configuration Test Script
 *
 * Tests AI environment variables and configuration setup.
 * Validates Vercel AI SDK with Google Gemini provider.
 *
 * Usage:
 *   node scripts/test-ai-config.js
 *
 * This script will:
 * - Check if all required environment variables are present
 * - Validate API key format
 * - Test AI provider initialization
 * - Verify text generation functionality
 * - Test streaming capabilities
 * - Provide detailed feedback on any issues
 */

import process from 'process';
import { config } from 'dotenv';

// Load environment variables from .dev.vars
config({ path: '.dev.vars' });

class AIConfigTester {
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
   * Test environment variables
   */
  async testEnvironmentVariables() {
    console.log('\n🔍 Testing Environment Variables...');

    const requiredVars = [
      'GOOGLE_GENERATIVE_AI_API_KEY',
      'GOOGLE_GENERATIVE_AI_MODEL_NAME'
    ];

    const missingVars = [];
    requiredVars.forEach(varName => {
      const value = process.env[varName];
      if (!value) {
        missingVars.push(varName);
      } else {
        this.addSuccess(`${varName} is set`);
      }
    });

    if (missingVars.length > 0) {
      this.addError(`Missing required environment variables: ${missingVars.join(', ')}`);
      this.addError('Add them to your .dev.vars file to enable AI functionality');
    }

    // Check .dev.vars file
    try {
      const fs = await import('fs');
      if (fs.existsSync('.dev.vars')) {
        this.addSuccess('.dev.vars file found');
      } else {
        this.addError('.dev.vars file not found - create it with your AI environment variables');
      }
    } catch (error) {
      this.addWarning('Could not check for .dev.vars file');
    }
  }

  /**
   * Test AI configuration values
   */
  testAIConfig() {
    console.log('\n🔍 Testing AI Configuration...');

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const modelName = process.env.GOOGLE_GENERATIVE_AI_MODEL_NAME;

    if (!apiKey) {
      this.addError('GOOGLE_GENERATIVE_AI_API_KEY is missing');
      return;
    }

    // Validate API key format (Google AI API keys typically start with specific patterns)
    if (typeof apiKey !== 'string' || apiKey.length < 20) {
      this.addError('GOOGLE_GENERATIVE_AI_API_KEY appears to be invalid (too short)');
    } else {
      this.addSuccess('GOOGLE_GENERATIVE_AI_API_KEY format appears valid');
    }

    if (!modelName) {
      this.addError('GOOGLE_GENERATIVE_AI_MODEL_NAME is missing');
      return;
    }

    // Validate model name format
    const validModelPatterns = [
      /^gemini-/i,
      /^models\/gemini-/i
    ];

    const isValidModel = validModelPatterns.some(pattern => pattern.test(modelName));
    if (isValidModel) {
      this.addSuccess(`Model name format is valid: ${modelName}`);
    } else {
      this.addWarning(`Model name "${modelName}" doesn't match expected Gemini patterns`);
      this.addWarning('Common model names: gemini-1.5-flash, gemini-1.5-pro, gemini-1.0-pro');
    }
  }

  /**
   * Test AI SDK packages
   */
  async testAIPackages() {
    console.log('\n🔍 Testing AI SDK Packages...');

    try {
      // Test if we can import the Vercel AI SDK
      const { generateText } = await import('ai');
      this.addSuccess('Vercel AI SDK package imported successfully');

      // Test if we can import the Google AI provider
      const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
      this.addSuccess('Google AI provider package imported successfully');

      return { generateText, createGoogleGenerativeAI };
    } catch (error) {
      this.addError(`Failed to import AI packages: ${error.message}`);
      this.addError('Run "npm install ai @ai-sdk/google" to install required packages');
      return null;
    }
  }

  /**
   * Test AI provider initialization
   */
  async testAIProviderInitialization() {
    console.log('\n🔍 Testing AI Provider Initialization...');

    if (this.errors.length > 0) {
      this.addWarning('Skipping AI provider initialization due to configuration errors');
      return null;
    }

    try {
      const packages = await this.testAIPackages();
      if (!packages) {
        return null;
      }

      const { createGoogleGenerativeAI } = packages;
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      const modelName = process.env.GOOGLE_GENERATIVE_AI_MODEL_NAME;

      // Initialize the Google AI provider
      const google = createGoogleGenerativeAI({
        apiKey: apiKey,
      });

      // Get the model
      const model = google(modelName);

      this.addSuccess('AI provider initialized successfully');
      this.addSuccess(`Model "${modelName}" created successfully`);

      return { model, packages };
    } catch (error) {
      this.addError(`Failed to initialize AI provider: ${error.message}`);

      if (error.message.includes('API key')) {
        this.addError('Check your GOOGLE_GENERATIVE_AI_API_KEY');
      }
      if (error.message.includes('model')) {
        this.addError('Check your GOOGLE_GENERATIVE_AI_MODEL_NAME');
      }

      return null;
    }
  }  /**
   * Test text generation
   */
  async testTextGeneration(aiSetup) {
    console.log('\n🔍 Testing Text Generation...');

    try {
      if (!aiSetup) {
        this.addWarning('Skipping text generation test due to initialization failure');
        return false;
      }

      const { model, packages } = aiSetup;
      const { generateText } = packages;

      // Test simple text generation with a small prompt to minimize API usage
      const result = await generateText({
        model: model,
        prompt: 'Say "Hello" in one word only.',
        maxTokens: 10,
      });

      if (result && result.text) {
        this.addSuccess('Text generation successful');
        this.addSuccess(`Generated response: "${result.text.trim()}"`);

        // Validate the response makes sense
        if (result.text.toLowerCase().includes('hello')) {
          this.addSuccess('AI response is contextually appropriate');
        } else {
          this.addWarning('AI response may be unexpected, but generation is working');
        }

        return true;
      } else {
        this.addError('Text generation returned empty result');
        return false;
      }

    } catch (error) {
      this.addError(`Text generation failed: ${error.message}`);

      // Provide specific guidance based on error type
      if (error.message.includes('401') || error.message.includes('unauthorized')) {
        this.addError('Authentication failed - check your API key');
      } else if (error.message.includes('quota') || error.message.includes('limit')) {
        this.addError('API quota or rate limit exceeded');
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        this.addError('Network connectivity issue - check internet connection');
      }

      return false;
    }
  }  /**
   * Test streaming capabilities
   */
  async testStreamingCapabilities(aiSetup) {
    console.log('\n🔍 Testing Streaming Capabilities...');

    try {
      if (!aiSetup) {
        this.addWarning('Skipping streaming test due to initialization failure');
        return false;
      }

      const { model } = aiSetup;
      const { streamText } = await import('ai');

      // Test streaming with a minimal prompt
      const stream = await streamText({
        model: model,
        prompt: 'Count from 1 to 3, one number per line.',
        maxTokens: 20,
      });

      let streamedContent = '';
      let chunkCount = 0;

      for await (const chunk of stream.textStream) {
        streamedContent += chunk;
        chunkCount++;
        if (chunkCount > 10) { // Prevent infinite loops
          break;
        }
      }

      if (streamedContent.length > 0) {
        this.addSuccess('Streaming text generation successful');
        this.addSuccess(`Received ${chunkCount} stream chunks`);
        this.addSuccess(`Streamed content: "${streamedContent.trim()}"`);
        return true;
      } else {
        this.addWarning('Streaming completed but no content received');
        return false;
      }

    } catch (error) {
      this.addError(`Streaming test failed: ${error.message}`);

      // Provide specific guidance based on error type
      if (error.message.includes('stream') || error.message.includes('async')) {
        this.addWarning('Streaming may not be supported for this model/configuration');
      }

      return false;
    }
  }

  /**
   * Test Remix environment integration
   */
  async testRemixIntegration() {
    console.log('\n🔍 Testing Remix Environment Integration...');

    try {
      // Check if the environment utility exists
      const fs = await import('fs');
      if (fs.existsSync('app/utils/env.ts')) {
        this.addSuccess('Environment utility found at app/utils/env.ts');
      } else {
        this.addWarning('Environment utility not found at expected location');
      }

      // Check if the environment variables would be accessible in Remix
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      const modelName = process.env.GOOGLE_GENERATIVE_AI_MODEL_NAME;

      if (apiKey && modelName) {
        this.addSuccess('AI environment variables are accessible for Remix integration');
      } else {
        this.addWarning('AI environment variables may not be accessible in Remix context');
      }

    } catch (error) {
      this.addWarning(`Remix integration test failed: ${error.message}`);
    }
  }

  /**
   * Test integration test configuration
   */
  async testIntegrationTestSetup() {
    console.log('\n🔍 Testing Integration Test Setup...');

    try {
      const fs = await import('fs');

      // Check if integration test file exists
      const integrationTestPath = 'app/__tests__/integration-tests/ai/vercel-ai.integration.test.ts';
      if (fs.existsSync(integrationTestPath)) {
        this.addSuccess('AI integration test file found');

        // Check if package.json has the test:integration script
        const packageJsonPath = 'package.json';
        if (fs.existsSync(packageJsonPath)) {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

          if (packageJson.scripts && packageJson.scripts['test:integration']) {
            this.addSuccess('Integration test script is configured');
            this.addSuccess('Run "npm run test:integration" to execute AI integration tests');
          } else {
            this.addWarning('Integration test script not found in package.json');
          }
        }
      } else {
        this.addWarning('AI integration test file not found');
        this.addWarning('Integration tests provide comprehensive AI functionality validation');
      }

    } catch (error) {
      this.addWarning(`Integration test setup check failed: ${error.message}`);
    }
  }

  /**
   * Generate configuration recommendations
   */
  generateRecommendations() {
    console.log('\n💡 Configuration Recommendations:');

    if (this.errors.length === 0) {
      console.log('✅ Your AI configuration appears to be complete!');
      console.log('');
      console.log('🚀 Next Steps:');
      console.log('1. Run "npm run test:integration" to run comprehensive AI tests');
      console.log('2. Import AI functions in your Remix routes:');
      console.log('   import { generateText } from "ai";');
      console.log('   import { createGoogleGenerativeAI } from "@ai-sdk/google";');
      console.log('3. Use getServerEnv() in your loaders/actions to access AI variables');
      console.log('4. Implement streaming AI responses with the useChat hook');
    } else {
      console.log('⚠️  Complete these steps to enable AI functionality:');
      console.log('');
      console.log('1. Create/update your .dev.vars file:');
      console.log('   GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here');
      console.log('   GOOGLE_GENERATIVE_AI_MODEL_NAME=gemini-1.5-flash');
      console.log('');
      console.log('2. Get a Gemini API key:');
      console.log('   https://aistudio.google.com/app/apikey');
      console.log('');
      console.log('3. Install required packages (if not already installed):');
      console.log('   npm install ai @ai-sdk/google');
    }
  }

  /**
   * Generate summary report
   */
  generateSummary() {
    console.log('\n📊 AI Configuration Test Summary');
    console.log('='.repeat(50));

    console.log(`✅ Successes: ${this.successes.length}`);
    console.log(`⚠️  Warnings: ${this.warnings.length}`);
    console.log(`❌ Errors: ${this.errors.length}`);

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('\n🎉 All tests passed! Your AI configuration is ready to use.');
    } else if (this.errors.length === 0) {
      console.log('\n✅ AI configuration is functional with minor warnings.');
    } else {
      console.log('\n💥 AI configuration has errors that need to be fixed.');
      console.log('\n🔧 Next Steps:');
      console.log('1. Fix the errors listed above');
      console.log('2. Check your .dev.vars file');
      console.log('3. Verify your API key and model name');
      console.log('4. Run this test again');
    }

    return this.errors.length === 0;
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🤖 AI Configuration Test');
    console.log('========================================');
    console.log('Testing AI environment variables and Vercel AI SDK configuration...');
    console.log('ℹ️  This script tests integration with Google Gemini via @ai-sdk/google');
    console.log('   API calls will consume your Gemini API quota\n');

    // Test configuration
    await this.testEnvironmentVariables();
    this.testAIConfig();

    // Test AI functionality (only if basic config is valid)
    let aiSetup = null;
    if (this.errors.length === 0) {
      aiSetup = await this.testAIProviderInitialization();
      await this.testTextGeneration(aiSetup);
      await this.testStreamingCapabilities(aiSetup);
    }

    // Test integration
    await this.testRemixIntegration();
    await this.testIntegrationTestSetup();

    // Generate recommendations and summary
    this.generateRecommendations();
    const success = this.generateSummary();

    console.log('\n📚 Additional Resources:');
    console.log('- Vercel AI SDK: https://ai-sdk.dev/docs/foundations/overview');
    console.log('- Google AI Studio: https://aistudio.google.com/app/apikey');
    console.log('- Integration Tests: app/__tests__/integration-tests/ai/');
    console.log('- Environment Utils: app/utils/env.ts');

    process.exit(success ? 0 : 1);
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new AIConfigTester();
  tester.runAllTests().catch(error => {
    console.error('\n💥 Unexpected error during testing:', error.message);
    process.exit(1);
  });
}

export default AIConfigTester;
