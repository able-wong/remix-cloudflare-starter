/**
 * @file Integration Tests for Vercel AI Package
 *
 * This file contains integration tests for the Vercel AI package using the Google Gemini provider.
 * These tests verify that the AI package works correctly with your existing environment configuration.
 *
 * IMPORTANT CONSIDERATIONS:
 * 1. **API Key**: These tests require a valid `GOOGLE_GENERATIVE_AI_API_KEY` to be set in your `.dev.vars` file.
 *    This key will be used to authenticate with the Gemini API.
 * 2. **Model Name**: A `GOOGLE_GENERATIVE_AI_MODEL_NAME` (e.g., 'gemini-1.5-flash') must also be set in `.dev.vars`.
 * 3. **Cost and Rate Limits**: Running these tests will consume your Gemini API quota.
 *    Use them sparingly and be mindful of potential costs and rate limits.
 * 4. **Network Dependency**: These tests depend on external network connectivity to the Gemini API.
 *    Failures might indicate network issues or API service disruptions, not necessarily code bugs.
 * 5. **Test Data**: Using specific, small prompts to minimize token usage during tests.
 *
 * SETUP:
 * 1. Ensure you have a `.dev.vars` file in your project root.
 * 2. Add your Gemini API key and model to `.dev.vars`:
 *    ```
 *    GOOGLE_GENERATIVE_AI_API_KEY="YOUR_GEMINI_API_KEY"
 *    GOOGLE_GENERATIVE_AI_MODEL_NAME="gemini-1.5-flash"
 *    ```
 * 3. Run these tests using: `npm run test:integration`
 */

import { config as dotenvConfig } from 'dotenv';
dotenvConfig({ path: '.dev.vars' }); // Load environment variables from .dev.vars

import { describe, it, expect, beforeAll } from '@jest/globals';
import { generateText, streamText, generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';

describe('Vercel AI Package Integration Tests', () => {
  // we are getting these env vars from process.env in jest environment.
  // for remix app, please use getClientEnv or getServerEnv in env.ts to access these variables.
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const modelName = process.env.GOOGLE_GENERATIVE_AI_MODEL_NAME;
  let model: ReturnType<ReturnType<typeof createGoogleGenerativeAI>>;
  beforeAll(() => {
    if (!apiKey) {
      throw new Error(
        'GOOGLE_GENERATIVE_AI_API_KEY environment variable is not set. Please configure it in .dev.vars to run integration tests.',
      );
    }
    if (!modelName) {
      throw new Error(
        'GOOGLE_GENERATIVE_AI_MODEL_NAME environment variable is not set. Please configure it in .dev.vars to run integration tests.',
      );
    }

    // Initialize the Google Gemini model using provider pattern
    const googleProvider = createGoogleGenerativeAI({ apiKey });
    model = googleProvider(modelName);
  });

  it('should generate text using generateText function', async () => {
    const result = await generateText({
      model: model,
      prompt: 'What is the capital of France? Answer in one word.',
    });

    expect(result.text).toBeDefined();
    expect(result.text.toLowerCase()).toContain('paris');
    expect(result.finishReason).toBe('stop');
    expect(result.usage).toBeDefined();
    expect(result.usage?.totalTokens).toBeGreaterThan(0);
  }, 30000);

  it('should generate streaming text using streamText function', async () => {
    const result = streamText({
      model: model,
      prompt: 'Count from 1 to 3. Each number on a new line.',
    });

    let fullText = '';
    for await (const delta of result.textStream) {
      fullText += delta;
    }

    expect(fullText).toBeDefined();
    expect(fullText).toContain('1');
    expect(fullText).toContain('2');
    expect(fullText).toContain('3');
  }, 30000);

  it('should generate JSON responses using generateObject function', async () => {
    // Define a schema for the expected JSON response
    const personSchema = z.object({
      name: z.string(),
      age: z.number(),
      city: z.string(),
      occupation: z.string(),
    });

    const result = await generateObject({
      model: model,
      schema: personSchema,
      prompt:
        'Create a fictional person profile with name, age, city, and occupation. Make the person a software engineer from San Francisco.',
    });

    expect(result.object).toBeDefined();
    expect(result.object.name).toBeDefined();
    expect(typeof result.object.name).toBe('string');
    expect(result.object.age).toBeDefined();
    expect(typeof result.object.age).toBe('number');
    expect(result.object.city).toBeDefined();
    expect(typeof result.object.city).toBe('string');
    expect(result.object.occupation).toBeDefined();
    expect(typeof result.object.occupation).toBe('string');

    // Check that the response follows the prompt
    expect(result.object.occupation.toLowerCase()).toContain('software');
    expect(result.object.city.toLowerCase()).toContain('san francisco');
    expect(result.object.age).toBeGreaterThan(0);
    expect(result.object.age).toBeLessThan(120);

    expect(result.finishReason).toBe('stop');
    expect(result.usage?.totalTokens).toBeGreaterThan(0);
  }, 30000);

  it('should handle conversation history with system messages', async () => {
    const result = await generateText({
      model: model,
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful math tutor. Always show your work step by step.',
        },
        {
          role: 'user',
          content: 'What is 15 + 27?',
        },
      ],
    });

    expect(result.text).toBeDefined();
    expect(result.text).toContain('42');
    expect(result.finishReason).toBe('stop');
    expect(result.usage?.totalTokens).toBeGreaterThan(0);
  }, 30000);

  it('should handle multi-turn conversations', async () => {
    const result = await generateText({
      model: model,
      messages: [
        {
          role: 'user',
          content: 'What is 5 + 5?',
        },
        {
          role: 'assistant',
          content: '5 + 5 = 10',
        },
        {
          role: 'user',
          content: 'What about 10 + 10?',
        },
      ],
    });

    expect(result.text).toBeDefined();
    expect(result.text).toContain('20');
    expect(result.finishReason).toBe('stop');
    expect(result.usage?.totalTokens).toBeGreaterThan(0);
  }, 30000);

  it('should handle temperature and other generation settings', async () => {
    const result = await generateText({
      model: model,
      prompt: 'Say hello in a creative way.',
      temperature: 0.1, // Low temperature for more deterministic output
      maxTokens: 50,
    });

    expect(result.text).toBeDefined();
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.finishReason).toBeDefined();
    // Allow for reasonable variance in token counting (AI models may use slightly more tokens)
    expect(result.usage?.totalTokens).toBeLessThanOrEqual(60);
  }, 30000);

  it('should handle errors gracefully with invalid prompts', async () => {
    try {
      await generateText({
        model: model,
        prompt: '', // Empty prompt should cause an error
      });

      // If we get here, the test should fail
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(Error);
    }
  }, 30000);

  it('should generate conversation analysis JSON responses', async () => {
    // Define a schema similar to what we use in conversation analysis
    const analysisSchema = z.object({
      category: z.string(),
      sentiment: z.enum(['positive', 'negative', 'neutral']),
      escalated: z.boolean(),
      hasQuestion: z.boolean(),
      confidence: z.number().min(0).max(1),
      summary: z.string(),
    });

    const sampleConversation = `
    Customer: Hi, I'm having trouble with my order. It hasn't arrived yet.
    Agent: I'm sorry to hear that. Can you please provide your order number?
    Customer: Sure, it's #12345. I ordered it 5 days ago.
    Agent: Let me check that for you. I can see your order is currently in transit and should arrive tomorrow.
    Customer: Great, thank you for checking!
    `;

    const result = await generateObject({
      model: model,
      schema: analysisSchema,
      prompt: `Analyze this customer service conversation and provide a JSON response with category, sentiment, escalated status, if it has questions, confidence score, and summary:

${sampleConversation}

Categories can be: shipping, payment, product, billing, technical, other
Sentiment should be: positive, negative, or neutral
Escalated should be true if the customer seems frustrated or angry
HasQuestion should be true if the customer asks questions
Confidence should be a number between 0 and 1 indicating how confident you are in your analysis
Summary should be a brief description of the conversation`,
    });

    expect(result.object).toBeDefined();
    expect(result.object.category).toBeDefined();
    expect(typeof result.object.category).toBe('string');
    expect(result.object.sentiment).toBeDefined();
    expect(['positive', 'negative', 'neutral']).toContain(
      result.object.sentiment,
    );
    expect(typeof result.object.escalated).toBe('boolean');
    expect(typeof result.object.hasQuestion).toBe('boolean');
    expect(typeof result.object.confidence).toBe('number');
    expect(result.object.confidence).toBeGreaterThanOrEqual(0);
    expect(result.object.confidence).toBeLessThanOrEqual(1);
    expect(result.object.summary).toBeDefined();
    expect(typeof result.object.summary).toBe('string');

    // Check that the analysis makes sense for the given conversation
    expect(result.object.category.toLowerCase()).toContain('shipping');
    expect(['positive', 'neutral']).toContain(result.object.sentiment); // Could be positive or neutral for polite resolution
    expect(result.object.escalated).toBe(false); // Customer wasn't angry
    expect(result.object.hasQuestion).toBe(true); // Customer asked about order status

    expect(result.finishReason).toBe('stop');
    expect(result.usage?.totalTokens).toBeGreaterThan(0);
  }, 30000);

  it('should demonstrate difference between generateText and generateObject for JSON', async () => {
    // Test with generateText - returns JSON as a string (possibly with markdown)
    const textResult = await generateText({
      model: model,
      prompt:
        'Create a simple JSON object with name "John" and age 30. Return only valid JSON.',
    });

    // Test with generateObject - returns parsed JSON object
    const objectSchema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const objectResult = await generateObject({
      model: model,
      schema: objectSchema,
      prompt: 'Create a person with name "John" and age 30.',
    });

    // Assertions
    expect(textResult.text).toBeDefined();
    expect(typeof textResult.text).toBe('string');

    expect(objectResult.object).toBeDefined();
    expect(typeof objectResult.object).toBe('object');
    expect(objectResult.object.name).toBe('John');
    expect(objectResult.object.age).toBe(30);

    // generateText might return JSON wrapped in markdown code blocks
    // generateObject returns a properly parsed JavaScript object
    expect(objectResult.object.name).toBeDefined();
    expect(objectResult.object.age).toBeDefined();
  }, 60000);
});
