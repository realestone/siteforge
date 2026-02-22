import { createRoot } from "react-dom/client";
import { PublicClientApplication, EventType } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { msalConfig } from "./app/lib/msalConfig";
import App from "./app/App.tsx";
import "./styles/index.css";

// MSAL instance — created once, outside the React tree
const msalInstance = new PublicClientApplication(msalConfig);

msalInstance.initialize().then(async () => {
  // handleRedirectPromise MUST be called on every page load.
  // In the popup window, this processes the auth code and closes the popup.
  // In the main window, this resolves immediately with null.
  try {
    const response = await msalInstance.handleRedirectPromise();
    if (response?.account) {
      msalInstance.setActiveAccount(response.account);
    }
  } catch (err) {
    console.error("[MSAL] Redirect error:", err);
  }

  // Set active account from cache if available
  if (!msalInstance.getActiveAccount()) {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      msalInstance.setActiveAccount(accounts[0]);
    }
  }

  msalInstance.addEventCallback((event) => {
    if (
      event.eventType === EventType.LOGIN_SUCCESS &&
      event.payload &&
      "account" in event.payload
    ) {
      msalInstance.setActiveAccount(event.payload.account);
    }
  });

  createRoot(document.getElementById("root")!).render(
    <MsalProvider instance={msalInstance}>
      <App />
    </MsalProvider>,
  );
});
