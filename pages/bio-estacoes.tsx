import { apiUrl } from "../lib/api";
import LayoutDefault from "@components/Layouts/default";
import { PostType } from "@components/postType";
import { NoFilter, DateColumnFilter } from "@components/Table";
import EditButton from "@components/Utils/Buttons/EditButton";
import RemoveButton from "@components/Utils/Buttons/RemoveButton";
import { useGlobal } from "@context/global";
import { AxiosResponse } from "axios";
import { ColumnFn } from "models/ColumnFn";
import React from "react";

interface CustomComponent {
  post: any;
  setPost: Function;
}

const handleFileB64 = (
  event: React.ChangeEvent<HTMLInputElement>,
  setPost: any
) => {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onloadend = () => {
    const b64 = reader.result as string;
    setPost((post: any) => ({ ...post, image: b64 }));
  };
  reader.readAsDataURL(file);
};

export default function BioEstacoes() {
  const { token = "" } = useGlobal();
  const url = apiUrl(`/bioStation`);

  const fields = [
    {
      field: "name",
      label: "Nome",
      placeholder: "Nome da bio estação",
    },
    {
      Component: ({ post, setPost }: CustomComponent) => (
        <div className="mb-3">
          <label className="form-label" htmlFor="description">
            Descrição
          </label>
          <textarea
            value={post?.description || ""}
            onChange={(e) =>
              setPost((post: any) => ({
                ...post,
                description: e.target.value,
              }))
            }
            id="description"
            className="form-control"
            placeholder="Descrição da bio estação"
          />
        </div>
      ),
    },
    {
      Component: ({ post, setPost }: CustomComponent) => (
        <div className="mb-3">
          <label className="form-label" htmlFor="capacidadeLitros">
            Capacidade (litros)
          </label>
          <input
            value={post?.capacidadeLitros ?? ""}
            onChange={(e) =>
              setPost((post: any) => ({
                ...post,
                capacidadeLitros:
                  e.target.value === "" ? null : Number(e.target.value),
              }))
            }
            type="number"
            min={0}
            step={1}
            id="capacidadeLitros"
            className="form-control"
            placeholder="Ex.: 80000"
          />
          <small className="text-muted">
            Usado no dimensionamento da Bio Estação (BEM) no aplicativo.
          </small>
        </div>
      ),
    },
    {
      Component: ({ post, setPost }: CustomComponent) => (
        <div className="mb-3">
          <label className="form-label" htmlFor="image">
            Imagem
          </label>

          {post?.image && (
            <div className="d-flex flex-column mb-3">
              <span>Pré-visualização</span>
              <img
                style={{ width: "100px", marginTop: "10px" }}
                src={post?.image}
              />
            </div>
          )}

          <input
            onChange={(e) => handleFileB64(e, setPost)}
            type="file"
            accept="image/*"
            id="image"
            className="form-control"
          />
        </div>
      ),
    },
  ];

  const columnsFn =
    ({ onUpdate, onRemove, getPost }: ColumnFn) =>
    () =>
      [
        {
          Header: "Nome",
          accessor: "name",
          sortType: "basic",
        },
        {
          Header: "Capacidade (L)",
          accessor: "capacidadeLitros",
          Filter: NoFilter,
          Cell: ({ value = null }) =>
            value ? (
              <span>{Number(value).toLocaleString("pt-BR")}</span>
            ) : (
              <span>-</span>
            ),
        },
        {
          Header: "Imagem",
          accessor: "image",
          Filter: NoFilter,
          Cell: ({ value = "" }) =>
            value ? (
              <img style={{ width: "48px" }} src={value} />
            ) : (
              <span>-</span>
            ),
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

            return (
              <div className="text-end">
                <EditButton className="me-2" onClick={() => onUpdate(value)} />
                <RemoveButton
                  onClick={() => {
                    if (
                      window.confirm(
                        `Tem certeza que deseja remover a bio estação "${currentPost.name}"?`
                      )
                    ) {
                      onRemove(value);
                    }
                  }}
                />
              </div>
            );
          },
        },
      ];

  return (
    <LayoutDefault>
      <PostType
        dataConfig={{
          url,
          token,
          fetcherDataFn: (response: AxiosResponse) => {
            return response.data.bioStations;
          },
        }}
        tableConfig={{
          columnsFn,
        }}
        formConfig={{
          insertTitle: "Adicionar Bio Estação",
          editTitle: "Editar Bio Estação",
          fields,
        }}
        pageConfig={{
          pageTitle: "Bio Estações",
        }}
      />
    </LayoutDefault>
  );
}
