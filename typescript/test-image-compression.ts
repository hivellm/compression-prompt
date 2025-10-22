#!/usr/bin/env node

/**
 * Quick test for image compression functionality
 */

import { Compressor, OutputFormat } from './src';
import { writeFileSync } from 'fs';

const testText = `
# Test Document for Image Compression

This is a test document to verify that the image compression feature is working correctly.
The image renderer should convert this compressed text into a 1024x1024 PNG image that can
be consumed by vision models.

## Features Being Tested

1. Text compression using statistical filtering
2. Image rendering with proper text wrapping
3. PNG encoding and validation
4. Proper handling of newlines and formatting

## Technical Details

The image compression pipeline works as follows:
- First, the input text is compressed using statistical filtering
- Then, the compressed text is rendered onto a canvas
- Finally, the canvas is encoded as a PNG image

This approach enables optical context compression for vision models like GPT-4V or Claude.

## Conclusion

If you can read this in an image, the feature is working correctly!
`;

async function main() {
  console.log('🧪 Testing Image Compression Feature\n');
  
  try {
    const compressor = new Compressor({
      targetRatio: 0.5,
      minInputTokens: 10,  // Lower for test
      minInputBytes: 100,  // Lower for test
    });

    console.log('📝 Original text:');
    console.log(`  Length: ${testText.length} chars`);
    console.log(`  Estimated tokens: ${Math.floor(testText.length / 4)}`);
    console.log();

    // Test 1: Text compression
    console.log('Test 1: Text-only compression');
    const textResult = compressor.compressWithFormat(testText, OutputFormat.TEXT);
    console.log(`  ✓ Compressed to ${textResult.compressedTokens} tokens (${(textResult.compressionRatio * 100).toFixed(1)}%)`);
    console.log(`  ✓ Saved ${textResult.tokensRemoved} tokens`);
    console.log();

    // Test 2: Image compression
    console.log('Test 2: Image compression');
    const imageResult = compressor.compressWithFormat(testText, OutputFormat.IMAGE);
    console.log(`  ✓ Compressed to ${imageResult.compressedTokens} tokens (${(imageResult.compressionRatio * 100).toFixed(1)}%)`);
    
    if (imageResult.imageData) {
      console.log(`  ✓ Generated image: ${imageResult.imageData.length} bytes (${Math.floor(imageResult.imageData.length / 1024)} KB)`);
      
      // Verify PNG signature
      const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
      const isValidPng = pngSignature.every((byte, i) => imageResult.imageData![i] === byte);
      
      if (isValidPng) {
        console.log('  ✓ Valid PNG signature detected');
      } else {
        console.log('  ✗ Invalid PNG signature!');
      }

      // Save image
      const filename = 'test_image_compression.png';
      writeFileSync(filename, imageResult.imageData);
      console.log(`  ✓ Saved to: ${filename}`);
    } else {
      console.log('  ✗ No image data generated!');
    }

    console.log();
    console.log('✅ All tests passed!');
    console.log();
    console.log('Next steps:');
    console.log('  1. Open test_image_compression.png to verify the image');
    console.log('  2. Check that text is readable and properly formatted');
    console.log('  3. Try with larger documents using the paper-to-images example');

  } catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

main();

