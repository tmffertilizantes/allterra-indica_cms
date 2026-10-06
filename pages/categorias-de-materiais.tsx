import { apiUrl } from "../lib/api";
import { PostType } from "@components";
import { NextPage } from "next";
import { useGlobal } from "@context/global";
import { AxiosResponse } from "axios";
import LayoutDefault from "@components/Layouts/default";
import SelectLanguage from "@components/Utils/SelectLanguage";
import { useMemo, useState } from "react";
import { Form } from "react-bootstrap";

interface CustomComponent {
  post: any;
  setPost: Function;
}

const Page: NextPage = () => {
  const { token = "" } = useGlobal();
  const url = apiUrl(`/materialCategory`);

  const [language, setLanguage] = useState("pt-br");

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
    {
      Component: ({ post, setPost }: CustomComponent) => (
        <div className="mb-3">
          <label className="form-label">Categorias com filtros</label>
          <Form.Check
            type="switch"
            id="custom-switch"
            checked={post.filters}
            onChange={(event) => {
              var filters = false;
              if (event.target.checked) {
                filters = true;
              }
              setPost({
                ...post,
                filters: filters,
              });
            }}
          />
        </div>
      ),
    }
  ];

  const initialData = useMemo(() => {
    let data = null;

    data = {
      active: true,
    };

    if (language) {
      data = {
        ...data,
        lang: language,
      };
    }

    return data;
  }, [language]);

  return (
    <LayoutDefault>
      <PostType
        initialPostData={initialData}
        dataConfig={{
          url,
          token,
          fetcherDataFn: (response: AxiosResponse) => response.data.categories,
        }}
        formConfig={{
          insertTitle: "Adicionar Categoria",
          editTitle: "Editar Categoria",
          fields,
        }}
        pageConfig={{
          pageTitle: "Categorias de Materiais",
        }}
      />
    </LayoutDefault>
  );
};

export default Page;
