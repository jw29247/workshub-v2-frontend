# Frontend Application - AI Assistant Guide

## Overview
React 19 application with TypeScript, serving as the user interface for the WorksHub operations dashboard. Built with modern tooling and real-time capabilities for agency management workflows.

## Tech Stack
- **React 19** with TypeScript for components and state management
- **Vite** for fast development and build tooling
- **Tailwind CSS v4** with custom design tokens for styling
- **React Router v7** for client-side routing
- **Redux Toolkit** for global state management
- **Socket.io** for real-time updates
- **Playwright** for end-to-end testing

## Project Structure
```
src/
├── components/     # Reusable UI components
├── contexts/       # React context providers
├── services/       # API calls and external integrations
├── store/          # Redux store and slices
├── utils/          # Helper functions and utilities
├── styles/         # Global styles and theme tokens
├── config/         # Configuration files
├── assets/         # Images, fonts, and static files
├── App.tsx         # Main application component
└── main.tsx        # Application entry point
```

## Key Libraries & Frameworks
- **@headlessui/react** - Accessible UI primitives
- **@heroicons/react** - SVG icon library
- **@reduxjs/toolkit** - State management
- **lucide-react** - Additional icons
- **date-fns** - Date manipulation utilities
- **recharts** - Data visualization charts
- **sonner** - Toast notifications
- **clsx** & **tailwind-merge** - Conditional CSS classes

## Development Commands
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Code quality checks
npm run lint        # ESLint linting
npm run typecheck   # TypeScript checking
npm run check       # Run both lint and typecheck

# Testing
npm run test                     # Run Playwright tests
npm run test:ui                  # Run tests with UI
npm run test:install-browsers    # Install test browsers

# Preview production build
npm run preview
```

## Development Guidelines

### Component Architecture
- Use functional components with hooks
- Follow atomic design principles (atoms, molecules, organisms)
- Keep components small and focused on single responsibility
- Use TypeScript interfaces for all props
- Prefer composition over inheritance

### State Management
- Use Redux Toolkit for global state
- Keep local state for component-specific data
- Use React Context for theme/auth state
- Implement proper loading and error states

### Styling Guidelines
- Use Tailwind CSS utility classes
- Leverage custom design tokens in `tokens.css` and `tokens-dark.css`
- Avoid inline styles
- Use `clsx` for conditional classes
- Support both light and dark themes

### TypeScript Best Practices
- Enable strict mode
- Define interfaces for all component props
- Use type assertions sparingly
- Export types for reuse across components
- Leverage utility types for better type safety

### API Integration
- Use services directory for API calls
- Implement proper error handling
- Use loading states for async operations
- Handle real-time updates via Socket.io
- Cache API responses appropriately

### Testing Strategy
- Write Playwright tests for critical user journeys
- Test accessibility features
- Verify responsive design
- Test real-time functionality
- Use data-testid attributes for reliable element selection

## Configuration Files
- **vite.config.ts** - Vite build configuration
- **tailwind.config.js** - Tailwind CSS configuration
- **tsconfig.json** - TypeScript configuration
- **eslint.config.js** - ESLint rules and settings
- **playwright.config.ts** - End-to-end test configuration

## Code Quality Standards
- **ESLint**: Enforces code quality and consistency
- **TypeScript**: Strict type checking enabled
- **Prettier**: Code formatting (integrated with ESLint)
- **GitHub Actions**: Automated quality checks on PRs

## Common Patterns

### Component Structure
```typescript
interface ComponentProps {
  // Define props with TypeScript
}

export const Component: React.FC<ComponentProps> = ({ prop }) => {
  // Component logic
  return (
    <div className="tailwind-classes">
      {/* JSX content */}
    </div>
  );
};
```

### API Service Pattern
```typescript
// services/apiService.ts
export const apiService = {
  async getData(params: Params): Promise<Data> {
    // API call implementation
  }
};
```

### Redux Store Pattern
```typescript
// store/slices/featureSlice.ts
export const featureSlice = createSlice({
  name: 'feature',
  initialState,
  reducers: {
    // Reducer logic
  }
});
```

## Authentication & Security
- OAuth integration for user authentication
- Secure token storage and management
- Route protection for authenticated users
- Proper CORS handling for API calls

## Performance Considerations
- Lazy load components for code splitting
- Optimize bundle size with tree shaking
- Use React.memo for expensive renders
- Implement proper caching strategies
- Monitor bundle analysis for optimization opportunities

## Real-time Features
- Socket.io client for live updates
- Handle connection/disconnection gracefully
- Implement optimistic UI updates
- Manage real-time state synchronization

## Build & Deployment
- Production builds use `npm run build`
- Static assets optimized for CDN deployment
- Environment variables configured via Vite
- Optimized for serverless and edge deployment
- CI/CD via GitHub Actions
- Supports Vercel, Netlify, and other static hosting

## Environment Configuration
- Copy `.env.example` to `.env` for local development
- Required: `VITE_API_URL` - Backend API endpoint
- Optional: `VITE_ENVIRONMENT` - deployment environment

## Deployment Platforms
- **Vercel**: Automatic deployments with vercel.json config
- **Netlify**: SPA routing with netlify.toml config
- **GitHub Actions**: Automated CI/CD workflows

## Troubleshooting
- Check browser console for JavaScript errors
- Verify API connectivity and network requests
- Ensure CORS is properly configured on backend
- Use React DevTools for component debugging
- Check Tailwind CSS compilation for styling issues
- Validate TypeScript compilation for type errors

For backend API documentation, see the backend repository.