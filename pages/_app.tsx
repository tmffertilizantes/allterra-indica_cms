import type { AppProps } from "next/app";
import Head from 'next/head'
import { useEffect } from "react";
import { GlobalContextProvider } from '../context/global';
import axios from "axios";
import { loadClientConfig, startClientConfigRefresh } from "../lib/clientConfig";
import { api } from "../lib/api";
import { installSessionInterceptors } from "../lib/session";
import '../geek-theme/fonts/feather/feather.css';
import "@styles/globals.css";
import "@styles/scss/index.scss";

// Credencial por destino (v1: ponte/legado · v2: access) e renovação da sessão (specs/016).
// No axios padrão, que as telas usam diretamente, e na instância central.
if (typeof window !== "undefined") {
  installSessionInterceptors(axios);
  installSessionInterceptors(api);
}

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
