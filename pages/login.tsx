import { apiUrl } from "../lib/api";
import { useState } from "react";
import Router, { useRouter } from "next/router";
import axios from "axios";
import { parseCookies, setCookie, destroyCookie } from "nookies";
import { userIsLogged } from "@context/user";

import Logo from "@components/Logo";
import { useGlobal } from "@context/global";
import Link from "next/link";

/** Cookies de sessão: só HTTPS (exceto desenvolvimento local em HTTP) e restritos ao próprio site (#15). */
const sessionCookieOptions = () => ({
  maxAge: 30 * 24 * 60 * 60,
  path: "/",
  sameSite: "strict" as const,
  secure: typeof window !== "undefined" && window.location.protocol === "https:",
});


interface UserLogin {
  email: string | undefined;
  password: string | undefined;
}

export default function Login() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showErrorMessage, setShowErrorMessage] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("Login incorreto");
  const [disableSubmitButton, setDisableSubmitButton] = useState<boolean>(true);

  const [login, setLogin] = useState<UserLogin>({
    email: undefined,
    password: undefined,
  });


  const { user = "" } = useGlobal();

  if (user) {
    router.push("/");
  }

  const onChangeLogin = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.name;

    const newLoginInfo = { ...login, [name]: e.target.value };
    setLogin(newLoginInfo);
    setShowErrorMessage(false);

    if (newLoginInfo.email && newLoginInfo.password) {
      setDisableSubmitButton(false);
    } else {
      setDisableSubmitButton(true);
    }
  };

  async function getUserByToken(token: string) {
    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };

      const response_me = await axios.get(apiUrl(`/auth/me`), config);

      setCookie(null, "user", JSON.stringify(response_me.data.user), sessionCookieOptions());
    } catch (error) {
      console.error(error);
    }
  }

  async function signIn() {
    setIsSubmitting(true);

    try {
      const response = await axios.post(apiUrl(`/auth/login`), {
        email: login.email,
        password: login.password,
      });

      const user_role_id = response.data.user.roleId;

      // Verifica se o usuario é admin ou super admin
      if (user_role_id === 1 || user_role_id === 2) {
        const user_token = response.data.token;

        setCookie(null, "USER_TOKEN", user_token, sessionCookieOptions());

        await getUserByToken(user_token);

        router.push("/analises");
      } else {
        setErrorMessage("Acesso negado");
        setShowErrorMessage(true);
      }
    } catch (error) {
      setErrorMessage("Login incorreto");
      setShowErrorMessage(true);
      console.error(error);
    }

    setIsSubmitting(false);
  }

  function handleSubmit(event: React.SyntheticEvent) {
    event.preventDefault();

    if (isSubmitting == false) {
      signIn();
    }
  }

  return (
    <div className="container d-flex flex-column">
      <div className="row align-items-center justify-content-center g-0 min-vh-100">
        <div className="col-lg-5 col-md-8 py-8 py-xl-0">
          <div className="card shadow ">
            <div className="card-body p-6">
              <div className="mb-4">
                <Logo />

                <h1 className="mb-1 fw-bold text-primary">Login</h1>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">
                    Email
                  </label>
                  <input
                    value={login.email}
                    type="email"
                    id="email"
                    className="form-control"
                    name="email"
                    placeholder="Preencha seu email"
                    onChange={onChangeLogin}
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="password" className="form-label">
                    Senha
                  </label>
                  <input
                    value={login.password}
                    type="password"
                    id="password"
                    className="form-control"
                    name="password"
                    placeholder="**************"
                    onChange={onChangeLogin}
                  />
                </div>

                {showErrorMessage && (
                  <div className="mb-3 text-center">
                    <span className="text-danger">{errorMessage}</span>
                  </div>
                )}

                <Link href={"/esqueci-minha-senha"}>
                  <a>Esqueci minha senha</a>
                </Link>

                <div className="mt-2">
                  <div className="d-grid">
                    <button
                      type="submit"
                      disabled={disableSubmitButton}
                      className="btn btn-primary "
                    >
                      {isSubmitting ? "Entrando..." : "Entrar"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
