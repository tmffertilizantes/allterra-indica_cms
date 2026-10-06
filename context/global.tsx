import { apiUrl, swrFetcher } from "../lib/api";
import { useState, useContext, createContext, useEffect } from "react";
import useSWR from "swr";
import { parseCookies } from "nookies";

interface Props {
  children: React.ReactNode
}

const GlobalContext = createContext<{ token: string, user: any, user_api_error: any }>({ token: "", user: "", user_api_error: "" });

export const GlobalContextProvider = ({ children }: Props) => {
  const cookies = parseCookies();

  const { data: { user } = {}, error } = useSWR(
    [apiUrl(`/auth/me`), cookies["USER_TOKEN"]],
    swrFetcher
  );

  return (
    <GlobalContext.Provider value={{
      token: cookies["USER_TOKEN"],
      user,
      user_api_error: error
    }}>
      {children}
    </GlobalContext.Provider>
  );
}

export const useGlobal = () => useContext(GlobalContext);
