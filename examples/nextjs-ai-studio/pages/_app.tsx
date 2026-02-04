import type { AppProps } from "next/app";
import { ChakraProvider } from "@chakra-ui/react";
import { theme } from "../styles/theme";

// Import polyfill - it runs immediately on import
import "../utils/cryptoPolyfill";
import "../styles/globals.css";
import "../styles/assistant-ui.css";
import AuthGuard from "../components/auth/AuthGuard";

const App = ({ Component, pageProps }: AppProps) => {
  return (
    <ChakraProvider theme={theme}>
      <AuthGuard>
        <Component {...pageProps} />
      </AuthGuard>
    </ChakraProvider>
  );
};

export default App;
