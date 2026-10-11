import { createRoot } from 'react-dom/client';
import './styles.css';
import { App } from './App';
import { ToastProvider } from './ui';
createRoot(document.getElementById('root')!).render(<ToastProvider><App /></ToastProvider>);
