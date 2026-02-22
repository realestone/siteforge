import { Configuration, LogLevel } from "@azure/msal-browser";

export const msalConfig: Configuration = {
  auth: {
    clientId: "cd5dd6ec-53a7-4192-adfe-b4c5aa184061",
    // Use /organizations for work/school accounts only.
    // Change to /common if app registration supports personal accounts too.
    // Change to /consumers for personal accounts only.
    // /common = work + personal accounts (requires app registration to support both)
    // /organizations = work/school only
    // /consumers = personal Microsoft accounts only
    authority: "https://login.microsoftonline.com/consumers",
    redirectUri: "http://localhost:5173",
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: true,
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Info,
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error:
            console.error("[MSAL]", message);
            break;
          case LogLevel.Warning:
            console.warn("[MSAL]", message);
            break;
          case LogLevel.Info:
            console.info("[MSAL]", message);
            break;
          case LogLevel.Verbose:
            console.debug("[MSAL]", message);
            break;
        }
      },
    },
  },
};

export const graphScopes = {
  files: ["Files.ReadWrite.All"],
  user: ["User.Read"],
};
