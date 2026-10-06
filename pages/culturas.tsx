import { apiUrl } from "../lib/api";
import { PostType, NoFilter, DateColumnFilter } from "@components";
import { NextPage } from "next";
import { useGlobal } from "@context/global";
import axios, { AxiosResponse } from "axios";
import LayoutDefault from "@components/Layouts/default";
import SelectLanguage from "@components/Utils/SelectLanguage";
import EditButton from "@components/Utils/Buttons/EditButton";
import StatusButton from "@components/Utils/Buttons/StatusButton";
import { useMemo, useState, useCallback } from "react";
import { Modal } from "react-bootstrap";
import useSWR from "swr";

interface CustomComponent {
  post: any;
  setPost: Function;
}

const NUTRIENT_NAMES = ["Boro", "Cálcio", "Enxofre", "Fósforo", "Magnésio", "Nitrogênio", "Potássio"];

function NutrientRow({
  nutrient,
  token,
  onSaved,
}: {
  nutrient: any;
  token: string;
  onSaved: () => void;
}) {
  const [extract, setExtract] = useState<number>(nutrient.extract ?? 0);
  const [exp, setExp] = useState<number>(nutrient.export ?? 0);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.patch(
        apiUrl(`/nutrient/${nutrient.id}`),
        { extract, export: exp },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr>
      <td className="align-middle">{nutrient.name}</td>
      <td>
        <input
          type="number"
          className="form-control form-control-sm"
          value={extract}
          onChange={(e) => setExtract(Number(e.target.value))}
          step="0.01"
        />
      </td>
      <td>
        <input
          type="number"
          className="form-control form-control-sm"
          value={exp}
          onChange={(e) => setExp(Number(e.target.value))}
          step="0.01"
        />
      </td>
      <td>
        <button
          className="btn btn-sm btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </td>
    </tr>
  );
}

function NewNutrientRow({
  name,
  cultureId,
  token,
  onSaved,
}: {
  name: string;
  cultureId: number;
  token: string;
  onSaved: () => void;
}) {
  const [extract, setExtract] = useState<number>(0);
  const [exp, setExp] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await axios.post(
        apiUrl(`/nutrient`),
        { name, extract, export: exp, cultureId, lang: "pt-BR", active: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr>
      <td className="align-middle">{name}</td>
      <td>
        <input
          type="number"
          className="form-control form-control-sm"
          value={extract}
          onChange={(e) => setExtract(Number(e.target.value))}
          step="0.01"
        />
      </td>
      <td>
        <input
          type="number"
          className="form-control form-control-sm"
          value={exp}
          onChange={(e) => setExp(Number(e.target.value))}
          step="0.01"
        />
      </td>
      <td>
        <button
          className="btn btn-sm btn-success"
          onClick={handleCreate}
          disabled={saving}
        >
          {saving ? "Criando..." : "Criar"}
        </button>
      </td>
    </tr>
  );
}

function ModalNutrientes({
  cultureId,
  cultureName,
  token,
  onClose,
}: {
  cultureId: number | null;
  cultureName: string;
  token: string;
  onClose: () => void;
}) {
  const nutrientsUrl = apiUrl(`/nutrient`);

  const { data: allNutrients, mutate: reloadNutrients } = useSWR(
    cultureId ? [nutrientsUrl, "modal", cultureId] : null,
    () =>
      axios
        .get(nutrientsUrl, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => res.data.nutrients)
  );

  const cultureNutrients: any[] = (allNutrients ?? []).filter(
    (n: any) => n.cultureId === cultureId
  );

  return (
    <Modal show={cultureId !== null} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Nutrientes — {cultureName}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <table className="table table-sm table-bordered mb-0">
          <thead className="table-light">
            <tr>
              <th>Nome</th>
              <th>Extração</th>
              <th>Exportação</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {allNutrients === undefined ? (
              <tr>
                <td colSpan={4} className="text-center text-muted py-3">
                  Carregando...
                </td>
              </tr>
            ) : (
              NUTRIENT_NAMES.map((name) => {
                const existing = cultureNutrients.find((n) => n.name === name);
                return existing ? (
                  <NutrientRow
                    key={name}
                    nutrient={existing}
                    token={token}
                    onSaved={reloadNutrients}
                  />
                ) : (
                  <NewNutrientRow
                    key={name}
                    name={name}
                    cultureId={cultureId!}
                    token={token}
                    onSaved={reloadNutrients}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </Modal.Body>
      <Modal.Footer>
        <button className="btn btn-outline-secondary" onClick={onClose}>
          Fechar
        </button>
      </Modal.Footer>
    </Modal>
  );
}

const Page: NextPage = () => {
  const { token = "" } = useGlobal();
  const url = apiUrl(`/culture`);

  const [language, setLanguage] = useState("pt-BR");
  const [nutrientCulture, setNutrientCulture] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const customColumnsFn = useCallback(
    ({ onUpdate, getPost, onStatusChange }: any) =>
      () =>
        [
          {
            Header: "Nome",
            accessor: "name",
            sortType: "basic",
          },
          {
            Header: "Criado Em",
            accessor: "createdAt",
            Filter: DateColumnFilter,
            filter: "dateBetween",
            Cell: ({ value = new Date() }) => (
              <span>{new Date(value).toLocaleDateString()}</span>
            ),
          },
          {
            Header: "",
            accessor: "id",
            Filter: NoFilter,
            Cell: ({ value = "" }) => {
              const currentPost = getPost(value);
              if (!currentPost) return null;
              if (!currentPost.hasOwnProperty("active"))
                currentPost["active"] = false;
              if (currentPost["active"] == null) currentPost["active"] = false;

              return (
                <div className="text-end d-flex gap-2 justify-content-end">
                  <button
                    className="btn btn-outline-secondary btn-xs"
                    onClick={() =>
                      setNutrientCulture({
                        id: currentPost.id,
                        name: currentPost.name,
                      })
                    }
                  >
                    Nutrientes
                  </button>
                  <EditButton onClick={() => onUpdate(value)} />
                  <StatusButton
                    active={currentPost["active"]}
                    onClick={() =>
                      onStatusChange(value, currentPost["active"])
                    }
                  />
                </div>
              );
            },
          },
        ],
    []
  );

  const fields = [
    {
      field: "name",
      label: "Nome",
      placeholder: "Exemplo",
      customEvents: (setCultura: (arg0: (cultura: any) => any) => any) => ({
        onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
          setCultura((cultura) => ({
            ...cultura,
            name: e.target.value,
            slug: e.target.value
              .toLowerCase()
              .replace(/ /g, "_")
              .replace(/[^\w-]+/g, ""),
          })),
      }),
    },
    {
      Component: ({ post, setPost }: CustomComponent) => (
        <SelectLanguage
          className="mb-4"
          value={post?.lang ? post?.lang : language}
          onChange={(event) => {
            setLanguage(event.target.value);
            setPost({ ...post, lang: event.target.value });
          }}
        />
      ),
    },
  ];

  const initialData = useMemo(() => {
    return language ? { lang: language } : { active: true };
  }, [language]);

  return (
    <LayoutDefault>
      <PostType
        initialPostData={initialData}
        dataConfig={{
          url,
          token,
          fetcherDataFn: (response: AxiosResponse) => response.data.cultures,
        }}
        tableConfig={{
          columnsFn: customColumnsFn,
        }}
        formConfig={{
          insertTitle: "Adicionar Cultura",
          editTitle: "Editar Cultura",
          fields,
        }}
        pageConfig={{
          pageTitle: "Culturas",
        }}
      />

      <ModalNutrientes
        cultureId={nutrientCulture?.id ?? null}
        cultureName={nutrientCulture?.name ?? ""}
        token={token}
        onClose={() => setNutrientCulture(null)}
      />
    </LayoutDefault>
  );
};

export default Page;
