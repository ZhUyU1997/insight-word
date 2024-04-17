import ReactDOM from "react-dom/client";
import { App } from "./App";
import { extendTheme, type ThemeConfig } from "@chakra-ui/react";
import { ChakraProvider } from "@chakra-ui/react";
import React from "react";

const config: ThemeConfig = {
  initialColorMode: "system",
  useSystemColorMode: true,
};

const theme = extendTheme({ config });

export default function Render(app: HTMLElement) {
  const root = ReactDOM.createRoot(app);
  root.render(
    <React.StrictMode>
      <ChakraProvider theme={theme}>
        <App />
      </ChakraProvider>
    </React.StrictMode>
  );
  return root;
}
