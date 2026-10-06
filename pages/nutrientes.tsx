import { apiUrl } from "../lib/api";
import LayoutDefault from "@components/Layouts/default";
import { PostType } from "@components/postType";
import { NextPage } from "next";
import { useGlobal } from "@context/global";
import axios, { AxiosResponse } from "axios";
import { useMemo } from "react";
import Select from "react-select";
import useSWR from "swr";

interface CustomComponent {
  post: any;
  setPost: Function;
}

export default function Nutrientes() {
  const { token = "" } = useGlobal();
  const url = apiUrl(`/nutrient`);

  const fields = [
    {
      field: "name",
      label: "Nome",
      placeholder: "Nome",
    },
    {
      field: "export",
      label: "Exportar",
      placeholder: "33",
    },
    {
      field: "extract",
      label: "Extrair",
      placeholder: "22",
    },
    {
      field: "lang",
      label: "Idioma",
      placeholder: "pt-br",
    },
    {
      Component: ({ post, setPost }: CustomComponent) => (
        <div>
          <label className="form-label">Culturas</label>

          <Select
            value={cultures_as_options.find(
              (culture: any) => culture.value === post.cultureId
            )}
            placeholder="Selecione a categoria..."
            classNamePrefix="select"
            className="mb-4"
            options={cultures_as_options}
            onChange={(newValue: any) =>
              setPost({ ...post, cultureId: newValue.value })
            }
          />
        </div>
      ),
    },
  ];

  const fetcherCultures = (url = "", token = "") =>
    axios
      .get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => res.data.cultures);

  const { data: cultures, error } = useSWR(
    [apiUrl(`/culture`), token],
    fetcherCultures
  );

  const cultures_as_options = useMemo(
    () =>
      cultures?.map((culture: { id: any; name: any }) => ({
        value: culture.id,
        label: culture.name,
      })) || [],
    [cultures]
  );

  const initialUsersData = useMemo(() => {
    let data = null;

    data = {
      active: true,
    }

    if (cultures_as_options && cultures_as_options.length) {
      data = {
        ...data,
        cultureId: cultures_as_options[0].value,
      };
    }

    return data;
  }, [cultures_as_options]);


  return (
    <LayoutDefault>
      <PostType
        initialPostData={initialUsersData}
        dataConfig={{
          url,
          token,
          fetcherDataFn: (response: AxiosResponse) => response.data.nutrients,
        }}
        formConfig={{
          insertTitle: "Adicionar Nutriente",
          editTitle: "Editar Nutriente",
          fields,
        }}
        searchConfig={{
          searchBy: "name",
        }}
        pageConfig={{
          pageTitle: "Nutrientes",
        }}
      />
    </LayoutDefault>
  );
}
