import React, { useState, useRef, useEffect } from 'react';

const TEMPLATES = [
  {
    id: 'quote-card',
    name: 'Quote Card',
    description: 'Clean text on colored background',
    defaultBg: '#0077B5',
    textColor: '#FFFFFF',
  },
  {
    id: 'stat-highlight',
    name: 'Stat Highlight',
    description: 'Big number with context',
    defaultBg: '#1a1a2e',
    textColor: '#FFFFFF',
  },
  {
    id: 'lesson-learned',
    name: 'Lesson Learned',
    description: 'Key takeaway format',
    defaultBg: '#16213e',
    textColor: '#FFFFFF',
  },
  {
    id: 'before-after',
    name: 'Before/After',
    description: 'Comparison layout',
    defaultBg: '#0f3460',
    textColor: '#FFFFFF',
  },
];

const COLORS = [
  '#0077B5', // LinkedIn Blue
  '#1a1a2e', // Dark Navy
  '#16213e', // Deep Blue
  '#0f3460', // Royal Blue
  '#e94560', // Coral Red
  '#533483', // Purple
  '#2d4059', // Steel Blue
  '#222831', // Charcoal
];

function ImageEditor({ initialPrompt, onImageReady }) {
  const canvasRef = useRef(null);
  const [template, setTemplate] = useState(TEMPLATES[0]);
  const [bgColor, setBgColor] = useState(TEMPLATES[0].defaultBg);
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [mainText, setMainText] = useState('');
  const [subText, setSubText] = useState('');
  const [statNumber, setStatNumber] = useState('');
  const [showAiPrompts, setShowAiPrompts] = useState(true);

  // Initialize with prompt if provided
  useEffect(() => {
    if (initialPrompt) {
      setMainText(initialPrompt);
    }
  }, [initialPrompt]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = 1200;
    const height = 1200;

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Draw based on template
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';

    switch (template.id) {
      case 'quote-card':
        // Quote marks
        ctx.font = 'bold 200px Georgia';
        ctx.fillStyle = `${textColor}33`;
        ctx.fillText('"', 200, 280);
        ctx.fillText('"', 1000, 950);

        // Main text
        ctx.fillStyle = textColor;
        ctx.font = 'bold 56px -apple-system, BlinkMacSystemFont, sans-serif';
        wrapText(ctx, mainText || 'Your quote here', 600, 500, 1000, 70);

        // Attribution
        if (subText) {
          ctx.font = '32px -apple-system, BlinkMacSystemFont, sans-serif';
          ctx.fillStyle = `${textColor}CC`;
          ctx.fillText(`— ${subText}`, 600, 1050);
        }
        break;

      case 'stat-highlight':
        // Big number
        ctx.font = 'bold 280px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText(statNumber || '75%', 600, 550);

        // Context
        ctx.font = '48px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillStyle = `${textColor}CC`;
        wrapText(ctx, mainText || 'Add context here', 600, 720, 1000, 60);

        // Source
        if (subText) {
          ctx.font = '28px -apple-system, BlinkMacSystemFont, sans-serif';
          ctx.fillStyle = `${textColor}88`;
          ctx.fillText(subText, 600, 1100);
        }
        break;

      case 'lesson-learned':
        // Label
        ctx.font = '24px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillStyle = `${textColor}88`;
        ctx.fillText('LESSON LEARNED', 600, 200);

        // Line
        ctx.strokeStyle = `${textColor}44`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(400, 230);
        ctx.lineTo(800, 230);
        ctx.stroke();

        // Main lesson
        ctx.fillStyle = textColor;
        ctx.font = 'bold 52px -apple-system, BlinkMacSystemFont, sans-serif';
        wrapText(ctx, mainText || 'Your key lesson here', 600, 500, 1000, 70);

        // Takeaway
        if (subText) {
          ctx.font = '36px -apple-system, BlinkMacSystemFont, sans-serif';
          ctx.fillStyle = `${textColor}BB`;
          wrapText(ctx, subText, 600, 900, 900, 50);
        }
        break;

      case 'before-after':
        // Split background
        ctx.fillStyle = `${bgColor}`;
        ctx.fillRect(0, 0, 600, height);
        ctx.fillStyle = lightenColor(bgColor, 20);
        ctx.fillRect(600, 0, 600, height);

        // Labels
        ctx.fillStyle = `${textColor}88`;
        ctx.font = '28px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText('BEFORE', 300, 150);
        ctx.fillText('AFTER', 900, 150);

        // Before text
        ctx.fillStyle = textColor;
        ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, sans-serif';
        wrapText(ctx, mainText || 'Before state', 300, 500, 500, 50);

        // After text
        wrapText(ctx, subText || 'After state', 900, 500, 500, 50);

        // Arrow
        ctx.font = '100px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillStyle = `${textColor}66`;
        ctx.fillText('→', 600, 600);
        break;

      default:
        break;
    }
  }, [template, bgColor, textColor, mainText, subText, statNumber]);

  // Helper to wrap text
  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let testLine = '';
    let lineCount = 0;

    for (let n = 0; n < words.length; n++) {
      testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, x, y + lineCount * lineHeight);
        line = words[n] + ' ';
        lineCount++;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y + lineCount * lineHeight);
  }

  // Helper to lighten color
  function lightenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = ((num >> 8) & 0x00ff) + amt;
    const B = (num & 0x0000ff) + amt;
    return `#${(
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)}`;
  }

  const handleDownload = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = 'linkedin-image.png';
    link.href = canvas.toDataURL('image/png');
    link.click();

    if (onImageReady) {
      onImageReady(canvas.toDataURL('image/png'));
    }
  };

  const handleCopyToClipboard = async () => {
    const canvas = canvasRef.current;
    try {
      canvas.toBlob(async (blob) => {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        alert('Image copied to clipboard!');
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      alert('Failed to copy. Try downloading instead.');
    }
  };

  // AI Image Prompts based on content
  const generateAiPrompts = () => {
    const prompts = [];
    if (mainText) {
      prompts.push(
        `Professional LinkedIn post image: ${mainText.substring(0, 100)}. Clean, minimalist design, corporate blue tones, no text overlay.`,
        `Abstract visualization representing: "${mainText.substring(0, 50)}". Modern, tech-forward aesthetic with gradient blues and whites.`,
        `Business concept illustration: ${mainText.substring(0, 80)}. Isometric style, professional color palette, suitable for LinkedIn.`
      );
    }
    return prompts;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Image Creator</h2>
        <p className="text-sm text-gray-500">
          Create professional graphics for your LinkedIn posts or get AI prompts for image generation
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="space-y-6">
          {/* Template Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-medium text-gray-900 mb-4">Template</h3>
            <div className="grid grid-cols-2 gap-3">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTemplate(t);
                    setBgColor(t.defaultBg);
                  }}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    template.id === t.id
                      ? 'border-linkedin-blue bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900 text-sm">{t.name}</div>
                  <div className="text-xs text-gray-500">{t.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-medium text-gray-900 mb-4">Colors</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 mb-2 block">Background</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setBgColor(color)}
                      className={`w-8 h-8 rounded-lg border-2 ${
                        bgColor === color ? 'border-gray-900' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-2 block">Text Color</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTextColor('#FFFFFF')}
                    className={`w-8 h-8 rounded-lg border-2 bg-white ${
                      textColor === '#FFFFFF' ? 'border-gray-900' : 'border-gray-300'
                    }`}
                  />
                  <button
                    onClick={() => setTextColor('#000000')}
                    className={`w-8 h-8 rounded-lg border-2 bg-black ${
                      textColor === '#000000' ? 'border-gray-400' : 'border-transparent'
                    }`}
                  />
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Text Content */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-medium text-gray-900 mb-4">Content</h3>
            <div className="space-y-4">
              {template.id === 'stat-highlight' && (
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Stat/Number</label>
                  <input
                    type="text"
                    value={statNumber}
                    onChange={(e) => setStatNumber(e.target.value)}
                    placeholder="e.g., 75%, 10x, $1M"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-linkedin-blue focus:border-transparent"
                  />
                </div>
              )}
              <div>
                <label className="text-sm text-gray-600 mb-1 block">
                  {template.id === 'quote-card'
                    ? 'Quote'
                    : template.id === 'stat-highlight'
                    ? 'Context'
                    : template.id === 'before-after'
                    ? 'Before'
                    : 'Main Text'}
                </label>
                <textarea
                  value={mainText}
                  onChange={(e) => setMainText(e.target.value)}
                  placeholder="Enter your main text..."
                  className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-linkedin-blue focus:border-transparent resize-none"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">
                  {template.id === 'quote-card'
                    ? 'Attribution (optional)'
                    : template.id === 'stat-highlight'
                    ? 'Source (optional)'
                    : template.id === 'before-after'
                    ? 'After'
                    : 'Supporting Text'}
                </label>
                <input
                  type="text"
                  value={subText}
                  onChange={(e) => setSubText(e.target.value)}
                  placeholder={
                    template.id === 'quote-card'
                      ? 'e.g., Suman Siva'
                      : template.id === 'stat-highlight'
                      ? 'e.g., Marco Internal Data, 2025'
                      : 'Enter text...'
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-linkedin-blue focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Preview & Export */}
        <div className="space-y-6">
          {/* Canvas Preview */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-medium text-gray-900 mb-4">Preview</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <canvas
                ref={canvasRef}
                width={1200}
                height={1200}
                style={{ width: '100%', height: 'auto' }}
              />
            </div>
            <div className="mt-4 flex space-x-3">
              <button
                onClick={handleDownload}
                className="flex-1 py-2 bg-linkedin-blue text-white rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Download PNG</span>
              </button>
              <button
                onClick={handleCopyToClipboard}
                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                <span>Copy to Clipboard</span>
              </button>
            </div>
          </div>

          {/* AI Image Generation Prompts */}
          <div className="bg-white rounded-lg shadow">
            <div
              className="p-4 border-b border-gray-200 flex items-center justify-between cursor-pointer"
              onClick={() => setShowAiPrompts(!showAiPrompts)}
            >
              <h3 className="font-medium text-gray-900">AI Image Prompts</h3>
              <svg
                className={`w-5 h-5 text-gray-500 transition-transform ${showAiPrompts ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {showAiPrompts && (
              <div className="p-4 space-y-3">
                <p className="text-sm text-gray-600 mb-3">
                  Use these prompts with DALL-E, Midjourney, or similar AI image generators:
                </p>
                {mainText ? (
                  generateAiPrompts().map((prompt, i) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">{prompt}</p>
                      <button
                        onClick={async () => {
                          await navigator.clipboard.writeText(prompt);
                          alert('Prompt copied!');
                        }}
                        className="mt-2 text-xs text-linkedin-blue hover:underline"
                      >
                        Copy Prompt
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    Enter some text above to generate AI image prompts
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">LinkedIn Image Tips</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Square images (1200x1200) get best engagement</li>
              <li>• Keep text minimal - 10 words or less</li>
              <li>• High contrast colors improve readability</li>
              <li>• Text + Image posts get 2x more impressions</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImageEditor;
