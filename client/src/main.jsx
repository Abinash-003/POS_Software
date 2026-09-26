import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./styles/index.css";
import { App } from "./App.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import { LanguageProvider } from "./i18n/LanguageProvider.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import { ConfirmProvider } from "./context/ConfirmContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { wakeApiServer } from "./lib/apiClient.js";

// Start waking the Render API immediately (cold start can take ~30–50s).
wakeApiServer();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      {/* Router sits outermost so shared UI (confirm dialogs, toasts) can use
          links and navigation regardless of where it is rendered. */}
      <BrowserRouter>
        <LanguageProvider>
          <ToastProvider>
            <ConfirmProvider>
              <AuthProvider>
                <App />
              </AuthProvider>
            </ConfirmProvider>
          </ToastProvider>
        </LanguageProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);
