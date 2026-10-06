import { apiUrl } from "../lib/api";
import LayoutDefault from "@components/Layouts/default";
import { PostType } from "@components/postType";
import { useGlobal } from "@context/global";
import axios, { AxiosResponse } from "axios";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import useSWR from "swr";
import withReactContent from "sweetalert2-react-content";
import Swal from "sweetalert2";

import "react-quill/dist/quill.snow.css";
import { Spinner } from "react-bootstrap";
import { AlertError, AlertItemEdited } from "@components/Alerts/Alerts";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

const fetcherTerms = (url = "", token = "") =>
  axios
    .get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    .then((res) => res.data.terms);

export default function Termos() {
  const { token = "" } = useGlobal();
  const url = apiUrl(`/terms`);

  const [descricao, setDescricao] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);

  async function saveChanges() {
    setIsSaving(true);

    try {
      const result = await axios.post(
        url,
        { description: descricao },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (result.status === 200) {
        AlertItemEdited()
      } else {
        AlertError();
      }
    } catch (error) {
      AlertError();
    }
    setIsSaving(false);
  }

  const { data: terms, error } = useSWR(
    [apiUrl(`/terms`), token],
    fetcherTerms
  );

  useEffect(() => {
    const term_description = terms?.map(
      (termo: { description: "" }) => termo.description
    );

    if (term_description) {
      setDescricao(term_description[0]);
    }
  }, [terms]);

  return (
    <LayoutDefault>
      <div className="container-fluid p-4">
        <h1>Termos de Uso</h1>
        <hr />

        {!terms && !error ? (
          <div>
            <Spinner animation="border" variant="primary" />
          </div>
        ) : (
          <>
            <ReactQuill theme="snow" value={descricao} onChange={setDescricao} />

            <div className="text-end">
              <button
                className="btn btn-primary mt-4"
                disabled={isSaving}
                onClick={saveChanges}
              >
                {isSaving ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </>
        )}

      </div>
    </LayoutDefault>
  );
}
