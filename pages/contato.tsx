import { apiUrl } from "../lib/api";
import { fetchContacts, saveContact } from "../lib/content";
import LayoutDefault from "@components/Layouts/default";
import { PostType } from "@components/postType";
import { useGlobal } from "@context/global";
import axios, { AxiosResponse } from "axios";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import useSWR from "swr";

import "react-quill/dist/quill.snow.css";
import { AlertItemCreated, AlertError } from "@components/Alerts/Alerts";
import { Spinner } from "react-bootstrap";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

// v1 ou v2 conforme o módulo `contact` (specs/023): mesmo caminho e formato.
const fetcherTerms = () => fetchContacts();

export default function Termos() {
  const { token = "" } = useGlobal();

  const [descricao, setDescricao] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);

  async function saveChanges() {
    setIsSaving(true);

    try {
      const result = await saveContact(descricao);

      if (result.status === 200) {
        AlertItemCreated()
      } else {
        AlertError()
      }
    } catch (error) {
      AlertError()
    }

    setIsSaving(false);
  }

  const { data: terms, error } = useSWR(
    [apiUrl(`/contact`), token],
    fetcherTerms
  );

  useEffect(() => {
    const term_description = terms?.map(
      (termo: { section: string }) => termo.section
    );

    if (term_description) {
      setDescricao(term_description[0]);
    }
  }, [terms]);

  return (
    <LayoutDefault>
      <div className="container-fluid p-4">
        <h1>Contato</h1>
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
