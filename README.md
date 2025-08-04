# 🔥 Burn It

A powerful, client-side web application for composing images, animated GIFs, and videos with real-time preview and multi-format export capabilities.

![Burn It Application](https://github.com/user-attachments/assets/056b95c0-db01-4e4b-a713-a0abf3e5dd0d)

## ✨ Features

### 🎨 Asset Management
- **Drag & Drop Import**: PNG, JPEG, GIF, and WebM files
- **Real-time Thumbnails**: Instant preview of all imported assets
- **Format Detection**: Automatic file type validation and handling
- **Smart Organization**: Asset browser with metadata display

### 🖼️ Canvas & Layers
- **Multi-layer Composition**: Unlimited layers with full z-order control
- **Resizable Canvas**: Multiple presets (1:1, 16:9, 9:16) and custom sizes
- **Transform Controls**: Move, resize, rotate, and adjust opacity
- **Layer Management**: Lock, hide, rename, and duplicate layers
- **Real-time Preview**: Smooth 60fps preview with configurable frame rates

### ⏱️ Timeline & Animation
- **Configurable Loop Duration**: Auto-detect from assets or custom timing
- **Playback Controls**: Play, pause, stop with speed adjustment (0.25×-2×)
- **Frame-accurate Scrubbing**: Precise timeline navigation
- **Visual Timeline**: Asset duration indicators and time markers

### 📤 Export Options
- **Image Export**: PNG and JPEG with quality control
- **Animated GIF**: Optimized with 256-color palette quantization
- **WebM Video**: Hardware-accelerated with alpha channel support
- **Format Detection**: Automatic browser capability detection

### 🌙 Fire Theme Design
- **Dark Interface**: Easy on the eyes for long editing sessions
- **Fire Accents**: Warm orange/red color scheme throughout
- **Responsive Layout**: Works on desktop, tablet, and mobile devices
- **Smooth Animations**: Polished micro-interactions and transitions

## 🚀 Quick Start

### Prerequisites
- Node.js 18.x or higher
- Modern web browser with Canvas 2D support

### Installation

```bash
# Clone the repository
git clone https://github.com/hankerspace/burnit.git
cd burnit

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the application.

### Building for Production

```bash
# Build optimized bundle
npm run build

# Preview production build
npm run preview
```

## 📖 Usage Guide

### 1. Import Assets
- Drag and drop files into the **Assets** panel
- Or click "browse files" to select files manually
- Supported formats: PNG, JPEG, GIF, WebM

### 2. Create Layers
- Click any asset to add it as a layer to the canvas
- Layers appear in the **Layers** panel in rendering order
- Use visibility 👁 and lock 🔒 controls as needed

### 3. Transform Layers
- Select layers to see transform handles on canvas
- Use the **Inspector** panel for precise numeric control
- Adjust position, scale, rotation, and opacity

### 4. Configure Timeline
- Set canvas size and frame rate in composition settings
- Use playback controls to preview your animation
- Adjust loop duration or let it auto-detect from assets

### 5. Export Your Work
- Click **Export** to open the export dialog
- Choose format: PNG, JPEG, GIF, or WebM
- Adjust quality settings and click export

## 🛠️ Development

### Project Structure

```
src/
├── app/           # Main application component
├── components/    # React components
│   ├── Assets/    # Asset browser
│   ├── Canvas/    # Canvas stage
│   ├── Export/    # Export dialog
│   ├── Inspector/ # Layer properties
│   ├── LayerList/ # Layer management
│   └── Timeline/  # Playback controls
├── lib/          # Core libraries
│   ├── canvas/   # Canvas drawing utilities
│   ├── gif/      # GIF encoding/decoding
│   ├── media/    # Media recording
│   └── video/    # Video utilities
├── state/        # Zustand state management
├── types/        # TypeScript definitions
├── utils/        # Utility functions
└── test/         # Test files
```

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run format       # Format code with Prettier
npm run format:check # Check code formatting

# Testing
npm run test         # Run tests in watch mode
npm run test:run     # Run tests once
npm run test:ui      # Run tests with UI
npm run test:e2e     # Run E2E tests
npm run test:e2e:ui  # Run E2E tests with UI
```

### Technology Stack

- **Frontend**: React 19 + TypeScript (with strict type safety)
- **Build Tool**: Vite 7
- **State Management**: Zustand
- **UI Components**: Radix UI primitives
- **Canvas**: HTML5 Canvas 2D API
- **Animation**: RequestAnimationFrame
- **GIF Processing**: gifuct-js + gifenc
- **Video**: MediaRecorder API + HTMLVideoElement
- **Testing**: Vitest + Playwright
- **Linting**: ESLint + Prettier
- **Code Quality**: Strict TypeScript configuration with enhanced type safety

## 🎯 Browser Support

### Minimum Requirements
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Feature Support
- **Canvas 2D**: All supported browsers
- **WebM Import**: Chrome, Firefox, Edge
- **WebM Export**: Chrome, Firefox, Edge (with MediaRecorder)
- **Alpha Channel**: Chrome, Firefox (VP8/VP9 with alpha)
- **OffscreenCanvas**: Chrome, Firefox (performance optimization)
- **Web Workers**: All supported browsers

The application gracefully degrades features based on browser capabilities.

## 🏗️ Architecture

### State Management
The application uses Zustand for centralized state management with the following stores:
- **Project State**: Assets, layers, composition settings
- **Timeline State**: Playback, current time, speed
- **Canvas State**: Zoom, pan, selection
- **UI State**: Tool selection, grid settings

### Rendering Pipeline
1. **Asset Loading**: Files are converted to ImageBitmaps or VideoElements
2. **Layer Composition**: Transforms are applied in Z-order
3. **Canvas Drawing**: Real-time rendering with requestAnimationFrame
4. **Export Processing**: Frames are captured and encoded

### Performance Optimizations
- **Web Workers**: GIF encoding off main thread
- **OffscreenCanvas**: Hardware-accelerated rendering when available
- **ImageBitmap**: Optimized image decoding
- **Lazy Loading**: Assets loaded on demand
- **Memory Management**: Automatic cleanup of resources

## 🧪 Testing

### Unit Tests
Located in `src/test/`, covering:
- State management logic
- Utility functions
- Canvas operations
- File handling

### E2E Tests
Located in `tests/`, covering:
- Application startup
- Asset import workflow
- Layer manipulation
- Export functionality
- Responsive behavior

### Running Tests

```bash
# Unit tests
npm run test:run

# E2E tests (requires browser installation)
npx playwright install
npm run test:e2e
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm run test:run`
5. Commit changes: `git commit -m 'Add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Style
- Use TypeScript for all new code
- Follow existing naming conventions
- Add tests for new functionality
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **gifuct-js**: GIF decoding library
- **gifenc**: GIF encoding library
- **Radix UI**: Accessible UI components
- **Zustand**: State management
- **Vite**: Build tool and development server

## 🐛 Known Issues

- WebM alpha channel support varies by browser
- Large GIF files may cause memory pressure
- Some mobile browsers have Canvas size limitations

---

Made with 🔥 by Hankerspace
