# AI Setup Guide

Setup **Vercel AI SDK** with AI providers in your Remix Cloudflare application.

> 💡 **Provider Support**: This guide uses Google Gemini (with integration tests), but any [Vercel AI SDK provider](https://sdk.vercel.ai/providers/ai-sdk-providers) works. Cloudflare billing advantage: only CPU time counted, not waiting time for AI responses.

## ⚡ Quick Setup

### 1. Get Your Google AI API Key

1. **Go to Google AI Studio:**
   - Visit [Google AI Studio](https://aistudio.google.com/)
   - Sign in with your Google account

2. **Create API Key:**
   - Click "Get API Key" in the top navigation
   - Click "Create API Key in new project" or select existing project
   - Copy the generated API key

3. **Choose Your Model:**
   - See [Gemini models documentation](https://ai.google.dev/gemini-api/docs/models/gemini) for available models and their capabilities
   - Recommended for most use cases: `gemini-1.5-flash`

### 2. Configure Environment Variables

1. **Set up environment variables:**

   If you don't have a `.dev.vars` file yet:

   ```bash
   cp .dev.vars.example .dev.vars
   ```

   If you already have a `.dev.vars` file, add or replace these lines:

   ```bash
   # AI Configuration (for Vercel AI SDK with Google)
   GOOGLE_GENERATIVE_AI_API_KEY=your_actual_api_key_from_google_ai_studio
   GOOGLE_GENERATIVE_AI_MODEL_NAME=gemini-1.5-flash
   ```

2. **Update `app/utils/env.ts` if needed:**

   The AI environment variables should already be defined in the starter template. If not, add them to the appropriate sections:

   ```typescript
   // For server-side usage (in actions/loaders)
   export function getServerEnv(context: any) {
     return {
       // ...existing variables...
       GOOGLE_GENERATIVE_AI_API_KEY: context.cloudflare.env.GOOGLE_GENERATIVE_AI_API_KEY,
       GOOGLE_GENERATIVE_AI_MODEL_NAME: context.cloudflare.env.GOOGLE_GENERATIVE_AI_MODEL_NAME,
     };
   }
   ```

   > 💡 **Important**: Never commit your `.dev.vars` file to version control. It's already in `.gitignore`.

### 3. Test Your Setup

Run the integration tests to verify everything works:

```bash
npm run test:integration
```

> 💡 **Note**: The integration tests use `process.env` directly (which works in Node.js test environment), but your application code should use the `getServerEnv()` pattern shown in the examples below.

This will run the AI integration tests and verify:

- ✅ API key authentication
- ✅ Text generation
- ✅ Streaming responses
- ✅ Structured object generation
- ✅ Error handling

## 🤖 Getting Implementation Help

Need to implement AI features? Use your AI coding assistant with these prompts:

### Basic Text Generation

> "Create a Remix action that uses Vercel AI SDK with Google Gemini to generate text. Use getServerEnv(context) for environment variables, validate the API key, and return JSON with proper error handling."

### Streaming Responses

> "Show me how to implement streaming text generation in a Remix route using Vercel AI SDK. Handle the stream properly and return the full text."

### Structured Data Generation

> "Create a Remix action that uses generateObject from Vercel AI SDK to return structured JSON data. Include Zod schema validation and proper TypeScript types."

### Frontend Integration

> "Build a React component with a form that submits to an AI generation endpoint using useFetcher. Include loading states and error handling with DaisyUI components."

**Key patterns your AI assistant should include:**

- Use `getServerEnv(context)` for environment variables (not `process.env`)
- Import from `'ai'` and `'@ai-sdk/google'`
- Validate API keys before making requests
- Handle errors gracefully with proper HTTP status codes
- Use proper TypeScript types throughout

## 🔧 Development Commands

```bash
# Run AI integration tests
npm run test:integration

# Test specific AI functionality
npx jest app/__tests__/integration-tests/ai/

# Run all tests including AI
npm run test:all
```

## 📊 Cost Considerations

### Cloudflare Billing Advantage

> 💡 **Cloudflare Edge Advantage**: Cloudflare Pages functions bill based on CPU time, not wall time. This means long AI requests that involve waiting for external API responses won't consume your free tier quota while waiting. Your function only uses CPU time during actual processing.

### Gemini Pricing (as of 2024)

- **Gemini 1.5 Flash**: $0.075 per 1M input tokens, $0.30 per 1M output tokens
- **Gemini 1.5 Pro**: $3.50 per 1M input tokens, $10.50 per 1M output tokens

### Cost Optimization Tips

1. **Choose the right model**: Use `gemini-1.5-flash` for most use cases
2. **Limit token usage**: Keep prompts concise and set max token limits
3. **Cache responses**: Implement caching for repeated requests
4. **Monitor usage**: Track API calls and token consumption

### Rate Limits

- **Gemini 1.5 Flash**: 1000 requests per minute
- **Gemini 1.5 Pro**: 360 requests per minute

## 🚀 Deployment Setup

### Cloudflare Pages Environment Variables

When deploying to Cloudflare Pages, add these environment variables in your dashboard:

1. Go to your Cloudflare Pages project
2. Navigate to Settings → Environment Variables
3. Add the following variables:

```env
GOOGLE_GENERATIVE_AI_API_KEY=your_actual_api_key
GOOGLE_GENERATIVE_AI_MODEL_NAME=gemini-1.5-flash
```

> 🔒 **Security**: Environment variables in Cloudflare Pages are encrypted and only available to your application.

### Pre-deployment Checklist

Before deploying, verify your setup:

```bash
# Test your configuration
npm run test-cloudflare

# Run AI tests
npm run test:integration

# Build and deploy
npm run deploy
```

## 🛡 Security Best Practices

### API Key Management

- ✅ **Never** commit API keys to version control
- ✅ Use environment variables for all sensitive data
- ✅ Rotate API keys regularly
- ✅ Monitor API usage for unusual activity

### Input Validation

- ✅ Validate and sanitize user inputs
- ✅ Implement rate limiting on AI endpoints
- ✅ Set maximum token limits
- ✅ Log requests for monitoring

## � Additional Resources

- [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs)
- [Vercel AI SDK Providers](https://sdk.vercel.ai/providers/ai-sdk-providers)
- [Google AI Studio](https://aistudio.google.com/)
- [Gemini API Documentation](https://ai.google.dev/gemini-api/docs)

---

**Ready to build AI-powered features?** Start with the examples above and run `npm run test:integration` to verify your setup! 🤖✨
