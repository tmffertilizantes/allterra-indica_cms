import { apiUrl } from "../lib/api";
import Logo from "@components/Logo";
import axios from "axios";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/router";
import { apiVersion } from "../lib/clientConfig";

export default function EsqueciMinhaSenha() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showMessage, setShowMessage] = useState<boolean>(false);
  const router = useRouter();

  async function submitEmail() {
    setIsSubmitting(true);

    try {
      const response = await axios.post(
        apiUrl(`/auth/forgot-password`),
        {
          email: email,
        }
      );

      // v2 (specs/016): código de 6 dígitos por e-mail → tela de nova senha com o código.
      if (apiVersion("auth") === "v2") {
        router.push(`/editar-senha?email=${encodeURIComponent(email)}`);
        return;
      }
    } catch (error) {}

		setShowMessage(true);
    setIsSubmitting(false);
  }

  function handleSubmit(event: React.SyntheticEvent) {
    event.preventDefault();

    if (isSubmitting == false) {
      submitEmail();
    }
  }

  function onChangeEmail(e: React.ChangeEvent<HTMLInputElement>) {
    setShowMessage(false);
    setEmail(e.target.value);
  }

  return (
    <div className="container d-flex flex-column">
      <div className="row align-items-center justify-content-center g-0 min-vh-100">
        <div className="col-lg-5 col-md-8 py-8 py-xl-0">
          <div className="card shadow ">
            <div className="card-body p-6">
              <div className="mb-4">
                <Logo />

                <h1 className="mb-1 fw-bold">Esqueci minha senha</h1>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">
                    Email
                  </label>
                  <input
                    value={email}
                    type="email"
                    id="email"
                    className="form-control"
                    name="email"
                    placeholder="Preencha seu email"
                    onChange={onChangeEmail}
                  />
                </div>

                {showMessage && (
                  <div className="mb-3 text-center">
                    <span className="text-success">Um e-mail foi enviado para você!</span>
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
