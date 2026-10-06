import type { AppProps } from "next/app";
import Head from 'next/head'
import { useEffect } from "react";
import { GlobalContextProvider } from '../context/global';
import { loadClientConfig, startClientConfigRefresh } from "../lib/clientConfig";
import '../geek-theme/fonts/feather/feather.css';
import "@styles/globals.css";
import "@styles/scss/index.scss";

function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  // Switch v1/v2 por módulo: lê /client-config sem bloquear a renderização.
  useEffect(() => {
    loadClientConfig();
    return startClientConfigRefresh();
  }, []);

  return (
    <GlobalContextProvider>
      <Head>
        <title>CMS -  Allterra Indica</title>
      </Head>

      <Component {...pageProps} />
    </GlobalContextProvider>
  );
}

export default MyApp;
