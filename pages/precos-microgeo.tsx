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

const ROLE_LABELS: Record<string, string> = {
  start: "Microgeo Start",
  reposicao: "Microgeo Reposição",
};

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

export default function ProdutosMicrogeo() {
  const { token = "" } = useGlobal();
  const url = apiUrl(`/microgeoPrice`);

  const fields = [
    {
      field: "name",
      label: "Nome",
      placeholder: "Ex.: Microgeo Start",
    },
    {
      Component: ({ post, setPost }: CustomComponent) => (
        <div className="mb-3">
          <label className="form-label" htmlFor="role">
            Produto
          </label>
          <select
            id="role"
            className="form-select"
            value={post?.role || ""}
            onChange={(e) =>
              setPost((post: any) => ({ ...post, role: e.target.value }))
            }
          >
            <option value="" disabled>
              Selecione…
            </option>
            <option value="start">Microgeo Start</option>
            <option value="reposicao">Microgeo Reposição</option>
          </select>
        </div>
      ),
    },
    {
      Component: ({ post, setPost }: CustomComponent) => (
        <div className="mb-3">
          <label className="form-label" htmlFor="custoPorKg">
            Custo (R$/kg)
          </label>
          <input
            value={post?.custoPorKg ?? ""}
            onChange={(e) =>
              setPost((post: any) => ({
                ...post,
                custoPorKg:
                  e.target.value === "" ? 0 : Number(e.target.value),
              }))
            }
            type="number"
            min={0}
            step="0.01"
            id="custoPorKg"
            className="form-control"
            placeholder="Ex.: 60"
          />
          <small className="text-muted">
            Usado no orçamento do dimensionamento da Bio Estação (BEM) no aplicativo.
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
          Header: "Produto",
          accessor: "role",
          Filter: NoFilter,
          Cell: ({ value = "" }) => <span>{ROLE_LABELS[value] || value}</span>,
        },
        {
          Header: "Custo (R$/kg)",
          accessor: "custoPorKg",
          Filter: NoFilter,
          Cell: ({ value = 0 }) => (
            <span>
              {Number(value).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
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
                        `Tem certeza que deseja remover o produto "${currentPost.name}"?`
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
            return response.data.microgeoPrices;
          },
        }}
        tableConfig={{
          columnsFn,
        }}
        formConfig={{
          insertTitle: "Adicionar Produto Microgeo",
          editTitle: "Editar Produto Microgeo",
          fields,
        }}
        pageConfig={{
          pageTitle: "Produtos Microgeo",
        }}
      />
    </LayoutDefault>
  );
}
