export const theme = {
  global: {
    colors: {
      brand: "#0a6b6f",
      "brand-dark": "#064e52",
      "accent-1": "#12a37f",
      background: "#e8eef3",
      "light-1": "#ffffff",
      "light-2": "#f4f7fa",
      "light-3": "#eef2f6",
      "dark-1": "#15202b",
      "dark-2": "#4a5d73",
      "dark-4": "#6b7c93",
      "dark-5": "#94a3b8",
      "status-ok": "#d1fae5",
      "status-warning": "#fef3c7",
      "status-critical": "#fee2e2",
      "meter-positive": "#059669",
      "meter-negative": "#e11d48",
      "card-border": "#e2e8f0",
      "flow-arrow": "#94a3b8"
    },
    font: {
      family:
        "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      size: "15px",
      height: "22px"
    },
    focus: { border: { color: "brand" } },
    elevation: {
      light: { x: "0px", y: "1px", blur: "3px", color: "rgba(15, 32, 43, 0.08)" },
      medium: { x: "0px", y: "8px", blur: "24px", color: "rgba(15, 32, 43, 0.1)" }
    }
  },
  button: {
    border: { radius: "10px" },
    primary: {
      background: { color: "brand" },
      extend: "font-weight: 600; letter-spacing: 0.02em;"
    }
  },
  heading: {
    level: {
      2: { medium: { size: "26px", height: "32px", weight: 700 } },
      4: { medium: { size: "16px", height: "22px", weight: 600 } }
    }
  },
  formField: {
    label: { size: "xsmall", weight: 600, color: "dark-2" }
  },
  textInput: {
    container: { extend: "border-radius: 10px;" }
  }
};
