import { apiUrl } from "../lib/api";

import { DateColumnFilter, NoFilter, PostType } from "@components";
import { NextPage } from "next";
import { useGlobal } from "@context/global";
import LayoutDefault from "@components/Layouts/default";
import SelectLanguage from "@components/Utils/SelectLanguage";
import { useMemo, useState, useRef } from "react";
import axios, { AxiosResponse } from "axios";
import useSWR from "swr";
import Select from "react-select";
import { ColumnFn } from "models/ColumnFn";
import EditButton from "@components/Utils/Buttons/EditButton";
import StatusButton from "@components/Utils/Buttons/StatusButton";
import RemoveButton from "@components/Utils/Buttons/RemoveButton";

interface CustomComponent {
  post: any;
  setPost: Function;
}

const fetcherCategories = (url = "", token = "") =>
  axios
    .get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    .then((res) => res.data.categories);

const fetcherCultures = (url = "", token = "") =>
  axios
    .get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    .then((res) => res.data.cultures);

const fetcherStates = (url = "", token = "") =>
  axios
    .get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    .then((res) => res.data.states);

const Page: NextPage = () => {
  const { token = "" } = useGlobal();
  const url = apiUrl(`/material`);
  const upload_url = apiUrl(`/upload`);

  const [language, setLanguage] = useState("pt-br");
  const [fileLabel, setFileLabel] = useState("");
  const hiddenFileInput = useRef<HTMLInputElement>(null);

  const fields = [
    {
      field: "name",
      label: "Nome",
      placeholder: "Exemplo",
      customEvents: (setCategoria: (arg0: (categoria: any) => any) => any) => ({
        onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
          setCategoria((categoria) => ({
            ...categoria,
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
        <div>
          <label className="form-label">Categoria</label>

          <Select
            value={categories_as_options.find(
              (category: any) => category.value === post.categoryId
            )}
            placeholder="Selecione a categoria..."
            classNamePrefix="select"
            className="mb-4"
            options={categories_as_options}
            onChange={(newValue: any) => {
              setPost({
                ...post,
                categoryId: newValue.value,
              });
            }}
          />
        </div>
      ),
    },
    {
      Component: ({ post, setPost }: CustomComponent) => (
        <>
          <p className="form-label">Arquivo do material</p>

          {post.file && (
            <a
              className="btn btn-outline-secondary btn-xs mb-2"
              href={post.file}
              rel="noreferrer"
              target="_blank"
            >
              Visualizar arquivo
            </a>
          )}

          <div></div>

          <button
            className="btn btn-primary btn-xs"
            onClick={(event) => hiddenFileInput?.current?.click()}
          >
            Enviar {post.file ? "novo" : ""} arquivo
          </button>

          <input
            className="d-none"
            type="file"
            ref={hiddenFileInput}
            onChange={(event) => {
              let files = event.target.files;

              if (files && files[0]) {
                const file = files[0] ?? null;
                const formData = new FormData();
                formData.append("file", file);

                setFileLabel("Enviando arquivo...");

                axios
                  .post(upload_url, formData, {
                    headers: {
                      Authorization: `Bearer ${token}`,
                      "Content-Type": "multipart/form-data",
                    },
                  })
                  .then((response) => {
                    setFileLabel(file.name);
                    setPost({ ...post, file: response.data.file });
                  })
                  .catch((error) => {
                    setFileLabel(
                      "Ocorreu um erro ao enviar o arquivo, tente novamente."
                    );

                    if (error.response) {
                      console.error(error.response.data); // => the response payload
                    }
                  });
              }
            }}
          />

          <p>{fileLabel}</p>
        </>
      ),
    },
    {
      Component: ({ post, setPost }: CustomComponent) => (
        <div>
          <label className="form-label">Cultura</label>
          <Select
            value={cultures_as_options.find(
              (culture: any) => culture.value === post.cultureId
            )}
            placeholder="Selecione uma cultura..."
            classNamePrefix="select"
            className="mb-4"
            options={cultures_as_options}
            onChange={(newValue: any) => {
              setPost({
                ...post,
                cultureId: newValue.value,
              });
            }}
          />
        </div>
      ),
    },
    {
      Component: ({ post, setPost }: CustomComponent) => (
        <div>
          <label className="form-label">Estado</label>

          <Select
            value={states_as_options.find(
              (state: any) => state.value === post.stateId
            )}
            placeholder="Selecione um estado..."
            classNamePrefix="select"
            className="mb-4"
            options={states_as_options}
            onChange={(newValue: any) => {
              setPost({
                ...post,
                stateId: newValue.value,
              });
            }}
          />
        </div>
      ),
    },
    {
      field: "year",
      label: "Ano do material",
      placeholder: "Exemplo: 2026",
      type: 'text',
      customEvents: (setCategoria: (arg0: (categoria: any) => any) => any) => ({
        onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
          setCategoria((categoria) => ({
            ...categoria,
            year: Number(e.target.value.replace(/[^0-9]/g, "")),
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

  const colunas =
    ({ onUpdate, onRemove, getPost, onStatusChange, reloadData }: ColumnFn) =>
      () =>
        [
          {
            Header: "Nome",
            accessor: "name",
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

              return (
                <div className="text-end d-flex justify-content-end">
                  <EditButton
                    className="me-2"
                    onClick={() => {
                      onUpdate(value);
                    }}
                  />
                  {currentPost && (
                    <StatusButton
                      className="me-2"
                      active={currentPost["active"]}
                      onClick={() => onStatusChange(value, currentPost["active"])}
                    />
                  )}
                  <RemoveButton onClick={() => onRemove(value)} />
                </div>
              );
            },
          },
        ];

  const { data: categories, error } = useSWR(
    [apiUrl(`/materialCategory`), token],
    fetcherCategories
  );

  const { data: cultures } = useSWR(
    [apiUrl(`/culture`), token],
    fetcherCultures
  );

  const { data: states } = useSWR(
    [apiUrl(`/state`), token],
    fetcherStates
  );

  const categories_as_options = useMemo(
    () =>
      categories?.map((category: { id: any; name: any }) => ({
        value: category.id,
        label: category.name,
      })) || [],
    [categories]
  );

  const cultures_as_options = useMemo(
    () =>
      cultures?.map((culture: { id: any; name: any }) => ({
        value: culture.id,
        label: culture.name,
      })) || [],
    [cultures]
  );

  const states_as_options = useMemo(
    () =>
      states?.map((state: { id: any; name: any }) => ({
        value: state.id,
        label: state.name,
      })) || [],
    [states]
  );


  const initialData = useMemo(() => {
    let data = null;

    data = {
      active: true,
    };

    if (categories_as_options && categories_as_options.length) {
      data = {
        ...data,
        categoryId: categories_as_options[0].value,
      };
    }

    if (language) {
      data = {
        ...data,
        lang: language,
      };
    }

    return data;
  }, [categories_as_options]);

  return (
    <LayoutDefault>
      <PostType
        initialPostData={initialData}
        dataConfig={{
          url,
          token,
          fetcherDataFn: (response: AxiosResponse) => response.data.materials,
        }}
        formConfig={{
          insertTitle: "Adicionar Material",
          editTitle: "Editar Material",
          fields,
        }}
        tableConfig={{
          columnsFn: colunas,
        }}
        pageConfig={{
          pageTitle: "Materiais",
        }}
        categoryFilter={{
          categories: categories_as_options,
        }}
      />
    </LayoutDefault>
  );
};

export default Page;
