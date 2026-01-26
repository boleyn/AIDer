import React from "react";

import { SandpackLayout, SandpackProvider } from "../../sandpack-react/src";
import {
  SandpackCodeEditor,
  SandpackFileExplorer,
  SandpackPreview,
} from "../../sandpack-react/src/components";

import indexHtml from "./index.html?raw";
import indexTsx from "./index.tsx?raw";
import indexCss from "./index.css?raw";
import constantsTs from "./constants.ts?raw";
import typesTs from "./types.ts?raw";
import utilsTs from "./utils.ts?raw";
import artifactCardTsx from "./components/ArtifactCard.tsx?raw";
import dottedGlowBackgroundTsx from "./components/DottedGlowBackground.tsx?raw";
import iconsTsx from "./components/Icons.tsx?raw";
import sideDrawerTsx from "./components/SideDrawer.tsx?raw";

const files = {
  "/index.tsx": {
    code: indexTsx,
  },
  "/index.css": {
    code: indexCss,
  },
  "/constants.ts": {
    code: constantsTs,
  },
  "/types.ts": {
    code: typesTs,
  },
  "/utils.ts": {
    code: utilsTs,
  },
  "/components/ArtifactCard.tsx": {
    code: artifactCardTsx,
  },
  "/components/DottedGlowBackground.tsx": {
    code: dottedGlowBackgroundTsx,
  },
  "/components/Icons.tsx": {
    code: iconsTsx,
  },
  "/components/SideDrawer.tsx": {
    code: sideDrawerTsx,
  },
  "/public/index.html": {
    code: indexHtml,
  },
};

export default {
  title: "examples/Flash UI",
  parameters: {
    layout: "fullscreen",
  },
};

export const FlashUI = () => (
  <SandpackProvider
    template="react-ts"
    files={files}
    customSetup={{
      dependencies: {
        "@google/genai": "^0.7.0",
      },
    }}
    options={{ activeFile: "/index.tsx" }}
  >
    <SandpackLayout
      style={{ "--sp-layout-height": "100vh" } as React.CSSProperties}
    >
      <SandpackFileExplorer initialCollapsedFolder={["/components/"]} />
      <SandpackCodeEditor closableTabs showLineNumbers />
      <SandpackPreview showNavigator />
    </SandpackLayout>
  </SandpackProvider>
);
