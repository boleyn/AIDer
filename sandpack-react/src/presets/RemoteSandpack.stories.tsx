import React from "react";

import { RemoteSandpack } from "./RemoteSandpack";

export default {
  title: "presets/RemoteSandpack",
  parameters: {
    layout: "fullscreen",
  },
};

export const Default = (): React.ReactElement => (
  <div style={{ height: "100vh" }}>
    <RemoteSandpack />
  </div>
);
