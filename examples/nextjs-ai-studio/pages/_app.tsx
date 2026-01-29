import type { AppProps } from "next/app";
import { ChakraProvider } from "@chakra-ui/react";

// Import polyfill - it runs immediately on import
import "../utils/cryptoPolyfill";
import "../styles/globals.css";
import "../styles/assistant-ui.css";

const App = ({ Component, pageProps }: AppProps) => {
  return (
    <ChakraProvider>
      <Component {...pageProps} />
    </ChakraProvider>
  );
};

export default App;
