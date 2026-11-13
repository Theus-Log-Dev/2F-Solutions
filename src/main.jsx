import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { StoreProvider } from './context/Store.jsx';
import './styles/index.css';

createRoot(document.getElementById('root')).render(
  <StoreProvider>
    <App />
  </StoreProvider>
);
