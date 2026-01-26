import React from "react";

import { Sandpack } from "./presets";

export default {
  title: "Intro/Private Packages",
};

export const Basic: React.FC = () => {
  return (
    <div style={{ width: 800, margin: "auto" }}>
      <Sandpack
        customSetup={{
          dependencies: {},
        }}
        files={{
          "/public/logo.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-11.5 -10.23174 23 20.46348">
          <title>React Logo</title>
          <circle cx="0" cy="0" r="2.05" fill="#61dafb"/>
          <g stroke="#61dafb" stroke-width="1" fill="none">
            <ellipse rx="11" ry="4.2"/>
            <ellipse rx="11" ry="4.2" transform="rotate(60)"/>
            <ellipse rx="11" ry="4.2" transform="rotate(120)"/>
          </g>
        </svg>
          `,
          "Button.js": `export const Button = ({ children, ...props }) => {
  return (
    <button
      style={{
        padding: "8px 16px",
        backgroundColor: "#007bff",
        color: "white",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
        fontSize: "14px",
      }}
      {...props}
    >
      {children}
    </button>
  );
};`,
          "App.js": `import { Button } from "./Button";

export default function App() {
  return <>
    <Button>Hello World</Button>
    <img width="100" src="/public/logo.svg" alt="React Logo" />
  </>
}`,
        }}
        options={{
          experimental_enableServiceWorker: true,
          experimental_enableStableServiceWorkerId: true,
        }}
        template="react"
      />
    </div>
  );
};
