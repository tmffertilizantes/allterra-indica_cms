import { apiUrl } from "../lib/api";
import Logo from "@components/Logo";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { apiVersion } from "../lib/clientConfig";
import { serverMessage } from "../lib/users";

export default function EsqueciMinhaSenha() {
  const [step, setStep] = useState(1);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordIsValid, setPasswordIsValid] = useState<boolean>(true);
  const [confirmPasswordIsValid, setConfirmPasswordIsValid] =
    useState<boolean>(true);
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showMessage, setShowMessage] = useState<boolean>(false);
  const [showErrorMessage, setShowErrorMessage] = useState<boolean>(false);

  const router = useRouter();
  const isV2 = apiVersion("auth") === "v2";
  const [email, setEmail] = useState("");
  const [errorText, setErrorText] = useState("Ocorreu um erro ao atualizar a senha");
  const emailValue = email || (typeof router.query.email === "string" ? router.query.email : "");

  /** v2: e-mail + código de 6 dígitos + nova senha (POST /auth/reset-password). */
  async function submitResetV2() {
    try {
      await axios.post(apiUrl(`/auth/reset-password`), {
        email: emailValue,
        code,
        newPassword: password,
        newPasswordConfirmation: confirmPassword,
      });
      setShowMessage(true);
      setTimeout(() => router.push("/login"), 1500);
    } catch (error: any) {
      setErrorText(
        error?.response?.status === 429
          ? "Muitas tentativas. Aguarde alguns minutos e tente novamente."
          : serverMessage(error, "Código inválido ou expirado")
      );
      setShowErrorMessage(true);
    }
  }

  async function submitNewPassword() {
    setIsSubmitting(true);

    if (isV2) {
      await submitResetV2();
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await axios.patch(
        apiUrl(`/auth/update-password`),
        {
          newPassword: password,
          newPasswordConfirmation: confirmPassword,
          confirmationCode: router.query.token,
        }
      );

      setShowMessage(true);
    } catch (error) {
      setShowErrorMessage(true);
    }

    setIsSubmitting(false);
  }

  function handleSubmit(event: React.SyntheticEvent) {
    event.preventDefault();

    if (isSubmitting == false) {
      submitNewPassword();
    }
  }

  function onChangePassword(e: React.ChangeEvent<HTMLInputElement>) {
    setShowMessage(false);
    setShowErrorMessage(false);
    setPassword(e.target.value);

    if (passwordsAreTheSame(confirmPassword, e.target.value)) {
      setConfirmPasswordIsValid(true);
    } else {
      setConfirmPasswordIsValid(false);
    }

    validatePassword(e.target.value);
  }

  function onChangeConfirmPassword(e: React.ChangeEvent<HTMLInputElement>) {
    setShowMessage(false);
    setShowErrorMessage(false);
    setConfirmPassword(e.target.value);

    if (passwordsAreTheSame(password, e.target.value)) {
      setConfirmPasswordIsValid(true);
    } else {
      setConfirmPasswordIsValid(false);
    }
  }

  function validatePassword(pass: string) {
    if (pass.length > 0 && (pass.length < 8 || pass.length > 72)) {
      setPasswordIsValid(false);
    } else {
      setPasswordIsValid(true);
    }
  }

  function passwordsAreTheSame(pass1: string, pass2: string) {
    if (pass1 == pass2) {
      return true;
    }
    return false;
  }

  function hasErrors() {
    if (!passwordIsValid || !confirmPasswordIsValid) {
      return true;
    }

    return false;
  }

  return (
    <div className="container d-flex flex-column">
      <div className="row align-items-center justify-content-center g-0 min-vh-100">
        <div className="col-lg-5 col-md-8 py-8 py-xl-0">
          <div className="card shadow ">
            <div className="card-body p-6">
              <div className="mb-4">
                <Logo />

                <h1 className="mb-1 fw-bold">Alterar senha</h1>
              </div>

              <form onSubmit={handleSubmit}>
                {isV2 && (
                  <>
                    <div className="mb-3">
                      <label htmlFor="email" className="form-label">
                        Email
                      </label>
                      <input
                        value={emailValue}
                        type="email"
                        id="email"
                        className="form-control"
                        name="email"
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="code" className="form-label">
                        Código recebido por e-mail
                      </label>
                      <input
                        value={code}
                        inputMode="numeric"
                        maxLength={6}
                        id="code"
                        className="form-control"
                        name="code"
                        placeholder="000000"
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                      />
                    </div>
                  </>
                )}
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">
                    Nova Senha
                  </label>
                  <input
                    value={password}
                    type="password"
                    id="password"
                    className="form-control"
                    name="password"
                    onChange={onChangePassword}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="email" className="form-label">
                    Confirmar Nova Senha
                  </label>
                  <input
                    value={confirmPassword}
                    type="password"
                    id="confirmpassword"
                    className="form-control"
                    name="confirmpassword"
                    onChange={onChangeConfirmPassword}
                  />
                </div>

                {hasErrors() && (
                  <div className="mb-3 text-center text-danger d-flex flex-column">
                    {!confirmPasswordIsValid && (
                      <span>Senhas incompatíveis</span>
                    )}
                    {!passwordIsValid && (
                      <span>A senha precisa ter de 8 a 72 caracteres</span>
                    )}
                  </div>
                )}

                {showMessage && (
                  <div className="mb-3 text-center">
                    <span className="text-success">
                      Senha alterada com sucesso
                    </span>
                  </div>
                )}

                {showErrorMessage && (
                  <div className="mb-3 text-center">
                    <span className="text-danger">{errorText}</span>
                  </div>
                )}

                <div>
                  <div className="d-grid">
                    <button type="submit" className="btn btn-primary ">
                      {isSubmitting ? "Enviando..." : "Enviar"}
                    </button>
                  </div>
                </div>

                <Link href="/login">
                  <a className="btn btn-outline-primary mt-3 w-100">
                    Voltar para o login
                  </a>
                </Link>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
