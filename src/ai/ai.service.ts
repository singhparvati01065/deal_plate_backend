import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';

// Keep in sync with the app's kPromotionCategories.
const CATEGORIES = [
  'North Indian',
  'South Indian',
  'Biryani',
  'Street Food',
  'Sweets',
  'Vegetarian',
];

const FLYER_SCHEMA = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      description: 'A short, catchy promotion title (max ~60 characters).',
    },
    category: {
      type: 'string',
      enum: [...CATEGORIES, 'Other'],
      description: 'Best-matching food category for this deal.',
    },
    badge: {
      type: 'string',
      description:
        'Short offer badge if present, e.g. "30% OFF", "Buy 1 Get 1". Empty string if none.',
    },
    description: {
      type: 'string',
      description: 'One or two sentence summary of the offer and terms.',
    },
  },
  required: ['title', 'category', 'badge', 'description'],
  additionalProperties: false,
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client = new Anthropic(); // reads ANTHROPIC_API_KEY

  /** Read a flyer image and extract structured promotion fields via Claude vision. */
  async scanFlyer(imageUrl: string) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new ServiceUnavailableException(
        'AI flyer scanning is not configured (missing ANTHROPIC_API_KEY).',
      );
    }
    const file = path.basename(imageUrl || '');
    const filePath = path.join(process.cwd(), 'uploads', file);
    if (!file || !fs.existsSync(filePath)) {
      throw new BadRequestException('Flyer image not found. Upload it first.');
    }

    const ext = file.split('.').pop()?.toLowerCase();
    const mediaType =
      ext === 'png'
        ? 'image/png'
        : ext === 'webp'
          ? 'image/webp'
          : ext === 'gif'
            ? 'image/gif'
            : 'image/jpeg';
    const data = fs.readFileSync(filePath).toString('base64');

    try {
      const response = await this.client.messages.create({
        model: 'claude-opus-4-8',
        max_tokens: 1024,
        output_config: { format: { type: 'json_schema', schema: FLYER_SCHEMA } },
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data },
              },
              {
                type: 'text',
                text:
                  'This is a restaurant promotional flyer. Extract a short promotion ' +
                  'title, the best-matching food category, an offer badge (like "30% OFF" ' +
                  'or "Buy 1 Get 1" — empty string if none), and a one-to-two sentence ' +
                  'description of the deal. Pick category only from the allowed list.',
              },
            ],
          },
        ],
      });

      const textBlock = response.content.find((b) => b.type === 'text') as
        | { type: 'text'; text: string }
        | undefined;
      if (!textBlock) throw new Error('No text in model response');
      const parsed = JSON.parse(textBlock.text) as Record<string, unknown>;
      return {
        title: (parsed.title as string) ?? '',
        category: CATEGORIES.includes(parsed.category as string)
          ? (parsed.category as string)
          : null,
        badge: (parsed.badge as string) || null,
        description: (parsed.description as string) ?? '',
      };
    } catch (e) {
      this.logger.error(`Flyer scan failed: ${(e as Error).message}`);
      throw new ServiceUnavailableException('Could not read the flyer. Try again.');
    }
  }
}
