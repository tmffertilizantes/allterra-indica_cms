import { apiUrl } from "../lib/api";
import axios from "axios";
import { Cidade } from "models/cidade";
import router from "next/router";
import { destroyCookie, parseCookies } from "nookies";

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

export function logout() {
  destroyCookie(null, 'USER_TOKEN', { path: '/' })
  destroyCookie(null, 'user', { path: '/' })
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
