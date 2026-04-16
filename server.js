const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

console.log('API Key exists:', !!process.env.ANTHROPIC_API_KEY);
console.log('API Key start:', process.env.ANTHROPIC_API_KEY?.substring(0, 10));

app.use(cors());
app.use(express.json());

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Recipe backend is running!' });
});

app.post('/api/recipes', async (req, res) => {
  try {
    const { ingredients, language = 'ru' } = req.body;

    const ingredientsList = Array.isArray(ingredients)
      ? ingredients
      : ingredients.split(',').map(i => i.trim());

    if (!ingredientsList || ingredientsList.length === 0) {
      return res.status(400).json({ error: 'No ingredients provided' });
    }

    const prompt = language === 'ru'
      ? `У меня есть следующие продукты: ${ingredientsList.join(', ')}. 
         Предложи ровно 3 рецепта которые можно приготовить из этих продуктов (можно использовать базовые специи, масло, соль).
         
         Ответь СТРОГО в формате JSON (без markdown, без \`\`\`):
         {
           "recipes": [
             {
               "name": "Название блюда",
               "time": "30 мин",
               "difficulty": "Легко",
               "ingredients": ["ингредиент 1", "ингредиент 2"],
               "steps": ["шаг 1", "шаг 2", "шаг 3"],
               "emoji": "🍳"
             }
           ]
         }`
      : `I have these ingredients: ${ingredientsList.join(', ')}.
         Suggest exactly 3 recipes that can be made with these ingredients (basic spices, oil, salt are allowed).
         
         Reply STRICTLY in JSON format (no markdown, no \`\`\`):
         {
           "recipes": [
             {
               "name": "Dish name",
               "time": "30 min",
               "difficulty": "Easy",
               "ingredients": ["ingredient 1", "ingredient 2"],
               "steps": ["step 1", "step 2", "step 3"],
               "emoji": "🍳"
             }
           ]
         }`;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0].text;
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid JSON response from AI');
    }
    
    const recipes = JSON.parse(jsonMatch[0]);
    res.json(recipes);

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate recipes',
      details: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
