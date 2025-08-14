
// Polyfills and browser compatibility
import 'react';
import 'react-dom/client';

// Browser polyfills
if (typeof globalThis === 'undefined') {
  (window as any).globalThis = window;
}

// Import CSS
import './index.css';
import './styles/mobile-responsive.css';

// Import main components after polyfills
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Initialize with error handling
const initializeApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error("Could not find root element to mount to");
    const errorDiv = document.createElement('div');
    errorDiv.innerHTML = '<h1>Application Error</h1><p>Could not initialize the application. Please refresh the page.</p>';
    document.body.appendChild(errorDiv);
    return;
  }

  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error('Failed to render React app:', error);
    rootElement.innerHTML = '<h1>Application Error</h1><p>Failed to load the application. Please refresh the page.</p>';
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}