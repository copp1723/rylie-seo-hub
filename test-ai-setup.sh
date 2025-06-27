#!/bin/bash

# Set the API key for this session
export OPENROUTER_API_KEY="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"

echo "🚀 OpenRouter API key is set!"
echo ""
echo "Testing API connection..."
node test-ai/test-api.js
