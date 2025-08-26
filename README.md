# WorksHub Frontend (v2)

A modern React application for the WorksHub operations dashboard. Built with React 19, TypeScript, and Tailwind CSS.

## 🚀 Features

- **Real-time Updates**: WebSocket integration for live data synchronization
- **Modern UI**: Built with React 19 and Tailwind CSS v4
- **Type Safety**: Full TypeScript implementation
- **State Management**: Redux Toolkit for predictable state updates
- **Authentication**: Secure user authentication and role-based access
- **Responsive Design**: Mobile-first responsive design
- **Dark Mode**: Built-in dark/light theme support
- **Performance**: Optimized builds with Vite

## 🛠️ Tech Stack

- **React 19** with TypeScript
- **Vite** for fast development and builds
- **Tailwind CSS v4** with custom design tokens
- **Redux Toolkit** for state management
- **React Router v7** for routing
- **Socket.io** for real-time updates
- **Playwright** for end-to-end testing

## 🏃‍♂️ Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/jw29247/workshub-v2-frontend.git
   cd workshub-v2-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your backend API URL
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## ⚙️ Configuration

### Environment Variables

The following environment variables are required:

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:3000` |
| `VITE_ENVIRONMENT` | Environment (development/staging/production) | `development` |

See `.env.example` for a complete list of configuration options.

## 📜 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking
- `npm run check` - Run both linting and type checking
- `npm run test` - Run Playwright tests
- `npm run test:ui` - Run tests with UI

## 🏗️ Project Structure

```
src/
├── components/          # React components
│   ├── auth/           # Authentication components
│   ├── billing/        # Billing-related components
│   ├── dashboard/      # Dashboard widgets
│   └── ...
├── contexts/           # React context providers
├── services/           # API services and utilities
├── store/              # Redux store and slices
├── styles/             # Global styles and themes
├── utils/              # Helper functions
└── config.ts           # App configuration
```

## 🎨 Styling

This project uses Tailwind CSS v4 with custom design tokens:

- `tokens.css` - Light theme design tokens
- `tokens-dark.css` - Dark theme design tokens
- Custom fonts (Space Grotesk) included

## 🔒 Authentication

The frontend supports secure authentication with:

- JWT token-based authentication
- Role-based access control (Team Member, Manager, SLT)
- Automatic token refresh
- Secure token storage

## 🌐 Real-time Features

WebSocket integration provides real-time updates for:

- Timer status changes
- Dashboard data updates
- Team health metrics
- Client billing information

## 🧪 Testing

End-to-end testing with Playwright:

```bash
# Install test browsers
npm run test:install-browsers

# Run tests
npm run test

# Run tests with UI
npm run test:ui
```

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main

### Netlify

1. Connect your repository to Netlify
2. Set build command to `npm run build`
3. Set publish directory to `dist`
4. Configure environment variables

### Manual Deployment

```bash
npm run build
# Upload dist/ folder to your hosting provider
```

## 🔧 Development

### Prerequisites

- Node.js 18 or higher
- npm 8 or higher

### Backend Connection

This frontend requires the WorksHub backend API. Configure the `VITE_API_URL` environment variable to point to your backend instance.

For local development, ensure your backend is running on `http://localhost:3000` or update the environment variable accordingly.

### Hot Reloading

The development server supports hot module replacement for fast development cycles.

## 📚 Documentation

- [Component Architecture](./src/components/README.md)
- [State Management](./src/store/README.md)
- [API Integration](./src/services/README.md)
- [WebSocket Architecture](./src/services/WEBSOCKET_ARCHITECTURE.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This project is proprietary software. All rights reserved.

## 📞 Support

For support, please contact the development team or create an issue in the repository.