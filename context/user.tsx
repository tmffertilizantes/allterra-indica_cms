import { apiUrl } from "../lib/api";
import axios from "axios";
import { Cidade } from "models/cidade";
import router from "next/router";
import { destroyCookie, parseCookies } from "nookies";
import { clearSessionCookies, isV2Session } from "../lib/session";

const cookies = parseCookies();

const axios_options = {
  headers: {
    Authorization: `Bearer ${cookies["USER_TOKEN"]}`,
  },
};

export function userIsLogged() {

  if (cookies["user"]) {
    return true;
  }

  return false;
}

export function getUserToken() {

  if (cookies["USER_TOKEN"]) {
    return cookies["USER_TOKEN"];
  }

  return "";
}

/** Logout: na v2 revoga a sessão no servidor (best effort) antes de apagar os cookies. */
export async function logout() {
  if (isV2Session()) {
    try {
      // `_retried`: sem tentar renovar se a sessão já tiver sido recusada.
      await axios.post(apiUrl(`/auth/logout`), undefined, { timeout: 3000, _retried: true } as any);
    } catch {
      // Sessão já inválida ou sem rede: os cookies são apagados mesmo assim.
    }
    clearSessionCookies();
  } else {
    destroyCookie(null, 'USER_TOKEN', { path: '/' })
    destroyCookie(null, 'user', { path: '/' })
  }
  router.push("/login");
}

export async function getUserLocation(stateId: number, cityId: number) {
  try {
    const location_raw = await axios.get(
      apiUrl(`/state/${stateId}?includes=city`),
      axios_options
    );

    if (cityId) {
      var cidade = location_raw.data.state.cities.find(
        (cidade: Cidade) => cidade.id === cityId
      );
    }

    let location = {
      state: location_raw.data.state.name,
      city: cidade ? cidade.name : "-",
    };

    return location;
  } catch (error) {
    console.error(error);
  }
}
