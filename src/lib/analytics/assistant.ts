/**
 * Analytics Assistant
 * 
 * Orchestrates the conversational analytics flow by:
 * 1. Parsing natural language queries
 * 2. Fetching relevant analytics data
 * 3. Generating AI responses with visualizations
 * 4. Suggesting follow-up questions
 */

import { parseAnalyticsQuery, isValidQuery, getQueryDescription } from './parser';
import { analyticsDataFetcher } from './fetcher';
import { 
  AnalyticsQuery, 
  AnalyticsData, 
  AnalyticsResponse,
  AnalyticsVisualization
} from './types';

/**
 * Main analytics assistant class
 */
export class AnalyticsAssistant {
  /**
   * Process an analytics query from natural language input
   */
  async processQuery(query: string, dealershipId?: string): Promise<AnalyticsResponse> {
    try {
      // Parse the natural language query
      const analyticsQuery = parseAnalyticsQuery(query, dealershipId);
      
      // Check if the query is valid for analytics processing
      if (!isValidQuery(analyticsQuery)) {
        return this.generateFallbackResponse(query, analyticsQuery);
      }
      
      // Fetch data based on the parsed query
      const analyticsData = await analyticsDataFetcher.fetchData(analyticsQuery);
      
      // Generate AI response with visualizations
      const response = await this.generateResponse(query, analyticsData, analyticsQuery);
      
      return response;
    } catch (error) {
      console.error('Error processing analytics query:', error);
      return {
        text: `I'm sorry, I encountered an error while analyzing your data. ${
          error instanceof Error ? error.message : 'Please try a different question.'
        }`,
        visualizations: [],
        query: {
          intent: 'unknown',
          metrics: [],
          dimensions: [],
          dateRange: {
            start: new Date(),
            end: new Date()
          },
          rawQuery: query
        }
      };
    }
  }
  
  /**
   * Generate a fallback response when query can't be processed as analytics
   */
  private async generateFallbackResponse(
    originalQuery: string, 
    parsedQuery: AnalyticsQuery
  ): Promise<AnalyticsResponse> {
    return {
      text: `I'm not sure I understand your analytics question. Could you rephrase it? For example, you could ask:
      
- "How has our organic traffic changed this month?"
- "What are our top performing pages?"
- "Which keywords are we ranking for?"
- "Where are our website visitors coming from?"`,
      visualizations: [],
      query: parsedQuery,
      followUpQuestions: [
        "How many visitors did we get last month?",
        "What are our top 5 landing pages?",
        "How are our keyword rankings trending?",
        "Which cities drive the most traffic to our site?"
      ]
    };
  }
  
  /**
   * Generate an AI response based on analytics data
   */
  private async generateResponse(
    originalQuery: string,
    data: AnalyticsData,
    query: AnalyticsQuery
  ): Promise<AnalyticsResponse> {
    try {
      // Format data for the prompt
      const formattedData = this.formatDataForPrompt(data);
      
      // Get dealership context
      const dealershipContext = await this.getDealershipContext(query.dealershipId);
      
      // Build the prompt
      const systemPrompt = `
You are Rylie, an expert SEO analytics assistant for automotive dealerships.
Analyze the provided data and give clear, actionable insights.
Focus on:
- What the numbers mean in plain English
- Whether the trend is positive or concerning
- Specific recommendations for improvement
- Comparisons to industry benchmarks when relevant

The user has asked: "${originalQuery}"

The data has been analyzed and the following insights are available:
${formattedData}

Dealership Context:
${dealershipContext}

Provide a conversational response that:
1. Directly answers their question
2. Highlights the most important insights from the data
3. Gives 1-2 actionable recommendations
4. References specific numbers from the data to support your points

Your response should be clear, concise, and focused on business impact rather than technical details.
Do NOT mention that you're looking at specific data or that you're generating a response - just provide the insights directly.
`;

      // Call OpenRouter API
      const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
          'X-Title': 'Rylie SEO Hub',
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: originalQuery }
          ],
          temperature: 0.5,
          max_tokens: 1000,
        }),
      });

      if (!openRouterResponse.ok) {
        const error = await openRouterResponse.json();
        console.error('OpenRouter API error:', error);
        throw new Error('Failed to generate analytics insights');
      }

      const responseData = await openRouterResponse.json();
      const aiResponse = responseData.choices[0]?.message?.content || 
        'I apologize, but I was unable to generate insights from your analytics data.';
      
      // Generate follow-up questions
      const followUpQuestions = this.generateFollowUpQuestions(query, data);
      
      return {
        text: aiResponse,
        visualizations: data.visualizations,
        query,
        followUpQuestions
      };
    } catch (error) {
      console.error('Error generating AI response:', error);
      
      // Fallback to a basic response using the data we have
      return this.generateBasicResponse(data, query);
    }
  }
  
  /**
   * Format analytics data for inclusion in the prompt
   */
  private formatDataForPrompt(data: AnalyticsData): string {
    const { query, visualizations, rawData } = data;
    
    // Start with query description
    let formattedData = `Query Analysis: ${getQueryDescription(query)}\n\n`;
    
    // Add visualization insights
    formattedData += 'Key Insights:\n';
    visualizations.forEach((viz, index) => {
      formattedData += `${index + 1}. ${viz.title}:\n`;
      
      // Add trend information
      const trendSymbol = viz.insights.trend === 'up' ? '↑' : 
                          viz.insights.trend === 'down' ? '↓' : '→';
      
      formattedData += `   - Trend: ${trendSymbol} ${viz.insights.trend.toUpperCase()}`;
      
      // Add percentage if available
      if (viz.insights.percentage !== undefined) {
        formattedData += ` (${viz.insights.percentage > 0 ? '+' : ''}${viz.insights.percentage.toFixed(1)}%)`;
      }
      
      formattedData += '\n';
      
      // Add significance
      formattedData += `   - Significance: ${viz.insights.significance.toUpperCase()}\n`;
      
      // Add recommendation if available
      if (viz.insights.recommendation) {
        formattedData += `   - Recommendation: ${viz.insights.recommendation}\n`;
      }
      
      // Add data summary based on visualization type
      if (viz.type === 'line' || viz.type === 'bar') {
        // Get highest and lowest values
        const allValues = viz.data.datasets.flatMap(ds => ds.data);
        const highest = Math.max(...allValues);
        const lowest = Math.min(...allValues);
        
        formattedData += `   - Range: ${lowest.toLocaleString()} to ${highest.toLocaleString()}\n`;
        
        // For time series, add start and end values
        if (viz.type === 'line' && viz.data.labels.length > 1) {
          const firstValue = viz.data.datasets[0].data[0];
          const lastValue = viz.data.datasets[0].data[viz.data.datasets[0].data.length - 1];
          formattedData += `   - Changed from ${firstValue.toLocaleString()} to ${lastValue.toLocaleString()}\n`;
        }
      }
      
      // Add top values for bar/pie charts
      if ((viz.type === 'bar' || viz.type === 'pie') && viz.data.labels.length > 0) {
        const topLabels = viz.data.labels.slice(0, 3);
        const topValues = viz.data.datasets[0].data.slice(0, 3);
        
        formattedData += '   - Top items:\n';
        topLabels.forEach((label, i) => {
          formattedData += `     * ${label}: ${topValues[i].toLocaleString()}\n`;
        });
      }
      
      formattedData += '\n';
    });
    
    // Add totals summary if available
    if (rawData.totals) {
      formattedData += 'Overall Totals:\n';
      
      if (Array.isArray(rawData.totals)) {
        // Handle array totals
        rawData.totals.forEach((total: any, index: number) => {
          Object.entries(total).forEach(([metric, value]) => {
            formattedData += `- ${metric}: ${value}\n`;
          });
        });
      } else {
        // Handle object totals
        Object.entries(rawData.totals).forEach(([metric, value]) => {
          formattedData += `- ${metric}: ${value}\n`;
        });
      }
    }
    
    return formattedData;
  }
  
  /**
   * Generate follow-up questions based on the query and data
   */
  private generateFollowUpQuestions(query: AnalyticsQuery, data: AnalyticsData): string[] {
    const { intent, metrics, dimensions, dateRange } = query;
    const followUps: string[] = [];
    
    // Generate follow-up questions based on intent
    switch (intent) {
      case 'traffic':
        followUps.push('Which traffic sources are growing the fastest?');
        followUps.push('What days of the week have the highest traffic?');
        break;
        
      case 'engagement':
        followUps.push('Which pages have the highest engagement rate?');
        followUps.push('How does mobile engagement compare to desktop?');
        break;
        
      case 'conversion':
        followUps.push('What content drives the most conversions?');
        followUps.push('How has our conversion rate changed over time?');
        break;
        
      case 'ranking':
        followUps.push('What keywords have improved the most in the last month?');
        followUps.push('Which competitors are outranking us for our target keywords?');
        break;
        
      case 'content':
        followUps.push('Which blog topics perform best for organic traffic?');
        followUps.push('What content should we create next based on our performance?');
        break;
        
      case 'local':
        followUps.push('How does our performance vary by city?');
        followUps.push('Which locations should we target for our next campaign?');
        break;
        
      default:
        followUps.push('How has our organic traffic changed over time?');
        followUps.push('What are our top performing pages?');
    }
    
    // Add comparison question if not already a comparison
    if (intent !== 'comparison') {
      followUps.push(`How does our ${metrics[0]} compare to last month?`);
    }
    
    // Add specific question based on the data
    if (data.visualizations.length > 0) {
      const viz = data.visualizations[0];
      if (viz.insights.trend === 'down' && viz.insights.significance === 'high') {
        followUps.push(`Why is our ${viz.title.toLowerCase()} declining?`);
      } else if (viz.insights.trend === 'up' && viz.insights.significance === 'high') {
        followUps.push(`What contributed to our ${viz.title.toLowerCase()} growth?`);
      }
    }
    
    // Shuffle and limit to 4 questions
    return this.shuffleArray(followUps).slice(0, 4);
  }
  
  /**
   * Shuffle an array (Fisher-Yates algorithm)
   */
  private shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  
  /**
   * Generate a basic response using just the data without AI
   */
  private generateBasicResponse(data: AnalyticsData, query: AnalyticsQuery): AnalyticsResponse {
    // Create a simple text response based on the data
    let text = `Here's what I found for your question about ${query.intent}:\n\n`;
    
    // Add insights from visualizations
    data.visualizations.forEach(viz => {
      text += `${viz.title}: `;
      
      if (viz.insights.trend === 'up') {
        text += `Increasing ${viz.insights.percentage ? `by ${viz.insights.percentage.toFixed(1)}%` : ''}. `;
      } else if (viz.insights.trend === 'down') {
        text += `Decreasing ${viz.insights.percentage ? `by ${Math.abs(viz.insights.percentage).toFixed(1)}%` : ''}. `;
      } else {
        text += 'Stable. ';
      }
      
      if (viz.insights.recommendation) {
        text += viz.insights.recommendation;
      }
      
      text += '\n\n';
    });
    
    return {
      text,
      visualizations: data.visualizations,
      query,
      followUpQuestions: this.generateFollowUpQuestions(query, data)
    };
  }
  
  /**
   * Get dealership context for enhancing analytics responses
   */
  private async getDealershipContext(dealershipId?: string): Promise<string> {
    if (!dealershipId) {
      return 'No specific dealership context available.';
    }
    
    try {
      // In a real implementation, this would fetch dealership data from the database
      // For now, we'll return a placeholder
      return `
Package: Gold
Main Brand: Toyota
Target Cities: Austin, Round Rock, Cedar Park
Target Keywords: toyota dealership austin, camry lease deals, rav4 hybrid austin
`;
    } catch (error) {
      console.error('Error fetching dealership context:', error);
      return 'Dealership context unavailable.';
    }
  }
}

// Export singleton instance for use throughout the application
export const analyticsAssistant = new AnalyticsAssistant();
